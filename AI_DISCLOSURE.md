# AI Disclosure Statement

## Models Used
- **Anthropic Claude (claude-3-5-sonnet-20241022 / claude-3-5-haiku-20241022)** as the primary agent LLM, orchestrator, and evaluator.
- **Groq (llama3-8b-8192)** as a fast, open-source fallback.

## APIs & Frameworks
- Anthropic Python SDK
- Groq SDK
- FastAPI, React, D3.js

## How AI is Used in the System
1. **Task Decomposition:** The Orchestrator LLM analyzes a complex user request and breaks it down into a dependency graph of 3-6 distinct subtasks.
2. **Task Classification:** A lightweight LLM call classifies each subtask into one of 6 canonical skill categories (Research, Coding, Writing, Critique, Planning, Synthesis).
3. **Task Execution:** Each autonomous agent calls the LLM to complete its assigned subtask. The prompt is dynamically constructed by injecting the agent's emergent specialization role and its short-term memory of previous tasks.
4. **LLM-as-Judge Scoring:** A separate, impartial LLM evaluates each agent's output based on accuracy, completeness, and formatting, returning a float score between 0.0 and 1.0. This score drives the skill vector updates.
5. **Synthesis:** A final LLM call combines all subtask outputs into a coherent, polished final answer.

## What was NOT AI-Generated
The core algorithmic innovations were designed manually by our engineering team:
- The **Emergent Role Specialization** algorithm.
- The **Epsilon-Greedy Routing** logic.
- The **Exponential Moving Average (EMA) skill vector update** formula.
- The **Dynamic Leader Election** and composite scoring system.
- The **Fault Detection** system (heartbeat loops and automatic state reassignment).
- The overall multi-agent state management architecture.

## AI Tools Used During Development
During the development process, AI tools such as Anthropic Claude and GitHub Copilot were used for code assistance, boilerplate generation, and syntax formatting, while the system architecture and mathematical algorithms were developed by the human team.
