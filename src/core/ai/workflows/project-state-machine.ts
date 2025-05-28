import { EventEmitter } from 'events';

export enum ProjectPhase {
  DRAFT = 'draft',
  ANALYZING = 'analyzing',
  PLANNING = 'planning',
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  REVIEW = 'review',
  DEPLOYMENT = 'deployment',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold'
}

export enum ProjectEvent {
  START_ANALYSIS = 'start_analysis',
  ANALYSIS_COMPLETE = 'analysis_complete',
  ANALYSIS_FAILED = 'analysis_failed',
  START_PLANNING = 'start_planning',
  PLANNING_COMPLETE = 'planning_complete',
  PLANNING_FAILED = 'planning_failed',
  START_DEVELOPMENT = 'start_development',
  DEVELOPMENT_PROGRESS = 'development_progress',
  DEVELOPMENT_COMPLETE = 'development_complete',
  DEVELOPMENT_FAILED = 'development_failed',
  START_TESTING = 'start_testing',
  TESTING_COMPLETE = 'testing_complete',
  TESTING_FAILED = 'testing_failed',
  START_REVIEW = 'start_review',
  REVIEW_APPROVED = 'review_approved',
  REVIEW_REJECTED = 'review_rejected',
  START_DEPLOYMENT = 'start_deployment',
  DEPLOYMENT_COMPLETE = 'deployment_complete',
  DEPLOYMENT_FAILED = 'deployment_failed',
  PROJECT_COMPLETE = 'project_complete',
  PROJECT_CANCELLED = 'project_cancelled',
  PROJECT_PAUSED = 'project_paused',
  PROJECT_RESUMED = 'project_resumed',
  ERROR_OCCURRED = 'error_occurred'
}

export interface StateTransition {
  from: ProjectPhase;
  to: ProjectPhase;
  event: ProjectEvent;
  condition?: (context: ProjectContext) => boolean;
  action?: (context: ProjectContext) => Promise<void>;
  rollback?: (context: ProjectContext) => Promise<void>;
}

export interface ProjectContext {
  projectId: string;
  currentPhase: ProjectPhase;
  previousPhase?: ProjectPhase;
  metadata: {
    requirements?: string;
    analysis?: any;
    plan?: any;
    progress?: any;
    testResults?: any;
    reviewResults?: any;
    deploymentInfo?: any;
    errors?: string[];
    retryCount?: number;
    lastUpdated: Date;
    phaseStartTime?: Date;
    estimatedCompletion?: Date;
  };
  agents: {
    assigned: string[];
    available: string[];
    working: string[];
  };
  tasks: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
  config: {
    autoAdvance: boolean;
    maxRetries: number;
    timeouts: Record<ProjectPhase, number>;
    approvalRequired: ProjectPhase[];
  };
}

export interface StateChangeEvent {
  projectId: string;
  from: ProjectPhase;
  to: ProjectPhase;
  event: ProjectEvent;
  timestamp: Date;
  context: ProjectContext;
  triggeredBy?: string;
}

export class ProjectStateMachine extends EventEmitter {
  private transitions: Map<string, StateTransition[]> = new Map();
  private contexts: Map<string, ProjectContext> = new Map();
  private locks: Map<string, boolean> = new Map();

  constructor() {
    super();
    this.initializeTransitions();
  }

