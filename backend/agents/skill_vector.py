"""
skill_vector.py — Emergent Role Specialization core module.

Every agent owns a skill vector initialized to 0.5 across all 6 dimensions.
Scores are updated via Exponential Moving Average after every task.
Role labels emerge from score distributions — never assigned.
"""

import math
from typing import Dict, Tuple

# The 6 canonical skill dimensions of the swarm
SKILL_DIMENSIONS = ["research", "coding", "writing", "critique", "planning", "synthesis"]

# Role emergence thresholds
THRESHOLD_GENERALIST = 0.55
THRESHOLD_EMERGING = 0.70


def initial_vector() -> Dict[str, float]:
    """Return a fresh, perfectly neutral skill vector — all agents start identical."""
    return {skill: 0.5 for skill in SKILL_DIMENSIONS}


def update(
    skill_vector: Dict[str, float],
    skill_type: str,
    performance_score: float,
    alpha: float = 0.3,
) -> Dict[str, float]:
    """
    Exponential Moving Average update for a specific skill dimension.

    EMA formula: new = alpha * score + (1 - alpha) * old
    Failure scores should be 0.1 (not 0.0) so agents don't collapse from a
    single bad result. Success scores come from the LLM-as-judge (0.0–1.0).

    Args:
        skill_vector: Current agent skill vector dict.
        skill_type:   The skill dimension being updated (must be in SKILL_DIMENSIONS).
        performance_score: Float in [0.0, 1.0] from the LLM judge.
        alpha: Learning rate. Default 0.3.

    Returns:
        Updated skill vector (new dict, does not mutate the original).
    """
    if skill_type not in SKILL_DIMENSIONS:
        raise ValueError(f"Unknown skill type: {skill_type}. Must be one of {SKILL_DIMENSIONS}")

    # Clamp score to valid range
    performance_score = max(0.0, min(1.0, performance_score))

    updated = dict(skill_vector)  # shallow copy — don't mutate caller's dict
    old_score = updated[skill_type]
    updated[skill_type] = (alpha * performance_score) + ((1 - alpha) * old_score)
    # Round to 4 decimal places to avoid floating-point noise in JSON/WebSocket
    updated[skill_type] = round(updated[skill_type], 4)
    return updated


def get_top_skill(skill_vector: Dict[str, float]) -> Tuple[str, float]:
    """
    Return (skill_name, score) for the highest-scoring skill dimension.

    Args:
        skill_vector: Agent's current skill vector.

    Returns:
        Tuple of (skill_name: str, score: float).
    """
    top_skill = max(skill_vector, key=lambda k: skill_vector[k])
    return top_skill, round(skill_vector[top_skill], 4)


def get_role_label(skill_vector: Dict[str, float]) -> str:
    """
    Derive an emergent role label purely from the skill vector.

    Thresholds:
      < 0.55 → Generalist          (no clear specialization yet)
      < 0.70 → Emerging {skill}    (showing promise in a direction)
      ≥ 0.70 → Specialist: {skill} (strongly specialized)

    Roles are NEVER assigned. They EMERGE from competition.
    """
    top_skill, top_score = get_top_skill(skill_vector)

    if top_score < THRESHOLD_GENERALIST:
        return "Generalist"
    elif top_score < THRESHOLD_EMERGING:
        return f"Emerging {top_skill.capitalize()}"
    else:
        return f"Specialist: {top_skill.capitalize()}"


def get_specialization_strength(skill_vector: Dict[str, float]) -> float:
    """
    Quantify how specialized an agent is — from pure generalist to pure specialist.

    Metric: Standard deviation of all skill values, normalized to [0, 1].
    - STD=0   → perfectly uniform (pure generalist, score = 0.0)
    - STD=max → maximally polarized (score approaches 1.0)

    Max possible std for N values each in [0,1]:
    Achieved when half are 0 and half are 1 → std = 0.5.
    We normalize by 0.5 to get a [0, 1] range.

    Args:
        skill_vector: Agent's current skill vector.

    Returns:
        Float in [0.0, 1.0] where 0 = generalist, 1 = maximum specialist.
    """
    values = list(skill_vector.values())
    n = len(values)
    if n == 0:
        return 0.0
    mean = sum(values) / n
    variance = sum((v - mean) ** 2 for v in values) / n
    std = math.sqrt(variance)
    # Normalize: max std for [0,1] values is 0.5
    normalized = min(1.0, std / 0.5)
    return round(normalized, 4)


def get_best_agent_for_skill(
    agents_skill_vectors: Dict[str, Dict[str, float]],
    skill_type: str,
) -> str:
    """
    Given a mapping of {agent_id: skill_vector}, return the agent_id with the
    highest score in the requested skill_type.

    Args:
        agents_skill_vectors: Dict mapping agent_id → skill_vector.
        skill_type: The required skill dimension.

    Returns:
        agent_id string of the best-matching agent.
    """
    if not agents_skill_vectors:
        raise ValueError("No agents provided for skill matching.")
    
    # Calculate scores for all agents
    scores = {aid: vec.get(skill_type, 0.0) for aid, vec in agents_skill_vectors.items()}
    max_score = max(scores.values())
    
    # Find all agents that share the highest score (important for tie-breaking at startup)
    best_agents = [aid for aid, score in scores.items() if score == max_score]
    
    # Return one at random from the best candidates
    import random
    return random.choice(best_agents)


def composite_score(
    skill_vector: Dict[str, float],
    task_history_frequency: Dict[str, int] | None = None,
) -> float:
    """
    Weighted composite score for leader election.

    If task_history_frequency is provided, skills that have been exercised more
    contribute more to the composite score (recency-weighted expertise).
    If no history, equal weights are used.

    Args:
        skill_vector: Agent's skill vector.
        task_history_frequency: Optional dict of {skill_type: count} for weighting.

    Returns:
        Float composite score in [0.0, 1.0].
    """
    if not task_history_frequency:
        # Equal weights — simple average
        return round(sum(skill_vector.values()) / len(skill_vector), 4)

    total_tasks = sum(task_history_frequency.values())
    if total_tasks == 0:
        return round(sum(skill_vector.values()) / len(skill_vector), 4)

    weighted_sum = 0.0
    for skill, score in skill_vector.items():
        weight = task_history_frequency.get(skill, 0) / total_tasks
        weighted_sum += weight * score

    # Blend 50% weighted, 50% simple average to avoid over-penalizing new skills
    simple_avg = sum(skill_vector.values()) / len(skill_vector)
    blended = 0.5 * weighted_sum + 0.5 * simple_avg
    return round(blended, 4)


def skill_vector_to_list(skill_vector: Dict[str, float]) -> list:
    """
    Return skill values in canonical SKILL_DIMENSIONS order (for radar charts).
    Ensures consistent ordering regardless of dict insertion order.
    """
    return [round(skill_vector.get(skill, 0.5), 4) for skill in SKILL_DIMENSIONS]


def describe_vector(skill_vector: Dict[str, float]) -> str:
    """Human-readable one-line summary of a skill vector (used in agent prompts)."""
    parts = [f"{skill}={round(score, 2)}" for skill, score in skill_vector.items()]
    role = get_role_label(skill_vector)
    return f"[{role}] {', '.join(parts)}"
