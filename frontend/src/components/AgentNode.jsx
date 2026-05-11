import React, { useEffect, useRef, useState } from 'react';

const SKILLS = ['research', 'coding', 'writing', 'critique', 'planning', 'synthesis'];

const SKILL_COLORS = {
  research:  '#00e5ff',
  coding:    '#f59e0b',
  writing:   '#10b981',
  critique:  '#ef4444',
  planning:  '#8b5cf6',
  synthesis: '#d946ef',
};

export default function AgentNode({ agent, isLeader, x, y, isActive }) {
  const [flash, setFlash] = useState(false);
  const prevScore = useRef(agent.composite_score);

  // Flash ring when composite_score changes (EMA update happened)
  useEffect(() => {
    if (Math.abs(agent.composite_score - prevScore.current) > 0.005) {
      prevScore.current = agent.composite_score;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 800);
      return () => clearTimeout(t);
    }
  }, [agent.composite_score]);

  const size = 56 + agent.composite_score * 26;
  const radius = size / 2;

  // Skill radar points
  const getPoints = () =>
    SKILLS.map((skill, i) => {
      const value = agent.skill_vector[skill] || 0.5;
      const angle = (Math.PI * 2 * i) / SKILLS.length - Math.PI / 2;
      const r = value * radius;
      return `${Math.cos(angle) * r},${Math.sin(angle) * r}`;
    }).join(' ');

  // Base hex
  const getBaseHex = (scale = 1) =>
    SKILLS.map((_, i) => {
      const angle = (Math.PI * 2 * i) / SKILLS.length - Math.PI / 2;
      return `${Math.cos(angle) * radius * scale},${Math.sin(angle) * radius * scale}`;
    }).join(' ');

  // Dominant skill color
  const topSkill = Object.entries(agent.skill_vector)
    .reduce((a, b) => b[1] > a[1] ? b : a, ['research', 0.5]);
  const topSkillColor = SKILL_COLORS[topSkill[0]] || '#94a3b8';

  const getAgentColor = () => {
    if (!agent.is_alive) return '#ef4444';
    if (isLeader) return '#ffbf00';
    const strength = agent.specialization_strength;
    if (strength < 0.20) return '#94a3b8';
    if (strength < 0.60) return '#3b82f6';
    return topSkillColor;
  };

  const color = getAgentColor();
  const isDead = !agent.is_alive;

  return (
    <g
      transform={`translate(${x || 0}, ${y || 0})`}
      style={{ transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}
      opacity={isDead ? 0.40 : 1}
    >
      {/* ── Outer orbit ring (leader only) ── */}
      {isLeader && (
        <>
          <circle
            r={radius + 22}
            fill="none"
            stroke="rgba(255,191,0,0.25)"
            strokeWidth="1"
            strokeDasharray="3 6"
          >
            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="12s" repeatCount="indefinite" />
          </circle>
          <circle
            r={radius + 16}
            fill="none"
            stroke="rgba(255,191,0,0.15)"
            strokeWidth="0.5"
          >
            <animate attributeName="opacity" values="0.6;0.15;0.6" dur="3s" repeatCount="indefinite" />
          </circle>
        </>
      )}

      {/* ── Active routing pulse ring ── */}
      {isActive && (
        <circle r={radius + 12} fill="none" stroke={color} strokeWidth="2" opacity="0">
          <animate attributeName="r" values={`${radius + 8};${radius + 28};${radius + 8}`} dur="1.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0;0.9" dur="1.2s" repeatCount="indefinite" />
        </circle>
      )}

      {/* ── EMA update flash ── */}
      {flash && (
        <circle r={radius + 6} fill="none" stroke={topSkillColor} strokeWidth="3" opacity="0">
          <animate attributeName="r" values={`${radius};${radius + 20}`} dur="0.7s" fill="freeze" />
          <animate attributeName="opacity" values="0.9;0" dur="0.7s" fill="freeze" />
        </circle>
      )}

      {/* ── Ambient glow behind node ── */}
      <circle
        r={radius + 8}
        fill={color}
        opacity={isDead ? 0 : (isLeader ? 0.08 : 0.05)}
        style={{ filter: `blur(${radius * 0.6}px)` }}
      />

      {/* ── Base hex grid ── */}
      {[0.35, 0.65, 1.0].map((scale, i) => (
        <polygon
          key={scale}
          points={getBaseHex(scale)}
          fill="none"
          stroke={color}
          strokeWidth={i === 2 ? 0.8 : 0.4}
          opacity={isDead ? 0.1 : (i === 2 ? 0.18 : 0.08)}
        />
      ))}

      {/* ── Radar chart fill ── */}
      <polygon
        points={getPoints()}
        fill={color}
        fillOpacity={isDead ? 0.05 : 0.18}
        stroke={color}
        strokeWidth={1.5}
        strokeOpacity={isDead ? 0.2 : 0.70}
        style={{ transition: 'all 0.7s cubic-bezier(0.4,0,0.2,1)' }}
      />

      {/* ── Skill dot markers at each vertex ── */}
      {SKILLS.map((skill, i) => {
        const val = agent.skill_vector[skill] || 0.5;
        const angle = (Math.PI * 2 * i) / SKILLS.length - Math.PI / 2;
        const r = val * radius;
        const cx = Math.cos(angle) * r;
        const cy = Math.sin(angle) * r;
        const dotColor = SKILL_COLORS[skill];
        return (
          <circle
            key={skill}
            cx={cx} cy={cy}
            r={val > 0.68 ? 3 : 1.5}
            fill={dotColor}
            opacity={isDead ? 0.1 : (val > 0.55 ? 0.90 : 0.35)}
            style={{ filter: val > 0.68 ? `drop-shadow(0 0 3px ${dotColor})` : 'none' }}
          />
        );
      })}

      {/* ── Center core ── */}
      <circle
        r={isLeader ? 5 : 3.5}
        fill={color}
        style={{ filter: `drop-shadow(0 0 ${isLeader ? 8 : 4}px ${color})` }}
      >
        {isLeader && (
          <animate attributeName="r" values="4;6;4" dur="2.5s" repeatCount="indefinite" />
        )}
      </circle>

      {/* ── Agent ID label ── */}
      <text
        y={radius + 16}
        textAnchor="middle"
        fill={isLeader ? '#ffbf00' : 'rgba(226,232,240,0.90)'}
        style={{
          fontFamily: 'Orbitron',
          fontSize: isLeader ? '11px' : '10px',
          fontWeight: isLeader ? 700 : 500,
          letterSpacing: '0.05em',
        }}
      >
        {agent.agent_id}
      </text>

      {/* ── Role label ── */}
      <text
        y={radius + 28}
        textAnchor="middle"
        fill={color}
        style={{ fontSize: '8.5px', opacity: isDead ? 0.4 : 0.85, fontFamily: 'Inter, sans-serif' }}
      >
        {agent.role_label}
      </text>

      {/* ── Score ── */}
      <text
        y={radius + 40}
        textAnchor="middle"
        fill="rgba(148,163,184,0.70)"
        style={{ fontSize: '7.5px', fontFamily: 'Space Mono' }}
      >
        {agent.composite_score.toFixed(3)}
      </text>

      {/* ── Busy indicator ── */}
      {agent.current_task && !isDead && (
        <circle r={3.5} cx={radius - 2} cy={-radius + 2} fill="#10b981">
          <animate attributeName="opacity" values="1;0.2;1" dur="0.9s" repeatCount="indefinite" />
          <animate attributeName="r" values="3;5;3" dur="0.9s" repeatCount="indefinite" />
        </circle>
      )}

      {/* ── Dead skull indicator ── */}
      {isDead && (
        <text y={4} textAnchor="middle" style={{ fontSize: '14px' }}>💀</text>
      )}
    </g>
  );
}
