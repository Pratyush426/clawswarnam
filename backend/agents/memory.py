"""
memory.py — Agent short-term memory module.

Each agent keeps a sliding window of the last N (task, output) pairs.
This memory is injected into agent prompts to provide continuity and
let agents build on their own previous work — a lightweight form of
episodic memory without a vector database.
"""

from __future__ import annotations

import time
from collections import deque
from typing import Any, Dict, List, Optional


class AgentMemory:
    """
    Bounded circular buffer for an agent's recent task exchanges.

    Stores up to `max_size` entries. When full, the oldest entry is
    automatically dropped. Thread-safe for async use via asyncio (single-
    threaded event loop), but NOT safe for multi-threaded access.
    """

    def __init__(self, max_size: int = 10):
        """
        Args:
            max_size: Maximum number of exchanges to retain. Default 10.
        """
        self.max_size = max_size
        self._entries: deque[Dict[str, Any]] = deque(maxlen=max_size)

    def add_exchange(
        self,
        task_description: str,
        output: str,
        skill_type: str,
        performance_score: Optional[float] = None,
        task_id: Optional[str] = None,
    ) -> None:
        """
        Record a completed task exchange in memory.

        Args:
            task_description: The subtask description that was given.
            output:           The agent's response/output.
            skill_type:       Skill category the task was classified under.
            performance_score: Optional judge score (0.0–1.0).
            task_id:          Optional UUID of the subtask for traceability.
        """
        entry = {
            "task_id": task_id,
            "task": task_description,
            "output": output,
            "skill_type": skill_type,
            "performance_score": performance_score,
            "timestamp": time.time(),
        }
        self._entries.append(entry)

    def get_recent(self, n: int = 5) -> List[Dict[str, Any]]:
        """
        Retrieve the most recent n exchanges (oldest first for prompt order).

        Args:
            n: Number of recent entries to retrieve. Clamped to max_size.

        Returns:
            List of exchange dicts, chronological order.
        """
        n = min(n, self.max_size)
        entries = list(self._entries)
        return entries[-n:] if len(entries) >= n else entries

    def format_for_prompt(self, n: int = 3) -> str:
        """
        Format the last n exchanges into a compact string for LLM prompt injection.

        Returns a string like:
            [Memory]
            Task: "Explain quantum entanglement" → Skill: research | Score: 0.82
            Output: "Quantum entanglement is a phenomenon where..."
            ---
            Task: "Write a summary paragraph" → Skill: writing | Score: 0.75
            Output: "The following summary covers..."

        Args:
            n: Number of recent exchanges to include.

        Returns:
            Formatted string ready for LLM context injection.
        """
        recent = self.get_recent(n)
        if not recent:
            return "[Memory: No previous tasks]"

        lines = ["[Memory — recent work context]"]
        for entry in recent:
            score_str = f" | Score: {entry['performance_score']:.2f}" if entry["performance_score"] is not None else ""
            lines.append(f"Task: \"{entry['task'][:100]}\" → Skill: {entry['skill_type']}{score_str}")
            # Truncate output to avoid bloating context
            truncated_output = entry["output"][:300] + ("..." if len(entry["output"]) > 300 else "")
            lines.append(f"Output: {truncated_output}")
            lines.append("---")
        return "\n".join(lines)

    def get_task_frequency(self) -> Dict[str, int]:
        """
        Count how many times each skill type has been exercised in memory.
        Used by composite_score to weight skill importance.

        Returns:
            Dict mapping skill_type → count.
        """
        frequency: Dict[str, int] = {}
        for entry in self._entries:
            skill = entry.get("skill_type", "unknown")
            frequency[skill] = frequency.get(skill, 0) + 1
        return frequency

    def clear(self) -> None:
        """Wipe all memory entries (used on agent respawn)."""
        self._entries.clear()

    @property
    def size(self) -> int:
        """Number of entries currently in memory."""
        return len(self._entries)

    @property
    def is_empty(self) -> bool:
        """True if memory contains no entries."""
        return len(self._entries) == 0

    def to_dict(self) -> Dict[str, Any]:
        """Serialize memory state for WebSocket broadcast / debugging."""
        return {
            "max_size": self.max_size,
            "current_size": self.size,
            "entries": [
                {
                    "task_id": e.get("task_id"),
                    "task": e["task"][:80] + ("..." if len(e["task"]) > 80 else ""),
                    "skill_type": e["skill_type"],
                    "performance_score": e.get("performance_score"),
                    "timestamp": e["timestamp"],
                }
                for e in self._entries
            ],
        }
