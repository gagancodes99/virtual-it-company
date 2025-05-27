# Sprint 1 - Weeks 3-4

## Week 3: Workflow Engine (June 10 - June 16)

### Task 14: Add n8n to Docker Compose
**ID**: WF-001  
**Priority**: P0 - Critical  
**Estimated Hours**: 2 hours  
**Dependencies**: None  
**Required Skills**: Docker, n8n, Environment Configuration

**Description**:  
Integrate n8n workflow automation platform into the Docker environment for visual workflow management.

**Acceptance Criteria**:
- [ ] Add n8n service to docker-compose.yml
- [ ] Configure PostgreSQL for n8n persistence
- [ ] Set up authentication for n8n
- [ ] Configure webhook URL
- [ ] Test n8n startup and access
- [ ] Document access credentials

**Docker Configuration**:
```yaml
# docker-compose.yml addition
n8n:
  image: n8nio/n8n:latest
  container_name: vitc-n8n
  ports:
    - "5678:5678"
  environment:
    - N8N_BASIC_AUTH_ACTIVE=true
    - N8N_BASIC_AUTH_USER=${N8N_USER:-admin}
    - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD:-password}
    - N8N_HOST=localhost
    - N8N_PORT=5678
    - N8N_PROTOCOL=http
    - DB_TYPE=postgresdb
    - DB_POSTGRESDB_HOST=postgres
    - DB_POSTGRESDB_PORT=5432
    - DB_POSTGRESDB_DATABASE=n8n
    - DB_POSTGRESDB_USER=postgres
    - DB_POSTGRESDB_PASSWORD=password
    - N8N_WEBHOOK_URL=http://localhost:5678/
  volumes:
    - n8n_data:/home/node/.n8n
  depends_on:
    - postgres
    - redis
  networks:
    - virtual-it-network
```

---

### Task 15: Create n8n Webhook Endpoints
**ID**: WF-002  
**Priority**: P0 - Critical  
**Estimated Hours**: 4 hours  
**Dependencies**: WF-001  
**Required Skills**: n8n, Webhooks, API Design

**Description**:  
Set up webhook endpoints in n8n for triggering workflows from external events.

**Acceptance Criteria**:
- [ ] Create project creation webhook
- [ ] Create task assignment webhook
- [ ] Create status update webhook
- [ ] Configure webhook authentication
- [ ] Test webhook responses
- [ ] Document webhook URLs and payloads

**Webhook Templates**:
```json
{
  "name": "New Project Webhook",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "new-project",
        "responseMode": "onReceived",
        "responseData": "allEntries"
      }
    },
    {
      "name": "Validate Input",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Validate required fields\nif (!items[0].json.requirements || !items[0].json.client_email) {\n  throw new Error('Missing required fields');\n}\nreturn items;"
      }
    }
  ]
}
```

---

### Task 16: Setup Basic LangGraph Integration
**ID**: WF-003  
**Priority**: P0 - Critical  
**Estimated Hours**: 8 hours  
**Dependencies**: None  
**Required Skills**: Python, LangGraph, State Machines

**Description**:  
Create the LangGraph service for complex workflow orchestration and state management.

**Acceptance Criteria**:
- [ ] Create langgraph-service directory structure
- [ ] Set up Python FastAPI service
- [ ] Install LangGraph dependencies
- [ ] Create basic workflow graph
- [ ] Implement state persistence
- [ ] Add Docker configuration
- [ ] Create unit tests

