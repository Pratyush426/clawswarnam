import React, { useEffect, useState } from 'react';

export default function BenchmarkPanel({ benchmark }) {
  // Use local state to trigger animation mount
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (benchmark) {
      setAnimate(false);
      const timer = setTimeout(() => setAnimate(true), 100);
      return () => clearTimeout(timer);
    }
  }, [benchmark]);

  if (!benchmark) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8' }}>
        <p>Complete a task to view benchmark comparison.</p>
      </div>
    );
  }

  const { clawswarm, single_agent, fixed_team } = benchmark;

  const BarGroup = ({ label, max, val1, val2, val3, reverseColors = false }) => {
    // For time, lower is better. For others, higher is better.
    const p1 = (val1 / max) * 100;
    const p2 = (val2 / max) * 100;
    const p3 = (val3 / max) * 100;

    return (
      <div style={{ marginBottom: '2rem' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#e2e8f0' }}>{label}</h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* ClawSwarm Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '100px', fontSize: '0.8rem', color: '#ffbf00', fontWeight: 'bold' }}>ClawSwarm</div>
            <div style={{ flex: 1, height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: animate ? `${p1}%` : '0%', 
                background: reverseColors && p1 > p2 ? '#f59e0b' : '#ffbf00',
                transition: 'width 1.5s cubic-bezier(0.2, 0.8, 0.2, 1)'
              }}></div>
            </div>
            <div style={{ width: '50px', fontSize: '0.8rem', textAlign: 'right' }}>{val1.toFixed(2)}</div>
          </div>

          {/* Single Agent Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '100px', fontSize: '0.8rem', color: '#94a3b8' }}>Single Agent</div>
            <div style={{ flex: 1, height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: animate ? `${p2}%` : '0%', 
                background: '#64748b',
                transition: 'width 1s ease-out 0.2s'
              }}></div>
            </div>
            <div style={{ width: '50px', fontSize: '0.8rem', textAlign: 'right' }}>{val2.toFixed(2)}</div>
          </div>

          {/* Fixed Team Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '100px', fontSize: '0.8rem', color: '#94a3b8' }}>Fixed Team</div>
            <div style={{ flex: 1, height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: animate ? `${p3}%` : '0%', 
                background: '#64748b',
                transition: 'width 1s ease-out 0.4s'
              }}></div>
            </div>
            <div style={{ width: '50px', fontSize: '0.8rem', textAlign: 'right' }}>{val3.toFixed(2)}</div>
          </div>
        </div>
      </div>
    );
  };

  // Find maxes for scaling
  const maxTime = Math.max(clawswarm.time_to_complete, single_agent.time_to_complete, fixed_team.time_to_complete) * 1.1;

  return (
    <div style={{ padding: '10px' }}>
      <h3 style={{ fontFamily: 'Orbitron', color: '#ffbf00', borderBottom: '1px solid rgba(255,191,0,0.3)', paddingBottom: '10px', marginBottom: '20px' }}>
        Architecture Comparison
      </h3>
      
      <BarGroup 
        label="Time to Complete (seconds) ↓" 
        max={maxTime} 
        val1={clawswarm.time_to_complete} 
        val2={single_agent.time_to_complete} 
        val3={fixed_team.time_to_complete}
        reverseColors={true}
      />
      
      <BarGroup 
        label="Quality Score (0-1) ↑" 
        max={1.0} 
        val1={clawswarm.quality_score} 
        val2={single_agent.quality_score} 
        val3={fixed_team.quality_score}
      />
      
      <BarGroup 
        label="Fault Resilience (0-1) ↑" 
        max={1.0} 
        val1={clawswarm.fault_resilience} 
        val2={single_agent.fault_resilience} 
        val3={fixed_team.fault_resilience}
      />
    </div>
  );
}
