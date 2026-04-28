import React, { useEffect, useRef } from 'react';

export default function TaskConsole({ events }) {
  const consoleRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [events]);

  const getColor = (eventType) => {
    switch (eventType) {
      case 'task_started': return '#94a3b8';
      case 'task_routed': return '#eab308'; // yellow
      case 'task_completed': return '#10b981'; // green
      case 'agent_failed': return '#ef4444'; // red
      case 'leader_elected': return '#00e5ff'; // cyan
      case 'role_evolved': return '#d946ef'; // pink
      case 'swarm_reorganized': return '#f97316'; // orange
      default: return '#e2e8f0';
    }
  };

  const formatData = (event) => {
    switch (event.event) {
      case 'task_started':
        return event.data.message;
      case 'task_routed':
        return `Subtask [${event.data.skill_type}] -> routed to ${event.data.agent_id}`;
      case 'task_completed':
        return `${event.data.agent_id} completed subtask | Score: ${event.data.score.toFixed(2)}`;
      case 'agent_failed':
        return `CRITICAL: ${event.data.agent_id} missed heartbeat. Marked FAILED.`;
      case 'leader_elected':
        return `NEW LEADER ELECTED: ${event.data.leader_id}`;
      case 'role_evolved':
        return `${event.data.agent_id} evolved to [${event.data.role_label}]`;
      case 'swarm_reorganized':
        return `Swarm topology reorganized. Fault mitigated.`;
      default:
        return JSON.stringify(event.data);
    }
  };

  return (
    <div 
      style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        background: '#0f172a', 
        borderRadius: '4px', 
        border: '1px solid rgba(255,255,255,0.1)' 
      }}
    >
      <div style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }}></div>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#eab308' }}></div>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }}></div>
        <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'Orbitron' }}>SWARM_CONSOLE // EVENT_STREAM</span>
      </div>
      
      <div 
        ref={consoleRef}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '10px', 
          fontSize: '0.85rem',
          lineHeight: '1.5'
        }}
      >
        {events.length === 0 && (
          <div style={{ color: '#64748b', fontStyle: 'italic' }}>Awaiting tasks...</div>
        )}
        
        {events.map((e, i) => {
          if (e.event === 'swarm_snapshot' || e.event === 'benchmark_update') return null; // Hide noise
          
          const time = new Date(e.timestamp * 1000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
          
          return (
            <div key={i} style={{ marginBottom: '8px', display: 'flex', gap: '10px' }}>
              <span style={{ color: '#64748b', minWidth: '70px' }}>[{time}]</span>
              <span style={{ color: getColor(e.event), fontWeight: e.event.includes('failed') ? 'bold' : 'normal' }}>
                {formatData(e)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
