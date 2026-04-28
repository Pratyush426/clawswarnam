import json
import time
import logging
from typing import List, Dict, Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"Client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        """
        Broadcasts an event to all connected WebSocket clients.
        
        Event schema:
        {
            "event": event_type,
            "data": data,
            "timestamp": timestamp
        }
        """
        payload = {
            "event": event_type,
            "data": data,
            "timestamp": time.time()
        }
        
        # Include full swarm snapshot in every major event to keep UI synced
        if event_type not in ["swarm_snapshot"]:
            from backend.agents.agent_pool import agent_pool
            payload["swarmState"] = agent_pool.get_pool_snapshot()
            
        json_payload = json.dumps(payload)
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json_payload)
            except Exception as e:
                logger.error(f"Failed to send to client: {e}")
                disconnected.append(connection)
                
        # Clean up dead connections
        for conn in disconnected:
            self.disconnect(conn)

ws_manager = ConnectionManager()
