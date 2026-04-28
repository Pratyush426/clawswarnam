import logging
from typing import Dict, Any

from backend.agents.base_agent import anthropic_client, groq_client, gemini_model, asyncio

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an impartial AI Judge evaluating the performance of another AI agent.
You will be provided with a Task Description and the Agent's Output.
Evaluate how well the agent accomplished the task.

Criteria:
- Accuracy and correctness
- Completeness
- Formatting and readability
- Adherence to the task description

Score the output on a scale from 0.0 (complete failure) to 1.0 (perfect execution).
Return ONLY a floating point number between 0.0 and 1.0. Do not provide any other text, explanation, or formatting.
Example: 0.85
"""

async def score_output(task: Dict[str, Any], output: str) -> float:
    """
    Evaluates an agent's output using an LLM judge.
    Returns a float between 0.0 and 1.0.
    Includes retry logic and a fallback score of 0.5.
    """
    task_desc = task.get("description", "Unknown task")
    user_prompt = f"Task Description:\n{task_desc}\n\nAgent Output:\n{output}"
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            score_str = ""
            
            # 1. Try Groq
            if groq_client:
                try:
                    response = await groq_client.chat.completions.create(
                        model="llama-3.1-8b-instant",
                        messages=[
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt}
                        ]
                    )
                    score_str = response.choices[0].message.content.strip()
                except Exception as e:
                    logger.warning(f"Groq scoring failed: {e}")

            # 2. Try Gemini
            if not score_str and gemini_model:
                try:
                    full_prompt = f"{SYSTEM_PROMPT}\n\n{user_prompt}"
                    response = await asyncio.to_thread(
                        gemini_model.models.generate_content,
                        model="gemini-2.0-flash",
                        contents=full_prompt
                    )
                    score_str = response.text.strip()
                except Exception as e:
                    logger.warning(f"Gemini scoring failed: {e}")

            # 3. Try Anthropic
            if not score_str and anthropic_client:
                try:
                    response = await anthropic_client.messages.create(
                        model="claude-3-5-haiku-20241022",
                        max_tokens=10,
                        system=SYSTEM_PROMPT,
                        messages=[{"role": "user", "content": user_prompt}]
                    )
                    score_str = response.content[0].text.strip()
                except Exception as e:
                    logger.warning(f"Anthropic scoring failed: {e}")

            if not score_str:
                logger.warning("No LLM client for scoring. Returning default 0.5.")
                return 0.5
                
            # Parse the float
            score = float(score_str)
            score = max(0.0, min(1.0, score)) # Clamp between 0.0 and 1.0
            return score
            
        except ValueError:
            logger.warning(f"Failed to parse LLM score '{score_str}' as float. Retrying...")
        except Exception as e:
            logger.error(f"LLM scoring failed on attempt {attempt+1}: {e}")
            
    logger.error("All scoring attempts failed. Falling back to default score of 0.5.")
    return 0.5
