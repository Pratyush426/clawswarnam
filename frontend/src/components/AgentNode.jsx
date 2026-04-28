import React from 'react';

const SKILLS = ["research", "coding", "writing", "critique", "planning", "synthesis"];

export default function AgentNode({ agent, isLeader, x, y }) {
  const size = 60 + (agent.composite_score * 40); // Size scales with score
  const radius = size / 2;
  
  // Calculate radar chart points
  const getPoints = () => {
    return SKILLS.map((skill, i) => {
      const value = agent.skill_vector[skill] || 0.5;
      const angle = (Math.PI * 2 * i) / SKILLS.length - Math.PI / 2;
      // Map 0-1 score to radius
      const r = value * radius;
      return `${Math.cos(angle) * r},${Math.sin(angle) * r}`;
    }).join(' ');
  };

  // Base hex points for background
  const getBaseHex = () => {
    return SKILLS.map((_, i) => {
      const angle = (Math.PI * 2 * i) / SKILLS.length - Math.PI / 2;
      return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`;
    }).join(' ');
  };

  // Color mapping based on specialization
  const getAgentColor = () => {
    if (!agent.is_alive) return '#ef4444'; // Red for failed
    if (isLeader) return '#ffbf00'; // Gold for leader
    
    // Interpolate gray to bright white/cyan based on strength
    const strength = agent.specialization_strength;
    if (strength < 0.2) return '#94a3b8'; // Generalist gray
    if (strength < 0.6) return '#3b82f6'; // Emerging blue
    return '#00e5ff'; // Specialist cyan
  };

  const color = getAgentColor();

  return (
    <g transform={`translate(${x || 0}, ${y || 0})`} style={{ transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      {/* Leader Glow */}
      {isLeader && (
        <circle 
          r={radius + 10} 
          fill="none" 
          stroke={color} 
          strokeWidth="2"
          className="leader-pulse"
        >
          <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
          <animate attributeName="r" values={`${radius + 5};${radius + 15};${radius + 5}`} dur="2s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Background Hex */}
      <polygon 
        points={getBaseHex()} 
        fill="rgba(255,255,255,0.05)" 
        stroke="rgba(255,255,255,0.1)" 
        strokeWidth="1"
      />

      {/* Radar Chart Polygon */}
      <polygon 
        points={getPoints()} 
        fill={color} 
        fillOpacity="0.3"
        stroke={color} 
        strokeWidth="2"
        style={{ transition: 'all 0.5s ease-in-out' }}
      />

      {/* Node Center Dot */}
      <circle r="3" fill="#fff" />

      {/* Labels */}
      <text 
        y={radius + 15} 
        textAnchor="middle" 
        fill="#fff" 
        style={{ fontFamily: 'Orbitron', fontSize: '10px', fontWeight: 'bold' }}
      >
        {agent.agent_id}
      </text>
      
      <text 
        y={radius + 28} 
        textAnchor="middle" 
        fill={color} 
        style={{ fontSize: '9px', opacity: 0.8 }}
      >
        {agent.role_label}
      </text>
      
      <text 
        y={radius + 40} 
        textAnchor="middle" 
        fill="#94a3b8" 
        style={{ fontSize: '8px' }}
      >
        Score: {agent.composite_score.toFixed(2)}
      </text>

      {/* Busy indicator */}
      {agent.current_task && (
        <circle r="4" cx={radius} cy={-radius} fill="#10b981">
          <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
        </circle>
      )}
    </g>
  );
}
