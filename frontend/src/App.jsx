import React, { useState, useEffect, useRef } from 'react';
import './styles/app.css';
import { useWebSocket } from './hooks/useWebSocket';
import SwarmVisualizer from './components/SwarmVisualizer';
import TaskConsole from './components/TaskConsole';
import AgentScoreboard from './components/AgentScoreboard';
import BenchmarkPanel from './components/BenchmarkPanel';
import FaultInjector from './components/FaultInjector';
import ArchitecturePanel from './components/ArchitecturePanel';
import ERSPanel from './components/ERSPanel';
import { Activity, Zap, Brain, Send, Layers } from 'lucide-react';

/* ── Animated number counter ─────────────────────────────────── */
function AnimatedNumber({ value, duration = 600 }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;
    prevRef.current = to;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      setDisplay(Math.round(from + (to - from) * ease));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <>{display}</>;
}

/* ── Header KPI ──────────────────────────────────────────────── */
function HeaderKPI({ label, value, color, animated = false }) {
  return (
    <div className="kpi" style={{ alignItems: 'center' }}>
      <div style={{ textAlign: 'right' }}>
        <div className="kpiValue" style={{ color, fontSize: '1.20rem', textShadow: `0 0 18px ${color}60` }}>
          {animated ? <AnimatedNumber value={value} /> : value}
        </div>
        <div className="kpiLabel" style={{ textAlign: 'right', marginTop: 1 }}>{label}</div>
      </div>
    </div>
  );
}

