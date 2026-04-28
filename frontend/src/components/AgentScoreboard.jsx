import React from 'react';

export default function AgentScoreboard({ swarmState }) {
  if (!swarmState || !swarmState.agents.length) {
    return <div style={{ color: '#94a3b8' }}>Awaiting agents...</div>;
  }

  // Sort: Alive first, then by composite score descending
  const sortedAgents = [...swarmState.agents].sort((a, b) => {
    if (a.is_alive !== b.is_alive) return a.is_alive ? -1 : 1;
    return b.composite_score - a.composite_score;
  });

  const getTopSkill = (vector) => {
    let top = "";
    let max = -1;
    for (const [k, v] of Object.entries(vector)) {
      if (v > max) { max = v; top = k; }
    }
    return top;
  };

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>Rnk</th>
            <th style={{ padding: '10px' }}>Agent ID</th>
            <th style={{ padding: '10px' }}>Role Label</th>
            <th style={{ padding: '10px' }}>Score</th>
            <th style={{ padding: '10px' }}>Top Skill</th>
            <th style={{ padding: '10px' }}>Tasks</th>
            <th style={{ padding: '10px' }}>Success</th>
          </tr>
        </thead>
        <tbody>
          {sortedAgents.map((agent, i) => {
            const isLeader = agent.agent_id === swarmState.leader_id;
            const isDead = !agent.is_alive;
            
            const totalTasks = agent.metrics.tasks_completed + agent.metrics.tasks_failed;
            const successRate = totalTasks > 0 
              ? Math.round((agent.metrics.tasks_completed / totalTasks) * 100) + '%' 
              : 'N/A';

            return (
              <tr 
                key={agent.agent_id}
                style={{ 
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  backgroundColor: isLeader ? 'rgba(255, 191, 0, 0.1)' : 'transparent',
                  color: isDead ? '#ef4444' : (isLeader ? '#ffbf00' : '#e2e8f0'),
                  textDecoration: isDead ? 'line-through' : 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                <td style={{ padding: '10px', color: '#64748b' }}>#{i + 1}</td>
                <td style={{ padding: '10px', fontWeight: isLeader ? 'bold' : 'normal' }}>
                  {agent.agent_id} {isLeader && '👑'} {isDead && '💀'}
                </td>
                <td style={{ padding: '10px' }}>{agent.role_label}</td>
                <td style={{ padding: '10px', fontFamily: 'Space Mono', fontWeight: 'bold' }}>
                  {agent.composite_score.toFixed(3)}
                </td>
                <td style={{ padding: '10px', textTransform: 'capitalize' }}>
                  {getTopSkill(agent.skill_vector)}
                </td>
                <td style={{ padding: '10px' }}>{totalTasks}</td>
                <td style={{ padding: '10px' }}>{successRate}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
