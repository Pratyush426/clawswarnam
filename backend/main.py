import asyncio
import logging
from typing import Optional, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.config import config
from backend.agents.agent_pool import agent_pool
from backend.orchestrator.engine import OrchestrationEngine
from backend.orchestrator.fault_detector import fault_detector
from backend.orchestrator.leader_election import leader_election
from backend.communication.websocket_manager import ws_manager
from backend.communication.message_bus import message_bus
from backend.benchmarks.comparator import run_benchmark

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="ClawSwarm AI API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Engine
engine = OrchestrationEngine(ws_manager)

# In-memory task store (for simplicity in this prototype)
task_store = {}

# Pydantic Models
class TaskRequest(BaseModel):
    task: str

class FaultRequest(BaseModel):
    agent_id: str

class RespawnRequest(BaseModel):
    agent_id: Optional[str] = None


@app.on_event("startup")
async def startup_event():
    """Start background loops on boot."""
    logger.info("Starting ClawSwarm AI background systems...")
    
    # Start Message Bus
    await message_bus.connect()
    
    # Start fault detector
    asyncio.create_task(
        fault_detector.run_loop(
            broadcast_callback=ws_manager.broadcast,
            reassign_callback=engine.handle_reassignment
        )
    )
    
    # Start leader election
    asyncio.create_task(
        leader_election.run_loop(
            broadcast_callback=ws_manager.broadcast
        )
    )

    # Start agent heartbeats
    asyncio.create_task(agent_pool.start_heartbeat_loop())

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down ClawSwarm AI...")
    fault_detector.stop()
    leader_election.stop()
    await message_bus.disconnect()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial snapshot
        await ws_manager.broadcast("swarm_snapshot", {"message": "Welcome to ClawSwarm AI"})
        while True:
            # Keep connection open
            data = await websocket.receive_text()
            # We don't process incoming WS messages yet, just server->client events
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


@app.post("/task")
async def submit_task(req: TaskRequest, background_tasks: BackgroundTasks):
    import uuid
    task_id = str(uuid.uuid4())
    
    task_store[task_id] = {
        "status": "processing",
        "task": req.task,
        "result": None,
        "benchmark": None
    }
    
    async def run_task():
        try:
            # 1. Run ClawSwarm Orchestration
            res = await engine.process_user_task(req.task)
            task_store[task_id]["status"] = "completed"
            task_store[task_id]["result"] = res["result"]
            
            # 2. Run Benchmarks
            benchmark_data = await run_benchmark(req.task, res["time_taken"], res["result"])
            task_store[task_id]["benchmark"] = benchmark_data
            
            # Broadcast benchmark update
            await ws_manager.broadcast("benchmark_update", {
                "task_id": task_id,
                "benchmark": benchmark_data
            })
            
            # 3. Update total tasks for leader election
            leader_election.total_tasks_completed += 1
            
        except Exception as e:
            logger.error(f"Task {task_id} failed: {e}")
            task_store[task_id]["status"] = "failed"
            task_store[task_id]["result"] = str(e)
            await ws_manager.broadcast("task_failed", {"task_id": task_id, "error": str(e)})

    # Run in background so endpoint returns immediately
    background_tasks.add_task(run_task)
    
    return {"task_id": task_id, "status": "processing"}


@app.get("/task/{task_id}")
async def get_task(task_id: str):
    if task_id not in task_store:
        raise HTTPException(status_code=404, detail="Task not found")
    return task_store[task_id]


@app.get("/swarm/status")
async def get_swarm_status():
    return {
        "agents": agent_pool.get_pool_snapshot(),
        "leader_id": leader_election.current_leader_id
    }


@app.post("/swarm/inject-fault")
async def inject_fault(req: FaultRequest):
    """Manually kill an agent for demo purposes."""
    agent = agent_pool.get_agent(req.agent_id)
    if not agent or not agent.is_alive:
        raise HTTPException(status_code=400, detail="Agent not found or already dead")
        
    # We simulate fault by just changing the heartbeat back in time
    # The fault detector will catch it on the next tick
    agent.last_heartbeat = 0
    return {"status": "success", "message": f"Fault injected into {req.agent_id}. Waiting for detector..."}


@app.post("/swarm/inject-fault/leader")
async def inject_fault_leader():
    """Kill the current leader."""
    leader_id = leader_election.current_leader_id
    if not leader_id:
        raise HTTPException(status_code=400, detail="No active leader to kill")
        
    agent = agent_pool.get_agent(leader_id)
    if not agent or not agent.is_alive:
        raise HTTPException(status_code=400, detail="Leader already dead")
        
    agent.last_heartbeat = 0
    return {"status": "success", "message": f"Fault injected into leader {leader_id}. Watch the re-election!"}


@app.post("/swarm/respawn")
async def respawn_agent(req: RespawnRequest):
    """Bring a dead agent back, or spawn a fresh one."""
    new_agent = agent_pool.spawn_agent(req.agent_id)
    await ws_manager.broadcast("agent_spawned", {"agent": new_agent.to_dict()})
    return {"status": "success", "agent_id": new_agent.agent_id}
