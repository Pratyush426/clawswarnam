import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import AgentNode from './AgentNode';

const SKILL_COLORS = {
  research:  '#00e5ff',
  coding:    '#f59e0b',
  writing:   '#10b981',
  critique:  '#ef4444',
  planning:  '#8b5cf6',
  synthesis: '#d946ef',
};

/* ── Animated data packet along a path ─────────────────────────── */
function DataPacket({ x1, y1, x2, y2, color, id }) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const duration = 1200 + Math.random() * 400;

  useEffect(() => {
    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const p = Math.min((ts - startRef.current) / duration, 1);
      setProgress(p);
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const x = x1 + (x2 - x1) * progress;
  const y = y1 + (y2 - y1) * progress;
  const opacity = progress < 0.1 ? progress * 10 : progress > 0.85 ? (1 - progress) / 0.15 : 1;

  return (
    <g opacity={opacity}>
      {/* Trail */}
      <circle cx={x1 + (x2 - x1) * Math.max(0, progress - 0.1)} cy={y1 + (y2 - y1) * Math.max(0, progress - 0.1)} r={2} fill={color} opacity={0.25} />
      {/* Packet */}
      <circle cx={x} cy={y} r={4} fill={color} filter={`drop-shadow(0 0 4px ${color})`} />
    </g>
  );
}

/* ── Connection line between nodes ──────────────────────────────── */
function ConnectionLine({ x1, y1, x2, y2, color, opacity = 0.25, animated = false }) {
  return (
    <g>
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color}
        strokeWidth={animated ? 1.5 : 0.8}
        opacity={opacity}
        strokeDasharray={animated ? '4 4' : 'none'}
      >
        {animated && (
          <animate attributeName="stroke-dashoffset" from="8" to="0" dur="0.6s" repeatCount="indefinite" />
        )}
      </line>
    </g>
  );
}

