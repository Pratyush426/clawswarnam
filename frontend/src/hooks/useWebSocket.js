import { useState, useEffect, useRef, useCallback } from 'react';

// For local dev, use the same host but port 8000. In production/docker, use window.location.host
const getWsUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Use the same host/port the frontend is on, and let the Vite proxy handle redirection to backend
  return `${protocol}//${window.location.host}/ws`;
};

const WS_URL = getWsUrl();

export function useWebSocket(demoMode = false) {
  const [events, setEvents] = useState([]);
  const [swarmState, setSwarmState] = useState({ agents: [], leader_id: null });
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const backoffRef = useRef(1000);

  const connect = useCallback(() => {
    if (demoMode) return; // Don't connect if in demo mode
    
    try {
      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onopen = () => {
        console.log('WebSocket Connected');
        setIsConnected(true);
        backoffRef.current = 1000; // Reset backoff
      };

      wsRef.current.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          
          // 1. Add to events log
          setEvents(prev => {
            const newEvents = [...prev, parsed];
            // Keep last 100 events to prevent memory issues
            if (newEvents.length > 100) return newEvents.slice(newEvents.length - 100);
            return newEvents;
          });

          // 2. Update swarm state if included in payload
          if (parsed.swarmState) {
            setSwarmState(prev => ({ ...prev, agents: parsed.swarmState }));
          }

          // 3. Handle specific state-mutating events
          if (parsed.event === 'leader_elected') {
            setSwarmState(prev => ({ ...prev, leader_id: parsed.data.leader_id }));
          }
          
        } catch (e) {
          console.error("Error parsing WS message:", e);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket Disconnected');
        setIsConnected(false);
        
        // Exponential backoff reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`Attempting to reconnect... (${backoffRef.current}ms)`);
          backoffRef.current = Math.min(backoffRef.current * 1.5, 30000);
          connect();
        }, backoffRef.current);
      };

      wsRef.current.onerror = (err) => {
        console.error('WebSocket Error:', err);
        wsRef.current.close();
      };
      
    } catch (e) {
      console.error("WebSocket Connection Error:", e);
    }
  }, [demoMode]);

  useEffect(() => {
    connect();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect on unmount
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  // Demo Mode Simulation
  useEffect(() => {
    if (!demoMode) return;
    
    setIsConnected(true);
    setSwarmState({
      leader_id: "agent-01",
      agents: Array.from({length: 5}, (_, i) => ({
        agent_id: `agent-0${i+1}`,
        role_label: i === 0 ? "Specialist: Research" : i === 1 ? "Emerging Coding" : "Generalist",
        composite_score: i === 0 ? 0.85 : i === 1 ? 0.68 : 0.50,
        skill_vector: {
          research: i === 0 ? 0.9 : 0.5,
          coding: i === 1 ? 0.75 : 0.5,
          writing: 0.5, critique: 0.5, planning: 0.5, synthesis: 0.5
        },
        is_alive: true,
        current_task: null,
        metrics: { tasks_completed: Math.floor(Math.random()*10), tasks_failed: 0, avg_response_time: 1.2 },
        specialization_strength: i === 0 ? 0.8 : i === 1 ? 0.4 : 0.0
      }))
    });
    
    const interval = setInterval(() => {
      setEvents(prev => {
        const fakeEvent = {
          event: "task_routed",
          timestamp: Date.now() / 1000,
          data: { task_id: `task-${Math.floor(Math.random()*1000)}`, agent_id: `agent-0${Math.floor(Math.random()*5)+1}`, skill_type: "research" }
        };
        const newEvents = [...prev, fakeEvent];
        return newEvents.length > 50 ? newEvents.slice(newEvents.length - 50) : newEvents;
      });
    }, 3000);
    
    return () => clearInterval(interval);
    
  }, [demoMode]);

  return { events, swarmState, isConnected };
}
