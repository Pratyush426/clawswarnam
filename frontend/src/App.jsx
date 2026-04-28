import React, { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import SwarmVisualizer from './components/SwarmVisualizer';
import TaskConsole from './components/TaskConsole';
import AgentScoreboard from './components/AgentScoreboard';
import BenchmarkPanel from './components/BenchmarkPanel';
import FaultInjector from './components/FaultInjector';
import { Activity, Zap, ShieldAlert } from 'lucide-react';

export default function App() {
  const [demoMode, setDemoMode] = useState(false);
  const { events, swarmState, isConnected } = useWebSocket(demoMode);
  const [activeTab, setActiveTab] = useState('console');
  const [taskInput, setTaskInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastBenchmark, setLastBenchmark] = useState(null);

  // Extract benchmark updates from events
  React.useEffect(() => {
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
      setTimeout(() => { setIsProcessing(false); }, 5000);
      return;
    }

    try {
      await fetch('/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskInput })
      });
      // We don't await the result here, the WS stream handles updates
      setTimeout(() => setIsProcessing(false), 2000);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  // Compute SIS (Swarm Intelligence Score)
  const computeSIS = () => {
    if (!swarmState.agents.length) return 0;
    const totalTasks = swarmState.agents.reduce((acc, a) => acc + a.metrics.tasks_completed, 0);
    const totalFails = swarmState.agents.reduce((acc, a) => acc + a.metrics.tasks_failed, 0);
    const avgQuality = swarmState.agents.reduce((acc, a) => acc + a.composite_score, 0) / swarmState.agents.length;
    // Mock formula for demo UI
    const score = (totalTasks * avgQuality * 100) / ((totalFails * 5) + 1);
    return Math.min(999, Math.round(score || 0));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#020408', color: '#e2e8f0' }}>
      {/* Header Bar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Zap color="#ffbf00" size={28} />
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '1px', color: '#fff' }}>
            CLAW<span style={{ color: '#ffbf00' }}>SWARM</span> AI
          </h1>
          <span style={{ fontSize: '0.8rem', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', marginLeft: '10px' }}>
            Emergent Specialization Engine
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>SIS (Swarm Intelligence Score):</span>
            <span style={{ fontFamily: 'Orbitron', fontSize: '1.2rem', color: '#00e5ff', fontWeight: 700 }}>{computeSIS()}</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity color={isConnected ? "#10b981" : "#ef4444"} size={18} />
            <span style={{ fontSize: '0.9rem', color: isConnected ? '#10b981' : '#ef4444' }}>
              {isConnected ? 'LIVE' : 'DISCONNECTED'}
            </span>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={demoMode} onChange={(e) => setDemoMode(e.target.checked)} />
            Demo Mode
          </label>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Panel - Visualizer */}
        <div style={{ flex: '0 0 60%', borderRight: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
          <SwarmVisualizer swarmState={swarmState} />
        </div>
        
        {/* Right Panel - Tabs */}
        <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          {/* Tab Navigation */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            {['console', 'scoreboard', 'benchmark'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: '1rem', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'Orbitron', textTransform: 'uppercase', fontSize: '0.9rem',
                  color: activeTab === tab ? '#ffbf00' : '#94a3b8',
                  borderBottom: activeTab === tab ? '2px solid #ffbf00' : '2px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          
          {/* Tab Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {activeTab === 'console' && <TaskConsole events={events} />}
            {activeTab === 'scoreboard' && <AgentScoreboard swarmState={swarmState} />}
            {activeTab === 'benchmark' && <BenchmarkPanel benchmark={lastBenchmark} />}
          </div>
        </div>
      </div>

      {/* Bottom Bar - Controls */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '1rem 2rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <form onSubmit={handleSubmitTask} style={{ flex: 1, display: 'flex', gap: '1rem' }}>
          <input 
            type="text" 
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            placeholder="Describe a complex task for the swarm..."
            style={{ 
              flex: 1, padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px',
              color: '#fff', fontFamily: 'Space Mono', fontSize: '1rem', outline: 'none'
            }}
            disabled={isProcessing}
          />
          <button 
            type="submit" 
            disabled={isProcessing || !taskInput.trim()}
            style={{ 
              padding: '0 2rem', background: isProcessing ? '#334155' : '#ffbf00', 
              color: '#000', border: 'none', borderRadius: '4px', cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontFamily: 'Orbitron', fontWeight: 700, fontSize: '1rem', transition: 'all 0.2s'
            }}
          >
            {isProcessing ? 'PROCESSING...' : 'DISPATCH'}
          </button>
        </form>
        
        {/* Demo Controls */}
        <div style={{ width: '300px' }}>
          <FaultInjector swarmState={swarmState} />
        </div>
      </footer>
    </div>
  );
}
