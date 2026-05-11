import React, { useMemo, useState, useEffect, useRef } from 'react';
import { GitBranch, Waves, Database, Boxes, Radio, Cpu, ArrowRight, Zap } from 'lucide-react';

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function formatPerMin(n) {
  if (!Number.isFinite(n)) return '—';
  return n < 10 ? n.toFixed(1) : Math.round(n).toString();
}

/* ── Animated architecture flow SVG ─────────────────────────── */
function ArchFlowDiagram({ insights, isConnected }) {
  const [packets, setPackets] = useState([]);
  const idRef = useRef(0);

  useEffect(() => {
    const edges = [
      { from: 'frontend', to: 'proxy', color: '#00e5ff' },
      { from: 'proxy', to: 'backend', color: '#ffbf00' },
      { from: 'backend', to: 'redis', color: '#3b82f6' },
      { from: 'backend', to: 'swarm', color: '#8b5cf6' },
      { from: 'swarm', to: 'bus', color: '#d946ef' },
      { from: 'bus', to: 'frontend', color: '#10b981' },
    ];

    const spawn = () => {
      const edge = edges[Math.floor(Math.random() * edges.length)];
      const pkt = { id: ++idRef.current, ...edge, progress: 0 };
      setPackets(prev => [...prev.slice(-8), pkt]);
    };

    const interval = setInterval(spawn, 900);
    return () => clearInterval(interval);
  }, []);

  // Animate packets
  useEffect(() => {
    const raf = requestAnimationFrame(function loop() {
      setPackets(prev =>
        prev
          .map(p => ({ ...p, progress: p.progress + 0.015 }))
          .filter(p => p.progress <= 1)
      );
      requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Node positions (in a 400x220 viewport)
  const nodes = {
    frontend: { x: 40, y: 110, label: 'React\nFrontend', color: '#00e5ff', icon: '⬡' },
    proxy:    { x: 140, y: 60, label: 'Vite\nProxy', color: '#3b82f6', icon: '⟶' },
    backend:  { x: 240, y: 110, label: 'FastAPI\nBackend', color: '#ffbf00', icon: '⬡' },
    redis:    { x: 340, y: 60, label: 'Redis\nStore', color: '#3b82f6', icon: '⬡' },
    swarm:    { x: 340, y: 160, label: 'Swarm\nEngine', color: '#8b5cf6', icon: '⬡' },
    bus:      { x: 140, y: 160, label: 'Event\nBus', color: '#d946ef', icon: '~' },
  };

  const edges = [
    { from: 'frontend', to: 'proxy', color: '#00e5ff' },
    { from: 'proxy', to: 'backend', color: '#ffbf00' },
    { from: 'backend', to: 'redis', color: '#3b82f6' },
    { from: 'backend', to: 'swarm', color: '#8b5cf6' },
    { from: 'swarm', to: 'bus', color: '#d946ef' },
    { from: 'bus', to: 'frontend', color: '#10b981' },
  ];

  const lerp = (a, b, t) => a + (b - a) * t;

  return (
    <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)', padding: 8 }}>
      <svg viewBox="0 0 400 240" width="100%" height="auto" style={{ display: 'block' }}>
        <defs>
          <filter id="archGlow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {/* Grid */}
          <pattern id="archGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="400" height="240" fill="url(#archGrid)" />

        {/* ── Edges ── */}
        {edges.map(({ from, to, color }) => {
          const n1 = nodes[from], n2 = nodes[to];
          return (
            <line
              key={`${from}-${to}`}
              x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y}
              stroke={color}
              strokeWidth={1.0}
              opacity={0.22}
              strokeDasharray="4 4"
            >
              <animate attributeName="stroke-dashoffset" from="8" to="0" dur="1.2s" repeatCount="indefinite" />
            </line>
          );
        })}

        {/* ── Packets ── */}
        {packets.map(p => {
          const n1 = nodes[p.from], n2 = nodes[p.to];
          if (!n1 || !n2) return null;
          const px = lerp(n1.x, n2.x, p.progress);
          const py = lerp(n1.y, n2.y, p.progress);
          const opacity = p.progress < 0.1 ? p.progress * 10 : p.progress > 0.85 ? (1 - p.progress) / 0.15 : 1;
          return (
            <g key={p.id} opacity={opacity}>
              <circle cx={px} cy={py} r={4} fill={p.color} filter="url(#archGlow)" />
              <circle cx={lerp(n1.x, n2.x, Math.max(0, p.progress - 0.08))} cy={lerp(n1.y, n2.y, Math.max(0, p.progress - 0.08))} r={2} fill={p.color} opacity={0.3} />
            </g>
          );
        })}

        {/* ── Nodes ── */}
        {Object.entries(nodes).map(([key, node]) => (
          <g key={key}>
            {/* Node glow */}
            <circle cx={node.x} cy={node.y} r={22} fill={node.color} opacity={0.06} />
            {/* Node circle */}
            <circle
              cx={node.x} cy={node.y} r={18}
              fill={`${node.color}18`}
              stroke={node.color}
              strokeWidth={1.2}
              strokeOpacity={0.55}
            />
            {/* Icon char */}
            <text x={node.x} y={node.y + 4} textAnchor="middle" fill={node.color} style={{ fontSize: '13px', opacity: 0.9 }}>
              {node.icon}
            </text>
            {/* Label */}
            {node.label.split('\n').map((line, li) => (
              <text
                key={li}
                x={node.x}
                y={node.y + 28 + li * 10}
                textAnchor="middle"
                fill="rgba(226,232,240,0.75)"
                style={{ fontSize: '7.5px', fontFamily: 'Orbitron', letterSpacing: '0.04em' }}
              >
                {line}
              </text>
            ))}
          </g>
        ))}

        {/* WS live label */}
        <text x={200} y={230} textAnchor="middle" fill={isConnected ? '#10b981' : '#ef4444'} style={{ fontSize: '7px', fontFamily: 'Space Mono', opacity: 0.75 }}>
          {isConnected ? '◉ WebSocket LIVE' : '○ WebSocket DOWN'}
        </text>
      </svg>
    </div>
  );
}

/* ── Stat tile ───────────────────────────────────────────────── */
function StatTile({ icon, label, value, sub, tone }) {
  const tones = {
    amber: { border: 'rgba(255,191,0,0.24)', bg: 'rgba(255,191,0,0.06)', text: '#fde68a' },
    cyan:  { border: 'rgba(0,229,255,0.22)', bg: 'rgba(0,229,255,0.06)', text: '#a5f3fc' },
    blue:  { border: 'rgba(59,130,246,0.22)', bg: 'rgba(59,130,246,0.06)', text: '#bfdbfe' },
    red:   { border: 'rgba(239,68,68,0.24)', bg: 'rgba(239,68,68,0.06)', text: '#fecaca' },
    green: { border: 'rgba(16,185,129,0.22)', bg: 'rgba(16,185,129,0.06)', text: '#a7f3d0' },
    violet: { border: 'rgba(139,92,246,0.22)', bg: 'rgba(139,92,246,0.06)', text: '#c4b5fd' },
  };
  const t = tones[tone] || tones.cyan;

  return (
    <div style={{
      borderRadius: 12,
      border: `1px solid ${t.border}`,
      background: t.bg,
      padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ color: t.text }}>{icon}</div>
        <div style={{ fontFamily: 'Orbitron', fontSize: '0.70rem', letterSpacing: '0.10em', color: t.text, textTransform: 'uppercase' }}>
          {label}
        </div>
      </div>
      <div style={{ fontFamily: 'Orbitron', fontSize: '1.10rem', color: 'rgba(226,232,240,0.95)', fontWeight: 700 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'Space Mono', marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ── Milestone feed ──────────────────────────────────────────── */
function Milestone({ ev }) {
  const color = {
    leader_elected: '#00e5ff',
    role_evolved: '#d946ef',
    agent_failed: '#ef4444',
    swarm_reorganized: '#f97316',
    task_completed: '#10b981',
    task_routed: '#ffbf00',
  }[ev.event] || '#e2e8f0';

  const time = typeof ev.timestamp === 'number'
    ? new Date(ev.timestamp * 1000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  const text = {
    leader_elected: `Leader elected → ${ev?.data?.leader_id ?? '—'}`,
    role_evolved: `${ev?.data?.agent_id ?? 'agent'} evolved → ${ev?.data?.role_label ?? '—'}`,
    agent_failed: `Fault → ${ev?.data?.agent_id ?? 'agent'} missed heartbeat`,
    swarm_reorganized: `Self-heal → topology reorganized`,
    task_routed: `Route [${ev?.data?.skill_type ?? 'skill'}] → ${ev?.data?.agent_id ?? 'agent'}`,
    task_completed: `Complete → ${ev?.data?.agent_id ?? 'agent'} scored ${typeof ev?.data?.score === 'number' ? ev.data.score.toFixed(2) : '—'}`,
  }[ev.event] || ev.event;

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ marginTop: 5, width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}`, flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontFamily: 'Space Mono', fontSize: '0.68rem', color: 'var(--muted)' }}>[{time}]</div>
        <div style={{ color: 'rgba(226,232,240,0.92)', fontSize: '0.82rem', lineHeight: 1.3, marginTop: 2 }}>{text}</div>
      </div>
    </div>
  );
}

/* ── Main Architecture Panel ────────────────────────────────── */
export default function ArchitecturePanel({ events, isConnected, swarmState }) {
  const insights = useMemo(() => {
    const nowSec = Date.now() / 1000;
    const windowSec = 30;
    const recent = (events || []).filter(e => typeof e?.timestamp === 'number' && (nowSec - e.timestamp) <= windowSec);
    const ratePerMin = (recent.length / windowSec) * 60;
    const last = (events || []).slice(-1)[0];
    const lastEvent = last?.event || '—';
    const alive = (swarmState?.agents || []).filter(a => a?.is_alive).length;
    const dead = (swarmState?.agents || []).filter(a => a && !a.is_alive).length;
    const leader = swarmState?.leader_id || '—';

    const milestones = [];
    for (let i = (events || []).length - 1; i >= 0 && milestones.length < 8; i--) {
      const ev = events[i];
      if (!ev?.event || ev.event === 'swarm_snapshot') continue;
      if (['task_routed', 'leader_elected', 'role_evolved', 'agent_failed', 'swarm_reorganized', 'task_completed'].includes(ev.event)) {
        milestones.push(ev);
      }
    }
    return { ratePerMin, lastEvent, alive, dead, leader, milestones };
  }, [events, swarmState]);

  const streamHealth = useMemo(() => {
    const total = insights.alive + insights.dead;
    return !total ? 0.4 : clamp(insights.alive / total, 0.05, 1);
  }, [insights.alive, insights.dead]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto', padding: '14px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, rgba(255,191,0,0.20), rgba(59,130,246,0.12))',
          border: '1px solid rgba(255,191,0,0.28)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <GitBranch size={18} color="#ffbf00" />
        </div>
        <div>
          <div style={{ fontFamily: 'Orbitron', fontSize: '0.82rem', letterSpacing: '0.08em', color: 'rgba(226,232,240,0.95)' }}>
            System Architecture
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>
            Live data flow · WebSocket stream · Swarm health
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <div className={`badge ${isConnected ? 'badgeLive' : 'badgeDown'}`}>
            <Radio size={12} />
            {isConnected ? 'Stream Live' : 'Stream Down'}
          </div>
        </div>
      </div>

      {/* Flow diagram */}
      <div style={{ marginBottom: 14 }}>
        <ArchFlowDiagram insights={insights} isConnected={isConnected} />
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        <StatTile icon={<Cpu size={14} />} label="Agents Online" value={insights.alive} sub={`${insights.dead} dead`} tone="green" />
        <StatTile icon={<Zap size={14} />} label="Events/Min" value={formatPerMin(insights.ratePerMin)} sub="30s window" tone="amber" />
        <StatTile icon={<Radio size={14} />} label="Last Event" value={insights.lastEvent.replace('_', ' ')} sub="most recent" tone="cyan" />
      </div>

      {/* Stream health bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'Orbitron', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Stream Health
          </span>
          <span style={{ fontSize: '0.72rem', fontFamily: 'Space Mono', color: 'rgba(226,232,240,0.80)' }}>
            {Math.round(streamHealth * 100)}%
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${streamHealth * 100}%`,
            background: 'linear-gradient(90deg, rgba(0,229,255,0.85), rgba(16,185,129,0.75))',
            transition: 'width 500ms ease',
            borderRadius: 4,
            boxShadow: '0 0 10px rgba(0,229,255,0.35)',
          }} />
        </div>
      </div>

      {/* Milestone feed */}
      <div>
        <div style={{ fontFamily: 'Orbitron', fontSize: '0.72rem', letterSpacing: '0.10em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 10 }}>
          Emergence Timeline
        </div>
        {insights.milestones.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: '0.80rem', fontStyle: 'italic' }}>
            Dispatch a task to watch the architecture "light up".
          </div>
        ) : (
          insights.milestones.map((ev, i) => (
            <Milestone key={`${ev.event}-${i}`} ev={ev} />
          ))
        )}
      </div>
    </div>
  );
}
