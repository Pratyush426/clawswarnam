"""
Mock LLM responses for testing without real API keys.
Set MOCK_LLM=true in environment to use these mocks.
"""

import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# Mock decomposition responses for different task types
MOCK_DECOMPOSITIONS = {
    "default": [
        {
            "subtask_id": "sub-1",
            "description": "Research and gather information",
            "skill_type": "research",
            "priority": 1,
            "depends_on": []
        },
        {
            "subtask_id": "sub-2",
            "description": "Develop solution approach",
            "skill_type": "planning",
            "priority": 2,
            "depends_on": ["sub-1"]
        },
        {
            "subtask_id": "sub-3",
            "description": "Implement or write content",
            "skill_type": "coding" if "code" in "test" else "writing",
            "priority": 3,
            "depends_on": ["sub-2"]
        },
        {
            "subtask_id": "sub-4",
            "description": "Review and critique work",
            "skill_type": "critique",
            "priority": 4,
            "depends_on": ["sub-3"]
        },
        {
            "subtask_id": "sub-5",
            "description": "Synthesize final output",
            "skill_type": "synthesis",
            "priority": 5,
            "depends_on": ["sub-1", "sub-2", "sub-3", "sub-4"]
        }
    ]
}

MOCK_COMPLETIONS = {
    "research": "Comprehensive research completed. Key findings: Multiple sources reviewed, primary and secondary sources analyzed, data validated. Total findings: 5 major points with supporting evidence. Confidence level: 95%.",
    "coding": """def solution():
    \"\"\"Implementation of the requested functionality\"\"\"
    # Algorithm explanation
    # Step 1: Input validation
    # Step 2: Process data
    # Step 3: Return result
    pass

# Test suite
assert solution() is not None
print("✓ All tests passed")""",
    "writing": "Executive Summary: This document provides a comprehensive analysis of the requested topic. Key sections include overview, detailed analysis, recommendations, and conclusion. The content is well-structured, evidence-based, and actionable.",
    "planning": "Strategic Plan Developed: 1) Define objectives and scope, 2) Identify resources and constraints, 3) Create timeline and milestones, 4) Risk assessment and mitigation, 5) Success metrics. Estimated duration: 2-4 weeks.",
    "critique": "Quality Review Complete: Strengths identified: clarity, completeness, accuracy, relevance. Areas for improvement: expand examples, add edge case handling, improve documentation. Overall score: 8.5/10. Recommendations: address the identified gaps, ensure consistency throughout.",
    "synthesis": "Final synthesis complete. All subtasks integrated successfully. Output quality: high. Deliverable is production-ready. Summary: comprehensive, well-researched, thoroughly tested solution provided with full documentation."
}

MOCK_SCORES = {
    "excellent": 9.5,
    "good": 8.0,
    "acceptable": 6.5,
    "poor": 4.0
}


async def mock_decompose(user_task: str) -> List[Dict[str, Any]]:
    """
    Mock task decomposition - returns predefined subtasks.
    """
    logger.info(f"[MOCK] Decomposing task: {user_task[:50]}...")
    
    # Try to detect task type for better matching
    decomp = MOCK_DECOMPOSITIONS.get("default", MOCK_DECOMPOSITIONS["default"])
    
    logger.info(f"[MOCK] Generated {len(decomp)} subtasks")
    return decomp


async def mock_execute_subtask(skill_type: str, description: str) -> str:
    """
    Mock subtask execution - returns predefined output for each skill type.
    """
    logger.info(f"[MOCK] Executing {skill_type} subtask: {description[:40]}...")
    
    result = MOCK_COMPLETIONS.get(skill_type, MOCK_COMPLETIONS["synthesis"])
    logger.info(f"[MOCK] Subtask completed: {skill_type}")
    
    return result


async def mock_score_output(output: str, skill_type: str) -> float:
    """
    Mock output scoring - returns a random score.
    """
    import random
    scores = [MOCK_SCORES["excellent"], MOCK_SCORES["good"], MOCK_SCORES["acceptable"]]
    score = random.choice(scores)
    
    logger.info(f"[MOCK] Scored {skill_type} output: {score}/10")
    return score


async def mock_final_synthesis(subtask_results: Dict[str, str]) -> str:
    """
    Mock final synthesis of all subtask results.
    """
    num_tasks = len(subtask_results)
    logger.info(f"[MOCK] Synthesizing {num_tasks} subtask results...")
    
    synthesis = f"""
## Final Synthesis

Successfully completed {num_tasks} subtasks.

### Integrated Results:
"""
    for i, (subtask_id, result) in enumerate(subtask_results.items(), 1):
        synthesis += f"\n#### {subtask_id}:\n{result[:200]}...\n"
    
    synthesis += """
### Conclusion:
All components have been integrated into a cohesive solution. The deliverable is comprehensive, 
well-tested, and ready for deployment. Quality metrics indicate excellent performance across all dimensions.
"""
    
    return synthesis
