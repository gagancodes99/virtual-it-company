import { EventEmitter } from 'events';
import { AgentTask } from '@/core/ai/execution/agent-executor';
import { IAIAgent } from '@/infrastructure/database/models/AIAgent';
import { LLMRouter, createDefaultRouterConfig } from '@/core/ai/llm/llm-router';

export interface AgentInstance {
  id: string;
  agent: IAIAgent;
  executor: AgentExecutor;
  status: AgentStatus;
  currentTasks: string[];
  workload: number;
  performance: AgentPerformanceMetrics;
  healthCheck: AgentHealthStatus;
  lastPing: Date;
}

export enum AgentStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OFFLINE = 'offline',
  ERROR = 'error',
  MAINTENANCE = 'maintenance'
}

export interface AgentPerformanceMetrics {
  tasksCompleted: number;
  averageResponseTime: number;
  successRate: number;
  costEfficiency: number;
  qualityScore: number;
  reliability: number;
  lastUpdated: Date;
}

export interface AgentHealthStatus {
  isHealthy: boolean;
  lastCheck: Date;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  errorCount: number;
  warnings: string[];
}

export interface TaskAssignment {
  taskId: string;
  agentId: string;
  assignedAt: Date;
  priority: number;
  estimatedDuration: number;
  actualDuration?: number;
  status: 'assigned' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  retryCount: number;
}

export interface PoolMetrics {
  totalAgents: number;
  availableAgents: number;
  busyAgents: number;
  offlineAgents: number;
  totalWorkload: number;
  averageUtilization: number;
  tasksInQueue: number;
  tasksCompleted: number;
  tasksPerMinute: number;
  averageResponseTime: number;
  poolHealth: number;
}

export class AgentPool extends EventEmitter {
  private agents: Map<string, AgentInstance> = new Map();
  private assignments: Map<string, TaskAssignment> = new Map();
  private router: LLMRouter;
  private healthCheckInterval: NodeJS.Timeout;
  private metricsCollectionInterval: NodeJS.Timeout;
  private loadBalancingEnabled: boolean = true;
  private maxConcurrentTasks: number = 10;
  private healthCheckFrequency: number = 30000; // 30 seconds

  constructor() {
    super();
    this.router = new LLMRouter(createDefaultRouterConfig());
    this.startHealthChecks();
    this.startMetricsCollection();
  }

  async registerAgent(agent: IAIAgent): Promise<void> {
    try {
    // const executor = new AgentExecutor(agent);
      
      const instance: AgentInstance = {
        id: agent._id.toString(),
        agent,
        executor,
        status: AgentStatus.OFFLINE,
        currentTasks: [],
        workload: 0,
        performance: {
          tasksCompleted: agent.performance.tasksCompleted,
          averageResponseTime: agent.performance.responseTimeMs,
          successRate: agent.performance.reliability,
          costEfficiency: 1.0,
          qualityScore: agent.performance.averageRating / 5.0,
          reliability: agent.performance.reliability,
          lastUpdated: new Date()
        },
        healthCheck: {
          isHealthy: false,
          lastCheck: new Date(),
          responseTime: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          errorCount: 0,
          warnings: []
        },
        lastPing: new Date()
      };

      this.agents.set(instance.id, instance);
      
      // Perform initial health check
      await this.performHealthCheck(instance.id);
      
      console.log(`Agent ${agent.name} (${instance.id}) registered in pool`);
      this.emit('agent:registered', { agentId: instance.id, agent });
      
      // Set status to available if health check passes
      if (instance.healthCheck.isHealthy) {
        await this.updateAgentStatus(instance.id, AgentStatus.AVAILABLE);
      }
      
    } catch {
      console.error(`Failed to register agent ${agent.name}:`, error);
      throw error;
    }
  }

  async unregisterAgent(agentId: string): Promise<void> {
    // const instance = this.agents.get(agentId);
    if (!instance) return;

    // Cancel all current tasks
    for (const taskId of instance.currentTasks) {
      await this.cancelTaskAssignment(taskId);
    }

    this.agents.delete(agentId);
    console.log(`Agent ${agentId} unregistered from pool`);
    this.emit('agent:unregistered', { agentId });
  }

