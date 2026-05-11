import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Clock, Shield } from 'lucide-react';

const SYSTEMS = [
  { key: 'clawswarm', label: 'ClawSwarm AI', color: '#ffbf00', glow: 'rgba(255,191,0,0.35)' },
  { key: 'single_agent', label: 'Single Agent', color: '#64748b', glow: 'rgba(100,116,139,0.20)' },
  { key: 'fixed_team', label: 'Fixed Team', color: '#475569', glow: 'rgba(71,85,105,0.20)' },
];

function MetricRow({ label, icon, unit, values, max, animate, lowerIsBetter = false }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ color: 'rgba(148,163,184,0.70)' }}>{icon}</span>
        <span style={{ fontFamily: 'Orbitron', fontSize: '0.72rem', letterSpacing: '0.10em', color: 'rgba(226,232,240,0.80)', textTransform: 'uppercase' }}>
          {label}
        </span>
        {lowerIsBetter && (
          <span style={{ fontSize: '0.65rem', color: 'rgba(148,163,184,0.55)', marginLeft: 4 }}>↓ lower is better</span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SYSTEMS.map(({ key, label: sysLabel, color, glow }) => {
          const raw = values[key];
          const pct = lowerIsBetter
            ? (1 - raw / max) * 100
            : (raw / max) * 100;
          const isWinner = lowerIsBetter
            ? raw === Math.min(...Object.values(values))
            : raw === Math.max(...Object.values(values));

          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Label */}
              <div style={{ width: 96, flexShrink: 0 }}>
                <div style={{ fontSize: '0.72rem', color: key === 'clawswarm' ? color : 'rgba(148,163,184,0.70)', fontWeight: key === 'clawswarm' ? 700 : 400, fontFamily: key === 'clawswarm' ? 'Orbitron' : 'Inter, sans-serif', letterSpacing: key === 'clawswarm' ? '0.04em' : 0 }}>
                  {sysLabel}
                </div>
              </div>

              {/* Bar track */}
              <div style={{ flex: 1, height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  height: '100%',
                  width: animate ? `${pct}%` : '0%',
                  background: isWinner
                    ? `linear-gradient(90deg, ${color}, ${color}BB)`
                    : `rgba(255,255,255,0.12)`,
                  borderRadius: 6,
                  transition: 'width 1.4s cubic-bezier(0.2,0.8,0.2,1)',
                  boxShadow: isWinner ? `0 0 10px ${glow}` : 'none',
                }} />
              </div>

              {/* Value */}
              <div style={{
                width: 50, textAlign: 'right', flexShrink: 0,
                fontFamily: 'Space Mono', fontSize: '0.75rem',
                color: isWinner ? color : 'rgba(148,163,184,0.60)',
                fontWeight: isWinner ? 700 : 400,
              }}>
                {typeof raw === 'number' ? raw.toFixed(2) : raw}{unit}
              </div>

              {/* Winner crown */}
              {isWinner && (
                <div style={{ width: 16, flexShrink: 0, fontSize: '11px', color: color }}>⟩</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WinnerBadge({ benchmark }) {
  const { clawswarm, single_agent, fixed_team } = benchmark;

  // Compute how much ClawSwarm wins
  const speedGain = ((single_agent.time_to_complete - clawswarm.time_to_complete) / single_agent.time_to_complete * 100).toFixed(0);
  const qualityGain = ((clawswarm.quality_score - single_agent.quality_score) / single_agent.quality_score * 100).toFixed(0);
  const resilienceGain = ((clawswarm.fault_resilience - single_agent.fault_resilience) / (single_agent.fault_resilience || 0.01) * 100).toFixed(0);

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,191,0,0.10), rgba(0,229,255,0.06))',
      border: '1px solid rgba(255,191,0,0.28)',
      borderRadius: 14, padding: '14px 18px', marginBottom: 20,
    }}>
      <div style={{ fontFamily: 'Orbitron', fontSize: '0.78rem', letterSpacing: '0.08em', color: '#ffbf00', marginBottom: 12 }}>
        ClawSwarm wins ↗
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {[
          { label: 'Faster', val: `${speedGain}%`, icon: <Clock size={13} /> },
          { label: 'Higher Quality', val: `+${qualityGain}%`, icon: <TrendingUp size={13} /> },
          { label: 'More Resilient', val: `${resilienceGain}%`, icon: <Shield size={13} /> },
        ].map(({ label, val, icon }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ color: 'rgba(253,230,138,0.80)', marginBottom: 4 }}>{icon}</div>
            <div style={{ fontFamily: 'Orbitron', fontSize: '1.05rem', color: '#ffbf00', fontWeight: 700, textShadow: '0 0 12px rgba(255,191,0,0.50)' }}>
              {val}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BenchmarkPanel({ benchmark }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (benchmark) {
      setAnimate(false);
      const t = setTimeout(() => setAnimate(true), 120);
      return () => clearTimeout(t);
    }
  }, [benchmark]);

  if (!benchmark) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'rgba(255,191,0,0.08)',
          border: '1px solid rgba(255,191,0,0.20)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <BarChart3 size={28} color="rgba(255,191,0,0.60)" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Orbitron', fontSize: '0.80rem', color: 'rgba(226,232,240,0.60)', letterSpacing: '0.06em' }}>
            Benchmark Pending
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 6, fontStyle: 'italic' }}>
            Complete a task to generate comparison data
          </div>
        </div>
      </div>
    );
  }

  const { clawswarm, single_agent, fixed_team } = benchmark;

  const maxTime = Math.max(clawswarm.time_to_complete, single_agent.time_to_complete, fixed_team.time_to_complete) * 1.05;

  return (
    <div style={{ padding: '4px 2px', animation: 'fadeSlideIn 0.4s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'rgba(255,191,0,0.10)', border: '1px solid rgba(255,191,0,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <BarChart3 size={16} color="#ffbf00" />
        </div>
        <div>
          <div style={{ fontFamily: 'Orbitron', fontSize: '0.80rem', letterSpacing: '0.08em', color: 'rgba(226,232,240,0.95)' }}>
            Architecture Comparison
          </div>
          <div style={{ fontSize: '0.70rem', color: 'var(--muted)', marginTop: 2 }}>
            ClawSwarm vs. Single Agent vs. Fixed Team
          </div>
        </div>
      </div>

      <WinnerBadge benchmark={benchmark} />

      <MetricRow
        label="Time to Complete"
        icon={<Clock size={14} />}
        unit="s"
        values={{ clawswarm: clawswarm.time_to_complete, single_agent: single_agent.time_to_complete, fixed_team: fixed_team.time_to_complete }}
        max={maxTime}
        animate={animate}
        lowerIsBetter
      />

      <MetricRow
        label="Quality Score"
        icon={<TrendingUp size={14} />}
        unit=""
        values={{ clawswarm: clawswarm.quality_score, single_agent: single_agent.quality_score, fixed_team: fixed_team.quality_score }}
        max={1.0}
        animate={animate}
      />

      <MetricRow
        label="Fault Resilience"
        icon={<Shield size={14} />}
        unit=""
        values={{ clawswarm: clawswarm.fault_resilience, single_agent: single_agent.fault_resilience, fixed_team: fixed_team.fault_resilience }}
        max={1.0}
        animate={animate}
      />
    </div>
  );
}
