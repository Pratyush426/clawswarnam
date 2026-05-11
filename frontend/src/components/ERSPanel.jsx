import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Brain, Zap, TrendingUp, GitBranch, Activity, Target } from 'lucide-react';

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

/* ── Animated EMA Formula ──────────────────────────────────────── */
function EMAFormula({ alpha = 0.3, performance, oldScore, newScore, skill, active }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) { setStep(0); return; }
    const timers = [
      setTimeout(() => setStep(1), 200),
      setTimeout(() => setStep(2), 700),
      setTimeout(() => setStep(3), 1200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [active, newScore]);

  const s = (v, decimals = 2) =>
    typeof v === 'number' ? v.toFixed(decimals) : '—';

  return (
    <div style={{
      background: 'rgba(0,0,0,0.40)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 14,
      padding: '18px 20px',
      fontFamily: "'Space Mono', monospace",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Brain size={16} color="rgba(139,92,246,0.95)" />
        <span style={{ fontFamily: 'Orbitron', fontSize: '0.72rem', letterSpacing: '0.12em', color: 'rgba(139,92,246,0.95)', textTransform: 'uppercase' }}>
          EMA Skill Update
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: '0.70rem',
          background: SKILL_COLORS[skill] ? `${SKILL_COLORS[skill]}22` : 'rgba(255,255,255,0.06)',
          border: `1px solid ${SKILL_COLORS[skill] || 'rgba(255,255,255,0.12)'}44`,
          color: SKILL_COLORS[skill] || '#e2e8f0',
          padding: '3px 10px',
          borderRadius: 999,
        }}>
          {SKILL_ICONS[skill]} {skill}
        </span>
      </div>

      {/* Formula line */}
      <div style={{ fontSize: '0.88rem', color: 'rgba(226,232,240,0.85)', lineHeight: 2.0 }}>
        <div style={{ opacity: step >= 1 ? 1 : 0.25, transition: 'opacity 400ms ease' }}>
          <span style={{ color: '#8b5cf6' }}>new_score</span>
          <span style={{ color: 'rgba(226,232,240,0.45)', margin: '0 8px' }}>=</span>
          <span style={{ color: '#f59e0b' }}>α</span>
          <span style={{ color: 'rgba(226,232,240,0.45)', margin: '0 6px' }}>×</span>
          <span style={{ color: '#10b981' }}>perf</span>
          <span style={{ color: 'rgba(226,232,240,0.45)', margin: '0 8px' }}>+</span>
          <span style={{ color: '#00e5ff' }}>(1 − α)</span>
          <span style={{ color: 'rgba(226,232,240,0.45)', margin: '0 6px' }}>×</span>
          <span style={{ color: '#64748b' }}>old_score</span>
        </div>

        <div style={{ opacity: step >= 2 ? 1 : 0.15, transition: 'opacity 400ms ease' }}>
          <span style={{ color: '#8b5cf6' }}>new_score</span>
          <span style={{ color: 'rgba(226,232,240,0.45)', margin: '0 8px' }}>=</span>
          <span style={{ color: '#f59e0b' }}>{s(alpha)}</span>
          <span style={{ color: 'rgba(226,232,240,0.45)', margin: '0 6px' }}>×</span>
          <span style={{ color: '#10b981' }}>{s(performance)}</span>
          <span style={{ color: 'rgba(226,232,240,0.45)', margin: '0 8px' }}>+</span>
          <span style={{ color: '#00e5ff' }}>{s(1 - alpha)}</span>
          <span style={{ color: 'rgba(226,232,240,0.45)', margin: '0 6px' }}>×</span>
          <span style={{ color: '#64748b' }}>{s(oldScore)}</span>
        </div>

        <div style={{ opacity: step >= 3 ? 1 : 0.15, transition: 'opacity 400ms ease', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#8b5cf6' }}>new_score</span>
          <span style={{ color: 'rgba(226,232,240,0.45)', margin: '0 8px' }}>=</span>
          <span style={{
            color: '#fff',
            fontWeight: 700,
            fontSize: '1.10rem',
            textShadow: `0 0 14px ${SKILL_COLORS[skill] || '#fff'}`,
            animation: step >= 3 ? 'countUp 0.4s ease' : 'none',
          }}>
            {s(newScore)}
          </span>
          {step >= 3 && oldScore !== undefined && (
            <span style={{
              fontSize: '0.72rem',
              color: newScore > oldScore ? '#10b981' : '#ef4444',
              background: newScore > oldScore ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${newScore > oldScore ? 'rgba(16,185,129,0.30)' : 'rgba(239,68,68,0.30)'}`,
              padding: '2px 8px',
              borderRadius: 999,
            }}>
              {newScore > oldScore ? '↑' : '↓'} {Math.abs(newScore - oldScore).toFixed(3)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Epsilon-Greedy Routing Visualizer ─────────────────────────── */
function EpsilonRouter({ lastRoutedEvent, agents }) {
  const [showExplore, setShowExplore] = useState(null);
  const epsilon = 0.20; // 20% explore

  useEffect(() => {
    if (!lastRoutedEvent) return;
    const isExplore = Math.random() < epsilon;
    setShowExplore(isExplore);
    const t = setTimeout(() => setShowExplore(null), 3000);
    return () => clearTimeout(t);
  }, [lastRoutedEvent]);

  return (
    <div style={{
      background: 'rgba(0,0,0,0.35)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <GitBranch size={16} color="rgba(245,158,11,0.95)" />
        <span style={{ fontFamily: 'Orbitron', fontSize: '0.72rem', letterSpacing: '0.12em', color: 'rgba(245,158,11,0.90)', textTransform: 'uppercase' }}>
          ε-Greedy Routing
        </span>
      </div>

      {/* Probability bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.72rem', color: 'var(--muted)' }}>
          <span style={{ color: '#f59e0b' }}>EXPLOIT (best agent)</span>
          <span style={{ color: '#8b5cf6' }}>EXPLORE (random)</span>
        </div>
        <div style={{ height: 20, borderRadius: 10, overflow: 'hidden', display: 'flex', border: '1px solid rgba(255,255,255,0.10)' }}>
          <div style={{
            width: `${(1 - epsilon) * 100}%`,
            background: 'linear-gradient(90deg, rgba(245,158,11,0.90), rgba(255,191,0,0.70))',
            display: 'flex', alignItems: 'center', paddingLeft: 10,
            fontSize: '0.68rem', fontFamily: 'Orbitron', color: '#050b14', fontWeight: 700,
            transition: 'all 0.4s ease',
            boxShadow: showExplore === false ? '0 0 16px rgba(245,158,11,0.60)' : 'none',
          }}>
            80%
          </div>
          <div style={{
            flex: 1,
            background: 'linear-gradient(90deg, rgba(139,92,246,0.60), rgba(217,70,239,0.50))',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 10,
            fontSize: '0.68rem', fontFamily: 'Orbitron', color: '#e2e8f0', fontWeight: 700,
            transition: 'all 0.4s ease',
            boxShadow: showExplore === true ? '0 0 16px rgba(139,92,246,0.60)' : 'none',
          }}>
            20%
          </div>
        </div>
      </div>

      {/* Decision indicator */}
      {showExplore !== null ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: showExplore ? 'rgba(139,92,246,0.12)' : 'rgba(245,158,11,0.10)',
          border: `1px solid ${showExplore ? 'rgba(139,92,246,0.30)' : 'rgba(245,158,11,0.30)'}`,
          borderRadius: 10, padding: '10px 14px',
          animation: 'fadeSlideIn 0.3s ease',
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: showExplore ? '#8b5cf6' : '#f59e0b',
            boxShadow: `0 0 10px ${showExplore ? '#8b5cf6' : '#f59e0b'}`,
            animation: 'pulse 1s ease infinite',
          }} />
          <span style={{ fontSize: '0.82rem', color: showExplore ? '#c4b5fd' : '#fde68a', fontFamily: 'Space Mono' }}>
            {showExplore
              ? `EXPLORE → random agent selected`
              : `EXPLOIT → routing to best scorer`
            }
          </span>
        </div>
      ) : (
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic' }}>
          Dispatch a task to trigger routing decision
        </div>
      )}

      {/* Last routing event */}
      {lastRoutedEvent && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'Space Mono' }}>
            [{SKILL_ICONS[lastRoutedEvent?.data?.skill_type]}
            {lastRoutedEvent?.data?.skill_type}]
          </span>
          <span style={{ fontSize: '0.72rem', color: 'rgba(226,232,240,0.60)' }}>→</span>
          <span style={{ fontSize: '0.72rem', color: '#00e5ff', fontFamily: 'Space Mono' }}>
            {lastRoutedEvent?.data?.agent_id}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Skill Divergence Chart ────────────────────────────────────── */
function SkillDivergenceChart({ agents }) {
  if (!agents || agents.length === 0) {
    return (
      <div style={{ color: 'var(--muted)', fontSize: '0.82rem', fontStyle: 'italic', padding: '20px 0' }}>
        Awaiting agents to initialize...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {agents.filter(a => a.is_alive).slice(0, 5).map(agent => {
        const topSkill = Object.entries(agent.skill_vector)
          .reduce((a, b) => b[1] > a[1] ? b : a, ['', 0]);
        const color = SKILL_COLORS[topSkill[0]] || '#94a3b8';

        return (
          <div key={agent.agent_id} style={{
            background: 'rgba(0,0,0,0.28)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12,
            padding: '10px 14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
                <span style={{ fontFamily: 'Orbitron', fontSize: '0.72rem', color: 'rgba(226,232,240,0.90)' }}>
                  {agent.agent_id}
                </span>
              </div>
              <span style={{ fontSize: '0.68rem', color, background: `${color}18`, border: `1px solid ${color}30`, padding: '2px 8px', borderRadius: 999 }}>
                {agent.role_label}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {SKILLS.map(skill => {
                const val = agent.skill_vector[skill] || 0.5;
                const skillColor = SKILL_COLORS[skill];
                return (
                  <div key={skill} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: '100%', height: 44, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <div style={{
                        width: '100%',
                        height: `${val * 100}%`,
                        background: `linear-gradient(180deg, ${skillColor}, ${skillColor}88)`,
                        transition: 'height 600ms cubic-bezier(0.4,0,0.2,1)',
                        borderRadius: '3px 3px 0 0',
                        boxShadow: val > 0.65 ? `0 0 8px ${skillColor}60` : 'none',
                      }} />
                    </div>
                    <span style={{ fontSize: '0.55rem', color: val > 0.65 ? skillColor : 'rgba(148,163,184,0.50)', fontFamily: 'Space Mono' }}>
                      {skill.slice(0, 3).toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Evolution Clock ───────────────────────────────────────────── */
function EvolutionClock({ events }) {
  const roleEvents = useMemo(() =>
    (events || []).filter(e => e.event === 'role_evolved').slice(-5).reverse(),
    [events]
  );

  if (roleEvents.length === 0) {
    return (
      <div style={{ color: 'var(--muted)', fontSize: '0.80rem', fontStyle: 'italic' }}>
        No role evolutions yet — dispatch tasks to trigger specialization.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {roleEvents.map((ev, i) => {
        const skill = ev?.data?.role_label?.split(': ')[1]?.toLowerCase();
        const color = SKILL_COLORS[skill] || '#8b5cf6';
        const time = typeof ev.timestamp === 'number'
          ? new Date(ev.timestamp * 1000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : '—';

        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '8px 12px',
            background: `${color}0e`,
            border: `1px solid ${color}28`,
            borderRadius: 10,
            animation: 'fadeSlideIn 0.4s ease',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 10px ${color}` }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', color, fontFamily: 'Orbitron', letterSpacing: '0.05em' }}>
                {ev?.data?.agent_id}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(226,232,240,0.85)', marginTop: 2 }}>
                → {ev?.data?.role_label}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'Space Mono', flexShrink: 0 }}>
              {time}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main ERS Panel ────────────────────────────────────────────── */
export default function ERSPanel({ events, swarmState }) {
  const [liveEMA, setLiveEMA] = useState({
    skill: 'research', alpha: 0.3, performance: 0.87, oldScore: 0.71, newScore: 0.759,
  });
  const [emaActive, setEmaActive] = useState(false);
  const prevEmaRef = useRef(null);

  const lastRoutedEvent = useMemo(() =>
    (events || []).filter(e => e.event === 'task_routed').slice(-1)[0],
    [events]
  );

  // Trigger EMA animation whenever a task_completed event fires
  useEffect(() => {
    const completedEvents = (events || []).filter(e => e.event === 'task_completed');
    const last = completedEvents[completedEvents.length - 1];
    if (!last || last === prevEmaRef.current) return;
    prevEmaRef.current = last;

    const agentId = last?.data?.agent_id;
    const score = last?.data?.score ?? 0.80;
    const agent = swarmState?.agents?.find(a => a.agent_id === agentId);
    if (!agent) return;

    const topSkill = Object.entries(agent.skill_vector)
      .reduce((a, b) => b[1] > a[1] ? b : a, ['research', 0.5]);

    const alpha = 0.3;
    const oldScore = topSkill[1];
    const performance = score;
    const newScore = alpha * performance + (1 - alpha) * oldScore;

    setLiveEMA({ skill: topSkill[0], alpha, performance, oldScore, newScore });
    setEmaActive(false);
    setTimeout(() => setEmaActive(true), 50);
  }, [events, swarmState]);

  // Pulsing demo animation when no real data
  useEffect(() => {
    const t = setInterval(() => {
      setLiveEMA(prev => {
        const newPerf = 0.5 + Math.random() * 0.5;
        const skill = SKILLS[Math.floor(Math.random() * SKILLS.length)];
        const oldScore = 0.45 + Math.random() * 0.30;
        const alpha = 0.3;
        const newScore = alpha * newPerf + (1 - alpha) * oldScore;
        return { skill, alpha, performance: newPerf, oldScore, newScore };
      });
      setEmaActive(false);
      setTimeout(() => setEmaActive(true), 50);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const totalAgents = swarmState?.agents?.length || 0;
  const aliveAgents = swarmState?.agents?.filter(a => a.is_alive).length || 0;
  const specialists = swarmState?.agents?.filter(a => a.is_alive && a.specialization_strength > 0.6).length || 0;
  const routingEvents = (events || []).filter(e => e.event === 'task_routed').length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto', padding: '14px' }}>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(217,70,239,0.15))',
          border: '1px solid rgba(139,92,246,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Brain size={18} color="#8b5cf6" />
        </div>
        <div>
          <div style={{ fontFamily: 'Orbitron', fontSize: '0.82rem', letterSpacing: '0.08em', color: 'rgba(226,232,240,0.95)' }}>
            Emergent Role Specialization
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>
            EMA Skill Vectors · ε-Greedy Routing · Live Evolution
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Alive', value: aliveAgents, color: '#10b981', icon: <Activity size={14} /> },
          { label: 'Specialists', value: specialists, color: '#8b5cf6', icon: <Target size={14} /> },
          { label: 'Routings', value: routingEvents, color: '#f59e0b', icon: <GitBranch size={14} /> },
          { label: 'ε', value: '20%', color: '#00e5ff', icon: <Zap size={14} /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{
            background: 'rgba(0,0,0,0.32)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12, padding: '10px 12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color }}>
              {icon}
              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Orbitron' }}>
                {label}
              </span>
            </div>
            <div style={{ fontFamily: 'Orbitron', fontSize: '1.05rem', color, fontWeight: 700, textShadow: `0 0 12px ${color}60` }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* EMA Formula — LIVE */}
      <div style={{ marginBottom: 12 }}>
        <EMAFormula {...liveEMA} active={emaActive} />
      </div>

      {/* Epsilon-Greedy Router */}
      <div style={{ marginBottom: 12 }}>
        <EpsilonRouter lastRoutedEvent={lastRoutedEvent} agents={swarmState?.agents} />
      </div>

      {/* Skill Divergence */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <TrendingUp size={14} color="rgba(0,229,255,0.85)" />
          <span style={{ fontFamily: 'Orbitron', fontSize: '0.72rem', letterSpacing: '0.10em', color: 'rgba(0,229,255,0.85)', textTransform: 'uppercase' }}>
            Skill Vector Divergence
          </span>
        </div>
        <SkillDivergenceChart agents={swarmState?.agents} />
      </div>

      {/* Evolution timeline */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Zap size={14} color="rgba(217,70,239,0.85)" />
          <span style={{ fontFamily: 'Orbitron', fontSize: '0.72rem', letterSpacing: '0.10em', color: 'rgba(217,70,239,0.85)', textTransform: 'uppercase' }}>
            Role Evolution Timeline
          </span>
        </div>
        <EvolutionClock events={events} />
      </div>

    </div>
  );
}