  private initializeTransitions(): void {
    const transitions: StateTransition[] = [
      // From DRAFT
      {
        from: ProjectPhase.DRAFT,
        to: ProjectPhase.ANALYZING,
        event: ProjectEvent.START_ANALYSIS,
        condition: (ctx) => !!ctx.metadata.requirements,
        action: this.startAnalysis.bind(this)
      },
      {
        from: ProjectPhase.DRAFT,
        to: ProjectPhase.CANCELLED,
        event: ProjectEvent.PROJECT_CANCELLED
      },

      // From ANALYZING
      {
        from: ProjectPhase.ANALYZING,
        to: ProjectPhase.PLANNING,
        event: ProjectEvent.ANALYSIS_COMPLETE,
        condition: (ctx) => !!ctx.metadata.analysis,
        action: this.startPlanning.bind(this)
      },
      {
        from: ProjectPhase.ANALYZING,
        to: ProjectPhase.FAILED,
        event: ProjectEvent.ANALYSIS_FAILED,
        action: this.handleFailure.bind(this),
        rollback: this.rollbackToPlanning.bind(this)
      },
      {
        from: ProjectPhase.ANALYZING,
        to: ProjectPhase.ON_HOLD,
        event: ProjectEvent.PROJECT_PAUSED
      },

      // From PLANNING
      {
        from: ProjectPhase.PLANNING,
        to: ProjectPhase.DEVELOPMENT,
        event: ProjectEvent.PLANNING_COMPLETE,
        condition: (ctx) => !!ctx.metadata.plan && ctx.tasks.total > 0,
        action: this.startDevelopment.bind(this)
      },
      {
        from: ProjectPhase.PLANNING,
        to: ProjectPhase.ANALYZING,
        event: ProjectEvent.PLANNING_FAILED,
        action: this.handleFailure.bind(this)
      },
      {
        from: ProjectPhase.PLANNING,
        to: ProjectPhase.ON_HOLD,
        event: ProjectEvent.PROJECT_PAUSED
      },

      // From DEVELOPMENT
      {
        from: ProjectPhase.DEVELOPMENT,
        to: ProjectPhase.TESTING,
        event: ProjectEvent.DEVELOPMENT_COMPLETE,
        condition: (ctx) => ctx.tasks.completed >= ctx.tasks.total * 0.9,
        action: this.startTesting.bind(this)
      },
      {
        from: ProjectPhase.DEVELOPMENT,
        to: ProjectPhase.PLANNING,
        event: ProjectEvent.DEVELOPMENT_FAILED,
        condition: (ctx) => (ctx.metadata.retryCount || 0) < ctx.config.maxRetries,
        action: this.handleFailure.bind(this)
      },
      {
        from: ProjectPhase.DEVELOPMENT,
        to: ProjectPhase.FAILED,
        event: ProjectEvent.DEVELOPMENT_FAILED,
        condition: (ctx) => (ctx.metadata.retryCount || 0) >= ctx.config.maxRetries
      },
      {
        from: ProjectPhase.DEVELOPMENT,
        to: ProjectPhase.ON_HOLD,
        event: ProjectEvent.PROJECT_PAUSED
      },

      // From TESTING
      {
        from: ProjectPhase.TESTING,
        to: ProjectPhase.REVIEW,
        event: ProjectEvent.TESTING_COMPLETE,
        condition: (ctx) => this.isTestingSuccessful(ctx),
        action: this.startReview.bind(this)
      },
      {
        from: ProjectPhase.TESTING,
        to: ProjectPhase.DEVELOPMENT,
        event: ProjectEvent.TESTING_FAILED,
        action: this.handleTestingFailure.bind(this)
      },
      {
        from: ProjectPhase.TESTING,
        to: ProjectPhase.ON_HOLD,
        event: ProjectEvent.PROJECT_PAUSED
      },

      // From REVIEW
      {
        from: ProjectPhase.REVIEW,
        to: ProjectPhase.DEPLOYMENT,
        event: ProjectEvent.REVIEW_APPROVED,
        action: this.startDeployment.bind(this)
      },
      {
        from: ProjectPhase.REVIEW,
        to: ProjectPhase.DEVELOPMENT,
        event: ProjectEvent.REVIEW_REJECTED,
        action: this.handleReviewRejection.bind(this)
      },
      {
        from: ProjectPhase.REVIEW,
        to: ProjectPhase.ON_HOLD,
        event: ProjectEvent.PROJECT_PAUSED
      },

      // From DEPLOYMENT
      {
        from: ProjectPhase.DEPLOYMENT,
        to: ProjectPhase.COMPLETED,
        event: ProjectEvent.DEPLOYMENT_COMPLETE,
        action: this.completeProject.bind(this)
      },
      {
        from: ProjectPhase.DEPLOYMENT,
        to: ProjectPhase.REVIEW,
        event: ProjectEvent.DEPLOYMENT_FAILED,
        action: this.handleDeploymentFailure.bind(this)
      },

      // From ON_HOLD
      {
        from: ProjectPhase.ON_HOLD,
        to: ProjectPhase.ANALYZING,
        event: ProjectEvent.PROJECT_RESUMED,
        condition: (ctx) => ctx.previousPhase === ProjectPhase.ANALYZING
      },
      {
        from: ProjectPhase.ON_HOLD,
        to: ProjectPhase.PLANNING,
        event: ProjectEvent.PROJECT_RESUMED,
        condition: (ctx) => ctx.previousPhase === ProjectPhase.PLANNING
      },
      {
        from: ProjectPhase.ON_HOLD,
        to: ProjectPhase.DEVELOPMENT,
        event: ProjectEvent.PROJECT_RESUMED,
        condition: (ctx) => ctx.previousPhase === ProjectPhase.DEVELOPMENT
      },
      {
        from: ProjectPhase.ON_HOLD,
        to: ProjectPhase.TESTING,
        event: ProjectEvent.PROJECT_RESUMED,
        condition: (ctx) => ctx.previousPhase === ProjectPhase.TESTING
      },
      {
        from: ProjectPhase.ON_HOLD,
        to: ProjectPhase.REVIEW,
        event: ProjectEvent.PROJECT_RESUMED,
        condition: (ctx) => ctx.previousPhase === ProjectPhase.REVIEW
      },

      // Universal transitions
      {
        from: ProjectPhase.DRAFT,
        to: ProjectPhase.CANCELLED,
        event: ProjectEvent.PROJECT_CANCELLED
      },
      {
        from: ProjectPhase.ANALYZING,
        to: ProjectPhase.CANCELLED,
        event: ProjectEvent.PROJECT_CANCELLED
      },
      {
        from: ProjectPhase.PLANNING,
        to: ProjectPhase.CANCELLED,
        event: ProjectEvent.PROJECT_CANCELLED
      },
      {
        from: ProjectPhase.DEVELOPMENT,
        to: ProjectPhase.CANCELLED,
        event: ProjectEvent.PROJECT_CANCELLED
      },
      {
        from: ProjectPhase.TESTING,
        to: ProjectPhase.CANCELLED,
        event: ProjectEvent.PROJECT_CANCELLED
      },
      {
        from: ProjectPhase.REVIEW,
        to: ProjectPhase.CANCELLED,
        event: ProjectEvent.PROJECT_CANCELLED
      }
    ];

    // Group transitions by from state
    transitions.forEach(transition => {
      const key = transition.from;
      const existing = this.transitions.get(key) || [];
      existing.push(transition);
      this.transitions.set(key, existing);
    });
  }

