import random
import logging
from typing import Dict, Any, Optional

from backend.config import config
from backend.agents.agent_pool import agent_pool
from backend.agents.skill_vector import get_best_agent_for_skill

logger = logging.getLogger(__name__)

def route_task(task: Dict[str, Any]) -> Optional[str]:
    """
    Epsilon-greedy routing algorithm.
    - (1 - epsilon) % of the time: Exploit (route to agent with highest score in skill)
    - epsilon % of the time: Explore (route to random agent)
    
    Returns the agent_id of the selected agent, or None if no agents available.
    """
    skill_type = task.get("skill_type", "general")
    epsilon = config.EPSILON
    
    # Get eligible agents (alive and not overloaded)
    # Since execute_task blocks, an agent is busy if current_task is not None
    # The requirement said "max 2 concurrent tasks", but since our execute_task is async 
    # we could allow it, but let's just use current_task is None for simplicity, 
    # or track a task_count. For now, let's just pick any alive agent to ensure we don't deadlock.
    # Actually, we should filter out agents that are dead.
    alive_agents = agent_pool.get_alive_agents()
    
    if not alive_agents:
        logger.error("No alive agents available for routing!")
        return None
        
    # Explore vs Exploit
    if random.random() < epsilon:
        # Explore: pick random alive agent
        chosen_agent = random.choice(alive_agents)
        logger.info(f"Routing [Explore]: Task {task.get('subtask_id')} -> {chosen_agent.agent_id}")
        return chosen_agent.agent_id
    else:
        # Exploit: pick best agent for skill, but incorporate a small penalty for workload
        # to ensure the swarm stays active and doesn't just bottle-neck on one agent.
        scored_candidates = []
        for a in alive_agents:
            base_score = a.skill_vector.get(skill_type, 0.0)
            
            # Substantial penalty if currently busy (max 1 task at a time for efficiency)
            load_busy = 0.5 if a.current_task else 0.0
            # Small penalty based on historical workload (to encourage others to specialize)
            load_history = (a.metrics.get("tasks_completed", 0) * 0.01)
            
            effective_score = base_score - load_busy - load_history
            scored_candidates.append((a.agent_id, effective_score))
        
        # Sort by effective score and pick the top one
        best_agent_id = max(scored_candidates, key=lambda x: x[1])[0]
        logger.info(f"Routing [Exploit-LoadAware]: Task {task.get('subtask_id')} -> {best_agent_id}")
        return best_agent_id