export default function SwarmVisualizer({ swarmState, events }) {
  const containerRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const simulationRef = useRef(null);
  const [packets, setPackets] = useState([]);
  const packetIdRef = useRef(0);

  // Track latest routing events for connection lines
  const [activeRoutes, setActiveRoutes] = useState([]);
  const prevEventsLength = useRef(0);

  // Spawn data packets when task_routed events arrive
  useEffect(() => {
    if (!events || events.length === prevEventsLength.current) return;
    const newEvents = events.slice(prevEventsLength.current);
    prevEventsLength.current = events.length;

    const routeEvents = newEvents.filter(e => e.event === 'task_routed');
    if (routeEvents.length === 0) return;

    const lastRoute = routeEvents[routeEvents.length - 1];
    setActiveRoutes(prev => {
      const entry = {
        agentId: lastRoute?.data?.agent_id,
        skill: lastRoute?.data?.skill_type,
        ts: Date.now(),
      };
      const next = [...prev, entry].slice(-3);
      return next;
    });

    // Spawn packet
    const nodesCopy = [...(simulationRef.current?.nodes() || [])];
    const targetNode = nodesCopy.find(n => n.id === lastRoute?.data?.agent_id);
    const leaderNode = nodesCopy.find(n => n.isLeader);
    if (targetNode && leaderNode) {
      const pkt = {
        id: ++packetIdRef.current,
        x1: leaderNode.x, y1: leaderNode.y,
        x2: targetNode.x, y2: targetNode.y,
        color: SKILL_COLORS[lastRoute?.data?.skill_type] || '#00e5ff',
      };
      setPackets(prev => [...prev, pkt]);
      setTimeout(() => {
        setPackets(prev => prev.filter(p => p.id !== pkt.id));
      }, 1800);
    }
  }, [events]);

  // Clean stale routes
  useEffect(() => {
    const t = setInterval(() => {
      setActiveRoutes(prev => prev.filter(r => Date.now() - r.ts < 4000));
    }, 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !swarmState || !swarmState.agents.length) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const newNodes = swarmState.agents.map(a => {
      const existing = nodes.find(n => n.id === a.agent_id);
      return {
        ...existing,
        id: a.agent_id,
        agent: a,
        isLeader: a.agent_id === swarmState.leader_id,
        radius: 28 + (a.composite_score * 22),
        isDead: !a.is_alive,
      };
    });

    if (!simulationRef.current) {
      simulationRef.current = d3.forceSimulation()
        .force('charge', d3.forceManyBody().strength(-280))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide().radius(d => d.radius + 50).iterations(3))
        .force('x', d3.forceX(width / 2).strength(d => d.isDead ? -0.05 : (d.isLeader ? 0.6 : d.agent.composite_score * 0.08)))
        .force('y', d3.forceY(height / 2).strength(d => d.isDead ? -0.05 : (d.isLeader ? 0.6 : d.agent.composite_score * 0.08)))
        .on('tick', () => {
          setNodes([...simulationRef.current.nodes()]);
        });
    }

    simulationRef.current.nodes(newNodes);
    simulationRef.current.alpha(0.3).restart();
  }, [swarmState.agents, swarmState.leader_id]);

  const leaderNode = nodes.find(n => n.isLeader);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
        <defs>
          {/* Center glow */}
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,191,0,0.08)" />
            <stop offset="60%" stopColor="rgba(0,229,255,0.04)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Ambient bloom filter */}
          <filter id="bloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Subtle grid */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Background grid */}
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Ambient glow */}
        <circle cx="50%" cy="50%" r="35%" fill="url(#centerGlow)" />

        {/* ── Connection lines from leader to each alive agent ── */}
        {leaderNode && nodes.filter(n => !n.isLeader && n.agent?.is_alive).map(node => {
          const isActive = activeRoutes.some(r => r.agentId === node.id);
          const skill = activeRoutes.find(r => r.agentId === node.id)?.skill;
          const color = isActive ? (SKILL_COLORS[skill] || '#00e5ff') : 'rgba(255,255,255,0.08)';
          return (
            <ConnectionLine
              key={`conn-${node.id}`}
              x1={leaderNode.x} y1={leaderNode.y}
              x2={node.x} y2={node.y}
              color={color}
              opacity={isActive ? 0.6 : 0.12}
              animated={isActive}
            />
          );
        })}

        {/* ── Data packets in flight ── */}
        {packets.map(pkt => (
          <DataPacket key={pkt.id} {...pkt} />
        ))}

        {/* ── Agent nodes ── */}
        {nodes.map(node => (
          <AgentNode
            key={node.id}
            agent={node.agent}
            isLeader={node.isLeader}
            x={node.x}
            y={node.y}
            isActive={activeRoutes.some(r => r.agentId === node.id)}
          />
        ))}
      </svg>

      {/* ── Legend overlay ── */}
      <div style={{
        position: 'absolute', bottom: 20, left: 20,
        padding: '12px 16px',
        background: 'rgba(2,4,8,0.75)',
        backdropFilter: 'blur(12px)',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.08)',
        minWidth: 170,
      }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: '0.68rem', letterSpacing: '0.12em', color: 'rgba(148,163,184,0.70)', marginBottom: 10, textTransform: 'uppercase' }}>
          Swarm Topology
        </div>
        {[
          { color: '#ffbf00', label: 'Leader (elected)' },
          { color: '#00e5ff', label: 'Specialist (≥0.70)' },
          { color: '#3b82f6', label: 'Emerging (≥0.55)' },
          { color: '#94a3b8', label: 'Generalist' },
          { color: '#ef4444', label: 'Failed / Dead' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }} />
            <span style={{ fontSize: '0.72rem', color: 'rgba(226,232,240,0.75)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Active routing label ── */}
      {activeRoutes.length > 0 && (
        <div style={{
          position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
          padding: '8px 18px',
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(10px)',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'fadeSlideIn 0.3s ease',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: SKILL_COLORS[activeRoutes[activeRoutes.length - 1]?.skill] || '#00e5ff', animation: 'pulse 1s infinite' }} />
          <span style={{ fontFamily: 'Space Mono', fontSize: '0.75rem', color: 'rgba(226,232,240,0.90)' }}>
            Routing [{activeRoutes[activeRoutes.length - 1]?.skill}] → {activeRoutes[activeRoutes.length - 1]?.agentId}
          </span>
        </div>
      )}

      {/* Skill color legend (right side) */}
      <div style={{
        position: 'absolute', bottom: 20, right: 20,
        padding: '10px 14px',
        background: 'rgba(2,4,8,0.75)',
        backdropFilter: 'blur(12px)',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'rgba(148,163,184,0.70)', marginBottom: 8, textTransform: 'uppercase' }}>
          Skill Channels
        </div>
        {Object.entries(SKILL_COLORS).map(([skill, color]) => (
          <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ width: 16, height: 3, borderRadius: 2, background: color, boxShadow: `0 0 4px ${color}` }} />
            <span style={{ fontSize: '0.68rem', color: 'rgba(226,232,240,0.65)', textTransform: 'capitalize' }}>{skill}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
