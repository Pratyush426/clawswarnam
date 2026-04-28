import json
import uuid
import logging
import os
from typing import List, Dict, Any

from backend.config import config
from backend.agents.base_agent import anthropic_client, groq_client, gemini_model, asyncio

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the Task Decomposer for ClawSwarm AI.
Your job is to break a complex user request into 3-6 distinct subtasks.

Each subtask MUST be classified into exactly one of these skill categories:
["research", "coding", "writing", "critique", "planning", "synthesis"]

You must output ONLY valid JSON in this exact format, with no markdown formatting around it:
[
  {
    "subtask_id": "unique-id",
    "description": "Detailed description of what needs to be done",
    "skill_type": "research",
    "priority": 1,
    "depends_on": [] 
  }
]

- 'depends_on' should be a list of 'subtask_id' strings that must be completed BEFORE this task can start.
- Ensure the 'synthesis' or final combination task depends on all previous tasks.
- Provide clear, actionable descriptions.
"""

async def decompose_task(user_task: str) -> List[Dict[str, Any]]:
    """
    Calls LLM to decompose a user task into a list of subtasks.
    Uses mock LLM if MOCK_LLM=true environment variable is set.
    """
    logger.info(f"Decomposing task: {user_task[:50]}...")
    
    # Check if using mock LLM for testing
    if os.getenv("MOCK_LLM", "").lower() == "true":
        from backend.orchestrator.mock_llm import mock_decompose
        return await mock_decompose(user_task)
    
    content = ""
    
    # 1. Try Groq
    if groq_client:
        try:
            response = await groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_task}
                ],
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
        except Exception as e:
            logger.warning(f"Groq decomposer failed: {e}")

    # 2. Try Gemini
    if not content and gemini_model:
        try:
            full_prompt = f"{SYSTEM_PROMPT}\n\nUSER TASK:\n{user_task}"
            response = await asyncio.to_thread(gemini_model.generate_content, full_prompt)
            content = response.text
        except Exception as e:
            logger.warning(f"Gemini decomposer failed: {e}")

    # 3. Try Anthropic
    if not content and anthropic_client:
        try:
            response = await anthropic_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2048,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_task}]
            )
            content = response.content[0].text
        except Exception as e:
            logger.error(f"Anthropic decomposer failed: {e}")

    if content:
        return _parse_json_response(content)
            
    raise RuntimeError("No LLM client available for decomposition. Check API keys.")

def _parse_json_response(content: str) -> List[Dict[str, Any]]:
    """Extract and parse JSON from the LLM response."""
    # Strip markdown block if present
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
        
    try:
        data = json.loads(content.strip())
        
        # Handle case where LLM returns {"tasks": [...]} instead of [...]
        if isinstance(data, dict):
            # Try to find the list in common keys
            for key in ["tasks", "subtasks", "steps"]:
                if key in data and isinstance(data[key], list):
                    subtasks = data[key]
                    break
            else:
                # If no list found, maybe it's just one task but as a dict? 
                # Or maybe it returned each task as a key? 
                # Just take first list found
                subtasks = next((v for v in data.values() if isinstance(v, list)), [])
        else:
            subtasks = data if isinstance(data, list) else []

        if not subtasks:
            logger.warning(f"No subtasks found in LLM response: {content}")
            return []
            
        # Validate and ensure UUIDs are robust
        id_map = {}
        for st in subtasks:
            if not isinstance(st, dict): continue
            
            # Extract old ID, ensuring it's hashable for the map
            old_id = st.get("subtask_id", "")
            if isinstance(old_id, dict):
                # Fallback if LLM nested the ID
                old_id = old_id.get("id", str(old_id))
            old_id = str(old_id)
            
            new_id = str(uuid.uuid4())
            id_map[old_id] = new_id
            st["subtask_id"] = new_id
            
            # Default fallback for missing fields
            if "skill_type" not in st:
                st["skill_type"] = "general"
            if "depends_on" not in st:
                st["depends_on"] = []
                
        # Update depends_on references
        for st in subtasks:
            if not isinstance(st, dict): continue
            
            raw_deps = st.get("depends_on", [])
            if not isinstance(raw_deps, list):
                raw_deps = [raw_deps]
                
            new_deps = []
            for dep in raw_deps:
                # Handle if dep is a dict
                dep_str = str(dep.get("subtask_id", dep)) if isinstance(dep, dict) else str(dep)
                if dep_str in id_map:
                    new_deps.append(id_map[dep_str])
            st["depends_on"] = new_deps
            
        return subtasks
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse decomposition JSON: {content}")
        raise ValueError("LLM returned invalid JSON for task decomposition.") from e
