import React, { useState } from 'react';
import { ShieldAlert, Skull, Plus, AlertTriangle } from 'lucide-react';

export default function FaultInjector({ swarmState }) {
  const [selectedAgent, setSelectedAgent] = useState('');
  const [lastAction, setLastAction] = useState(null);

  const aliveAgents = swarmState?.agents?.filter(a => a.is_alive) || [];
  const deadAgents = swarmState?.agents?.filter(a => !a.is_alive) || [];

  const runAction = async (label, fn) => {
    try {
      await fn();
      setLastAction({ label, ok: true, ts: Date.now() });
    } catch (e) {
      setLastAction({ label, ok: false, ts: Date.now() });
      console.error(e);
    }
  };

  const handleKillLeader = () => runAction('Kill Leader', () =>
    fetch('/api/swarm/inject-fault/leader', { method: 'POST' })
  );

  const handleKillSpecific = () => {
    if (!selectedAgent) return;
    runAction(`Kill ${selectedAgent}`, () =>
      fetch('/api/swarm/inject-fault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: selectedAgent }),
      })
    );
    setSelectedAgent('');
  };

  const handleRespawn = () => runAction('Respawn Agent', () =>
    fetch('/api/swarm/respawn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
  );

  return (
    <div style={{
      background: 'rgba(239,68,68,0.06)',
      border: '1px solid rgba(239,68,68,0.22)',
      borderRadius: 14,
      padding: '12px 14px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <ShieldAlert size={14} color="#ef4444" />
        <span style={{ fontFamily: 'Orbitron', fontSize: '0.68rem', letterSpacing: '0.10em', color: '#ef4444', textTransform: 'uppercase' }}>
          Fault Injection
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, fontSize: '0.68rem', fontFamily: 'Space Mono' }}>
          <span style={{ color: '#10b981' }}>●{aliveAgents.length} alive</span>
          <span style={{ color: deadAgents.length > 0 ? '#ef4444' : 'rgba(100,116,139,0.55)' }}>
            ✗{deadAgents.length} dead
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {/* Kill Leader */}
        <button
          onClick={handleKillLeader}
          disabled={!swarmState?.leader_id}
          style={{
            background: swarmState?.leader_id ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.06)',
            border: `1px solid rgba(239,68,68,${swarmState?.leader_id ? '0.45' : '0.15'})`,
            borderRadius: 10, padding: '8px 12px',
            color: swarmState?.leader_id ? '#fca5a5' : 'rgba(252,165,165,0.30)',
            fontFamily: 'Orbitron', fontWeight: 700, fontSize: '0.70rem',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            cursor: swarmState?.leader_id ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all 140ms ease',
            boxShadow: swarmState?.leader_id ? '0 0 12px rgba(239,68,68,0.15)' : 'none',
          }}
        >
          <Skull size={13} />
          Kill Leader
          {swarmState?.leader_id && (
            <span style={{ marginLeft: 'auto', fontSize: '0.62rem', color: 'rgba(252,165,165,0.55)', fontFamily: 'Space Mono' }}>
              → {swarmState.leader_id}
            </span>
          )}
        </button>

        {/* Kill specific agent */}
        <div style={{ display: 'flex', gap: 6 }}>
          <select
            value={selectedAgent}
            onChange={e => setSelectedAgent(e.target.value)}
            style={{
              flex: 1, minWidth: 0,
              background: 'rgba(0,0,0,0.40)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8, padding: '7px 10px',
              color: selectedAgent ? '#fca5a5' : 'rgba(148,163,184,0.55)',
              fontFamily: 'Space Mono', fontSize: '0.72rem',
              outline: 'none',
            }}
          >
            <option value="">Target agent...</option>
            {aliveAgents.map(a => (
              <option key={a.agent_id} value={a.agent_id}>{a.agent_id}</option>
            ))}
          </select>
          <button
            onClick={handleKillSpecific}
            disabled={!selectedAgent}
            style={{
              background: selectedAgent ? 'rgba(239,68,68,0.20)' : 'transparent',
              border: `1px solid rgba(239,68,68,${selectedAgent ? '0.45' : '0.18'})`,
              borderRadius: 8, padding: '7px 12px',
              color: selectedAgent ? '#ef4444' : 'rgba(239,68,68,0.30)',
              fontFamily: 'Orbitron', fontSize: '0.65rem', fontWeight: 700,
              cursor: selectedAgent ? 'pointer' : 'not-allowed',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              transition: 'all 140ms ease',
            }}
          >
            KILL
          </button>
        </div>

        {/* Respawn */}
        <button
          onClick={handleRespawn}
          style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px dashed rgba(16,185,129,0.35)',
            borderRadius: 10, padding: '8px 12px',
            color: '#6ee7b7',
            fontFamily: 'Orbitron', fontSize: '0.68rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all 140ms ease',
          }}
        >
          <Plus size={13} />
          Respawn Agent
        </button>
      </div>

      {/* Last action feedback */}
      {lastAction && (Date.now() - lastAction.ts < 4000) && (
        <div style={{
          marginTop: 10,
          padding: '6px 10px',
          borderRadius: 8,
          background: lastAction.ok ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
          border: `1px solid ${lastAction.ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
          fontSize: '0.70rem',
          fontFamily: 'Space Mono',
          color: lastAction.ok ? '#6ee7b7' : '#fca5a5',
          display: 'flex', alignItems: 'center', gap: 6,
          animation: 'fadeSlideIn 0.2s ease',
        }}>
          <AlertTriangle size={11} />
          {lastAction.ok ? `✓ ${lastAction.label} dispatched` : `✗ ${lastAction.label} failed`}
        </div>
      )}
    </div>
  );
}