  async getAvailableAgent(
    task: AgentTask,
    preferences?: {
      agentType?: string;
      skills?: string[];
      maxResponseTime?: number;
      preferLocal?: boolean;
    }
  ): Promise<AgentInstance | null> {
    // const candidates = Array.from(this.agents.values())
      .filter(agent => this.isAgentSuitable(agent, task, preferences))
      .sort((a, b) => this.scoreAgent(b, task) - this.scoreAgent(a, task));

    if (candidates.length === 0) {
      console.warn(`No suitable agent found for task ${task.id}`);
      return null;
    }

    return candidates[0];
  }

  private isAgentSuitable(
    agent: AgentInstance,
    task: AgentTask,
    preferences?: any
  ): boolean {
    // Check basic availability
    if (agent.status !== AgentStatus.AVAILABLE) {
      return false;
    }

    // Check health status
    if (!agent.healthCheck.isHealthy) {
      return false;
    }

    // Check workload capacity
    if (agent.workload >= agent.agent.settings.maxConcurrentTasks) {
      return false;
    }

    // Check agent type preference
    if (preferences?.agentType && agent.agent.type !== preferences.agentType) {
      return false;
    }

    // Check if agent can handle the task
    if (!agent.executor.canHandleTask(task)) {
      return false;
    }

    // Check skill requirements
    if (preferences?.skills) {
      const agentSkills = [
        ...agent.agent.capabilities.languages,
        ...agent.agent.capabilities.frameworks,
        ...agent.agent.capabilities.specializations
      ].map(s => s.toLowerCase());

      const requiredSkills = preferences.skills.map(s => s.toLowerCase());
      const hasRequiredSkills = requiredSkills.every(skill =>
        agentSkills.some(agentSkill => 
          agentSkill.includes(skill) || skill.includes(agentSkill)
        )
      );

      if (!hasRequiredSkills) {
        return false;
      }
    }

    // Check response time preference
    if (preferences?.maxResponseTime) {
      if (agent.performance.averageResponseTime > preferences.maxResponseTime) {
        return false;
      }
    }

    return true;
  }

