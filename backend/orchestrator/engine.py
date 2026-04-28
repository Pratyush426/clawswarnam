import asyncio
import time
import logging
from typing import Dict, Any, List

from backend.agents.agent_pool import agent_pool
from backend.orchestrator.task_decomposer import decompose_task
from backend.orchestrator.task_classifier import classify_task
from backend.orchestrator.router import route_task
from backend.orchestrator.scorer import score_output
from backend.agents.base_agent import anthropic_client, groq_client

logger = logging.getLogger(__name__)

class OrchestrationEngine:
    def __init__(self, websocket_manager):
        self.ws = websocket_manager
        # In-memory store of active tasks to allow reassignment mapping
        self.active_subtasks = {} 
        
    async def process_user_task(self, user_task: str) -> Dict[str, Any]:
        """
        Main entry point for fulfilling a complex user task.
        """
        start_time = time.time()
        await self.ws.broadcast("task_started", {"message": "Decomposing task..."})
        
        # 1. Decompose
        subtasks = await decompose_task(user_task)
        await self.ws.broadcast("task_started", {"message": f"Decomposed into {len(subtasks)} subtasks."})
        
        # 2. Classify
        for st in subtasks:
            st["skill_type"] = await classify_task(st["description"])
            self.active_subtasks[st["subtask_id"]] = st
            
        # 3. Execution (Respecting dependencies)
        completed_outputs = {}
        pending = list(subtasks)
        
        # Helper to execute a single subtask (with built-in retry/reassignment loops)
        async def execute_subtask(task: Dict[str, Any]):
            task_id = task["subtask_id"]
            
            while True:
                agent_id = route_task(task)
                if not agent_id:
                    await asyncio.sleep(1) # Wait for an agent to free up or respawn
                    continue
                    
                agent = agent_pool.get_agent(agent_id)
                if not agent or not agent.is_alive:
                    continue
                    
                await self.ws.broadcast("task_routed", {
                    "task_id": task_id,
                    "agent_id": agent_id,
                    "skill_type": task["skill_type"]
                })
                
                try:
                    # Provide context of dependent task outputs
                    context = ""
                    for dep_id in task.get("depends_on", []):
                        if dep_id in completed_outputs:
                            context += f"\nOutput of prerequisite task:\n{completed_outputs[dep_id]}\n"
                    
                    if context:
                        task["description"] = f"{task['description']}\n\nContext from previous steps:{context}"

                    output = await agent.execute_task(task)
                    
                    # Score it
                    score = await score_output(task, output)
                    agent.apply_score(task_id, task["skill_type"], score)
                    
                    # Notify Role Evolution if any
                    await self.ws.broadcast("role_evolved", {
                        "agent_id": agent.agent_id,
                        "role_label": agent.role_label,
                        "skill_vector": agent.skill_vector
                    })
                    
                    await self.ws.broadcast("task_completed", {
                        "task_id": task_id,
                        "agent_id": agent_id,
                        "score": score
                    })
                    
                    completed_outputs[task_id] = output
                    return
                    
                except Exception as e:
                    logger.error(f"Task {task_id} failed on agent {agent_id}: {e}")
                    # Loop will continue and route to another agent
                    await asyncio.sleep(1)

        # Loop to execute ready tasks
        tasks_in_progress = set()
        
        while len(completed_outputs) < len(subtasks):
            for st in pending:
                st_id = st["subtask_id"]
                if st_id in completed_outputs or st_id in tasks_in_progress:
                    continue
                    
                # Check dependencies
                deps_met = all(dep in completed_outputs for dep in st.get("depends_on", []))
                if deps_met:
                    tasks_in_progress.add(st_id)
                    # Fire and forget; state is tracked via completed_outputs
                    asyncio.create_task(execute_subtask(st))
                    
            await asyncio.sleep(0.5)

        # 4. Synthesis
        await self.ws.broadcast("task_started", {"message": "Synthesizing final output..."})
        final_result = await self._synthesize(user_task, completed_outputs)
        
        end_time = time.time()
        
        return {
            "status": "success",
            "time_taken": round(end_time - start_time, 2),
            "result": final_result
        }

    async def _synthesize(self, original_task: str, outputs: Dict[str, str]) -> str:
        """Final LLM call to combine everything into a cohesive result."""
        # Find best synthesis agent
        alive_agents = agent_pool.get_alive_agents()
        if not alive_agents:
            return "Error: No alive agents to synthesize."
            
        skill_vectors = {a.agent_id: a.skill_vector for a in alive_agents}
        from backend.agents.skill_vector import get_best_agent_for_skill
        best_synth_id = get_best_agent_for_skill(skill_vectors, "synthesis")
        synth_agent = agent_pool.get_agent(best_synth_id)
        
        combined_text = "\n\n---\n\n".join([f"Subtask Result:\n{v}" for k, v in outputs.items()])
        synth_prompt = f"Original Request: {original_task}\n\nCombine the following subtask outputs into a final, polished response:\n{combined_text}"
        
        # We manually call the LLM here instead of using execute_task to avoid recursive loops 
        # but using execute_task is actually fine if we format it as a task.
        synth_task = {
            "subtask_id": "synthesis-final",
            "description": synth_prompt,
            "skill_type": "synthesis"
        }
        
        try:
            final_output = await synth_agent.execute_task(synth_task)
            score = await score_output(synth_task, final_output)
            synth_agent.apply_score("synthesis-final", "synthesis", score)
            return final_output
        except Exception:
            # Fallback direct call if agent fails
            return combined_text

    async def handle_reassignment(self, task: Dict[str, Any], new_agent_id: str):
        """
        Callback for fault detector when an agent dies mid-task.
        The engine's execute_subtask while True loop handles retries naturally 
        when the agent raises an exception or dies, but we can explicitly log it here.
        """
        logger.info(f"Engine notified of task reassignment to {new_agent_id}")