**Service Structure**:
```python
# langgraph-service/app.py
from fastapi import FastAPI
from langgraph.graph import StateGraph, END
from typing import TypedDict

app = FastAPI()

class ProjectState(TypedDict):
    project_id: str
    requirements: str
    status: str
    current_phase: str
    tasks: list
    errors: list

def create_project_workflow():
    workflow = StateGraph(ProjectState)
    
    # Add nodes
    workflow.add_node("analyze", analyze_requirements)
    workflow.add_node("plan", create_plan)
    workflow.add_node("execute", execute_tasks)
    
    # Add edges
    workflow.set_entry_point("analyze")
    workflow.add_edge("analyze", "plan")
    workflow.add_edge("plan", "execute")
    workflow.add_edge("execute", END)
    
    return workflow.compile()

@app.post("/workflow/start")
async def start_workflow(project_data: dict):
    workflow = create_project_workflow()
    result = await workflow.ainvoke(project_data)
    return result
```

---

### Task 17: Implement Project State Machine
**ID**: WF-004  
**Priority**: P0 - Critical  
**Estimated Hours**: 8 hours  
**Dependencies**: WF-003  
**Required Skills**: State Machines, Python, Async Programming

**Description**:  
Build comprehensive project lifecycle state machine with all phases and transitions.

**Acceptance Criteria**:
- [ ] Define all project states
- [ ] Implement state transition logic
- [ ] Add validation for transitions
- [ ] Create state persistence
- [ ] Implement rollback capability
- [ ] Add state change notifications
- [ ] Create comprehensive tests

**State Definitions**:
```python
from enum import Enum

class ProjectPhase(Enum):
    DRAFT = "draft"
    ANALYZING = "analyzing"
    PLANNING = "planning"
    DEVELOPMENT = "development"
    TESTING = "testing"
    REVIEW = "review"
    DEPLOYMENT = "deployment"
    COMPLETED = "completed"
    FAILED = "failed"

class StateTransitions:
    ALLOWED = {
        ProjectPhase.DRAFT: [ProjectPhase.ANALYZING],
        ProjectPhase.ANALYZING: [ProjectPhase.PLANNING, ProjectPhase.FAILED],
        ProjectPhase.PLANNING: [ProjectPhase.DEVELOPMENT, ProjectPhase.FAILED],
        ProjectPhase.DEVELOPMENT: [ProjectPhase.TESTING, ProjectPhase.FAILED],
        ProjectPhase.TESTING: [ProjectPhase.REVIEW, ProjectPhase.DEVELOPMENT],
        ProjectPhase.REVIEW: [ProjectPhase.DEPLOYMENT, ProjectPhase.DEVELOPMENT],
        ProjectPhase.DEPLOYMENT: [ProjectPhase.COMPLETED, ProjectPhase.FAILED]
    }
    
    @classmethod
    def can_transition(cls, from_state: ProjectPhase, to_state: ProjectPhase) -> bool:
        return to_state in cls.ALLOWED.get(from_state, [])
```

---

### Task 18: Create Redis Task Queue
**ID**: WF-005  
**Priority**: P0 - Critical  
**Estimated Hours**: 6 hours  
**Dependencies**: None  
**Required Skills**: Redis, Queue Systems, Python/TypeScript

**Description**:  
Implement Redis-based task queue for asynchronous task processing and agent coordination.

**Acceptance Criteria**:
- [ ] Set up Redis connection
- [ ] Create task queue implementation
- [ ] Add priority queue support
- [ ] Implement task retry logic
- [ ] Create dead letter queue
- [ ] Add queue monitoring
- [ ] Create integration tests

**Queue Implementation**:
```typescript
// src/lib/queue/task-queue.ts
import { Redis } from 'ioredis';
import { Queue, Worker, QueueEvents } from 'bullmq';

export class TaskQueue {
  private queue: Queue;
  private worker: Worker;
  private events: QueueEvents;
  
  constructor(private redis: Redis) {
    this.queue = new Queue('agent-tasks', {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      }
    });
    
    this.setupWorker();
  }
  
  async addTask(task: AgentTask, priority: number = 0) {
    return this.queue.add(task.type, task, {
      priority,
      delay: task.scheduledFor ? task.scheduledFor - Date.now() : 0
    });
  }
  
  private setupWorker() {
    this.worker = new Worker('agent-tasks', 
      async (job) => {
        const agent = await this.assignAgent(job.data);
        return agent.executeTask(job.data);
      },
      { connection: this.redis }
    );
  }
}
```