  private scoreAgent(agent: AgentInstance, task: AgentTask): number {
    let score = 0;

    // Performance score (40%)
    score += agent.performance.successRate * 40;

    // Availability score (20%)
    const utilizationScore = (1 - (agent.workload / agent.agent.settings.maxConcurrentTasks)) * 20;
    score += utilizationScore;

    // Skill match score (20%)
    const skillMatchScore = this.calculateSkillMatch(agent, task) * 20;
    score += skillMatchScore;

    // Quality score (10%)
    score += agent.performance.qualityScore * 10;

    // Cost efficiency score (10%)
    score += agent.performance.costEfficiency * 10;

    // Penalty for high response time
    if (agent.performance.averageResponseTime > 5000) {
      score -= 10;
    }

    // Bonus for recent activity
    const timeSinceLastPing = Date.now() - agent.lastPing.getTime();
    if (timeSinceLastPing < 60000) { // Less than 1 minute
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateSkillMatch(agent: AgentInstance, task: AgentTask): number {
    const agentSkills = [
      ...agent.agent.capabilities.languages,
      ...agent.agent.capabilities.frameworks,
      ...agent.agent.capabilities.specializations,
      ...agent.agent.capabilities.tools
    ].map(s => s.toLowerCase());

    const taskRequirements = task.requirements.map(r => r.toLowerCase());
    
    if (taskRequirements.length === 0) return 1;

    const matchedRequirements = taskRequirements.filter(req =>
      agentSkills.some(skill => skill.includes(req) || req.includes(skill))
    );

    return matchedRequirements.length / taskRequirements.length;
  }

  async assignTask(task: AgentTask, agentId?: string): Promise<TaskAssignment | null> {
    let agent: AgentInstance | null;

    if (agentId) {
      agent = this.agents.get(agentId);
      if (!agent || !this.isAgentSuitable(agent, task)) {
        throw new Error(`Agent ${agentId} is not suitable for task ${task.id}`);
      }
    } else {
      agent = await this.getAvailableAgent(task);
    }

    if (!agent) {
      console.warn(`No available agent for task ${task.id}`);
      return null;
    }

    // Create assignment
    const assignment: TaskAssignment = {
      taskId: task.id,
      agentId: agent.id,
      assignedAt: new Date(),
      priority: this.getPriorityScore(task.priority),
      estimatedDuration: this.estimateTaskDuration(task, agent),
      status: 'assigned',
      retryCount: 0
    };

    // Update agent state
    agent.currentTasks.push(task.id);
    agent.workload++;
    
    // Update agent status if at capacity
    if (agent.workload >= agent.agent.settings.maxConcurrentTasks) {
      await this.updateAgentStatus(agent.id, AgentStatus.BUSY);
    }

    this.assignments.set(task.id, assignment);

    console.log(`Task ${task.id} assigned to agent ${agent.id}`);
    this.emit('task:assigned', { task, agent, assignment });

    // Execute the task
    this.executeTask(task, agent, assignment);

    return assignment;
  }

  private async executeTask(
    task: AgentTask,
    agent: AgentInstance,
    assignment: TaskAssignment
  ): Promise<void> {
    try {
      assignment.status = 'in_progress';
      this.emit('task:started', { task, agent, assignment });

      const startTime = Date.now();
    // const response = await agent.executor.executeTask(task);
      const duration = Date.now() - startTime;

      assignment.actualDuration = duration;
      assignment.status = response.status === 'success' ? 'completed' : 'failed';

      // Update agent metrics
      await this.updateAgentMetrics(agent.id, {
        duration,
        success: response.status === 'success',
        cost: response.metadata.cost
      });

      // Remove task from agent's current tasks
      agent.currentTasks = agent.currentTasks.filter(id => id !== task.id);
      agent.workload = Math.max(0, agent.workload - 1);

      // Update agent status if now available
      if (agent.status === AgentStatus.BUSY && agent.workload < agent.agent.settings.maxConcurrentTasks) {
        await this.updateAgentStatus(agent.id, AgentStatus.AVAILABLE);
      }

      console.log(`Task ${task.id} ${assignment.status} by agent ${agent.id} in ${duration}ms`);
      this.emit('task:completed', { task, agent, assignment, response });

    } catch {
      console.error(`Task execution failed for ${task.id}:`, error);
      
      assignment.status = 'failed';
      assignment.retryCount++;

      // Handle task failure
      await this.handleTaskFailure(task, agent, assignment, error as Error);
    }
  }

  private async handleTaskFailure(
    task: AgentTask,
    agent: AgentInstance,
    assignment: TaskAssignment,
    error: Error
  ): Promise<void> {
    // Remove task from agent
    agent.currentTasks = agent.currentTasks.filter(id => id !== task.id);
    agent.workload = Math.max(0, agent.workload - 1);

    // Update agent status
    if (agent.status === AgentStatus.BUSY && agent.workload < agent.agent.settings.maxConcurrentTasks) {
      await this.updateAgentStatus(agent.id, AgentStatus.AVAILABLE);
    }

    // Update agent error metrics
    agent.healthCheck.errorCount++;
    agent.performance.successRate = Math.max(0, agent.performance.successRate - 0.1);

    this.emit('task:failed', { task, agent, assignment, error });

    // Retry logic (could be enhanced)
    if (assignment.retryCount < 3) {
      console.log(`Retrying task ${task.id} (attempt ${assignment.retryCount + 1})`);
      setTimeout(() => {
        this.assignTask(task); // Reassign to any available agent
      }, 5000 * assignment.retryCount); // Exponential backoff
    }
  }

  async cancelTaskAssignment(taskId: string): Promise<void> {
    const assignment = this.assignments.get(taskId);
    if (!assignment) return;

    // const agent = this.agents.get(assignment.agentId);
    if (agent) {
      agent.currentTasks = agent.currentTasks.filter(id => id !== taskId);
      agent.workload = Math.max(0, agent.workload - 1);
      
      if (agent.status === AgentStatus.BUSY && agent.workload < agent.agent.settings.maxConcurrentTasks) {
        await this.updateAgentStatus(agent.id, AgentStatus.AVAILABLE);
      }
    }

    assignment.status = 'cancelled';
    this.emit('task:cancelled', { taskId, assignment });
  }

  private async updateAgentStatus(agentId: string, status: AgentStatus): Promise<void> {
    // const agent = this.agents.get(agentId);
    if (!agent) return;

    const previousStatus = agent.status;
    agent.status = status;
    agent.lastPing = new Date();

    console.log(`Agent ${agentId} status changed: ${previousStatus} -> ${status}`);
    this.emit('agent:status_changed', { agentId, from: previousStatus, to: status });
  }

  private async updateAgentMetrics(
    agentId: string,
    taskResult: { duration: number; success: boolean; cost: number }
  ): Promise<void> {
    // const agent = this.agents.get(agentId);
    if (!agent) return;

    const metrics = agent.performance;
    
    // Update task count
    if (taskResult.success) {
      metrics.tasksCompleted++;
    }

    // Update average response time (exponential moving average)
    metrics.averageResponseTime = metrics.averageResponseTime * 0.8 + taskResult.duration * 0.2;

    // Update success rate
    const alpha = 0.1; // Learning rate
    if (taskResult.success) {
      metrics.successRate = Math.min(1.0, metrics.successRate + alpha * (1 - metrics.successRate));
    } else {
      metrics.successRate = Math.max(0.0, metrics.successRate - alpha * metrics.successRate);
    }

    // Update cost efficiency (inverse of cost per task)
    if (taskResult.cost > 0) {
      const newCostEfficiency = 1 / (taskResult.cost + 0.001);
      metrics.costEfficiency = metrics.costEfficiency * 0.9 + newCostEfficiency * 0.1;
    }

    // Update reliability based on recent performance
    metrics.reliability = (metrics.successRate + metrics.costEfficiency) / 2;

    metrics.lastUpdated = new Date();

    this.emit('agent:metrics_updated', { agentId, metrics });
  }

  private estimateTaskDuration(task: AgentTask, agent: AgentInstance): number {
    // Base estimation on task complexity and agent performance
    const baseTime = 5 * 60 * 1000; // 5 minutes base
    
    const complexityMultiplier = {
      'code': 2.0,
      'design': 1.5,
      'test': 1.2,
      'analysis': 1.8,
      'review': 1.0,
      'documentation': 0.8
    };

    const priorityMultiplier = {
      'critical': 0.8, // High priority gets more focused attention
      'high': 0.9,
      'medium': 1.0,
      'low': 1.2
    };

    const agentMultiplier = Math.max(0.5, 2 - agent.performance.successRate);

    return baseTime * 
           (complexityMultiplier[task.type] || 1.0) * 
           (priorityMultiplier[task.priority] || 1.0) * 
           agentMultiplier;
  }

  private getPriorityScore(priority: AgentTask['priority']): number {
    const priorityMap = {
      'critical': 1,
      'high': 2,
      'medium': 3,
      'low': 4
    };
    return priorityMap[priority] || 3;
  }

  // Health checking
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const agentId of this.agents.keys()) {
        await this.performHealthCheck(agentId);
      }
    }, this.healthCheckFrequency);
  }

  private async performHealthCheck(agentId: string): Promise<void> {
    // const agent = this.agents.get(agentId);
    if (!agent) return;

    try {
      const startTime = Date.now();
      
      // Simple health check - verify agent can respond
    // const isAvailable = agent.executor.isAvailable();
      const responseTime = Date.now() - startTime;

      agent.healthCheck = {
        isHealthy: isAvailable,
        lastCheck: new Date(),
        responseTime,
        memoryUsage: 0, // Would be actual memory usage in real implementation
        cpuUsage: 0,    // Would be actual CPU usage in real implementation
        errorCount: agent.healthCheck.errorCount,
        warnings: []
      };

      // Update agent status based on health
      if (isAvailable && agent.status === AgentStatus.OFFLINE) {
        await this.updateAgentStatus(agentId, AgentStatus.AVAILABLE);
      } else if (!isAvailable && agent.status !== AgentStatus.OFFLINE) {
        await this.updateAgentStatus(agentId, AgentStatus.OFFLINE);
      }

    } catch {
      console.error(`Health check failed for agent ${agentId}:`, error);
      agent.healthCheck.isHealthy = false;
      agent.healthCheck.errorCount++;
      
      if (agent.status !== AgentStatus.ERROR) {
        await this.updateAgentStatus(agentId, AgentStatus.ERROR);
      }
    }
  }

  // Metrics collection
  private startMetricsCollection(): void {
    this.metricsCollectionInterval = setInterval(() => {
      this.collectPoolMetrics();
    }, 60000); // Every minute
  }

  private collectPoolMetrics(): void {
    const metrics = this.getPoolMetrics();
    this.emit('pool:metrics', metrics);
  }

  getPoolMetrics(): PoolMetrics {
    // const agents = Array.from(this.agents.values());
    const assignments = Array.from(this.assignments.values());

    // const totalAgents = agents.length;
    // const availableAgents = agents.filter(a => a.status === AgentStatus.AVAILABLE).length;
    // const busyAgents = agents.filter(a => a.status === AgentStatus.BUSY).length;
    // const offlineAgents = agents.filter(a => a.status === AgentStatus.OFFLINE).length;

    // const totalWorkload = agents.reduce((sum, a) => sum + a.workload, 0);
    // const maxCapacity = agents.reduce((sum, a) => sum + a.agent.settings.maxConcurrentTasks, 0);
    const averageUtilization = maxCapacity > 0 ? (totalWorkload / maxCapacity) * 100 : 0;

    const tasksInQueue = assignments.filter(a => a.status === 'assigned').length;
    const tasksCompleted = assignments.filter(a => a.status === 'completed').length;
    
    // const averageResponseTime = agents.length > 0
      ? agents.reduce((sum, a) => sum + a.performance.averageResponseTime, 0) / agents.length 
      : 0;

    // const healthyAgents = agents.filter(a => a.healthCheck.isHealthy).length;
    const poolHealth = totalAgents > 0 ? (healthyAgents / totalAgents) * 100 : 0;

    return {
      totalAgents,
      availableAgents,
      busyAgents,
      offlineAgents,
      totalWorkload,
      averageUtilization,
      tasksInQueue,
      tasksCompleted,
      tasksPerMinute: 0, // Would calculate based on completed tasks in last minute
      averageResponseTime,
      poolHealth
    };
  }

  // Public API methods
  getAgent(agentId: string): AgentInstance | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): AgentInstance[] {
    return Array.from(this.agents.values());
  }

  getAssignment(taskId: string): TaskAssignment | undefined {
    return this.assignments.get(taskId);
  }

  getAllAssignments(): TaskAssignment[] {
    return Array.from(this.assignments.values());
  }

  async rebalanceWorkload(): Promise<void> {
    if (!this.loadBalancingEnabled) return;

    console.log('Rebalancing agent workload...');
    
    // Get overloaded and underloaded agents
    // const agents = Array.from(this.agents.values());
    // const overloaded = agents.filter(a =>
      a.workload > a.agent.settings.maxConcurrentTasks * 0.8
    );
    // const underloaded = agents.filter(a =>
      a.status === AgentStatus.AVAILABLE && a.workload < a.agent.settings.maxConcurrentTasks * 0.5
    );

    // Simple rebalancing logic (can be enhanced)
    for (const agent of overloaded) {
      if (underloaded.length === 0) break;
      
      // Move some tasks from overloaded to underloaded agents
      const tasksToMove = Math.min(2, agent.currentTasks.length);
    // const targetAgent = underloaded[0];

      for (let i = 0; i < tasksToMove; i++) {
        const taskId = agent.currentTasks[i];
        const assignment = this.assignments.get(taskId);
        
        if (assignment && assignment.status === 'assigned') {
          // Reassign task
          await this.cancelTaskAssignment(taskId);
          // Would need to get the actual task object to reassign
          // This is a simplified example
        }
      }
    }

    this.emit('pool:rebalanced', { overloaded: overloaded.length, underloaded: underloaded.length });
  }

  async shutdown(): Promise<void> {
    clearInterval(this.healthCheckInterval);
    clearInterval(this.metricsCollectionInterval);
    
    // Cancel all active tasks
    for (const assignment of this.assignments.values()) {
      if (assignment.status === 'assigned' || assignment.status === 'in_progress') {
        await this.cancelTaskAssignment(assignment.taskId);
      }
    }

    this.agents.clear();
    this.assignments.clear();
    
    console.log('Agent pool shut down');
    this.emit('pool:shutdown');
  }
}

// Export singleton instance
    // export const agentPool = new AgentPool();