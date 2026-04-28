import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import AgentNode from './AgentNode';

export default function SwarmVisualizer({ swarmState }) {
  const containerRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const simulationRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !swarmState || !swarmState.agents.length) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Prepare node data
    const newNodes = swarmState.agents.map(a => {
      // Find existing node to preserve position
      const existing = nodes.find(n => n.id === a.agent_id);
      return {
        ...existing, // preserve x, y, vx, vy
        id: a.agent_id,
        agent: a,
        isLeader: a.agent_id === swarmState.leader_id,
        radius: 30 + (a.composite_score * 20),
        // If dead, let it drift away
        isDead: !a.is_alive
      };
    });

    // We don't want to recreate the simulation on every data update, just update its nodes
    if (!simulationRef.current) {
      simulationRef.current = d3.forceSimulation()
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius(d => d.radius + 40).iterations(2))
        // High score agents pull closer to center
        .force("x", d3.forceX(width / 2).strength(d => d.isDead ? -0.1 : (d.isLeader ? 0.5 : d.agent.composite_score * 0.1)))
        .force("y", d3.forceY(height / 2).strength(d => d.isDead ? -0.1 : (d.isLeader ? 0.5 : d.agent.composite_score * 0.1)))
        .on("tick", () => {
          setNodes([...simulationRef.current.nodes()]);
        });
    }

    simulationRef.current.nodes(newNodes);
    simulationRef.current.alpha(0.3).restart();

  }, [swarmState.agents, swarmState.leader_id]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg width="100%" height="100%">
        <defs>
          <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255, 191, 0, 0.05)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        
        {/* Background glow in center */}
        <circle cx="50%" cy="50%" r="300" fill="url(#bgGlow)" />
        
        {nodes.map(node => (
          <AgentNode 
            key={node.id} 
            agent={node.agent} 
            isLeader={node.isLeader} 
            x={node.x} 
            y={node.y} 
          />
        ))}
      </svg>
      
      {/* Legend overlay */}
      <div style={{ position: 'absolute', bottom: '20px', left: '20px', padding: '10px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#94a3b8' }}>SWARM TOPOLOGY</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.7rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: 10, height: 10, background: '#ffbf00', borderRadius: '50%' }}></div> Leader
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: 10, height: 10, background: '#00e5ff', borderRadius: '50%' }}></div> Specialist
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: 10, height: 10, background: '#3b82f6', borderRadius: '50%' }}></div> Emerging
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: 10, height: 10, background: '#94a3b8', borderRadius: '50%' }}></div> Generalist
          </div>
        </div>
      </div>
    </div>
  );
}
