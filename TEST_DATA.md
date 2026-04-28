# ClawSwarm AI - Testing Data & Examples

## API Endpoints & Sample Requests

### 1. Submit a Task
**POST** `/task`

#### Sample Tasks for Testing

**Request Body (JSON):**

```json
{
  "task": "Write a Python function that implements binary search and include unit tests"
}
```

---

## Test Task Examples

### Research & Synthesis Tasks
```json
{
  "task": "Research quantum computing breakthroughs in 2024 and provide a summary of the top 5 advances with their practical applications"
}
```

### Code Generation with Testing
```json
{
  "task": "Implement a REST API endpoint in Python that handles user authentication with JWT tokens, write comprehensive unit tests, and create API documentation"
}
```

### Analysis & Strategy
```json
{
  "task": "Analyze three competing AI frameworks (CrewAI, AutoGen, LangGraph) and create a comparison matrix with pros/cons, then recommend which is best for a startup with limited ML expertise"
}
```

### Document & Review
```json
{
  "task": "Write a technical specification for a real-time chat application, create a detailed architecture diagram in text format, and perform a security review"
}
```

### Complex Multi-Step
```json
{
  "task": "Design a data pipeline that: 1) Ingests JSON log files, 2) Transforms them to Parquet format, 3) Loads into a data warehouse, 4) Creates SQL views for analytics. Write pseudocode and document the ETL process."
}
```

### Educational Content
```json
{
  "task": "Explain how transformer neural networks work at a level for someone with basic ML knowledge. Use analogies, provide mathematical formulas, include a simple Python implementation of attention mechanism, and write unit tests for it."
}
```

### Debugging & Optimization
```json
{
  "task": "Review this code snippet for performance issues: 'for i in range(1000000): if i % 2 == 0: print(i)'. Identify bottlenecks, optimize it, benchmark the improvement, and explain what makes it faster."
}
```

---

## cURL Command Examples

### Submit a Task
```bash
curl -X POST "http://localhost:8000/task" \
  -H "Content-Type: application/json" \
  -d '{"task": "Write a Python function that implements binary search and include unit tests"}'
```

### Poll Task Status
```bash
curl "http://localhost:8000/task/{task_id}"
```

### Get Swarm Status
```bash
curl "http://localhost:8000/swarm/status"
```

### Inject Fault (Test Fault Tolerance)
```bash
curl -X POST "http://localhost:8000/swarm/inject-fault" \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "agent_0"}'
```

---

## Python Test Script

Save as `test_clawswarm.py`:

```python
import requests
import json
import time

BASE_URL = "http://localhost:8000"

test_tasks = [
    "Write a Python function that implements binary search and include unit tests",
    "Create a REST API endpoint that handles pagination and filtering",
    "Explain machine learning overfitting with examples",
    "Design a caching strategy for a high-traffic API",
]

def submit_task(task_description):
    """Submit a task and return the task_id"""
    payload = {"task": task_description}
    response = requests.post(f"{BASE_URL}/task", json=payload)
    result = response.json()
    print(f"✓ Task submitted: {result['task_id']}")
    return result['task_id']

def get_task_status(task_id):
    """Poll task status"""
    response = requests.get(f"{BASE_URL}/task/{task_id}")
    return response.json()

def get_swarm_status():
    """Get current swarm state"""
    response = requests.get(f"{BASE_URL}/swarm/status")
    return response.json()

def inject_fault(agent_id):
    """Inject a fault into an agent"""
    payload = {"agent_id": agent_id}
    response = requests.post(f"{BASE_URL}/swarm/inject-fault", json=payload)
    return response.json()

if __name__ == "__main__":
    print("=" * 60)
    print("ClawSwarm AI - Test Suite")
    print("=" * 60)
    
    # Test 1: Submit multiple tasks
    print("\n[TEST 1] Submitting tasks...")
    task_ids = []
    for task in test_tasks:
        try:
            task_id = submit_task(task)
            task_ids.append(task_id)
        except Exception as e:
            print(f"✗ Error: {e}")
    
    # Test 2: Check swarm status
    print("\n[TEST 2] Swarm Status...")
    try:
        status = get_swarm_status()
        print(f"✓ Leader ID: {status.get('leader_id')}")
        print(f"✓ Agents: {len(status.get('agents', []))}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 3: Poll task progress
    print("\n[TEST 3] Polling task progress (30 sec)...")
    start = time.time()
    while time.time() - start < 30:
        for task_id in task_ids:
            try:
                task = get_task_status(task_id)
                status = task.get('status')
                print(f"  Task {task_id[:8]}... Status: {status}")
            except Exception as e:
                print(f"  Error: {e}")
        time.sleep(5)
    
    # Test 4: Fault injection
    print("\n[TEST 4] Testing fault tolerance...")
    try:
        status = get_swarm_status()
        agents = status.get('agents', [])
        if agents:
            agent_id = agents[0].get('agent_id')
            print(f"  Injecting fault on {agent_id}...")
            inject_fault(agent_id)
            print(f"✓ Fault injected, system should recover in <2s")
            time.sleep(3)
            new_status = get_swarm_status()
            print(f"✓ New leader: {new_status.get('leader_id')}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    print("\n" + "=" * 60)
    print("Test suite complete")
    print("=" * 60)
```

