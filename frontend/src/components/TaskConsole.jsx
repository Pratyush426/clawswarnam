import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'lucide-react';

const EVENT_META = {
  task_started:      { color: '#64748b', icon: '○', label: 'INIT' },
  task_routed:       { color: '#ffbf00', icon: '→', label: 'ROUTE' },
  task_completed:    { color: '#10b981', icon: '✓', label: 'DONE' },
  agent_failed:      { color: '#ef4444', icon: '✗', label: 'FAIL' },
  leader_elected:    { color: '#00e5ff', icon: '★', label: 'ELECT' },
  role_evolved:      { color: '#d946ef', icon: '↑', label: 'EVO' },
  swarm_reorganized: { color: '#f97316', icon: '⟳', label: 'HEAL' },
};

const formatData = (event) => {
  switch (event.event) {
    case 'task_started':
      return event.data.message || 'Task pipeline initialized';
    case 'task_routed':
      return `[${event.data.skill_type}] → ${event.data.agent_id}`;
    case 'task_completed':
      return `${event.data.agent_id} · score: ${typeof event.data.score === 'number' ? event.data.score.toFixed(3) : '—'}`;
    case 'agent_failed':
      return `CRITICAL: ${event.data.agent_id} missed heartbeat → marked DEAD`;
    case 'leader_elected':
      return `NEW LEADER: ${event.data.leader_id}`;
    case 'role_evolved':
      return `${event.data.agent_id} → ${event.data.role_label}`;
    case 'swarm_reorganized':
      return `Swarm topology reorganized · fault mitigated`;
    default:
      return JSON.stringify(event.data).slice(0, 100);
  }
};

function ConsoleLine({ event, index, isNew }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  if (event.event === 'swarm_snapshot' || event.event === 'benchmark_update') return null;

  const meta = EVENT_META[event.event] || { color: '#e2e8f0', icon: '·', label: 'EVT' };
  const time = typeof event.timestamp === 'number'
    ? new Date(event.timestamp * 1000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '——:——:——';

  return (
    <div style={{
      display: 'flex',
      gap: 0,
      padding: '5px 0',
      borderBottom: '1px solid rgba(255,255,255,0.035)',
      opacity: mounted ? 1 : 0,
      transform: mounted ? 'translateX(0)' : 'translateX(-8px)',
      transition: 'opacity 220ms ease, transform 220ms ease',
    }}>
      {/* Line number */}
      <span style={{ width: 36, flexShrink: 0, fontSize: '0.68rem', fontFamily: 'Space Mono', color: 'rgba(100,116,139,0.55)', paddingRight: 8, textAlign: 'right' }}>
        {index + 1}
      </span>

      {/* Timestamp */}
      <span style={{ width: 70, flexShrink: 0, fontSize: '0.70rem', fontFamily: 'Space Mono', color: 'rgba(100,116,139,0.80)' }}>
        {time}
      </span>

      {/* Event type badge */}
      <span style={{
        width: 52, flexShrink: 0,
        fontSize: '0.62rem',
        fontFamily: 'Orbitron',
        letterSpacing: '0.04em',
        color: meta.color,
        background: `${meta.color}14`,
        borderRadius: 4,
        textAlign: 'center',
        padding: '1px 0',
        marginRight: 10,
        alignSelf: 'center',
      }}>
        {meta.label}
      </span>

      {/* Icon + message */}
      <span style={{
        fontSize: '0.80rem',
        fontFamily: 'Space Mono',
        color: meta.color,
        lineHeight: 1.45,
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ opacity: 0.7, marginRight: 6 }}>{meta.icon}</span>
        {formatData(event)}
      </span>
    </div>
  );
}

export default function TaskConsole({ events }) {
  const consoleRef = useRef(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [events]);

  const filters = ['all', 'route', 'done', 'fail', 'elect', 'evo'];
  const filterMap = {
    all:   null,
    route: 'task_routed',
    done:  'task_completed',
    fail:  'agent_failed',
    elect: 'leader_elected',
    evo:   'role_evolved',
  };

  const visibleEvents = events.filter(e => {
    if (filter === 'all') return e.event !== 'swarm_snapshot' && e.event !== 'benchmark_update';
    return e.event === filterMap[filter];
  });

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(2,4,10,0.90)',
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.08)',
      overflow: 'hidden',
    }}>
      {/* Terminal title bar */}
      <div style={{
        padding: '9px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'rgba(0,0,0,0.35)',
        flexShrink: 0,
      }}>
        {/* macOS dots */}
        <div style={{ display: 'flex', gap: 5 }}>
          {['#ef4444', '#f59e0b', '#10b981'].map(c => (
            <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c, opacity: 0.80 }} />
          ))}
        </div>
        <Terminal size={13} color="rgba(148,163,184,0.70)" />
        <span style={{ fontFamily: 'Orbitron', fontSize: '0.68rem', letterSpacing: '0.12em', color: 'rgba(148,163,184,0.70)', textTransform: 'uppercase' }}>
          swarm_console · event_stream
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '0.70rem', fontFamily: 'Space Mono', color: 'rgba(100,116,139,0.70)' }}>
          {visibleEvents.length} events
        </span>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: 4, padding: '7px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(0,0,0,0.20)',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '3px 10px',
              borderRadius: 6,
              border: `1px solid ${filter === f ? 'rgba(255,191,0,0.40)' : 'rgba(255,255,255,0.08)'}`,
              background: filter === f ? 'rgba(255,191,0,0.10)' : 'transparent',
              color: filter === f ? '#ffbf00' : 'rgba(148,163,184,0.70)',
              fontFamily: 'Orbitron',
              fontSize: '0.62rem',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'all 140ms ease',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Log lines */}
      <div
        ref={consoleRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 14px',
          lineHeight: 1.6,
        }}
      >
        {visibleEvents.length === 0 && (
          <div style={{ color: 'rgba(100,116,139,0.60)', fontFamily: 'Space Mono', fontSize: '0.80rem', fontStyle: 'italic', paddingTop: 20 }}>
            _ awaiting events...
          </div>
        )}
        {visibleEvents.map((e, i) => (
          <ConsoleLine key={i} event={e} index={i} isNew={i === visibleEvents.length - 1} />
        ))}
      </div>
    </div>
  );
}