---

### Task 19: Build Workflow Templates
**ID**: WF-006  
**Priority**: P1 - High  
**Estimated Hours**: 8 hours  
**Dependencies**: WF-002, WF-004  
**Required Skills**: n8n, Workflow Design, JSON

**Description**:  
Create reusable workflow templates for common project types and operations.

**Acceptance Criteria**:
- [ ] Create web application workflow
- [ ] Create API service workflow
- [ ] Create mobile app workflow
- [ ] Create bug fix workflow
- [ ] Add workflow versioning
- [ ] Create workflow documentation
- [ ] Test all workflows end-to-end

**Workflow Template Example**:
```json
{
  "name": "Web Application Project",
  "meta": {
    "templateId": "web-app-v1",
    "description": "Complete workflow for web application projects"
  },
  "nodes": [
    {
      "name": "Start",
      "type": "n8n-nodes-base.webhook"
    },
    {
      "name": "Analyze Requirements",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://langgraph:8001/analyze",
        "method": "POST"
      }
    },
    {
      "name": "Create GitHub Repo",
      "type": "n8n-nodes-base.github",
      "parameters": {
        "operation": "create",
        "resource": "repository"
      }
    },
    {
      "name": "Assign Agents",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://localhost:3000/api/agents/assign"
      }
    }
  ]
}
```

---

## Week 4: Agent Coordination (June 17 - June 23)

### Task 20: Create Agent Pool Manager
**ID**: POOL-001  
**Priority**: P0 - Critical  
**Estimated Hours**: 6 hours  
**Dependencies**: AGENT-001  
**Required Skills**: TypeScript, System Design, Concurrency

**Description**:  
Build the agent pool management system for tracking agent availability and workload.

**Acceptance Criteria**:
- [ ] Create agent pool class
- [ ] Implement agent registration
- [ ] Track agent availability
- [ ] Monitor agent workload
- [ ] Add agent health checks
- [ ] Create pool statistics API
- [ ] Implement unit tests

**Pool Manager Implementation**:
```typescript
// src/lib/agents/agent-pool.ts
export class AgentPool {
  private agents: Map<string, AgentInstance> = new Map();
  private workload: Map<string, number> = new Map();
  
  async registerAgent(agent: BaseAgent): Promise<void> {
    const instance = new AgentInstance(agent);
    this.agents.set(agent.id, instance);
    this.workload.set(agent.id, 0);
    
    // Start health check
    this.startHealthCheck(agent.id);
  }
  
  async getAvailableAgent(role: string, skills?: string[]): Promise<BaseAgent> {
    const candidates = Array.from(this.agents.values())
      .filter(agent => 
        agent.role === role && 
        agent.status === 'available' &&
        (!skills || skills.every(s => agent.skills.includes(s)))
      )
      .sort((a, b) => 
        this.workload.get(a.id)! - this.workload.get(b.id)!
      );
    
    if (candidates.length === 0) {
      throw new Error(`No available agent for role: ${role}`);
    }
    
    return candidates[0].agent;
  }
  
  async assignTask(agentId: string, task: AgentTask): Promise<void> {
    const current = this.workload.get(agentId) || 0;
    this.workload.set(agentId, current + 1);
    
    // Update agent status
    const instance = this.agents.get(agentId);
    if (instance && current + 1 >= instance.maxConcurrentTasks) {
      instance.status = 'busy';
    }
  }
}
```

---

### Task 21: Implement Task Distribution Logic
**ID**: POOL-002  
**Priority**: P0 - Critical  
**Estimated Hours**: 8 hours  
**Dependencies**: POOL-001, WF-005, AGENT-004  
**Required Skills**: Algorithms, Load Balancing, TypeScript

**Description**:  
Create intelligent task distribution system that assigns tasks to optimal agents.

