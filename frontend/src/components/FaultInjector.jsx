import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';

export default function FaultInjector({ swarmState }) {
  const [selectedAgent, setSelectedAgent] = useState('');
  
  const aliveAgents = swarmState?.agents?.filter(a => a.is_alive) || [];
  const deadAgents = swarmState?.agents?.filter(a => !a.is_alive) || [];

  const handleKillLeader = async () => {
    try {
      await fetch('/api/swarm/inject-fault/leader', { method: 'POST' });
    } catch (e) { console.error(e); }
  };

  const handleKillSpecific = async () => {
    if (!selectedAgent) return;
    try {
      await fetch('/api/swarm/inject-fault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: selectedAgent })
      });
      setSelectedAgent('');
    } catch (e) { console.error(e); }
  };

  const handleRespawn = async () => {
    try {
      await fetch('/api/swarm/respawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '4px', padding: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem' }}>
          <ShieldAlert size={16} /> FAULT INJECTION
        </div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          Alive: <span style={{ color: '#10b981' }}>{aliveAgents.length}</span> | 
          Dead: <span style={{ color: '#ef4444' }}>{deadAgents.length}</span>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button 
          onClick={handleKillLeader}
          disabled={!swarmState.leader_id}
          style={{ 
            background: '#ef4444', color: '#fff', border: 'none', padding: '8px', 
            borderRadius: '4px', cursor: swarmState.leader_id ? 'pointer' : 'not-allowed',
            fontFamily: 'Orbitron', fontWeight: 'bold', fontSize: '0.8rem',
            boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
          }}
          title="This will trigger automatic failover"
        >
          KILL LEADER
        </button>
        
        <div style={{ display: 'flex', gap: '5px' }}>
          <select 
            value={selectedAgent} 
            onChange={(e) => setSelectedAgent(e.target.value)}
            style={{ flex: 1, background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid #ef4444', padding: '4px' }}
          >
            <option value="">Select Target...</option>
            {aliveAgents.map(a => (
              <option key={a.agent_id} value={a.agent_id}>{a.agent_id}</option>
            ))}
          </select>
          <button 
            onClick={handleKillSpecific}
            disabled={!selectedAgent}
            style={{ 
              background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', 
              padding: '4px 8px', borderRadius: '4px', cursor: selectedAgent ? 'pointer' : 'not-allowed',
              fontFamily: 'Orbitron', fontSize: '0.7rem'
            }}
          >
            KILL
          </button>
        </div>

        <button 
          onClick={handleRespawn}
          style={{ 
            background: 'transparent', color: '#10b981', border: '1px dashed #10b981', 
            padding: '8px', borderRadius: '4px', cursor: 'pointer',
            fontFamily: 'Orbitron', fontSize: '0.8rem', marginTop: '5px'
          }}
        >
          + RESPAWN AGENT
        </button>
      </div>
    </div>
  );
}