  async initializeProject(projectId: string, requirements: string, config?: Partial<ProjectContext['config']>): Promise<ProjectContext> {
    const context: ProjectContext = {
      projectId,
      currentPhase: ProjectPhase.DRAFT,
      metadata: {
        requirements,
        lastUpdated: new Date(),
        phaseStartTime: new Date(),
        errors: []
      },
      agents: {
        assigned: [],
        available: [],
        working: []
      },
      tasks: {
        total: 0,
        completed: 0,
        failed: 0,
        pending: 0
      },
      config: {
        autoAdvance: true,
        maxRetries: 3,
        timeouts: {
          [ProjectPhase.DRAFT]: 0,
          [ProjectPhase.ANALYZING]: 10 * 60 * 1000, // 10 minutes
          [ProjectPhase.PLANNING]: 15 * 60 * 1000,   // 15 minutes
          [ProjectPhase.DEVELOPMENT]: 60 * 60 * 1000, // 1 hour
          [ProjectPhase.TESTING]: 30 * 60 * 1000,    // 30 minutes
          [ProjectPhase.REVIEW]: 24 * 60 * 60 * 1000, // 24 hours
          [ProjectPhase.DEPLOYMENT]: 20 * 60 * 1000,  // 20 minutes
          [ProjectPhase.COMPLETED]: 0,
          [ProjectPhase.FAILED]: 0,
          [ProjectPhase.CANCELLED]: 0,
          [ProjectPhase.ON_HOLD]: 0
        },
        approvalRequired: [ProjectPhase.REVIEW, ProjectPhase.DEPLOYMENT],
        ...config
      }
    };

    this.contexts.set(projectId, context);
    
    // Set up timeout for current phase
    this.setupPhaseTimeout(projectId);
    
    this.emit('project:initialized', { projectId, context });
    
    return context;
  }