**Acceptance Criteria**:
- [ ] Implement skill-based matching
- [ ] Add workload-based distribution
- [ ] Create priority handling
- [ ] Implement task affinity
- [ ] Add distribution metrics
- [ ] Create fallback strategies
- [ ] Build comprehensive tests

**Distribution Algorithm**:
```typescript
// src/lib/agents/task-distributor.ts
export class TaskDistributor {
  constructor(
    private agentPool: AgentPool,
    private taskQueue: TaskQueue
  ) {}
  
  async distributeTask(task: AgentTask): Promise<AssignmentResult> {
    // Calculate task complexity
    const complexity = this.calculateComplexity(task);
    
    // Find matching agents
    const candidates = await this.findCandidates(task);
    
    // Score candidates
    const scores = candidates.map(agent => ({
      agent,
      score: this.scoreAgent(agent, task, complexity)
    }));
    
    // Select best agent
    const selected = scores.sort((a, b) => b.score - a.score)[0];
    
    if (!selected || selected.score < 0.5) {
      // Queue for later
      await this.taskQueue.addTask(task, task.priority);
      return { status: 'queued', reason: 'No suitable agent available' };
    }
    
    // Assign to agent
    await this.agentPool.assignTask(selected.agent.id, task);
    return { status: 'assigned', agentId: selected.agent.id };
  }
  
  private scoreAgent(agent: BaseAgent, task: AgentTask, complexity: number): number {
    let score = 1.0;
    
    // Skill match
    const skillMatch = task.requiredSkills.filter(s => 
      agent.skills.includes(s)
    ).length / task.requiredSkills.length;
    score *= skillMatch;
    
    // Workload factor
    const workloadFactor = 1 - (agent.currentWorkload / agent.maxWorkload);
    score *= workloadFactor;
    
    // Performance history
    const performanceScore = agent.metrics.successRate;
    score *= performanceScore;
    
    // Complexity match
    if (complexity > 7 && agent.level === 'senior') score *= 1.2;
    if (complexity < 3 && agent.level === 'junior') score *= 1.1;
    
    return score;
  }
}
```

---

### Task 22: Add Workload Balancing
**ID**: POOL-003  
**Priority**: P1 - High  
**Estimated Hours**: 6 hours  
**Dependencies**: POOL-002  
**Required Skills**: Load Balancing, Algorithms, Performance Optimization

**Description**:  
Implement dynamic workload balancing to optimize agent utilization and prevent overload.

**Acceptance Criteria**:
- [ ] Create workload monitoring
- [ ] Implement rebalancing algorithm
- [ ] Add task migration capability
- [ ] Create load thresholds
- [ ] Implement backpressure
- [ ] Add performance metrics
- [ ] Create load tests

---

### Task 23: Build Inter-Agent Communication
**ID**: POOL-004  
**Priority**: P1 - High  
**Estimated Hours**: 8 hours  
**Dependencies**: POOL-001  
**Required Skills**: Messaging Systems, WebSockets, Event-Driven Architecture

**Description**:  
Create communication system for agents to collaborate on complex tasks.

**Acceptance Criteria**:
- [ ] Design message protocol
- [ ] Implement message bus
- [ ] Add request/response pattern
- [ ] Create broadcast capability
- [ ] Implement message persistence
- [ ] Add message routing
- [ ] Create integration tests

**Communication Protocol**:
```typescript
// src/lib/agents/communication.ts
interface AgentMessage {
  id: string;
  from: string;
  to: string | string[]; // Support broadcast
  type: 'request' | 'response' | 'notification';
  subject: string;
  payload: any;
  timestamp: Date;
  replyTo?: string;
}

export class AgentCommunicationBus {
  private handlers = new Map<string, MessageHandler[]>();
  
  async send(message: AgentMessage): Promise<void> {
    // Route to recipient(s)
    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    
    for (const recipient of recipients) {
      if (recipient === '*') {
        // Broadcast
        await this.broadcast(message);
      } else {
        // Direct message
        await this.deliver(recipient, message);
      }
    }
    
    // Persist message
    await this.persistMessage(message);
  }
  
  subscribe(agentId: string, handler: MessageHandler): void {
    const handlers = this.handlers.get(agentId) || [];
    handlers.push(handler);
    this.handlers.set(agentId, handlers);
  }
}
```

