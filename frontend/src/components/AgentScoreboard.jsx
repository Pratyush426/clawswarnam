import React, { useState } from 'react';
import { Crown, Skull, Cpu } from 'lucide-react';

const SKILLS = ['research', 'coding', 'writing', 'critique', 'planning', 'synthesis'];

const SKILL_COLORS = {
  research:  '#00e5ff',
  coding:    '#f59e0b',
  writing:   '#10b981',
  critique:  '#ef4444',
  planning:  '#8b5cf6',
  synthesis: '#d946ef',
};

const SKILL_ICONS = {
  research:  '🔬',
  coding:    '⚙️',
  writing:   '✍️',
  critique:  '🎯',
  planning:  '🗺️',
  synthesis: '🔮',
};

/* ── Hex Skill Radar (SVG inline) ─────────────────────────────── */
function MiniRadar({ skillVector, color, size = 60 }) {
  const r = size / 2;
  const center = size / 2;

  const pts = SKILLS.map((skill, i) => {
    const val = skillVector[skill] || 0.5;
    const angle = (Math.PI * 2 * i) / SKILLS.length - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * val * r,
      y: center + Math.sin(angle) * val * r,
      raw: Math.cos(angle) * r,
      raws: Math.sin(angle) * r,
    };
  });

  const hexPts = SKILLS.map((_, i) => {
    const angle = (Math.PI * 2 * i) / SKILLS.length - Math.PI / 2;
    return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
  }).join(' ');

  const skillPts = pts.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      {/* Grid rings */}
      {[0.35, 0.65, 1.0].map(scale => (
        <polygon
          key={scale}
          points={SKILLS.map((_, i) => {
            const angle = (Math.PI * 2 * i) / SKILLS.length - Math.PI / 2;
            return `${center + Math.cos(angle) * r * scale},${center + Math.sin(angle) * r * scale}`;
          }).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={0.5}
          opacity={0.18}
        />
      ))}
      {/* Skill shape */}
      <polygon
        points={skillPts}
        fill={color}
        fillOpacity={0.20}
        stroke={color}
        strokeWidth={1.5}
        strokeOpacity={0.80}
      />
      {/* Skill dots */}
      {pts.map((p, i) => {
        const val = skillVector[SKILLS[i]] || 0.5;
        const dotColor = SKILL_COLORS[SKILLS[i]];
        return (
          <circle
            key={i}
            cx={p.x} cy={p.y}
            r={val > 0.68 ? 2.5 : 1.5}
            fill={dotColor}
            opacity={val > 0.60 ? 1 : 0.4}
          />
        );
      })}
      {/* Center */}
      <circle cx={center} cy={center} r={2.5} fill={color} opacity={0.7} />
    </svg>
  );
}