  async transition(projectId: string, event: ProjectEvent, triggeredBy?: string): Promise<boolean> {
    // Prevent concurrent transitions
    if (this.locks.get(projectId)) {
      throw new Error(`Project ${projectId} is locked for transition`);
    }

    this.locks.set(projectId, true);

    try {
      const context = this.contexts.get(projectId);
      if (!context) {
        throw new Error(`Project ${projectId} not found`);
      }

      const availableTransitions = this.transitions.get(context.currentPhase) || [];
      const validTransition = availableTransitions.find(t => 
        t.event === event && (!t.condition || t.condition(context))
      );

      if (!validTransition) {
        console.warn(`Invalid transition: ${context.currentPhase} -> ${event}`);
        return false;
      }

      const fromPhase = context.currentPhase;
      const toPhase = validTransition.to;

      // Store previous phase for rollback scenarios
      context.previousPhase = fromPhase;
      context.currentPhase = toPhase;
      context.metadata.lastUpdated = new Date();
      context.metadata.phaseStartTime = new Date();

      // Execute transition action if defined
      if (validTransition.action) {
        try {
          await validTransition.action(context);
        } catch {
          console.error(`Transition action failed for ${projectId}:`, error);
          
          // Rollback if possible
          if (validTransition.rollback) {
            await validTransition.rollback(context);
          }
          
          // Revert state change
          context.currentPhase = fromPhase;
          context.metadata.errors?.push(`Transition action failed: ${error}`);
          
          throw error;
        }
      }

      // Set up timeout for new phase
      this.setupPhaseTimeout(projectId);

      // Emit state change event
      const stateChangeEvent: StateChangeEvent = {
        projectId,
        from: fromPhase,
        to: toPhase,
        event,
        timestamp: new Date(),
        context: { ...context },
        triggeredBy
      };

      this.emit('state:changed', stateChangeEvent);
      this.emit(`phase:${toPhase}`, stateChangeEvent);

      // Auto-advance if configured and applicable
      if (context.config.autoAdvance) {
        await this.checkAutoAdvance(projectId);
      }

      return true;
    } finally {
      this.locks.delete(projectId);
    }
  }

  private async checkAutoAdvance(projectId: string): Promise<void> {
    const context = this.contexts.get(projectId);
    if (!context) return;

    // Auto-advance logic based on current phase
    switch (context.currentPhase) {
      case ProjectPhase.ANALYZING:
        if (context.metadata.analysis) {
          setTimeout(() => this.transition(projectId, ProjectEvent.ANALYSIS_COMPLETE), 1000);
        }
        break;
      case ProjectPhase.PLANNING:
        if (context.metadata.plan && context.tasks.total > 0) {
          setTimeout(() => this.transition(projectId, ProjectEvent.PLANNING_COMPLETE), 1000);
        }
        break;
      case ProjectPhase.DEVELOPMENT:
        if (context.tasks.completed >= context.tasks.total) {
          setTimeout(() => this.transition(projectId, ProjectEvent.DEVELOPMENT_COMPLETE), 1000);
        }
        break;
      case ProjectPhase.TESTING:
        if (this.isTestingSuccessful(context)) {
          setTimeout(() => this.transition(projectId, ProjectEvent.TESTING_COMPLETE), 1000);
        }
        break;
    }
  }

  private setupPhaseTimeout(projectId: string): void {
    const context = this.contexts.get(projectId);
    if (!context) return;

    const timeout = context.config.timeouts[context.currentPhase];
    if (timeout > 0) {
      setTimeout(() => {
        this.handlePhaseTimeout(projectId);
      }, timeout);
    }
  }

  private async handlePhaseTimeout(projectId: string): Promise<void> {
    const context = this.contexts.get(projectId);
    if (!context) return;

    console.warn(`Phase timeout for project ${projectId} in phase ${context.currentPhase}`);
    
    // Emit timeout event
    this.emit('phase:timeout', { projectId, phase: context.currentPhase, context });
    
    // Handle timeout based on phase
    switch (context.currentPhase) {
      case ProjectPhase.ANALYZING:
        await this.transition(projectId, ProjectEvent.ANALYSIS_FAILED);
        break;
      case ProjectPhase.PLANNING:
        await this.transition(projectId, ProjectEvent.PLANNING_FAILED);
        break;
      case ProjectPhase.DEVELOPMENT:
        await this.transition(projectId, ProjectEvent.DEVELOPMENT_FAILED);
        break;
      case ProjectPhase.TESTING:
        await this.transition(projectId, ProjectEvent.TESTING_FAILED);
        break;
    }
  }

  // Transition action methods
  private async startAnalysis(context: ProjectContext): Promise<void> {
    console.log(`Starting analysis for project ${context.projectId}`);
    // This would trigger the analysis workflow
    this.emit('workflow:start', { 
      type: 'analysis', 
      projectId: context.projectId, 
      requirements: context.metadata.requirements 
    });
  }

  private async startPlanning(context: ProjectContext): Promise<void> {
    console.log(`Starting planning for project ${context.projectId}`);
    this.emit('workflow:start', { 
      type: 'planning', 
      projectId: context.projectId, 
      analysis: context.metadata.analysis 
    });
  }

  private async startDevelopment(context: ProjectContext): Promise<void> {
    console.log(`Starting development for project ${context.projectId}`);
    this.emit('workflow:start', { 
      type: 'development', 
      projectId: context.projectId, 
      plan: context.metadata.plan 
    });
  }