---

### Task 24: Implement Status Tracking
**ID**: POOL-005  
**Priority**: P0 - Critical  
**Estimated Hours**: 4 hours  
**Dependencies**: POOL-001, AGENT-003  
**Required Skills**: Real-time Systems, Database Design, Monitoring

**Description**:  
Build comprehensive status tracking for all agents and their current activities.

**Acceptance Criteria**:
- [ ] Create status data model
- [ ] Implement status updates
- [ ] Add status history
- [ ] Create status dashboard API
- [ ] Implement status notifications
- [ ] Add status analytics
- [ ] Create monitoring tests

**Status Model**:
```typescript
// src/lib/agents/status-tracker.ts
interface AgentStatus {
  agentId: string;
  status: 'available' | 'busy' | 'offline' | 'error';
  currentTasks: string[];
  completedToday: number;
  averageResponseTime: number;
  lastActive: Date;
  health: {
    cpu: number;
    memory: number;
    errorRate: number;
  };
}

export class StatusTracker {
  private statusCache = new Map<string, AgentStatus>();
  
  async updateStatus(agentId: string, update: Partial<AgentStatus>): Promise<void> {
    const current = this.statusCache.get(agentId) || this.getDefaultStatus(agentId);
    const updated = { ...current, ...update, lastActive: new Date() };
    
    this.statusCache.set(agentId, updated);
    
    // Persist to database
    await this.persistStatus(updated);
    
    // Emit status change event
    this.emit('status:changed', { agentId, status: updated });
  }
  
  async getPoolStatus(): Promise<PoolStatus> {
    const statuses = Array.from(this.statusCache.values());
    
    return {
      total: statuses.length,
      available: statuses.filter(s => s.status === 'available').length,
      busy: statuses.filter(s => s.status === 'busy').length,
      offline: statuses.filter(s => s.status === 'offline').length,
      tasksInProgress: statuses.reduce((sum, s) => sum + s.currentTasks.length, 0),
      averageUtilization: this.calculateUtilization(statuses)
    };
  }
}
```

---

## Testing Requirements for Sprint 1

### Unit Tests
- [ ] Workflow state transitions
- [ ] Task queue operations
- [ ] Agent pool management
- [ ] Task distribution logic
- [ ] Communication protocols
- [ ] Status tracking accuracy

### Integration Tests
- [ ] n8n webhook triggers
- [ ] LangGraph workflow execution
- [ ] Redis queue persistence
- [ ] Agent task assignment
- [ ] Inter-agent messaging
- [ ] End-to-end workflow

### Performance Tests
- [ ] Queue throughput
- [ ] Agent pool scaling
- [ ] Message bus latency
- [ ] Status update frequency
- [ ] Workflow execution time

---

## Deployment Checklist for Sprint 1

### Infrastructure
- [ ] n8n service running
- [ ] LangGraph service deployed
- [ ] Redis configured for persistence
- [ ] PostgreSQL schemas created
- [ ] Network connectivity verified

### Configuration
- [ ] n8n workflows imported
- [ ] Agent pool initialized
- [ ] Queue settings optimized
- [ ] Monitoring enabled
- [ ] Backup configured

### Documentation
- [ ] Workflow documentation
- [ ] Agent pool API docs
- [ ] Task distribution guide
- [ ] Communication protocol spec
- [ ] Troubleshooting guide

---

**Next Sprint Preview**: Sprint 2 will focus on external integrations (GitHub, email, storage) and real-time features (Socket.io, live updates).