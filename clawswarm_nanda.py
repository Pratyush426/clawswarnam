from nanda_adapter import NANDA
import os
import random

# ── your existing ClawSwarm logic ──────────────────────────────
agents = {
    "router":    {"skill": 0.9, "tasks": 0},
    "extractor": {"skill": 0.7, "tasks": 0},
    "summarizer":{"skill": 0.8, "tasks": 0},
}

def pick_agent(agents: dict, epsilon=0.1) -> str:
    """Epsilon-greedy selection using EMA skill scores."""
    if random.random() < epsilon:
        return random.choice(list(agents.keys()))   # explore
    return max(agents, key=lambda a: agents[a]["skill"])  # exploit

def update_ema(agent: str, reward: float, alpha=0.1):
    """Update EMA skill score after task completion."""
    agents[agent]["skill"] = (
        alpha * reward + (1 - alpha) * agents[agent]["skill"]
    )

def run_clawswarm(message: str) -> str:
    """Core ClawSwarm task: route → process → update skill."""
    chosen = pick_agent(agents)
    agents[chosen]["tasks"] += 1

    # Simulate task processing (replace with your real agent logic)
    result = f"[{chosen.upper()}] processed: {message}"

    # Reward = 1.0 if message was short (fast task), else 0.6
    reward = 1.0 if len(message) < 100 else 0.6
    update_ema(chosen, reward)

    skill_report = {a: round(agents[a]["skill"], 3) for a in agents}
    return f"{result} | skill_scores={skill_report}"

# ── NANDA wrapper ──────────────────────────────────────────────
def main():
    nanda = NANDA(run_clawswarm)   # wrap your logic in one line

    nanda.start_server_api(
        os.getenv("ANTHROPIC_API_KEY"),
        os.getenv("DOMAIN_NAME")
    )

if __name__ == "__main__":
    main()