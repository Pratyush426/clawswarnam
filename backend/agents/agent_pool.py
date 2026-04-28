from typing import Dict, List, Optional, Any
import logging

from backend.config import config
from backend.agents.base_agent import BaseAgent
from backend.agents import skill_vector as sv

logger = logging.getLogger(__name__)

class AgentPool:
    """
    Manages the lifecycle and state of all agents in the swarm.
    """

    def __init__(self, num_agents: int = config.NUM_AGENTS):
        self.agents: Dict[str, BaseAgent] = {}
        self._spawn_initial_agents(num_agents)
        logger.info(f"Initialized AgentPool with {num_agents} agents.")

    def _spawn_initial_agents(self, count: int):
        for i in range(count):
            agent_id = f"agent-{i+1:02d}"
            self.agents[agent_id] = BaseAgent(agent_id=agent_id)

    def spawn_agent(self, agent_id: Optional[str] = None) -> BaseAgent:
        """Spawn a new agent (e.g. to replace a failed one)."""
        agent = BaseAgent(agent_id=agent_id)
        self.agents[agent.agent_id] = agent
        logger.info(f"Spawned new agent: {agent.agent_id}")
        return agent

    def get_agent(self, agent_id: str) -> Optional[BaseAgent]:
        """Retrieve an agent by ID."""
        return self.agents.get(agent_id)

    def get_alive_agents(self) -> List[BaseAgent]:
        """Return a list of all currently alive agents."""
        return [a for a in self.agents.values() if a.is_alive]

    def get_pool_snapshot(self) -> List[Dict[str, Any]]:
        """Return serializable state of all agents for WebSocket broadcast."""
        return [agent.to_dict() for agent in self.agents.values()]

    def reassign_task(self, task: Dict[str, Any], failed_agent_id: str) -> Optional[str]:
        """
        Finds the next best agent for a task when one fails.
        Excludes the failed agent.
        Returns the new agent_id or None if no alive agents available.
        """
        alive = self.get_alive_agents()
        candidates = [a for a in alive if a.agent_id != failed_agent_id]
        
        if not candidates:
            return None
            
        skill_type = task.get("skill_type", "general")
        
        # Build dict of {agent_id: skill_vector} for sv.get_best_agent_for_skill
        skill_vectors = {a.agent_id: a.skill_vector for a in candidates}
        
        # We use exploit strictly for reassignment to ensure best chance of success
        best_agent_id = sv.get_best_agent_for_skill(skill_vectors, skill_type)
        return best_agent_id

    def mark_agent_failed(self, agent_id: str):
        """Mark an agent as dead (FAILED)."""
        agent = self.get_agent(agent_id)
        if agent:
            agent.is_alive = False
            logger.warning(f"Agent {agent_id} marked as FAILED.")

    async def start_heartbeat_loop(self):
        """Background loop to pulse heartbeats for all alive agents."""
        logger.info("Starting AgentPool heartbeat pulse loop.")
        import asyncio
        while True:
            for agent in self.get_alive_agents():
                agent.heartbeat()
            await asyncio.sleep(5)

# Singleton instance for the app
agent_pool = AgentPool()
