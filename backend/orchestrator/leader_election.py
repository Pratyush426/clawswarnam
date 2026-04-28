import asyncio
import logging
import random
from typing import Optional, Dict, Any

from backend.agents.agent_pool import agent_pool

logger = logging.getLogger(__name__)

class LeaderElectionSystem:
    def __init__(self):
        self.current_leader_id: Optional[str] = None
        self.total_tasks_completed = 0 # To track when to start real elections
        self.is_running = False
        
    def calculate_leader_score(self, agent_id: str) -> float:
        """
        Computes composite score for election:
        (avg skill vector) * 0.6 + (success rate) * 0.4
        """
        agent = agent_pool.get_agent(agent_id)
        if not agent or not agent.is_alive:
            return 0.0
            
        # 1. Average skill vector
        avg_skill = sum(agent.skill_vector.values()) / len(agent.skill_vector)
        
        # 2. Success rate
        completed = agent.metrics["tasks_completed"]
        failed = agent.metrics["tasks_failed"]
        total = completed + failed
        
        if total == 0:
            success_rate = 0.5 # Default neutral before they do anything
        else:
            success_rate = completed / total
            
        composite = (avg_skill * 0.6) + (success_rate * 0.4)
        return round(composite, 4)

    def force_election(self) -> Optional[Dict[str, Any]]:
        """
        Run an immediate election. Useful when current leader dies.
        Returns the election result for broadcasting, or None if no alive agents.
        """
        alive_agents = agent_pool.get_alive_agents()
        if not alive_agents:
            self.current_leader_id = None
            return None
            
        # Random initial election if no tasks completed
        total_tasks_acc = sum(a.metrics["tasks_completed"] + a.metrics["tasks_failed"] for a in alive_agents)
        if total_tasks_acc < 3 and not self.current_leader_id:
            new_leader = random.choice(alive_agents)
            self.current_leader_id = new_leader.agent_id
            logger.info(f"Initial random leader elected: {self.current_leader_id}")
            return self._build_election_event()

        # Real election
        scores = {a.agent_id: self.calculate_leader_score(a.agent_id) for a in alive_agents}
        top_candidate_id = max(scores, key=scores.get)
        top_score = scores[top_candidate_id]
        
        old_leader_id = self.current_leader_id
        
        # If no current leader, just assign top
        if not old_leader_id or not agent_pool.get_agent(old_leader_id) or not agent_pool.get_agent(old_leader_id).is_alive:
            self.current_leader_id = top_candidate_id
            logger.info(f"New leader elected: {top_candidate_id} (Score: {top_score})")
            return self._build_election_event()
            
        # Transfer if drop > 0.15
        current_leader_score = scores.get(old_leader_id, 0.0)
        if (top_score - current_leader_score) > 0.15 and top_candidate_id != old_leader_id:
            logger.info(f"Leader transfer: {old_leader_id} ({current_leader_score}) -> {top_candidate_id} ({top_score})")
            self.current_leader_id = top_candidate_id
            return self._build_election_event()
            
        # No transfer needed
        return None
        
    def _build_election_event(self) -> Dict[str, Any]:
        """Build the event data payload for leader_elected."""
        alive_agents = agent_pool.get_alive_agents()
        scores = {a.agent_id: self.calculate_leader_score(a.agent_id) for a in alive_agents}
        return {
            "leader_id": self.current_leader_id,
            "scores": scores
        }

    async def run_loop(self, broadcast_callback):
        """
        Background task that runs every 10 seconds.
        """
        self.is_running = True
        logger.info("Leader Election system started.")
        while self.is_running:
            await asyncio.sleep(10)
            try:
                election_event_data = self.force_election()
                if election_event_data:
                    # Need to broadcast
                    await broadcast_callback("leader_elected", election_event_data)
            except Exception as e:
                logger.error(f"Error in leader election loop: {e}")
                
    def stop(self):
        self.is_running = False

leader_election = LeaderElectionSystem()