/* ── Particle dot background canvas ──────────────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    const dots = Array.from({ length: 55 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.2 + 0.4,
      a: Math.random() * 0.35 + 0.08,
    }));

    let animId;
    const render = () => {
      ctx.clearRect(0, 0, W, H);
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
        if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,229,255,${d.a})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', opacity: 0.55,
      }}
    />
  );
}

/* ── Main App ────────────────────────────────────────────────── */
export default function App() {
  const [demoMode, setDemoMode] = useState(false);
  const { events, swarmState, isConnected } = useWebSocket(demoMode);
  const [activeTab, setActiveTab] = useState('console');
  const [taskInput, setTaskInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastBenchmark, setLastBenchmark] = useState(null);

  // Extract benchmark updates from events
  useEffect(() => {
    const bmEvent = events.find(e => e.event === 'benchmark_update');
    if (bmEvent) {
      setLastBenchmark(bmEvent.data.benchmark);
      setActiveTab('benchmark');
    }
  }, [events]);

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    if (!taskInput.trim() || isProcessing) return;
    setIsProcessing(true);
    setTaskInput('');
    setActiveTab('console');
    if (demoMode) {
      setTimeout(() => setIsProcessing(false), 5000);
      return;
    }
    try {
      await fetch('/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskInput }),
      });
      setTimeout(() => setIsProcessing(false), 2000);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  // SIS score
  const computeSIS = () => {
    if (!swarmState.agents.length) return 0;
    const totalTasks = swarmState.agents.reduce((acc, a) => acc + a.metrics.tasks_completed, 0);
    const totalFails = swarmState.agents.reduce((acc, a) => acc + a.metrics.tasks_failed, 0);
    const avgQ = swarmState.agents.reduce((acc, a) => acc + a.composite_score, 0) / swarmState.agents.length;
    return Math.min(999, Math.round((totalTasks * avgQ * 100) / ((totalFails * 5) + 1) || 0));
  };

  const sis = computeSIS();
  const aliveCount = swarmState.agents.filter(a => a.is_alive).length;
  const specialists = swarmState.agents.filter(a => a.is_alive && a.specialization_strength > 0.6).length;
  const routings = events.filter(e => e.event === 'task_routed').length;

  const TABS = [
    { id: 'console',      label: 'Console',      icon: '▸' },
    { id: 'ers',          label: 'ERS Engine',   icon: '⬡' },
    { id: 'scoreboard',   label: 'Agents',       icon: '◈' },
    { id: 'architecture', label: 'Architecture', icon: '⟳' },
    { id: 'benchmark',    label: 'Benchmark',    icon: '◇' },
  ];

  return (
    <div className="appRoot">
      <div className="appShell">

        {/* ═══════════════ HEADER ═══════════════ */}
        <header className="glassBar" style={{ position: 'relative', overflow: 'hidden' }}>
          <ParticleCanvas />
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 24px',
          }}>

            {/* Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(255,191,0,0.25), rgba(0,229,255,0.12))',
                border: '1px solid rgba(255,191,0,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(255,191,0,0.15)',
              }}>
                <Zap size={20} color="#ffbf00" />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.08em', color: '#fff', fontFamily: 'Orbitron' }}>
                  CLAW<span style={{ color: '#ffbf00' }}>SWARM</span>
                </h1>
                <div style={{ fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 2, fontFamily: 'Inter, sans-serif' }}>
                  Emergent Role Specialization Engine
                </div>
              </div>

              {/* Badges */}
              <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                <span className="badge" style={{ fontSize: '0.65rem' }}>
                  <Brain size={11} color="#8b5cf6" />
                  ERS v2
                </span>
                <span className="badge" style={{ fontSize: '0.65rem' }}>
                  <Layers size={11} color="#00e5ff" />
                  Aurora UI
                </span>
              </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              <HeaderKPI label="SIS Score" value={sis} color="#00e5ff" animated />
              <HeaderKPI label="Agents Online" value={aliveCount} color="#10b981" animated />
              <HeaderKPI label="Specialists" value={specialists} color="#8b5cf6" animated />
              <HeaderKPI label="Routings" value={routings} color="#ffbf00" animated />

              {/* Live indicator */}
              <div className={`badge ${isConnected ? 'badgeLive' : 'badgeDown'}`} style={{ gap: 6 }}>
                <Activity size={14} style={{ animation: isConnected ? 'pulse 2s ease infinite' : 'none' }} />
                {isConnected ? 'LIVE' : 'OFFLINE'}
              </div>

              {/* Demo mode toggle */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', fontSize: '0.72rem', color: 'var(--muted)',
                fontFamily: 'Orbitron', letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                <div
                  onClick={() => setDemoMode(v => !v)}
                  style={{
                    width: 36, height: 20, borderRadius: 10,
                    background: demoMode ? 'rgba(255,191,0,0.50)' : 'rgba(255,255,255,0.10)',
                    border: `1px solid ${demoMode ? 'rgba(255,191,0,0.60)' : 'rgba(255,255,255,0.18)'}`,
                    position: 'relative', cursor: 'pointer', transition: 'all 220ms ease',
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, left: demoMode ? 18 : 3,
                    width: 12, height: 12, borderRadius: '50%',
                    background: demoMode ? '#ffbf00' : 'rgba(148,163,184,0.70)',
                    transition: 'left 220ms ease, background 220ms ease',
                  }} />
                </div>
                Demo
              </label>
            </div>
          </div>
        </header>

        {/* ═══════════════ MAIN SPLIT ═══════════════ */}
        <div className="split">

          {/* Left pane — Swarm Visualizer */}
          <div className="leftPane">
            <SwarmVisualizer swarmState={swarmState} events={events} />
          </div>

          {/* Right pane — Tabs */}
          <div className="rightPane">
            {/* Tab nav */}
            <div className="tabs">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tabButton ${activeTab === tab.id ? 'tabButtonActive' : ''}`}
                >
                  <span style={{ marginRight: 5, opacity: 0.70, fontSize: '0.80rem' }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
              {activeTab === 'console'      && <TaskConsole events={events} />}
              {activeTab === 'ers'          && <ERSPanel events={events} swarmState={swarmState} />}
              {activeTab === 'scoreboard'   && <AgentScoreboard swarmState={swarmState} />}
              {activeTab === 'architecture' && <ArchitecturePanel events={events} isConnected={isConnected} swarmState={swarmState} />}
              {activeTab === 'benchmark'    && <BenchmarkPanel benchmark={lastBenchmark} />}
            </div>
          </div>
        </div>

        {/* ═══════════════ FOOTER / CONTROLS ═══════════════ */}
        <footer className="glassFooter" style={{ padding: '12px 24px' }}>
          <div className="twoColFooter">

            {/* Task input */}
            <form onSubmit={handleSubmitTask} style={{ flex: 1, display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  value={taskInput}
                  onChange={e => setTaskInput(e.target.value)}
                  placeholder="Describe a complex task for the swarm to decompose and execute..."
                  className="field"
                  disabled={isProcessing}
                  style={{ paddingRight: '3rem' }}
                />
                {isProcessing && (
                  <div style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    width: 16, height: 16, borderRadius: '50%',
                    border: '2px solid rgba(0,229,255,0.20)',
                    borderTopColor: '#00e5ff',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                )}
              </div>
              <button
                type="submit"
                disabled={isProcessing || !taskInput.trim()}
                className="primaryButton"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {isProcessing
                  ? 'PROCESSING...'
                  : <><Send size={13} /> DISPATCH</>
                }
              </button>
            </form>

            {/* Fault injector */}
            <div style={{ width: 340, flexShrink: 0 }}>
              <FaultInjector swarmState={swarmState} />
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
