import asyncio
import time
import logging
from typing import Callable, Any

from backend.agents.agent_pool import agent_pool
from backend.orchestrator.leader_election import leader_election

logger = logging.getLogger(__name__)

class FaultDetector:
    def __init__(self):
        self.is_running = False
        self.heartbeat_timeout = 15.0 # seconds
        self.check_interval = 2.0 # seconds
        
    async def run_loop(self, broadcast_callback: Callable, reassign_callback: Callable):
        """
        Runs continuously, checking agent heartbeats.
        """
        self.is_running = True
        logger.info("Fault Detector system started.")
        
        while self.is_running:
            await asyncio.sleep(self.check_interval)
            
            try:
                now = time.time()
                alive_agents = agent_pool.get_alive_agents()
                
                for agent in alive_agents:
                    if now - agent.last_heartbeat > self.heartbeat_timeout:
                        logger.warning(f"Agent {agent.agent_id} missed heartbeat! Marking FAILED.")
                        
                        # 1. Mark failed
                        agent_pool.mark_agent_failed(agent.agent_id)
                        
                        # 2. Broadcast failure
                        await broadcast_callback("agent_failed", {"agent_id": agent.agent_id})
                        
                        # 3. Handle leader death
                        if agent.agent_id == leader_election.current_leader_id:
                            logger.error(f"Leader {agent.agent_id} failed! Triggering emergency election.")
                            election_data = leader_election.force_election()
                            if election_data:
                                await broadcast_callback("leader_elected", election_data)
                                
                        # 4. Handle in-progress task reassignment
                        if agent.current_task:
                            task = agent.current_task
                            logger.info(f"Reassigning task {task.get('subtask_id')} from dead agent {agent.agent_id}")
                            new_agent_id = agent_pool.reassign_task(task, agent.agent_id)
                            
                            if new_agent_id:
                                # We call the engine's callback to handle the actual LLM re-execution
                                await reassign_callback(task, new_agent_id)
                            else:
                                logger.error(f"Failed to reassign task {task.get('subtask_id')}: No alive agents.")
                        
                        # 5. Broadcast swarm reorganized
                        await broadcast_callback("swarm_reorganized", {"timestamp": time.time()})
                        
            except Exception as e:
                logger.error(f"Error in fault detector loop: {e}")

    def stop(self):
        self.is_running = False

fault_detector = FaultDetector()
