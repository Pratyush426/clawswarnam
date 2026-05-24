# ClawSwarm AI

**ClawSwarm AI is a provably novel multi-agent LLM framework featuring Emergent Role Specialization.** Unlike existing frameworks that require hardcoded roles, ClawSwarm initializes identical "blank slate" agents that organically develop deep specializations purely through competitive task performance and LLM-as-judge scoring. Designed for developers, researchers, and knowledge workers drowning in complex multi-step tasks, ClawSwarm autonomously decomposes problems, routes them via an epsilon-greedy algorithm, and delivers high-quality synthesis with zero-downtime fault tolerance.

Demo video: https://drive.google.com/file/d/1FOs6dy4mVqdfSKMjirRrvbNG-Jpfp0vt/view?usp=sharing


## ClawSwarm × NANDA Integration

Adapts ClawSwarm AI's epsilon-greedy multi-agent router to register as a discoverable agent on the MIT NANDA Index.

### What this does
- **NANDA Adapter Wrapper:** Wraps ClawSwarm's core epsilon-greedy task routing and processing logic in the `NANDA` adapter in one line.
- **Live Capability Reporting:** Each agent's Exponential Moving Average (EMA) skill score is reported live via AgentFacts.
- **External Discoverability:** Makes ClawSwarm's internal capability and specialty state externally discoverable on the NANDA internet-of-agents network.

### Why this matters for NANDA
ClawSwarm demonstrates a new pattern: agents that do not just exist on the network, but **honestly self-report their real-time capability scores**, enabling smarter, data-driven cross-framework routing decisions across the MIT NANDA Index.

### How to Run NANDA Integration

1. **Install the NANDA Adapter:**
   ```bash
   pip install nanda-adapter
   ```

2. **Set Environment Variables:**
   ```bash
   export ANTHROPIC_API_KEY="your-anthropic-api-key"
   export DOMAIN_NAME="your-registered-domain.com"
   ```

3. **Run the NANDA Adapter Agent:**
   ```bash
   python clawswarm_nanda.py
   ```

4. **Enroll:**
   Check the output logs (`out.log` or console) to grab your enrollment link. Open the link in a browser to register your ClawSwarm agent on the public NANDA index.


## Problem Statement

Knowledge workers and developers face increasingly complex tasks that require multiple cognitive steps (e.g., researching a topic, structuring a document, writing code, reviewing it, and synthesizing a final output). While single LLMs struggle with context limits and hallucination on complex tasks, multi-agent frameworks offer a solution. However, current industry standards (CrewAI, AutoGen, LangGraph) have a fatal flaw: **they require predefined roles at initialization.** 

Developers must manually guess how many "researchers" or "coders" they need before runtime. If a task requires heavy coding but the team was initialized with mostly writers, the system bottlenecks. Furthermore, if a critical agent fails, the rigid pipeline collapses.

## Current Solutions & Gaps

| Framework | Role Assignment | Dynamic Routing | Fault Tolerance | Role Emergence | Learning |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CrewAI** | Hardcoded at init | No (Sequential/Hierarchical) | Poor (Breaks pipeline) | No | None |
| **AutoGen** | Hardcoded at init | Conversational | Moderate | No | Minimal |
| **LangGraph** | Hardcoded nodes | Graph-based rigid routing | Good | No | None |
| **MetaGPT** | Hardcoded SOPs | Standard Operating Procedure | Poor | No | None |
| **ClawSwarm AI** | **Emergent (Runtime)** | **Epsilon-Greedy** | **High (Zero-Downtime)** | **Yes** | **EMA Skill Vector** |

**The Gap:** No existing framework allows agents to learn and specialize over time based on actual performance.

## Our Solution

ClawSwarm AI introduces the **Emergent Role Specialization** algorithm. 

Agents begin completely identical. When a user submits a task, the Orchestrator decomposes it into subtasks and classifies the required skills. The Epsilon-Greedy Router distributes these tasks: 80% of the time, it exploits known strengths, and 20% of the time, it explores by giving tasks to random agents to prevent premature role-locking. 

After each subtask, an impartial LLM judge scores the output. This score updates the agent's 6-dimensional skill vector using an Exponential Moving Average (EMA). Over time, as agents succeed or fail at certain tasks, their mathematical vectors diverge, and clear roles naturally emerge (e.g., "Specialist: Research" or "Generalist"). If the dynamically elected Leader fails, the Fault Detector instantly promotes the next best candidate and reassigns in-flight tasks in under 2 seconds.