/* ── Individual agent card ────────────────────────────────────── */
function AgentCard({ agent, rank, isLeader }) {
  const [expanded, setExpanded] = useState(false);
  const isDead = !agent.is_alive;

  const topSkillEntry = Object.entries(agent.skill_vector)
    .reduce((a, b) => b[1] > a[1] ? b : a, ['research', 0.5]);
  const topSkill = topSkillEntry[0];
  const topSkillVal = topSkillEntry[1];
  const skillColor = SKILL_COLORS[topSkill] || '#94a3b8';

  const nodeColor = isDead ? '#ef4444' : isLeader ? '#ffbf00' : skillColor;

  const totalTasks = agent.metrics.tasks_completed + agent.metrics.tasks_failed;
  const successRate = totalTasks > 0 ? (agent.metrics.tasks_completed / totalTasks) : 0;

  return (
    <div
      onClick={() => !isDead && setExpanded(v => !v)}
      style={{
        background: `radial-gradient(600px 120px at 0% 0%, ${nodeColor}12, transparent 60%), rgba(5,10,22,0.80)`,
        border: `1px solid ${isDead ? 'rgba(239,68,68,0.20)' : isLeader ? 'rgba(255,191,0,0.28)' : `${nodeColor}28`}`,
        borderRadius: 14,
        padding: '14px 16px',
        cursor: isDead ? 'default' : 'pointer',
        transition: 'border-color 180ms ease, background 180ms ease, box-shadow 180ms ease',
        boxShadow: isLeader ? `0 0 24px rgba(255,191,0,0.10)` : 'none',
        opacity: isDead ? 0.55 : 1,
        marginBottom: 8,
      }}
      className="hoverGlass"
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Rank */}
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: `${nodeColor}18`,
          border: `1px solid ${nodeColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Orbitron', fontSize: '0.72rem', color: nodeColor, fontWeight: 700,
        }}>
          {isDead ? <Skull size={12} color="#ef4444" /> : isLeader ? <Crown size={12} color="#ffbf00" /> : rank}
        </div>

        {/* Mini radar */}
        <MiniRadar skillVector={agent.skill_vector} color={nodeColor} size={48} />

        {/* Identity */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontFamily: 'Orbitron', fontSize: '0.78rem',
              color: isLeader ? '#ffbf00' : 'rgba(226,232,240,0.95)',
              fontWeight: isLeader ? 700 : 500,
            }}>
              {agent.agent_id}
            </span>
            {isLeader && (
              <span style={{
                fontSize: '0.65rem', fontFamily: 'Orbitron',
                background: 'rgba(255,191,0,0.12)', border: '1px solid rgba(255,191,0,0.28)',
                color: '#fde68a', padding: '1px 6px', borderRadius: 999,
              }}>
                LEADER
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{
              fontSize: '0.70rem', color: nodeColor,
              background: `${nodeColor}15`, border: `1px solid ${nodeColor}28`,
              padding: '1px 7px', borderRadius: 999,
            }}>
              {agent.role_label}
            </span>
          </div>
        </div>

        {/* Score */}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: 'Orbitron', fontSize: '1.05rem',
            color: nodeColor, fontWeight: 700,
            textShadow: `0 0 14px ${nodeColor}60`,
          }}>
            {agent.composite_score.toFixed(3)}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontFamily: 'Space Mono', marginTop: 2 }}>
            {totalTasks} tasks
          </div>
        </div>
      </div>

      {/* Success rate bar */}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${successRate * 100}%`,
            background: `linear-gradient(90deg, ${nodeColor}CC, ${nodeColor}88)`,
            borderRadius: 2,
            transition: 'width 600ms ease',
            boxShadow: `0 0 6px ${nodeColor}60`,
          }} />
        </div>
        <span style={{ fontSize: '0.68rem', fontFamily: 'Space Mono', color: 'var(--muted)', flexShrink: 0 }}>
          {totalTasks > 0 ? `${Math.round(successRate * 100)}% ok` : 'N/A'}
        </span>
      </div>

      {/* Expanded: full skill breakdown */}
      {expanded && !isDead && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)', animation: 'fadeSlideIn 0.25s ease' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {SKILLS.map(skill => {
              const val = agent.skill_vector[skill] || 0.5;
              const sc = SKILL_COLORS[skill];
              return (
                <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.65rem', width: 58, flexShrink: 0, color: val > 0.65 ? sc : 'var(--muted)', fontFamily: 'Space Mono', textTransform: 'capitalize' }}>
                    {SKILL_ICONS[skill]} {skill.slice(0, 5)}
                  </span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${val * 100}%`,
                      background: sc,
                      borderRadius: 3,
                      transition: 'width 400ms ease',
                      boxShadow: val > 0.65 ? `0 0 6px ${sc}` : 'none',
                    }} />
                  </div>
                  <span style={{ width: 34, textAlign: 'right', fontSize: '0.65rem', fontFamily: 'Space Mono', color: val > 0.65 ? sc : 'var(--muted)' }}>
                    {val.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Scoreboard ──────────────────────────────────────────── */
export default function AgentScoreboard({ swarmState }) {
  if (!swarmState || !swarmState.agents.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: 'var(--muted)' }}>
        <Cpu size={32} opacity={0.35} />
        <span style={{ fontSize: '0.85rem' }}>Awaiting agents to initialize...</span>
      </div>
    );
  }

  const sorted = [...swarmState.agents].sort((a, b) => {
    if (a.is_alive !== b.is_alive) return a.is_alive ? -1 : 1;
    return b.composite_score - a.composite_score;
  });

  const aliveCount = sorted.filter(a => a.is_alive).length;
  const specialistCount = sorted.filter(a => a.is_alive && a.specialization_strength > 0.6).length;
  const avgScore = sorted.filter(a => a.is_alive).reduce((s, a) => s + a.composite_score, 0) / (aliveCount || 1);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Online', value: aliveCount, color: '#10b981' },
          { label: 'Specialists', value: specialistCount, color: '#8b5cf6' },
          { label: 'Avg Score', value: avgScore.toFixed(3), color: '#00e5ff' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'rgba(0,0,0,0.30)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10, padding: '8px 12px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: '1.05rem', color, fontWeight: 700, textShadow: `0 0 12px ${color}60` }}>{value}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Hint */}
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 10, fontStyle: 'italic' }}>
        Click any agent card to expand skill breakdown
      </div>

      {/* Cards */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sorted.map((agent, i) => (
          <AgentCard
            key={agent.agent_id}
            agent={agent}
            rank={i + 1}
            isLeader={agent.agent_id === swarmState.leader_id}
          />
        ))}
      </div>
    </div>
  );
}
