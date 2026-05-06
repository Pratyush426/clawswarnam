# ClawSwarm AI - Frontend Architecture Documentation

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Core Components](#core-components)
5. [State Management](#state-management)
6. [Real-Time Communication](#real-time-communication)
7. [Visualization System](#visualization-system)
8. [Component Deep Dives](#component-deep-dives)
9. [Styling & Design System](#styling--design-system)
10. [Development & Deployment](#development--deployment)

---

## Overview

The **ClawSwarm AI Frontend** is a modern React-based single-page application (SPA) that provides real-time visualization and monitoring of the multi-agent swarm system. It delivers live insights into agent specialization, task execution, swarm topology, and system health through an interactive dashboard.

### Key Features

- **Live Swarm Visualization**: Real-time D3.js force-directed graph showing agent relationships
- **Agent Scoreboard**: Real-time metrics on individual agent performance and specialization
- **Task Console**: Live event stream showing task decomposition, routing, scoring
- **Benchmark Dashboard**: Performance metrics and comparative analysis
- **Fault Injection UI**: Test system resilience by simulating agent failures
- **WebSocket Integration**: Bi-directional real-time communication with backend
- **Demo Mode**: Standalone operation without backend for UI prototyping

### User Interface Philosophy

- **Minimal, High-Impact Design**: Dark theme with accent colors (gold #ffbf00, cyan #00e5ff)
- **Information Density**: Pack relevant data without overwhelming
- **Responsiveness**: Immediate feedback to user actions
- **Accessibility**: Keyboard shortcuts, clear labels, high contrast

---

## Technology Stack

### Core Framework

```json
{
  "runtime": "Node.js 18+",
  "framework": "React 18.2.0",
  "build_tool": "Vite 5.0+",
  "visualization": "D3.js 7.8.5",
  "icons": "Lucide React 0.292.0",
  "styling": "Inline CSS + CSS Grid/Flexbox",
  "http_client": "Fetch API (built-in)"
}
```

### Why These Choices?

| Technology | Reason |
|-----------|--------|
| **React 18** | Component-based UI, hooks API, concurrent rendering |
| **Vite** | Ultra-fast HMR, instant cold start, small bundle |
| **D3.js** | Powerful graph visualization, force-directed layouts |
| **Lucide React** | Lightweight, modern SVG icons, tree-shakeable |
| **Inline CSS** | No build step, direct control, instant styling |

### Why NOT Others?

- **No Redux/Zustand**: Overkill for single WebSocket data source; local React state sufficient
- **No TypeScript**: Quick iteration priority; vanilla JS faster to prototype
- **No CSS Framework**: Inline CSS keeps bundle tiny (~200KB total)

---

## Project Structure

```
frontend/
├── package.json                 # Dependencies & scripts
├── vite.config.js              # Vite build configuration
├── index.html                  # Entry HTML
├── src/
│   ├── main.jsx                # React entry point
│   ├── App.jsx                 # Main app container & routing
│   │
│   ├── components/             # UI components (dumb/presentational)
│   │   ├── AgentNode.jsx       # Individual agent dot + label
│   │   ├── AgentScoreboard.jsx # Agent metrics table
│   │   ├── BenchmarkPanel.jsx  # Performance comparison charts
│   │   ├── FaultInjector.jsx   # Simulate failures UI
│   │   ├── SwarmVisualizer.jsx # D3 force-directed graph
│   │   └── TaskConsole.jsx     # Event log viewer
│   │
│   └── hooks/                  # Custom React hooks
│       └── useWebSocket.js     # WebSocket connection & event handling
│
└── public/                     # Static assets (favicons, etc.)
```

### File Size Budget

```
Total Bundle: ~300–400 KB
├── React:        ~40 KB (minified)
├── D3.js:        ~60 KB (minified)
├── App code:     ~15 KB
├── Other deps:   ~15 KB
└── (Browser cache, GZIP compression reduce actual transfer to ~80 KB)
```

---

## Core Components

### Component Hierarchy

```
App (Container)
├── Header
│   ├── Logo + Title
│   ├── SIS (Swarm Intelligence Score)
│   ├── Connection Status
│   └── Demo Mode Toggle
│
├── Main Content (2-column layout)
│   ├── Left (60%): SwarmVisualizer (D3 graph)
│   │
│   └── Right (40%): Tab Container
│       ├── TaskConsole (Event log)
│       ├── AgentScoreboard (Metrics table)
│       └── BenchmarkPanel (Perf charts)
│
└── Footer
    ├── Task Input Form
    ├── Control Buttons
    └── Fault Injector
```

### Data Flow

```
Backend (WebSocket events)
    ↓ (useWebSocket hook captures)
    ↓
App state: { events[], swarmState, isConnected }
    ↓ (distributes via props)
    ├─→ SwarmVisualizer (swarmState)
    ├─→ TaskConsole (events)
    ├─→ AgentScoreboard (swarmState)
    └─→ BenchmarkPanel (events)
    ↓ (React re-renders affected components)
    ↓
DOM updates (browser paint)
    ↓
User sees updated visualization
```

---

## State Management

### App-Level State

```javascript
// In App.jsx
const [demoMode, setDemoMode] = useState(false);
const { events, swarmState, isConnected } = useWebSocket(demoMode);
const [activeTab, setActiveTab] = useState('console');
const [taskInput, setTaskInput] = useState('');
const [isProcessing, setIsProcessing] = useState(false);
const [lastBenchmark, setLastBenchmark] = useState(null);
```

### State Purposes

| State | Type | Purpose | Scope |
|-------|------|---------|-------|
| `demoMode` | boolean | Enable/disable real WebSocket | App-wide |
| `events` | array | Stream of backend events | App-wide |
| `swarmState` | object | Snapshot of agent pool state | App-wide |
| `isConnected` | boolean | WebSocket connection status | App-wide |
| `activeTab` | string | Currently visible panel | App-wide |
| `taskInput` | string | User's task input textarea | App-wide |
| `isProcessing` | boolean | Task submission in progress | App-wide |
| `lastBenchmark` | object | Latest benchmark result | App-wide |

### SwarmState Structure

```javascript
{
  agents: [
    {
      agent_id: "agent-0",
      skill_vector: {
        research: 0.71,
        coding: 0.52,
        writing: 0.48,
        critique: 0.72,
        planning: 0.55,
        synthesis: 0.49
      },
      role_label: "Specialist: Critique",
      is_alive: true,
      composite_score: 0.597,
      metrics: {
        tasks_completed: 12,
        tasks_failed: 2,
        total_response_time: 145.3
      },
      current_task: null  // null if idle, else { task_id, ... }
    },
    // ... more agents
  ],
  leader_id: "agent-2",
  total_tasks_completed: 47
}
```

### Events Structure

```javascript
{
  event: "task_completed",        // event type
  data: {                         // event-specific payload
    task_id: "subtask-123",
    agent_id: "agent-2",
    score: 0.87
  },
  timestamp: 1714567890.123,      // server timestamp
  swarmState: { ... }             // full state snapshot (optional)
}
```

---

## Real-Time Communication

### The useWebSocket Hook

Located in `frontend/src/hooks/useWebSocket.js`, this custom hook abstracts all WebSocket complexity.

#### Hook Interface

```javascript
const { events, swarmState, isConnected } = useWebSocket(demoMode);
```

#### Responsibilities

1. **Connection Management**
   - Open WebSocket to `ws://localhost:8000/ws`
   - Reconnect on disconnect with exponential backoff
   - Clean up on component unmount

2. **Event Buffering**
   - Store incoming events in array (max last 100)
   - Trigger component re-render on new event

3. **State Extraction**
   - Parse `swarmState` from event payloads
   - Merge updates (don't overwrite, patch)

4. **Demo Mode**
   - If `demoMode=true`, generate mock events
   - Simulate delays, agent failures, specialization
   - No backend required

#### Code Structure

```javascript
import { useEffect, useState } from 'react';

export const useWebSocket = (demoMode = false) => {
  const [events, setEvents] = useState([]);
  const [swarmState, setSwarmState] = useState({
    agents: [],
    leader_id: null,
    total_tasks_completed: 0
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (demoMode) {
      // Generate demo events
      return startDemoMode(setEvents, setSwarmState);
    }

    // Real WebSocket connection
    const ws = new WebSocket(`ws://${window.location.host}/ws`);
    
    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setEvents(prev => [...prev.slice(-99), message]);  // Keep last 100
      if (message.swarmState) {
        setSwarmState(message.swarmState);
      }
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Reconnect logic here...
    };

    return () => ws.close();
  }, [demoMode]);

  return { events, swarmState, isConnected };
};
```

#### Demo Mode Generator

Generates realistic mock events for UI testing:

```javascript
const startDemoMode = (setEvents, setSwarmState) => {
  // Initialize 5 mock agents
  const agents = Array.from({ length: 5 }, (_, i) => ({
    agent_id: `agent-${i}`,
    skill_vector: {
      research: 0.5 + Math.random() * 0.2,
      coding: 0.5 + Math.random() * 0.2,
      // ... etc
    },
    role_label: "Generalist",
    is_alive: true,
    composite_score: 0.5,
    metrics: { tasks_completed: 0, tasks_failed: 0, total_response_time: 0 }
  }));

  // Simulate task lifecycle
  const interval = setInterval(() => {
    // Generate random events (task_started, task_routed, role_evolved, etc.)
    // Update agents' skill vectors gradually
    // Simulate failures and recoveries
  }, 2000);

  return () => clearInterval(interval);
};
```

---

## Visualization System

### D3.js Force-Directed Graph

The SwarmVisualizer component uses D3's force simulation to create an interactive, physics-based network graph.

#### How It Works

```javascript
// Initialize D3 force simulation
const simulation = d3.forceSimulation()
  // Repulsive force (agents push away from each other)
  .force("charge", d3.forceManyBody().strength(-200))
  // Gravitational center (keeps graph centered)
  .force("center", d3.forceCenter(width / 2, height / 2))
  // Collision avoidance (agents don't overlap)
  .force("collide", d3.forceCollide()
    .radius(d => d.radius + 40)
    .iterations(2))
  // High-performing agents pulled toward center (bias)
  .force("x", d3.forceX(width / 2)
    .strength(d => d.isLeader ? 0.5 : d.agent.composite_score * 0.1))
  .force("y", d3.forceY(height / 2)
    .strength(d => d.isLeader ? 0.5 : d.agent.composite_score * 0.1))
  .on("tick", () => {
    // Update node positions on each simulation step
    setNodes([...simulation.nodes()]);
  });

// Update simulation when data changes
simulation.nodes(newNodes);
simulation.alpha(0.3).restart();  // "Heat" simulation to restart movements
```

#### Visual Encoding

| Property | Visual | Meaning |
|----------|--------|---------|
| **Position (X, Y)** | Graph layout | Network topology (clusters = collaboration) |
| **Radius** | Circle size | Composite score (larger = stronger) |
| **Color** | Hue | Role specialization |
| **Border** | Highlight | Leader status |
| **Opacity** | Transparency | Alive/dead status |

#### Color Scheme

```javascript
const roleColors = {
  'Generalist': '#94a3b8',              // Gray
  'Emerging ...': '#3b82f6',            // Blue
  'Specialist: ...': '#00e5ff',         // Cyan
  'Leader': '#ffbf00'                   // Gold
};
```

#### Agent Node Rendering

```javascript
// SVG circle for each agent
<circle
  cx={node.x}
  cy={node.y}
  r={node.radius}
  fill={node.isLeader ? '#ffbf00' : roleToColor(node.agent.role_label)}
  opacity={node.agent.is_alive ? 1.0 : 0.3}
  stroke={node.isLeader ? '#fff' : 'none'}
  strokeWidth={3}
/>

// Label below circle
<text x={node.x} y={node.y + node.radius + 15}>
  {node.agent.agent_id}
</text>
```

### Performance Optimization

D3 simulations can be computationally expensive. We optimize by:

1. **Reuse Simulation**: Only initialize once; update nodes in-place
2. **Batch Updates**: Collect all position updates before re-render
3. **Limit Frequency**: Cap frame rate to 60 FPS via requestAnimationFrame
4. **SVG Canvas**: Use SVG (not Canvas) for better accessibility and zoom

---

## Component Deep Dives

### 1. AgentNode.jsx

Renders a single agent as a visual node in the swarm graph.

```javascript
export default function AgentNode({ agent, isLeader, x, y }) {
  return (
    <g>
      {/* Leader crown indicator */}
      {isLeader && (
        <polygon
          points={`${x},${y - 50} ${x + 10},${y - 35} ${x - 10},${y - 35}`}
          fill="#ffbf00"
        />
      )}
      
      {/* Main circle */}
      <circle
        cx={x}
        cy={y}
        r={30 + agent.composite_score * 20}
        fill={roleToColor(agent.role_label)}
        opacity={agent.is_alive ? 1 : 0.3}
        style={{ cursor: 'pointer' }}
        onClick={() => showAgentDetails(agent)}
      />
      
      {/* Label */}
      <text
        x={x}
        y={y + 50}
        textAnchor="middle"
        fontSize="12"
        fill="#e2e8f0"
      >
        {agent.agent_id}
      </text>
      
      {/* Metrics tooltip (on hover) */}
      <title>
        {agent.role_label}
        Tasks: {agent.metrics.tasks_completed} | Failures: {agent.metrics.tasks_failed}
      </title>
    </g>
  );
}

const roleToColor = (roleLabel) => {
  if (roleLabel === 'Generalist') return '#94a3b8';
  if (roleLabel.includes('Emerging')) return '#3b82f6';
  if (roleLabel.includes('Specialist')) return '#00e5ff';
  return '#e2e8f0';
};
```

### 2. SwarmVisualizer.jsx

Main D3 visualization component managing the force simulation.

**Key Features:**
- D3 force-directed simulation for network topology
- Real-time node position updates
- Leader highlighting
- Dead agent fading
- SVG rendering with accessibility

**State:**
- `nodes`: Array of node objects with x, y coordinates
- `simulationRef`: Reference to D3 simulation object

**Lifecycle:**
1. On mount: Initialize simulation
2. On data update: Feed new nodes to simulation, restart
3. On tick: Update React state with new positions
4. Continuous: D3 fire "tick" events at 60 FPS

### 3. AgentScoreboard.jsx

Table view of all agents with detailed metrics.

```javascript
export default function AgentScoreboard({ swarmState }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
            <th>Agent</th>
            <th>Role</th>
            <th>Score</th>
            <th>Completed</th>
            <th>Failed</th>
            <th>Top Skill</th>
          </tr>
        </thead>
        <tbody>
          {swarmState.agents.map(agent => (
            <tr key={agent.agent_id} style={{
              opacity: agent.is_alive ? 1 : 0.5,
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <td>{agent.agent_id}</td>
              <td style={{ color: roleToColor(agent.role_label) }}>
                {agent.role_label}
              </td>
              <td>{agent.composite_score.toFixed(3)}</td>
              <td>{agent.metrics.tasks_completed}</td>
              <td>{agent.metrics.tasks_failed}</td>
              <td>{getTopSkill(agent.skill_vector)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 4. TaskConsole.jsx

Real-time event log viewer showing task lifecycle.

```javascript
export default function TaskConsole({ events }) {
  const getEventColor = (eventType) => {
    const colors = {
      'task_started': '#3b82f6',        // Blue
      'task_routed': '#8b5cf6',         // Purple
      'task_completed': '#10b981',      // Green
      'role_evolved': '#f59e0b',        // Amber
      'agent_failed': '#ef4444',        // Red
      'leader_elected': '#ffbf00'       // Gold
    };
    return colors[eventType] || '#e2e8f0';
  };

  return (
    <div style={{ overflowY: 'auto', maxHeight: '400px' }}>
      {events.slice().reverse().map((event, idx) => (
        <div
          key={idx}
          style={{
            padding: '0.5rem',
            margin: '0.25rem 0',
            borderLeft: `3px solid ${getEventColor(event.event)}`,
            background: 'rgba(255,255,255,0.05)'
          }}
        >
          <strong style={{ color: getEventColor(event.event) }}>
            {event.event.toUpperCase()}
          </strong>
          <pre style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
            {JSON.stringify(event.data, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}
```

### 5. BenchmarkPanel.jsx

Displays performance metrics and comparison charts.

```javascript
export default function BenchmarkPanel({ benchmark }) {
  if (!benchmark) {
    return <div>No benchmark data yet</div>;
  }

  return (
    <div>
      <h3>Performance Summary</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <MetricCard
          title="Total Tasks"
          value={benchmark.total_tasks_completed}
        />
        <MetricCard
          title="Success Rate"
          value={`${(benchmark.success_rate * 100).toFixed(1)}%`}
        />
        <MetricCard
          title="Avg Response Time"
          value={`${benchmark.avg_response_time.toFixed(2)}s`}
        />
        <MetricCard
          title="Specialization Index"
          value={benchmark.specialization_index.toFixed(3)}
        />
      </div>
      
      <h3>Agent Performance</h3>
      <AgentComparison agents={benchmark.agents} />
    </div>
  );
}
```

### 6. FaultInjector.jsx

UI for simulating failures and testing system resilience.

```javascript
export default function FaultInjector() {
  const [selectedAgent, setSelectedAgent] = useState(null);
  
  const killAgent = async (agentId) => {
    await fetch('/fault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agentId })
    });
  };

  return (
    <div style={{ padding: '1rem', background: 'rgba(255, 0, 0, 0.1)' }}>
      <h3>⚠️ Fault Injection</h3>
      <p>Simulate agent failures to test resilience:</p>
      <select
        value={selectedAgent || ''}
        onChange={(e) => setSelectedAgent(e.target.value)}
      >
        <option value="">Select agent...</option>
        {/* Populated with agent list */}
      </select>
      <button onClick={() => killAgent(selectedAgent)}>
        Kill Agent
      </button>
    </div>
  );
}
```

---

## Styling & Design System

### Design Philosophy

**ClawSwarm UI** uses a **minimal, high-tech aesthetic** with:
- Dark background (`#020408`) for reduced eye strain
- Neon accent colors: Gold (`#ffbf00`), Cyan (`#00e5ff`)
- Monospace fonts (Space Mono) for data presentation
- High contrast for accessibility
- Inline CSS for instant styling (no FOUC)

### Color Palette

```javascript
const theme = {
  // Backgrounds
  bg_primary: '#020408',              // Nearly black
  bg_secondary: 'rgba(0,0,0,0.3)',    // Transparent overlay
  bg_tertiary: 'rgba(255,255,255,0.05)',  // Subtle surface

  // Text
  text_primary: '#e2e8f0',             // Light gray
  text_secondary: '#94a3b8',           // Medium gray
  text_accent: '#ffbf00',              // Gold

  // Borders
  border_subtle: 'rgba(255,255,255,0.1)',
  border_bright: 'rgba(255,255,255,0.2)',

  // Semantic
  success: '#10b981',                  // Green
  warning: '#f59e0b',                  // Amber
  error: '#ef4444',                    // Red
  info: '#3b82f6',                     // Blue
  
  // Role specialization
  role_generalist: '#94a3b8',
  role_emerging: '#3b82f6',
  role_specialist: '#00e5ff',
  role_leader: '#ffbf00'
};
```

### Common CSS Patterns

```javascript
// Flex container
{
  display: 'flex',
  flexDirection: 'row' | 'column',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '1rem'
}

// Grid layout
{
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',  // 2 equal columns
  gap: '1.5rem'
}

// Button
{
  padding: '0.8rem 1rem',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'Orbitron',
  textTransform: 'uppercase',
  fontSize: '0.9rem',
  color: '#ffbf00',
  transition: 'all 0.2s'
}

// Hover effect
':hover': {
  color: '#fff',
  background: 'rgba(255, 191, 0, 0.1)'
}

// Scrollable container
{
  overflowY: 'auto',
  maxHeight: '400px',
  scrollBehavior: 'smooth'
}
```

### Responsive Design

```javascript
// Mobile-first approach
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',  // Stack vertically on mobile
    // On desktop (via media query):
    // flexDirection: 'row',
    // flex: '1 0 60%', flex: '0 0 40%'
  }
};

// Media query (inline CSS can't use media queries; recommend external CSS for responsive)
// Workaround: Use container queries or resize listeners
```

---

## Development & Deployment

### Development Workflow

```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Start dev server with HMR
npm run dev
# → http://localhost:5173

# 3. Backend running separately
cd ../backend
python -m uvicorn backend.main:app --reload
# → http://localhost:8000

# Frontend automatically connects to ws://localhost:8000/ws
```

### Environment Configuration

```javascript
// frontend/src/main.jsx or App.jsx
const API_URL = process.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = process.env.VITE_WS_URL || 'ws://localhost:8000';
```

### Build Process

```bash
# Production build
npm run build
# → Outputs to dist/

# Preview production build locally
npm run preview
# → http://localhost:5173

# Deploy dist/ folder to static hosting
# (Netlify, Vercel, AWS S3, etc.)
```

### Docker Deployment

```dockerfile
# Dockerfile.frontend
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
# Docker Compose
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    environment:
      - VITE_API_URL=http://backend:8000
      - VITE_WS_URL=ws://backend:8000
    depends_on:
      - backend
```

### Production Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure API/WebSocket URLs for production domain
- [ ] Enable CORS on backend for production domain
- [ ] Use WSS (WebSocket Secure) for HTTPS sites
- [ ] Set proper cache headers (index.html: no-cache, bundle.js: immutable)
- [ ] Enable GZIP compression on server
- [ ] Configure security headers (CSP, X-Frame-Options)
- [ ] Test WebSocket connection on production server
- [ ] Implement error boundary for graceful error handling
- [ ] Set up monitoring/logging for frontend errors

---

## Key UX Interactions

### Submitting a Task

```
1. User types task description in footer input
2. Presses Enter or clicks "Submit" button
3. Button shows loading spinner (isProcessing=true)
4. Task input disabled & cleared
5. Frontend sends POST /task to backend
6. WebSocket receives "task_started" event
7. Console tab auto-activates, shows decomposition
8. Events stream in real-time as subtasks execute
9. UI updates with agent specializations (role_evolved)
10. Final result appears in console
11. isProcessing=false, input re-enabled
```

### Monitoring Specialization

```
1. Open Scoreboard tab
2. Scroll through agent metrics
3. Watch skill vectors change in real-time
4. Role labels update as skills diverge:
   - "Generalist" (< 0.55 top skill)
   - "Emerging [Skill]" (0.55–0.70)
   - "Specialist: [Skill]" (>= 0.70)
5. Green dot next to leader in AgentNode
6. Dead agents fade in SwarmVisualizer
```

### Testing Resilience

```
1. Open Fault Injector panel
2. Select an agent from dropdown
3. Click "Kill Agent"
4. In console, watch:
   - "agent_failed" event appears
   - In-flight task reassigned
   - "leader_elected" if leader died
   - "swarm_reorganized" event
5. In visualizer, see agent fade out
6. Task reappears on new agent
7. Swarm continues executing
```

---

## Performance Metrics & SIS (Swarm Intelligence Score)

### SIS Computation

The **Swarm Intelligence Score** is a composite metric shown in the header:

```javascript
const computeSIS = () => {
  const totalTasks = swarmState.agents.reduce(
    (acc, a) => acc + a.metrics.tasks_completed, 0
  );
  const totalFails = swarmState.agents.reduce(
    (acc, a) => acc + a.metrics.tasks_failed, 0
  );
  const avgQuality = swarmState.agents.reduce(
    (acc, a) => acc + a.composite_score, 0
  ) / swarmState.agents.length;

  // Formula: (tasks * quality) / (failures + 1)
  const score = (totalTasks * avgQuality * 100) / ((totalFails * 5) + 1);
  return Math.min(999, Math.round(score || 0));
};
```

### Interpretation

- **SIS < 100**: Swarm is still warming up / learning
- **SIS 100–300**: Good progress, agents specializing
- **SIS 300–500**: Excellent, high task completion
- **SIS > 500**: Exceptional, mature swarm with strong specialization

---

## Advanced Features

### Real-Time Lag Detection

```javascript
const calculateLatency = () => {
  const lastEvent = events[events.length - 1];
  if (!lastEvent) return 0;
  
  const now = Date.now() / 1000;
  return now - lastEvent.timestamp;
};

// Show latency in header if > 2 seconds
{isConnected && calculateLatency() > 2 && (
  <span style={{ color: '#f59e0b' }}>
    ⚠️ Lag: {calculateLatency().toFixed(1)}s
  </span>
)}
```

### Event Filtering

```javascript
// Filter events by type
const filterEvents = (events, eventType) => {
  return events.filter(e => e.event.includes(eventType));
};

// Usage
const roleEvolutions = filterEvents(events, 'role_evolved');
```

### Agent Comparison

```javascript
// Compare two agents' specialization
const compareAgents = (agent1, agent2) => {
  return Object.keys(agent1.skill_vector).map(skill => ({
    skill,
    agent1Score: agent1.skill_vector[skill],
    agent2Score: agent2.skill_vector[skill],
    delta: agent2.skill_vector[skill] - agent1.skill_vector[skill]
  }));
};
```

---

## Accessibility

### WCAG 2.1 Compliance

- [ ] **Color Contrast**: Text on background meets 4.5:1 minimum
- [ ] **Keyboard Navigation**: All interactive elements accessible via Tab
- [ ] **ARIA Labels**: Buttons have descriptive labels
- [ ] **Alt Text**: Icons have title attributes
- [ ] **Semantic HTML**: Use `<button>`, `<label>`, not `<div>` for interactive

### Keyboard Shortcuts (Future Enhancement)

```
Ctrl+Enter     Submit task from any focus
Tab            Navigate between panels
1              Switch to Console tab
2              Switch to Scoreboard tab
3              Switch to Benchmark tab
R              Refresh data
D              Toggle Demo Mode
```

---

## Troubleshooting

### WebSocket Connection Issues

```
Symptom: "DISCONNECTED" status in header
Debug:
  1. Check backend is running: curl http://localhost:8000/health
  2. Check WebSocket URL: browser console → WS_URL
  3. Check CORS: backend logs for "connection refused"
  4. Check firewall: can you telnet localhost 8000?
  5. Try demo mode: Enable to test UI without backend
```

### Visualization Not Updating

```
Symptom: SwarmVisualizer shows but D3 graph doesn't update
Debug:
  1. Check useWebSocket hook: console.log(swarmState)
  2. Verify events arriving: check TaskConsole for events
  3. Verify D3 ref: console.log(simulationRef.current)
  4. Check event loop: Is React re-rendering? (React DevTools)
```

### High Latency

```
Symptom: Events delayed, updates lag
Debug:
  1. Reduce event buffer size (currently 100, try 20)
  2. Check network tab: WebSocket message size
  3. Check backend: Is it slow to score/route?
  4. Check machine: High CPU/memory usage?
  5. Reduce D3 simulation resolution
```

---

## Future Enhancements

1. **Export Visualizations**: Download graph as PNG/SVG
2. **Persistent Storage**: Save/load benchmark results
3. **Multi-Swarm Comparison**: Side-by-side swarm comparison
4. **Agent Grouping**: Cluster agents by specialization
5. **Task Replay**: Re-run specific task sequences
6. **Dark/Light Theme Toggle**: User preference
7. **Mobile Responsive**: Vertical layout for small screens
8. **Advanced Filtering**: Search agents, tasks, events
9. **Real-time Alerts**: Notify on failures, anomalies
10. **Performance Profiling**: Flamecharts, time analysis

---

## Summary

The **ClawSwarm AI Frontend** is a modern, real-time visualization dashboard built with React, D3.js, and WebSocket. It provides:

1. **Live Monitoring**: Real-time agent state, task execution, specialization
2. **Interactive Visualization**: Force-directed graph showing swarm topology
3. **Event Streaming**: Task console with color-coded event types
4. **Performance Dashboard**: Benchmarks, metrics, comparisons
5. **Fault Injection**: Test system resilience with simulated failures
6. **Demo Mode**: Standalone UI testing without backend
7. **Responsive Design**: Desktop-first, high-contrast aesthetic
8. **Zero Dependencies**: Minimal bundle size (~300 KB)

The architecture prioritizes **clarity, responsiveness, and real-time feedback**, enabling users to understand swarm behavior, monitor specialization, and validate system resilience at a glance.

---

## References

- **React Docs**: https://react.dev
- **Vite Docs**: https://vitejs.dev
- **D3.js Docs**: https://d3js.org
- **WebSocket API**: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- **WCAG Accessibility**: https://www.w3.org/WAI/WCAG21/quickref/
- **Lucide React Icons**: https://lucide.dev