  private async startTesting(context: ProjectContext): Promise<void> {
    console.log(`Starting testing for project ${context.projectId}`);
    this.emit('workflow:start', { 
      type: 'testing', 
      projectId: context.projectId 
    });
  }

  private async startReview(context: ProjectContext): Promise<void> {
    console.log(`Starting review for project ${context.projectId}`);
    this.emit('workflow:start', { 
      type: 'review', 
      projectId: context.projectId 
    });
  }

  private async startDeployment(context: ProjectContext): Promise<void> {
    console.log(`Starting deployment for project ${context.projectId}`);
    this.emit('workflow:start', { 
      type: 'deployment', 
      projectId: context.projectId 
    });
  }

  private async completeProject(context: ProjectContext): Promise<void> {
    console.log(`Project ${context.projectId} completed successfully`);
    context.metadata.estimatedCompletion = new Date();
    this.emit('project:completed', { projectId: context.projectId, context });
  }

  private async handleFailure(context: ProjectContext): Promise<void> {
    const retryCount = (context.metadata.retryCount || 0) + 1;
    context.metadata.retryCount = retryCount;
    
    console.warn(`Handling failure for project ${context.projectId}, retry ${retryCount}`);
    
    if (retryCount >= context.config.maxRetries) {
      context.currentPhase = ProjectPhase.FAILED;
      this.emit('project:failed', { projectId: context.projectId, context });
    }
  }

  private async handleTestingFailure(context: ProjectContext): Promise<void> {
    console.log(`Testing failed for project ${context.projectId}, returning to development`);
    // Add failed test information to context for developers to address
  }

  private async handleReviewRejection(context: ProjectContext): Promise<void> {
    console.log(`Review rejected for project ${context.projectId}, returning to development`);
    // Add review feedback to context
  }

  private async handleDeploymentFailure(context: ProjectContext): Promise<void> {
    console.log(`Deployment failed for project ${context.projectId}, returning to review`);
  }

  private async rollbackToPlanning(context: ProjectContext): Promise<void> {
    console.log(`Rolling back project ${context.projectId} to planning phase`);
    // Clean up any analysis artifacts if needed
  }

  private isTestingSuccessful(context: ProjectContext): boolean {
    const testResults = context.metadata.testResults;
    if (!testResults) return false;
    
    // Simple success criteria - can be made more sophisticated
    return testResults.passed >= testResults.total * 0.9;
  }

  // Public API methods
  getContext(projectId: string): ProjectContext | undefined {
    return this.contexts.get(projectId);
  }

  getCurrentPhase(projectId: string): ProjectPhase | undefined {
    return this.contexts.get(projectId)?.currentPhase;
  }

  updateProgress(projectId: string, progress: Partial<ProjectContext['tasks']>): void {
    const context = this.contexts.get(projectId);
    if (context) {
      Object.assign(context.tasks, progress);
      context.metadata.lastUpdated = new Date();
      
      this.emit('progress:updated', { projectId, progress, context });
      
      // Check for auto-advance
      if (context.config.autoAdvance) {
        this.checkAutoAdvance(projectId);
      }
    }
  }

  updateMetadata(projectId: string, metadata: Partial<ProjectContext['metadata']>): void {
    const context = this.contexts.get(projectId);
    if (context) {
      Object.assign(context.metadata, metadata);
      context.metadata.lastUpdated = new Date();
      
      this.emit('metadata:updated', { projectId, metadata, context });
    }
  }

  getValidTransitions(projectId: string): ProjectEvent[] {
    const context = this.contexts.get(projectId);
    if (!context) return [];

    const availableTransitions = this.transitions.get(context.currentPhase) || [];
    return availableTransitions
      .filter(t => !t.condition || t.condition(context))
      .map(t => t.event);
  }

  async pauseProject(projectId: string): Promise<boolean> {
    return await this.transition(projectId, ProjectEvent.PROJECT_PAUSED);
  }

  async resumeProject(projectId: string): Promise<boolean> {
    return await this.transition(projectId, ProjectEvent.PROJECT_RESUMED);
  }

  async cancelProject(projectId: string): Promise<boolean> {
    return await this.transition(projectId, ProjectEvent.PROJECT_CANCELLED);
  }

  destroy(projectId: string): void {
    this.contexts.delete(projectId);
    this.locks.delete(projectId);
  }
}

// Export singleton instance
export const projectStateMachine = new ProjectStateMachine();