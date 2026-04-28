import logging
from typing import Dict

from backend.agents.skill_vector import SKILL_DIMENSIONS
from backend.agents.base_agent import anthropic_client, groq_client, gemini_model, asyncio

logger = logging.getLogger(__name__)

# Keyword fallback in case LLM classification fails or for speed
KEYWORD_MAP = {
    "research": ["research", "find", "search", "investigate", "explore", "gather", "look up"],
    "coding": ["code", "implement", "function", "script", "program", "api", "debug", "test"],
    "writing": ["write", "draft", "document", "report", "summary", "paragraph", "essay"],
    "critique": ["critique", "review", "evaluate", "assess", "check", "verify", "analyze"],
    "planning": ["plan", "design", "architecture", "structure", "outline", "strategy"],
    "synthesis": ["synthesize", "combine", "integrate", "merge", "finalize", "conclude"]
}

SYSTEM_PROMPT = f"""You are the Task Classifier for ClawSwarm AI.
Classify the following subtask description into EXACTLY ONE of these categories:
{SKILL_DIMENSIONS}

Output ONLY the category name. No punctuation, no explanation."""

async def classify_task(description: str) -> str:
    """
    Classify a task description into one of the 6 canonical skill dimensions.
    Uses LLM first, falls back to keyword matching.
    """
    result = ""
    try:
        # 1. Try Groq
        if groq_client:
            try:
                response = await groq_client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": description}
                    ]
                )
                result = response.choices[0].message.content.strip().lower()
            except Exception as e:
                logger.warning(f"Groq classification failed: {e}")

        # 2. Try Gemini
        if (not result or result not in SKILL_DIMENSIONS) and gemini_model:
            try:
                full_prompt = f"{SYSTEM_PROMPT}\n\nTASK:\n{description}"
                response = await asyncio.to_thread(gemini_model.generate_content, full_prompt)
                result = response.text.strip().lower()
            except Exception as e:
                logger.warning(f"Gemini classification failed: {e}")

        # 3. Try Anthropic
        if (not result or result not in SKILL_DIMENSIONS) and anthropic_client:
            try:
                response = await anthropic_client.messages.create(
                    model="claude-3-5-haiku-20241022",
                    max_tokens=10,
                    system=SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": description}]
                )
                result = response.content[0].text.strip().lower()
            except Exception as e:
                logger.warning(f"Anthropic classification failed: {e}")

        if result in SKILL_DIMENSIONS:
            return result
                
    except Exception as e:
        logger.warning(f"LLM classification failed, falling back to keywords: {e}")
        
    return _keyword_fallback(description)

def _keyword_fallback(description: str) -> str:
    """Simple keyword matching if LLM fails."""
    desc_lower = description.lower()
    
    # Count matches for each skill
    scores = {skill: 0 for skill in SKILL_DIMENSIONS}
    for skill, keywords in KEYWORD_MAP.items():
        for kw in keywords:
            if kw in desc_lower:
                scores[skill] += 1
                
    # Get highest scoring skill
    best_skill = max(scores, key=scores.get)
    
    # If no matches found, default to generalist -> "writing" or "synthesis" or random. We use planning.
    if scores[best_skill] == 0:
        return "planning"
        
    return best_skill