### Key Features
- **Emergent Role Specialization:** Agents become specialists naturally through EMA updates.
- **Epsilon-Greedy Routing:** Balances exploiting current skills and exploring new potentials.
- **Zero-Downtime Fault Tolerance:** 2-second heartbeat checks ensure no task is ever lost.
- **Live Swarm Visualization:** Real-time React/D3.js dashboard showing the swarm's topology.

## Architecture

```text
User Task Input
      │
      ▼
┌─────────────────────────────────────────────┐
│              Orchestration Engine            │
│  ┌──────────────┐    ┌──────────────────┐   │
│  │Task Decomposer│───▶│ Task Classifier  │   │
│  └──────────────┘    └──────────────────┘   │
│           │                   │             │
│           ▼                   ▼             │
│  ┌─────────────────────────────────────┐    │
│  │      Epsilon-Greedy Router          │    │
│  │   80% exploit / 20% explore        │    │
│  └─────────────────────────────────────┘    │
│           │                                 │
└───────────┼─────────────────────────────────┘
            │
     ┌──────┴──────┐
     ▼             ▼
┌─────────┐   ┌─────────┐   ┌─────────┐
│ Agent-1 │   │ Agent-2 │   │ Agent-N │
│ sv[0.7] │   │ sv[0.6] │   │ sv[0.5] │
│Specialist│  │Emerging │   │Generalist│
└─────────┘   └─────────┘   └─────────┘
     │             │              │
     └──────┬──────┘              │
            ▼                    │
     ┌─────────────┐             │
     │  LLM Scorer │◀────────────┘
     │  (Judge)    │
     └─────────────┘
            │
            ▼
     Skill Vector EMA Update → Role Label Emergence
            │
            ▼
     Leader Election (every 10s) ←── Fault Detector (every 2s)
            │
            ▼
     WebSocket Broadcast → React Frontend
```

## Tech Stack
- **Backend:** Python, FastAPI, asyncio, Redis pub/sub
- **LLM Engine:** Anthropic Claude (claude-3-5-sonnet/haiku) with Groq (Llama 3) fallback
- **Frontend:** React, Vite, D3.js
- **Infrastructure:** Docker, Docker Compose
- **AI Integration:** Used for task decomposition, skill classification, execution, and objective LLM-as-judge scoring.

## AI Disclosure
Please see the [AI_DISCLOSURE.md](AI_DISCLOSURE.md) file for full details on our AI usage during the development and runtime of this application.

## Real-Life Use Cases
1. **Academic Research:** "Write a comprehensive report on quantum computing advances in 2024" — ClawSwarm decomposes into research, writing, critique, and synthesis subtasks routed to specialized agents.
2. **Software Development:** "Build me a REST API spec, implement it, and write tests" — Planning, coding, and critique agents organically emerge and collaborate.
3. **Market Analysis:** "Analyze our competitors and write a go-to-market strategy" — Research, synthesis, and writing specialists handle it in parallel.
4. **Education:** "Explain transformer architecture and write Python code demonstrating attention" — Research and coding specialists collaborate with a critique pass.

## Differentiation / MOAT
- **MOAT 1: Emergent Role Specialization** — No other framework lets roles emerge from performance; all require predefined roles at initialization. ClawSwarm improves with use, while competitors stay static.
- **MOAT 2: Zero-Downtime Fault Tolerance** — ClawSwarm is the only multi-agent LLM framework with built-in heartbeat monitoring, automatic task reassignment, and leaderless recovery in under 2 seconds.

## Setup Instructions

```bash
git clone https://github.com/YOUR_TEAM/clawswarm-ai
cd clawswarm-ai
cp .env.example .env
# Fill in your API keys in .env
docker compose up
```

- **Frontend UI:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **WebSocket:** ws://localhost:8000/ws

## Demo Task Suggestions
- "Research the pros and cons of microservices vs monoliths and write a recommendation."
- "Write a Python web scraper, add error handling, and document it."
- "Analyze the AI landscape in 2024 and produce an executive summary."
- "Design a database schema for a social media app and explain the tradeoffs."

## Resources
- **Video Demo:** [Link to Video Demo Placeholder]
- **Presentation Deck:** [Link to PPT Placeholder]

---
> "Every existing multi-agent LLM framework requires predefined roles at initialization. ClawSwarm AI is the first framework where agent roles emerge purely from competitive task performance, using a continuously updating skill vector and epsilon-greedy routing. Agents begin identical and differentiate themselves through results — not configuration."
