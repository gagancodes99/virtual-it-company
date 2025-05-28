import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import Redis from 'ioredis';
import { AgentTask } from '@/core/ai/execution/agent-executor';

export interface QueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  defaultJobOptions?: {
    attempts?: number;
    backoff?: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
    removeOnComplete?: number;
    removeOnFail?: number;
  };
}

export interface TaskQueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export class TaskQueue {
  private queue: Queue;
  private worker: Worker;
  private events: QueueEvents;
  private redis: Redis;
  private isProcessing: boolean = false;

  constructor(
    private config: QueueConfig,
    private onTaskProcess: (task: AgentTask) => Promise<AgentResponse>
  ) {
    // Create Redis connection
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    // Initialize queue
    this.queue = new Queue('agent-tasks', {
      connection: this.redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
        ...config.defaultJobOptions
      }
    });

    // Initialize worker
    this.setupWorker();

    // Initialize events
    this.setupEvents();
  }

  private setupWorker(): void {
    this.worker = new Worker('agent-tasks', 
      async (job: Job) => {
        const task = job.data as AgentTask;
        
        // Update task status to processing
        task.status = 'processing';
        await this.updateTaskStatus(task.id, 'processing');
        
        try {
          console.log(`Processing task ${task.id}: ${task.title}`);
          
          // Execute task using provided processor
          const response = await this.onTaskProcess(task);
          
          // Update task status based on response
          const finalStatus = response.status === 'success' ? 'completed' : 'failed';
          await this.updateTaskStatus(task.id, finalStatus);
          
          return response;
        } catch {
          console.error(`Task ${task.id} failed:`, error);
          await this.updateTaskStatus(task.id, 'failed');
          throw error;
        }
      },
      {
        connection: this.redis,
        concurrency: 5, // Process up to 5 tasks concurrently
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 }
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`Task ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Task ${job?.id} failed:`, err.message);
    });
  }

  private setupEvents(): void {
    this.events = new QueueEvents('agent-tasks', {
      connection: this.redis
    });

    this.events.on('waiting', ({ jobId }) => {
      console.log(`Task ${jobId} is waiting`);
    });

    this.events.on('active', ({ jobId }) => {
      console.log(`Task ${jobId} is now active`);
    });

    this.events.on('completed', ({ jobId, returnvalue }) => {
      console.log(`Task ${jobId} completed with result:`, returnvalue);
    });

    this.events.on('failed', ({ jobId, failedReason }) => {
      console.error(`Task ${jobId} failed:`, failedReason);
    });
  }

  async addTask(task: AgentTask, options?: {
    priority?: number;
    delay?: number;
    scheduledFor?: Date;
  }): Promise<Job> {
    const jobOptions: any = {
      priority: options?.priority || this.getPriorityScore(task.priority),
      delay: options?.delay || (options?.scheduledFor ? options.scheduledFor.getTime() - Date.now() : 0),
      jobId: task.id, // Use task ID as job ID for tracking
    };

    // Add task metadata
    const jobData = {
      ...task,
      addedAt: new Date(),
      priority: task.priority
    };

    const job = await this.queue.add('process-task', jobData, jobOptions);
    
    console.log(`Added task ${task.id} to queue with priority ${jobOptions.priority}`);
    
    return job;
  }

  async addBulkTasks(tasks: AgentTask[]): Promise<Job[]> {
    const jobs = tasks.map(task => ({
      name: 'process-task',
      data: task,
      opts: {
        priority: this.getPriorityScore(task.priority),
        jobId: task.id
      }
    }));

    const addedJobs = await this.queue.addBulk(jobs);
    console.log(`Added ${addedJobs.length} tasks to queue`);
    
    return addedJobs;
  }

  async getTask(taskId: string): Promise<Job | null> {
    return await this.queue.getJob(taskId);
  }

  async cancelTask(taskId: string): Promise<void> {
    const job = await this.queue.getJob(taskId);
    if (job) {
      await job.remove();
      await this.updateTaskStatus(taskId, 'cancelled');
      console.log(`Cancelled task ${taskId}`);
    }
  }

  async retryTask(taskId: string): Promise<void> {
    const job = await this.queue.getJob(taskId);
    if (job) {
      await job.retry();
      console.log(`Retrying task ${taskId}`);
    }
  }

  async getQueueMetrics(): Promise<TaskQueueMetrics> {
    const waiting = await this.queue.getWaiting();
    const active = await this.queue.getActive();
    const completed = await this.queue.getCompleted();
    const failed = await this.queue.getFailed();
    const delayed = await this.queue.getDelayed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      paused: (await this.queue.isPaused()) ? 1 : 0
    };
  }

  async getTasksByStatus(status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'): Promise<Job[]> {
    switch (status) {
      case 'waiting':
        return await this.queue.getWaiting();
      case 'active':
        return await this.queue.getActive();
      case 'completed':
        return await this.queue.getCompleted();
      case 'failed':
        return await this.queue.getFailed();
      case 'delayed':
        return await this.queue.getDelayed();
      default:
        return [];
    }
  }

  async pauseQueue(): Promise<void> {
    await this.queue.pause();
    console.log('Queue paused');
  }

  async resumeQueue(): Promise<void> {
    await this.queue.resume();
    console.log('Queue resumed');
  }

  async clearQueue(): Promise<void> {
    await this.queue.obliterate({ force: true });
    console.log('Queue cleared');
  }

  async cleanQueue(options?: {
    grace?: number;
    limit?: number;
  }): Promise<void> {
    // Clean completed jobs older than 1 hour
    await this.queue.clean(60 * 60 * 1000, 100, 'completed');
    
    // Clean failed jobs older than 24 hours
    await this.queue.clean(24 * 60 * 60 * 1000, 50, 'failed');
    
    console.log('Queue cleaned');
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

  private async updateTaskStatus(taskId: string, status: AgentTask['status']): Promise<void> {
    // This would integrate with your database to update task status
    // For now, we'll just log it
    console.log(`Task ${taskId} status updated to: ${status}`);
    
    // TODO: Integrate with database model to persist status changes
    // await TaskModel.updateOne({ id: taskId }, { status, updatedAt: new Date() });
  }

  async getQueueHealth(): Promise<{
    connected: boolean;
    processing: boolean;
    metrics: TaskQueueMetrics;
    workers: number;
  }> {
    try {
      const metrics = await this.getQueueMetrics();
      
      return {
        connected: this.redis.status === 'ready',
        processing: !await this.queue.isPaused(),
        metrics,
        workers: 1 // Current implementation has 1 worker
      };
    } catch {
      return {
        connected: false,
        processing: false,
        metrics: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 1 },
        workers: 0
      };
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.events.close();
    await this.queue.close();
    await this.redis.disconnect();
    console.log('Task queue closed');
  }
}

// Singleton instance manager
export class TaskQueueManager {
  private static instance: TaskQueue | null = null;
  
  static getInstance(
    config?: QueueConfig,
    processor?: (task: AgentTask) => Promise<AgentResponse>
  ): TaskQueue {
    if (!TaskQueueManager.instance && config && processor) {
      TaskQueueManager.instance = new TaskQueue(config, processor);
    }
    
    if (!TaskQueueManager.instance) {
      throw new Error('TaskQueue not initialized. Call getInstance with config and processor first.');
    }
    
    return TaskQueueManager.instance;
  }
  
  static async closeInstance(): Promise<void> {
    if (TaskQueueManager.instance) {
      await TaskQueueManager.instance.close();
      TaskQueueManager.instance = null;
    }
  }
}

// Queue configuration helper
export const createQueueConfig = (overrides?: Partial<QueueConfig>): QueueConfig => {
  const defaultConfig: QueueConfig = {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 100,
      removeOnFail: 500
    }
  };

  return {
    ...defaultConfig,
    ...overrides,
    redis: {
      ...defaultConfig.redis,
      ...overrides?.redis
    }
  };
};