---

## PowerShell Test Script

Save as `test_clawswarm.ps1`:

```powershell
$BASE_URL = "http://localhost:8000"

$tasks = @(
    "Write a Python function that implements binary search and include unit tests",
    "Create a REST API endpoint that handles pagination and filtering",
    "Explain machine learning overfitting with examples"
)

function Submit-Task {
    param([string]$TaskDescription)
    
    $payload = @{ task = $TaskDescription } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$BASE_URL/task" -Method Post -Body $payload -ContentType "application/json"
    return $response.task_id
}

function Get-TaskStatus {
    param([string]$TaskId)
    
    return Invoke-RestMethod -Uri "$BASE_URL/task/$TaskId" -Method Get
}

function Get-SwarmStatus {
    return Invoke-RestMethod -Uri "$BASE_URL/swarm/status" -Method Get
}

# Submit tasks
Write-Host "Submitting tasks..." -ForegroundColor Green
$taskIds = @()
foreach ($task in $tasks) {
    $taskId = Submit-Task -TaskDescription $task
    $taskIds += $taskId
    Write-Host "✓ Task submitted: $taskId"
}

# Get swarm status
Write-Host "`nGetting swarm status..." -ForegroundColor Green
$status = Get-SwarmStatus
Write-Host "✓ Leader ID: $($status.leader_id)"
Write-Host "✓ Agents: $($status.agents.Count)"

# Poll progress
Write-Host "`nPolling task progress..." -ForegroundColor Green
for ($i = 0; $i -lt 6; $i++) {
    foreach ($taskId in $taskIds) {
        $task = Get-TaskStatus -TaskId $taskId
        Write-Host "  Task $($taskId.Substring(0,8))... Status: $($task.status)"
    }
    Start-Sleep -Seconds 5
}
```

---

## WebSocket Testing (JavaScript/Browser Console)

```javascript
const ws = new WebSocket("ws://localhost:8000/ws");

ws.onopen = () => {
  console.log("Connected to ClawSwarm WebSocket");
};

ws.onmessage = (event) => {
  console.log("Message received:", event.data);
  const data = JSON.parse(event.data);
  
  if (data.type === "swarm_snapshot") {
    console.log("Swarm Snapshot:", data.payload);
  } else if (data.type === "agent_update") {
    console.log("Agent Update:", data.payload);
  } else if (data.type === "benchmark_update") {
    console.log("Benchmark:", data.payload);
  }
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};

ws.onclose = () => {
  console.log("Disconnected from ClawSwarm");
};
```

---

## Load Testing with Apache Bench

```bash
# Single request
ab -n 1 -c 1 -T "application/json" -p payload.json http://localhost:8000/task

# 100 concurrent requests
ab -n 100 -c 10 -T "application/json" -p payload.json http://localhost:8000/task
```

**payload.json:**
```json
{"task": "Write a Python function that implements binary search"}
```

---

## Expected Behavior During Testing

| Event | Expected Response | Timeout |
|-------|------------------|---------|
| Task Submit | `{"task_id": "...", "status": "processing"}` | <1s |
| Task Processing | Status transitions: processing → completed/failed | <60s |
| Fault Detection | Leader reelected, tasks reassigned | <2s |
| Swarm Status | All agents snapshot with skill vectors | <200ms |
| WebSocket Message | Real-time updates broadcast to all clients | <100ms |

---

## Environment Setup for Testing

Create a `.env.test` file:

```env
ANTHROPIC_API_KEY=your_test_key
GROQ_API_KEY=your_test_key
REDIS_URL=redis://localhost:6379
NUM_AGENTS=5
ALPHA=0.3
EPSILON=0.2
LOG_LEVEL=DEBUG
```

Then run:
```bash
cp .env.test .env
docker-compose up
```
