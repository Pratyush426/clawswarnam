import asyncio
import time
import uuid
import logging
from typing import Dict, Any, Optional

from anthropic import AsyncAnthropic
from groq import AsyncGroq
from google import genai as google_genai

from backend.config import config
from backend.agents.memory import AgentMemory
from backend.agents import skill_vector as sv

logger = logging.getLogger(__name__)

# Initialize LLM clients
anthropic_client = AsyncAnthropic(api_key=config.ANTHROPIC_API_KEY) if config.ANTHROPIC_API_KEY and config.ANTHROPIC_API_KEY.startswith("sk-ant") else None
groq_client = AsyncGroq(api_key=config.GROQ_API_KEY) if config.GROQ_API_KEY else None

if config.GEMINI_API_KEY:
    _gemini_client = google_genai.Client(api_key=config.GEMINI_API_KEY)
    gemini_model = _gemini_client
else:
    gemini_model = None


class BaseAgent:
    """
    The fundamental ClawSwarm Agent.
    Starts as a blank slate and specializes through EMA skill updates.
    """

    def __init__(self, agent_id: Optional[str] = None):
        self.agent_id = agent_id or f"agent-{uuid.uuid4().hex[:8]}"
        
        # Core Emergent Properties
        self.skill_vector = sv.initial_vector()
        self.memory = AgentMemory(max_size=10)
        
        # State
        self.is_alive = True
        self.current_task: Optional[Dict[str, Any]] = None
        self.last_heartbeat = time.time()
        
        # Metrics
        self.metrics = {
            "tasks_completed": 0,
            "tasks_failed": 0,
            "total_response_time": 0.0
        }

    @property
    def role_label(self) -> str:
        """Dynamically computed role label based on current skill vector."""
        return sv.get_role_label(self.skill_vector)

    @property
    def top_skill(self) -> str:
        """The agent's highest scoring skill."""
        skill, _ = sv.get_top_skill(self.skill_vector)
        return skill

    @property
    def composite_score(self) -> float:
        """
        Used for leader election.
        Weights current skill vector by how often the agent has used those skills.
        """
        freq = self.memory.get_task_frequency()
        return sv.composite_score(self.skill_vector, freq)

    def heartbeat(self):
        """Update heartbeat timestamp."""
        self.last_heartbeat = time.time()

    def _build_prompt(self, task_description: str, skill_type: str) -> str:
        """
        Constructs the system prompt, injecting the agent's current specialization
        and short-term memory to maintain continuity.
        """
        role = self.role_label
        skill, score = sv.get_top_skill(self.skill_vector)
        
        system_prompt = f"""You are an autonomous AI agent in the ClawSwarm system.
Your ID is {self.agent_id}.

[EMERGENT SPECIALIZATION]
Your current role label is: {role}
Your dominant skill is: {skill} (Score: {score:.2f})
Your full skill vector: {sv.describe_vector(self.skill_vector)}

You must execute the following subtask which has been classified as requiring the '{skill_type}' skill.
Lean into your current specialization. If you are a specialist, provide deep, expert-level output.
If you are a generalist, provide balanced, well-rounded output.

{self.memory.format_for_prompt(n=3)}
"""
        return system_prompt

    async def _call_llm(self, system_prompt: str, user_prompt: str) -> str:
        """
        Call the configured LLM. Prioritizes free providers (Groq, Gemini) over Anthropic.
        Uses mock LLM if MOCK_LLM=true environment variable is set.
        """
        import os
        
        # Check if using mock LLM for testing
        if os.getenv("MOCK_LLM", "").lower() == "true":
            from backend.orchestrator.mock_llm import mock_execute_subtask
            skill_type = "general"
            # Try to extract skill type from system prompt
            if "research" in system_prompt.lower():
                skill_type = "research"
            elif "code" in system_prompt.lower() or "implement" in system_prompt.lower():
                skill_type = "coding"
            elif "write" in system_prompt.lower():
                skill_type = "writing"
            elif "review" in system_prompt.lower() or "critique" in system_prompt.lower():
                skill_type = "critique"
            elif "plan" in system_prompt.lower():
                skill_type = "planning"
            return await mock_execute_subtask(skill_type, user_prompt)
        
        # 1. Try Groq (Llama 3) - Fastest and free
        if groq_client:
            try:
                response = await groq_client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ]
                )
                return response.choices[0].message.content
            except Exception as e:
                logger.warning(f"[{self.agent_id}] Groq API failed: {e}. Trying Gemini...")

        # 2. Try Gemini (Flash) - Free and reliable
        if gemini_model:
            try:
                # Gemini combined prompt
                full_prompt = f"{system_prompt}\n\nUSER TASK:\n{user_prompt}"
                response = await asyncio.to_thread(
                    gemini_model.models.generate_content,
                    model="gemini-2.0-flash",
                    contents=full_prompt
                )
                return response.text
            except Exception as e:
                logger.warning(f"[{self.agent_id}] Gemini API failed: {e}. Trying Anthropic...")

        # 3. Try Anthropic (Claude) - Paid fallback
        if anthropic_client:
            try:
                response = await anthropic_client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=2048,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_prompt}]
                )
                return response.content[0].text
            except Exception as e:
                logger.error(f"[{self.agent_id}] Anthropic API failed: {e}")
                raise
        
        raise RuntimeError("No LLM clients configured or keys are invalid. Please check your .env file.")

    async def execute_task(self, task: Dict[str, Any]) -> str:
        """
        Executes a task, calls LLM, updates memory and state.
        Note: The Scorer module handles updating the skill vector, not the agent itself.
        The prompt says: "updates skill vector on completion" -> We can do a provisional update or leave it to the scorer. 
        Actually, the instruction says: "execute_task(task) async method: calls LLM with memory context, updates skill vector on completion, updates heartbeat. On failure: mark task failed, update skill vector negatively, raise exception"
        """
        task_description = task.get("description", "")
        skill_type = task.get("skill_type", "general")
        task_id = task.get("subtask_id", str(uuid.uuid4()))

        self.current_task = task
        self.heartbeat()
        start_time = time.time()

        system_prompt = self._build_prompt(task_description, skill_type)
        user_prompt = f"Execute this task:\n{task_description}"

        try:
            # Add small random jitter (0-500ms) to prevent absolute synchronization of API calls
            import random
            await asyncio.sleep(random.uniform(0, 0.5))
            
            # 1. Execute via LLM
            output = await self._call_llm(system_prompt, user_prompt)
            
            # 2. Update metrics
            elapsed = time.time() - start_time
            self.metrics["tasks_completed"] += 1
            self.metrics["total_response_time"] += elapsed
            
            # 3. Add to memory (without score initially, orchestrator will score it)
            self.memory.add_exchange(
                task_description=task_description,
                output=output,
                skill_type=skill_type,
                task_id=task_id
            )
            
            self.current_task = None
            self.heartbeat()
            return output

        except Exception as e:
            # On failure: mark task failed, update skill vector negatively (0.1 score), raise exception
            self.metrics["tasks_failed"] += 1
            self.skill_vector = sv.update(self.skill_vector, skill_type, 0.1, config.ALPHA)
            self.current_task = None
            self.heartbeat()
            logger.error(f"[{self.agent_id}] Task {task_id} failed: {e}")
            raise

    def apply_score(self, task_id: str, skill_type: str, score: float):
        """
        Called by the orchestrator/scorer after evaluating the agent's output.
        Updates the agent's skill vector.
        """
        self.skill_vector = sv.update(self.skill_vector, skill_type, score, config.ALPHA)
        # Update the score in memory if possible
        for entry in reversed(self.memory._entries):
            if entry.get("task_id") == task_id:
                entry["performance_score"] = score
                break
                
    def to_dict(self) -> Dict[str, Any]:
        """Serialize state for WebSocket broadcast."""
        avg_response_time = 0.0
        if self.metrics["tasks_completed"] > 0:
            avg_response_time = self.metrics["total_response_time"] / self.metrics["tasks_completed"]
            
        return {
            "agent_id": self.agent_id,
            "role_label": self.role_label,
            "composite_score": self.composite_score,
            "skill_vector": self.skill_vector,
            "is_alive": self.is_alive,
            "current_task": self.current_task["subtask_id"] if self.current_task else None,
            "metrics": {
                "tasks_completed": self.metrics["tasks_completed"],
                "tasks_failed": self.metrics["tasks_failed"],
                "avg_response_time": round(avg_response_time, 2)
            },
            "specialization_strength": sv.get_specialization_strength(self.skill_vector)
        }
