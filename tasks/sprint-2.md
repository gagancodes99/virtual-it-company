# Sprint 2 - Weeks 5-6

## Week 5: External Integrations (June 24 - June 30)

### Task 25: Implement GitHub Integration
**ID**: INT-001  
**Priority**: P0 - Critical  
**Estimated Hours**: 8 hours  
**Dependencies**: None  
**Required Skills**: GitHub API, Git, TypeScript, OAuth

**Description**:  
Create comprehensive GitHub integration for repository management, code commits, and PR creation.

**Acceptance Criteria**:
- [ ] Set up GitHub OAuth app
- [ ] Implement GitHub client wrapper
- [ ] Create repository creation method
- [ ] Add file commit functionality
- [ ] Implement PR creation
- [ ] Add webhook handlers
- [ ] Create integration tests

**GitHub Service Implementation**:
```typescript
// src/lib/integrations/github.ts
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';

export class GitHubService {
  private octokit: Octokit;
  
  constructor(private config: GitHubConfig) {
    this.octokit = new Octokit({
      auth: config.token,
      baseUrl: 'https://api.github.com'
    });
  }
  
  async createRepository(options: CreateRepoOptions): Promise<Repository> {
    try {
      const { data } = await this.octokit.repos.createForAuthenticatedUser({
        name: options.name,
        description: options.description,
        private: options.private ?? true,
        auto_init: true,
        gitignore_template: options.gitignoreTemplate || 'Node',
        license_template: options.license || 'mit'
      });
      
      // Set up webhook
      if (options.webhookUrl) {
        await this.createWebhook(data.name, options.webhookUrl);
      }
      
      return {
        id: data.id,
        name: data.name,
        url: data.html_url,
        cloneUrl: data.clone_url,
        defaultBranch: data.default_branch
      };
    } catch (error) {
      throw new GitHubError('Failed to create repository', error);
    }
  }
  
  async commitFiles(repo: string, files: FileCommit[], message: string): Promise<void> {
    // Get current commit SHA
    const { data: ref } = await this.octokit.git.getRef({
      owner: this.config.owner,
      repo,
      ref: 'heads/main'
    });
    
    const currentCommitSha = ref.object.sha;
    
    // Get current tree
    const { data: currentCommit } = await this.octokit.git.getCommit({
      owner: this.config.owner,
      repo,
      commit_sha: currentCommitSha
    });
    
    // Create blobs for each file
    const blobs = await Promise.all(
      files.map(async (file) => {
        const { data } = await this.octokit.git.createBlob({
          owner: this.config.owner,
          repo,
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64'
        });
        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: data.sha
        };
      })
    );
    
    // Create new tree
    const { data: newTree } = await this.octokit.git.createTree({
      owner: this.config.owner,
      repo,
      tree: blobs,
      base_tree: currentCommit.tree.sha
    });
    
    // Create commit
    const { data: newCommit } = await this.octokit.git.createCommit({
      owner: this.config.owner,
      repo,
      message,
      tree: newTree.sha,
      parents: [currentCommitSha],
      author: {
        name: 'Virtual IT Company Bot',
        email: 'bot@virtualitcompany.com'
      }
    });
    
    // Update reference
    await this.octokit.git.updateRef({
      owner: this.config.owner,
      repo,
      ref: 'heads/main',
      sha: newCommit.sha
    });
  }
  
  async createPullRequest(options: CreatePROptions): Promise<PullRequest> {
    const { data } = await this.octokit.pulls.create({
      owner: this.config.owner,
      repo: options.repo,
      title: options.title,
      body: options.description,
      head: options.sourceBranch,
      base: options.targetBranch || 'main',
      draft: options.draft || false
    });
    
    return {
      id: data.id,
      number: data.number,
      url: data.html_url,
      state: data.state
    };
  }
}
```

---

### Task 26: Add SendGrid Email Service
**ID**: INT-002  
**Priority**: P1 - High  
**Estimated Hours**: 4 hours  
**Dependencies**: None  
**Required Skills**: SendGrid API, Email Templates, TypeScript

**Description**:  
Implement email notification service for client communication and system alerts.

**Acceptance Criteria**:
- [ ] Set up SendGrid API client
- [ ] Create email templates
- [ ] Implement send functionality
- [ ] Add template variables
- [ ] Create email queue
- [ ] Add delivery tracking
- [ ] Build unit tests

**Email Service Implementation**:
```typescript
// src/lib/integrations/email.ts
import sgMail from '@sendgrid/mail';
import { renderTemplate } from '@/lib/templates';

export class EmailService {
  constructor(private config: EmailConfig) {
    sgMail.setApiKey(config.sendGridApiKey);
  }
  
  async sendProjectUpdate(data: ProjectUpdateData): Promise<void> {
    const html = await renderTemplate('project-update', {
      projectName: data.projectName,
      status: data.status,
      progress: data.progress,
      nextSteps: data.nextSteps,
      estimatedCompletion: data.estimatedCompletion
    });
    
    const msg = {
      to: data.clientEmail,
      from: {
        email: this.config.fromEmail,
        name: 'Virtual IT Company'
      },
      subject: `Project Update: ${data.projectName}`,
      html,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    };
    
    try {
      await sgMail.send(msg);
      await this.logEmailSent(data.projectId, 'project-update', data.clientEmail);
    } catch (error) {
      await this.handleEmailError(error, msg);
    }
  }
  
  async sendTaskNotification(data: TaskNotificationData): Promise<void> {
    const template = this.getTaskTemplate(data.type);
    
    await this.sendEmail({
      to: data.recipientEmail,
      subject: template.subject(data),
      html: await renderTemplate(template.name, data),
      category: 'task-notification'
    });
  }
  
  private async sendEmail(options: SendEmailOptions): Promise<void> {
    // Add to queue for retry logic
    await this.emailQueue.add('send-email', options, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  }
}

// Email Templates
export const emailTemplates = {
  'project-update': `
    <h2>Project Update: {{projectName}}</h2>
    <p>Current Status: <strong>{{status}}</strong></p>
    <div class="progress-bar">
      <div class="progress" style="width: {{progress}}%">{{progress}}%</div>
    </div>
    <h3>Next Steps:</h3>
    <ul>
      {{#each nextSteps}}
        <li>{{this}}</li>
      {{/each}}
    </ul>
    <p>Estimated Completion: {{estimatedCompletion}}</p>
  `,
  
  'task-completed': `
    <h2>Task Completed: {{taskName}}</h2>
    <p>Great news! The task "{{taskName}}" has been completed.</p>
    <p><strong>Completed by:</strong> {{agentName}}</p>
    <p><strong>Time taken:</strong> {{duration}}</p>
    <p><a href="{{reviewUrl}}" class="button">Review Results</a></p>
  `
};
```

---

### Task 27: Create S3 File Storage Service
**ID**: INT-003  
**Priority**: P1 - High  
**Estimated Hours**: 6 hours  
**Dependencies**: None  
**Required Skills**: AWS SDK, S3, File Handling, TypeScript

**Description**:  
Implement file storage service for project deliverables and assets using AWS S3.

**Acceptance Criteria**:
- [ ] Configure AWS SDK
- [ ] Create S3 bucket management
- [ ] Implement file upload
- [ ] Add file download
- [ ] Create signed URLs
- [ ] Add file versioning
- [ ] Implement security policies
- [ ] Create integration tests

**S3 Storage Implementation**:
```typescript
// src/lib/integrations/storage.ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

export class StorageService {
  private s3Client: S3Client;
  
  constructor(private config: StorageConfig) {
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
  }
  
  async uploadFile(file: UploadFile): Promise<StorageResult> {
    const key = this.generateKey(file);
    
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimeType,
      Metadata: {
        projectId: file.projectId,
        uploadedBy: file.uploadedBy,
        originalName: file.originalName
      },
      ServerSideEncryption: 'AES256'
    });
    
    await this.s3Client.send(command);
    
    return {
      key,
      url: `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`,
      size: file.buffer.length,
      etag: crypto.createHash('md5').update(file.buffer).digest('hex')
    };
  }
  
  async getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key
    });
    
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }
  
  async createProjectFolder(projectId: string): Promise<void> {
    // Create folder structure for project
    const folders = [
      `projects/${projectId}/source/`,
      `projects/${projectId}/deliverables/`,
      `projects/${projectId}/documentation/`,
      `projects/${projectId}/assets/`
    ];
    
    for (const folder of folders) {
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: folder,
        Body: ''
      }));
    }
  }
  
  private generateKey(file: UploadFile): string {
    const timestamp = Date.now();
    const hash = crypto.createHash('sha256')
      .update(`${file.projectId}-${timestamp}-${file.originalName}`)
      .digest('hex')
      .substring(0, 8);
    
    return `projects/${file.projectId}/${file.category}/${timestamp}-${hash}-${file.originalName}`;
  }
}
```

---

### Task 28: Implement Deployment Triggers
**ID**: INT-004  
**Priority**: P1 - High  
**Estimated Hours**: 8 hours  
**Dependencies**: INT-001  
**Required Skills**: CI/CD, Deployment Platforms, Webhooks

**Description**:  
Create automated deployment system for completed projects to various platforms.

**Acceptance Criteria**:
- [ ] Create deployment service interface
- [ ] Implement Vercel deployment
- [ ] Add Railway deployment
- [ ] Create Netlify deployment
- [ ] Add deployment status tracking
- [ ] Implement rollback capability
- [ ] Create deployment tests

**Deployment Service Implementation**:
```typescript
// src/lib/integrations/deployment.ts
interface DeploymentProvider {
  deploy(options: DeployOptions): Promise<DeploymentResult>;
  getStatus(deploymentId: string): Promise<DeploymentStatus>;
  rollback(deploymentId: string): Promise<void>;
}

export class VercelDeployment implements DeploymentProvider {
  constructor(private config: VercelConfig) {}
  
  async deploy(options: DeployOptions): Promise<DeploymentResult> {
    const deployment = await this.createDeployment({
      name: options.projectName,
      gitRepository: {
        repo: options.githubRepo,
        type: 'github'
      },
      buildCommand: options.buildCommand || 'npm run build',
      outputDirectory: options.outputDir || 'dist',
      environmentVariables: options.envVars,
      framework: this.detectFramework(options)
    });
    
    // Monitor deployment
    const status = await this.waitForDeployment(deployment.id);
    
    return {
      id: deployment.id,
      url: deployment.url,
      status,
      provider: 'vercel',
      createdAt: new Date()
    };
  }
  
  private async createDeployment(config: any): Promise<any> {
    const response = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    
    if (!response.ok) {
      throw new DeploymentError('Failed to create deployment', response);
    }
    
    return response.json();
  }
}

export class DeploymentService {
  private providers: Map<string, DeploymentProvider> = new Map();
  
  constructor() {
    this.registerProviders();
  }
  
  async deployProject(project: Project, target: string): Promise<DeploymentResult> {
    const provider = this.providers.get(target);
    if (!provider) {
      throw new Error(`Unknown deployment target: ${target}`);
    }
    
    // Prepare deployment
    const options: DeployOptions = {
      projectName: project.name,
      githubRepo: project.githubRepo,
      branch: 'main',
      envVars: await this.getProjectEnvVars(project.id),
      buildCommand: project.buildCommand,
      outputDir: project.outputDir
    };
    
    // Deploy
    const result = await provider.deploy(options);
    
    // Update project
    await this.updateProjectDeployment(project.id, result);
    
    // Notify
    await this.notifyDeployment(project, result);
    
    return result;
  }
}
```

---

### Task 29: Add Stripe Payment Processing
**ID**: INT-005  
**Priority**: P2 - Medium  
**Estimated Hours**: 8 hours  
**Dependencies**: None  
**Required Skills**: Stripe API, Payment Processing, Webhooks

**Description**:  
Implement payment processing for project invoicing and subscription management.

**Acceptance Criteria**:
- [ ] Set up Stripe client
- [ ] Create customer management
- [ ] Implement invoice creation
- [ ] Add payment processing
- [ ] Set up webhooks
- [ ] Create subscription handling
- [ ] Add payment analytics
- [ ] Build security tests

**Payment Service Implementation**:
```typescript
// src/lib/integrations/payments.ts
import Stripe from 'stripe';

export class PaymentService {
  private stripe: Stripe;
  
  constructor(private config: PaymentConfig) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: '2023-10-16'
    });
  }
  
  async createProjectInvoice(project: CompletedProject): Promise<Invoice> {
    // Create or get customer
    const customer = await this.ensureCustomer(project.client);
    
    // Create invoice items
    const items = await this.createInvoiceItems(project, customer.id);
    
    // Create invoice
    const invoice = await this.stripe.invoices.create({
      customer: customer.id,
      description: `Project: ${project.name}`,
      metadata: {
        projectId: project.id,
        projectType: project.type
      },
      auto_advance: false, // Don't auto-send yet
      collection_method: 'send_invoice',
      days_until_due: 30
    });
    
    // Add line items
    for (const item of items) {
      await this.stripe.invoiceItems.create({
        customer: customer.id,
        invoice: invoice.id,
        description: item.description,
        amount: Math.round(item.amount * 100), // Convert to cents
        currency: 'usd'
      });
    }
    
    // Finalize invoice
    const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(invoice.id);
    
    return {
      id: finalizedInvoice.id,
      number: finalizedInvoice.number!,
      amount: finalizedInvoice.amount_due / 100,
      dueDate: new Date(finalizedInvoice.due_date! * 1000),
      url: finalizedInvoice.hosted_invoice_url!,
      pdfUrl: finalizedInvoice.invoice_pdf!
    };
  }
  
  private async createInvoiceItems(project: CompletedProject, customerId: string): Promise<InvoiceItem[]> {
    const items: InvoiceItem[] = [];
    
    // Base project cost
    items.push({
      description: `${project.type} Development`,
      amount: project.baseCost
    });
    
    // Additional features
    for (const feature of project.additionalFeatures) {
      items.push({
        description: feature.name,
        amount: feature.cost
      });
    }
    
    // AI usage costs
    if (project.aiUsageCost > 0) {
      items.push({
        description: 'AI Processing Costs',
        amount: project.aiUsageCost
      });
    }
    
    return items;
  }
  
  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.Invoice);
        break;
        
      case 'invoice.payment_failed':
        await this.handlePaymentFailure(event.data.object as Stripe.Invoice);
        break;
        
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
    }
  }
}
```

---

## Week 6: Real-Time Features (July 1 - July 7)

### Task 30: Setup Socket.io Server
**ID**: RT-001  
**Priority**: P1 - High  
**Estimated Hours**: 4 hours  
**Dependencies**: None  
**Required Skills**: Socket.io, WebSockets, Real-time Systems

**Description**:  
Implement Socket.io server for real-time communication between frontend and backend.

**Acceptance Criteria**:
- [ ] Configure Socket.io server
- [ ] Set up authentication
- [ ] Create room management
- [ ] Implement connection handling
- [ ] Add error handling
- [ ] Create reconnection logic
- [ ] Build connection tests

**Socket.io Server Implementation**:
```typescript
// src/lib/realtime/socket-server.ts
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import jwt from 'jsonwebtoken';

export class RealtimeServer {
  private io: Server;
  private rooms: Map<string, Set<string>> = new Map();
  
  constructor(httpServer: any) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL,
        credentials: true
      },
      transports: ['websocket', 'polling']
    });
    
    // Redis adapter for scaling
    const pubClient = new Redis(process.env.REDIS_URL);
    const subClient = pubClient.duplicate();
    this.io.adapter(createAdapter(pubClient, subClient));
    
    this.setupMiddleware();
    this.setupEventHandlers();
  }
  
  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        socket.data.userId = decoded.userId;
        socket.data.tenantId = decoded.tenantId;
        socket.data.role = decoded.role;
        
        next();
      } catch (err) {
        next(new Error('Authentication failed'));
      }
    });
  }
  
  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Join tenant room
      socket.join(`tenant:${socket.data.tenantId}`);
      
      // Join user-specific room
      socket.join(`user:${socket.data.userId}`);
      
      // Handle project subscriptions
      socket.on('subscribe:project', async (projectId: string) => {
        // Verify access
        if (await this.canAccessProject(socket.data.userId, projectId)) {
          socket.join(`project:${projectId}`);
          socket.emit('subscribed', { room: `project:${projectId}` });
        } else {
          socket.emit('error', { message: 'Access denied' });
        }
      });
      
      // Handle agent status updates
      socket.on('agent:status', async (data) => {
        if (socket.data.role === 'agent') {
          await this.broadcastAgentStatus(socket.data.userId, data);
        }
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.handleDisconnect(socket);
      });
    });
  }
  
  // Public methods for emitting events
  async emitProjectUpdate(projectId: string, update: any): Promise<void> {
    this.io.to(`project:${projectId}`).emit('project:update', update);
  }
  
  async emitAgentStatus(agentId: string, status: any): Promise<void> {
    this.io.to(`agent:${agentId}`).emit('agent:status', status);
  }
  
  async emitTaskProgress(projectId: string, taskId: string, progress: any): Promise<void> {
    this.io.to(`project:${projectId}`).emit('task:progress', {
      taskId,
      ...progress
    });
  }
}
```

---

### Task 31: Implement Project Status Updates
**ID**: RT-002  
**Priority**: P1 - High  
**Estimated Hours**: 6 hours  
**Dependencies**: RT-001, POOL-005  
**Required Skills**: Real-time Systems, Event-Driven Architecture

**Description**:  
Create real-time project status update system for live progress tracking.

**Acceptance Criteria**:
- [ ] Design status update events
- [ ] Implement status emitters
- [ ] Create status aggregation
- [ ] Add status persistence
- [ ] Build frontend handlers
- [ ] Create status history
- [ ] Test real-time updates

**Status Update Implementation**:
```typescript
// src/lib/realtime/status-updates.ts
export class ProjectStatusUpdater {
  constructor(
    private realtimeServer: RealtimeServer,
    private projectRepo: ProjectRepository
  ) {}
  
  async updateProjectStatus(
    projectId: string, 
    updates: ProjectStatusUpdate
  ): Promise<void> {
    // Update database
    const project = await this.projectRepo.updateStatus(projectId, updates);
    
    // Prepare real-time update
    const realtimeUpdate = {
      projectId,
      timestamp: new Date(),
      type: 'status_update',
      data: {
        phase: updates.phase,
        status: updates.status,
        progress: updates.progress,
        currentTask: updates.currentTask,
        metrics: {
          tasksCompleted: project.tasksCompleted,
          totalTasks: project.totalTasks,
          estimatedCompletion: project.estimatedCompletion
        }
      }
    };
    
    // Emit to all project subscribers
    await this.realtimeServer.emitProjectUpdate(projectId, realtimeUpdate);
    
    // Log update
    await this.logStatusUpdate(projectId, realtimeUpdate);
    
    // Check for milestones
    if (this.isMilestone(updates)) {
      await this.handleMilestone(projectId, updates);
    }
  }
  
  async streamTaskProgress(
    projectId: string,
    taskId: string,
    progressStream: AsyncIterable<number>
  ): Promise<void> {
    for await (const progress of progressStream) {
      await this.realtimeServer.emitTaskProgress(projectId, taskId, {
        progress,
        timestamp: new Date()
      });
      
      // Throttle updates
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  private isMilestone(updates: ProjectStatusUpdate): boolean {
    const milestones = ['planning_complete', 'development_complete', 'testing_complete'];
    return milestones.includes(updates.status);
  }
  
  private async handleMilestone(projectId: string, updates: ProjectStatusUpdate): Promise<void> {
    // Send milestone notification
    await this.notificationService.sendMilestoneNotification(projectId, updates.status);
    
    // Update analytics
    await this.analyticsService.trackMilestone(projectId, updates.status);
  }
}
```

---

### Task 32: Add Agent Status Broadcasting
**ID**: RT-003  
**Priority**: P1 - High  
**Estimated Hours**: 4 hours  
**Dependencies**: RT-001, POOL-005, POOL-004  
**Required Skills**: Real-time Systems, Broadcasting, State Management

**Description**:  
Implement agent status broadcasting for monitoring agent availability and workload.

**Acceptance Criteria**:
- [ ] Create agent status events
- [ ] Implement status broadcasting
- [ ] Add status aggregation
- [ ] Create dashboard updates
- [ ] Implement presence tracking
- [ ] Add performance metrics
- [ ] Test broadcasting system

**Agent Broadcasting Implementation**:
```typescript
// src/lib/realtime/agent-broadcasting.ts
export class AgentStatusBroadcaster {
  private agentStatuses: Map<string, AgentRealtimeStatus> = new Map();
  
  constructor(
    private realtimeServer: RealtimeServer,
    private metricsCollector: MetricsCollector
  ) {
    this.startHeartbeat();
  }
  
  async broadcastAgentUpdate(agentId: string, update: AgentStatusUpdate): Promise<void> {
    // Update local cache
    const current = this.agentStatuses.get(agentId) || this.getDefaultStatus(agentId);
    const updated = { ...current, ...update, lastUpdate: new Date() };
    this.agentStatuses.set(agentId, updated);
    
    // Broadcast to subscribers
    await this.realtimeServer.emitAgentStatus(agentId, updated);
    
    // Broadcast to admin dashboard
    await this.realtimeServer.io.to('admin:agents').emit('agent:status:update', {
      agentId,
      status: updated
    });
    
    // Update metrics
    this.metricsCollector.recordAgentStatus(agentId, updated);
  }
  
  async broadcastTaskAssignment(agentId: string, task: AgentTask): Promise<void> {
    const event = {
      type: 'task_assigned',
      agentId,
      task: {
        id: task.id,
        type: task.type,
        projectId: task.projectId,
        priority: task.priority
      },
      timestamp: new Date()
    };
    
    await this.realtimeServer.io.to(`agent:${agentId}`).emit('task:assigned', event);
    await this.realtimeServer.io.to(`project:${task.projectId}`).emit('task:assigned', event);
  }
  
  async broadcastPoolStatus(): Promise<void> {
    const poolStatus = {
      timestamp: new Date(),
      agents: {
        total: this.agentStatuses.size,
        available: Array.from(this.agentStatuses.values()).filter(s => s.status === 'available').length,
        busy: Array.from(this.agentStatuses.values()).filter(s => s.status === 'busy').length,
        offline: Array.from(this.agentStatuses.values()).filter(s => s.status === 'offline').length
      },
      performance: {
        averageResponseTime: this.calculateAverageResponseTime(),
        tasksInProgress: this.countTasksInProgress(),
        successRate: this.calculateSuccessRate()
      }
    };
    
    await this.realtimeServer.io.to('admin:dashboard').emit('pool:status', poolStatus);
  }
  
  private startHeartbeat(): void {
    setInterval(async () => {
      // Check for stale agents
      const now = Date.now();
      for (const [agentId, status] of this.agentStatuses) {
        if (now - status.lastUpdate.getTime() > 30000) { // 30 seconds
          await this.broadcastAgentUpdate(agentId, { status: 'offline' });
        }
      }
      
      // Broadcast pool status
      await this.broadcastPoolStatus();
    }, 5000); // Every 5 seconds
  }
}
```

---

### Task 33: Create Activity Feed Component
**ID**: RT-004  
**Priority**: P1 - High  
**Estimated Hours**: 6 hours  
**Dependencies**: RT-002, RT-003  
**Required Skills**: React, Real-time UI, TypeScript

**Description**:  
Build real-time activity feed component for displaying project and agent activities.

**Acceptance Criteria**:
- [ ] Create activity feed UI component
- [ ] Implement real-time updates
- [ ] Add activity filtering
- [ ] Create activity persistence
- [ ] Implement pagination
- [ ] Add activity grouping
- [ ] Build component tests

**Activity Feed Implementation**:
```typescript
// src/components/realtime/ActivityFeed.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Activity, ActivityType } from '@/types';
import { formatRelativeTime } from '@/lib/utils';

export const ActivityFeed: React.FC<{ projectId?: string }> = ({ projectId }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<ActivityType | 'all'>('all');
  const socket = useSocket();
  const feedRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!socket) return;
    
    // Subscribe to relevant rooms
    if (projectId) {
      socket.emit('subscribe:project', projectId);
    } else {
      socket.emit('subscribe:global');
    }
    
    // Listen for activities
    const handleActivity = (activity: Activity) => {
      setActivities(prev => [activity, ...prev].slice(0, 100)); // Keep last 100
      
      // Auto-scroll to top
      if (feedRef.current) {
        feedRef.current.scrollTop = 0;
      }
    };
    
    socket.on('activity:new', handleActivity);
    socket.on('project:update', (update) => {
      handleActivity({
        id: crypto.randomUUID(),
        type: 'project_update',
        timestamp: new Date(update.timestamp),
        data: update
      });
    });
    
    socket.on('agent:status', (status) => {
      handleActivity({
        id: crypto.randomUUID(),
        type: 'agent_status',
        timestamp: new Date(),
        data: status
      });
    });
    
    socket.on('task:completed', (task) => {
      handleActivity({
        id: crypto.randomUUID(),
        type: 'task_completed',
        timestamp: new Date(),
        data: task
      });
    });
    
    return () => {
      socket.off('activity:new');
      socket.off('project:update');
      socket.off('agent:status');
      socket.off('task:completed');
    };
  }, [socket, projectId]);
  
  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.type === filter);
  
  return (
    <div className="activity-feed">
      <div className="activity-feed-header">
        <h3>Activity Feed</h3>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value as ActivityType | 'all')}
          className="filter-select"
        >
          <option value="all">All Activities</option>
          <option value="project_update">Project Updates</option>
          <option value="agent_status">Agent Status</option>
          <option value="task_completed">Completed Tasks</option>
          <option value="error">Errors</option>
        </select>
      </div>
      
      <div ref={feedRef} className="activity-feed-content">
        {filteredActivities.map(activity => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
        
        {filteredActivities.length === 0 && (
          <div className="empty-state">
            <p>No activities to display</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ActivityItem: React.FC<{ activity: Activity }> = ({ activity }) => {
  const getIcon = () => {
    switch (activity.type) {
      case 'project_update': return '📊';
      case 'agent_status': return '🤖';
      case 'task_completed': return '✅';
      case 'error': return '❌';
      default: return '📌';
    }
  };
  
  const getMessage = () => {
    switch (activity.type) {
      case 'project_update':
        return `Project ${activity.data.projectId} moved to ${activity.data.phase}`;
      case 'agent_status':
        return `${activity.data.agentName} is now ${activity.data.status}`;
      case 'task_completed':
        return `Task "${activity.data.taskName}" completed by ${activity.data.agentName}`;
      case 'error':
        return `Error: ${activity.data.message}`;
      default:
        return 'Unknown activity';
    }
  };
  
  return (
    <div className="activity-item">
      <span className="activity-icon">{getIcon()}</span>
      <div className="activity-content">
        <p className="activity-message">{getMessage()}</p>
        <span className="activity-time">{formatRelativeTime(activity.timestamp)}</span>
      </div>
    </div>
  );
};
```

---

### Task 34: Enable Client Notifications
**ID**: RT-005  
**Priority**: P1 - High  
**Estimated Hours**: 4 hours  
**Dependencies**: RT-001, INT-002  
**Required Skills**: Notifications, Real-time Systems, Email Integration

**Description**:  
Implement real-time client notifications for project updates and milestones.

**Acceptance Criteria**:
- [ ] Create notification system
- [ ] Implement browser notifications
- [ ] Add email notifications
- [ ] Create notification preferences
- [ ] Build notification history
- [ ] Add notification templates
- [ ] Test notification delivery

**Notification System Implementation**:
```typescript
// src/lib/realtime/notifications.ts
export class NotificationService {
  constructor(
    private realtimeServer: RealtimeServer,
    private emailService: EmailService,
    private smsService?: SMSService
  ) {}
  
  async sendProjectNotification(
    projectId: string, 
    notification: ProjectNotification
  ): Promise<void> {
    const project = await this.projectRepo.findById(projectId);
    const preferences = await this.getClientPreferences(project.clientId);
    
    // Real-time notification
    if (preferences.realtime) {
      await this.realtimeServer.io.to(`user:${project.clientId}`).emit('notification', {
        id: crypto.randomUUID(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        timestamp: new Date(),
        actions: notification.actions
      });
    }
    
    // Email notification
    if (preferences.email) {
      await this.emailService.sendNotification({
        to: project.clientEmail,
        subject: notification.title,
        template: 'notification',
        data: {
          ...notification,
          projectName: project.name,
          actionUrl: `${process.env.APP_URL}/projects/${projectId}`
        }
      });
    }
    
    // SMS notification (optional)
    if (preferences.sms && this.smsService && notification.priority === 'high') {
      await this.smsService.send({
        to: project.clientPhone,
        message: `${notification.title}: ${notification.message}`
      });
    }
    
    // Store notification
    await this.storeNotification(project.clientId, notification);
  }
  
  async sendMilestoneNotification(projectId: string, milestone: string): Promise<void> {
    const milestoneConfig = {
      planning_complete: {
        title: 'Planning Phase Complete',
        message: 'Your project plan is ready for review',
        priority: 'medium'
      },
      development_complete: {
        title: 'Development Complete',
        message: 'Your project is ready for testing',
        priority: 'high'
      },
      project_complete: {
        title: 'Project Delivered!',
        message: 'Your project has been successfully completed',
        priority: 'high'
      }
    };
    
    const config = milestoneConfig[milestone];
    if (!config) return;
    
    await this.sendProjectNotification(projectId, {
      type: 'milestone',
      ...config,
      data: { milestone },
      actions: [
        {
          label: 'View Project',
          url: `/projects/${projectId}`
        }
      ]
    });
  }
}

// Browser notification handler
export class BrowserNotificationHandler {
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  }
  
  static async show(notification: ClientNotification): Promise<void> {
    if (!await this.requestPermission()) {
      return;
    }
    
    const notif = new Notification(notification.title, {
      body: notification.message,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: notification.id,
      data: notification.data,
      requireInteraction: notification.priority === 'high'
    });
    
    notif.onclick = () => {
      window.focus();
      if (notification.actions?.[0]?.url) {
        window.location.href = notification.actions[0].url;
      }
      notif.close();
    };
  }
}
```

---

## Testing Requirements for Sprint 2

### Unit Tests
- [ ] GitHub API operations
- [ ] Email template rendering
- [ ] S3 file operations
- [ ] Deployment service logic
- [ ] Socket.io event handlers
- [ ] Notification delivery

### Integration Tests
- [ ] GitHub webhook flow
- [ ] Email delivery verification
- [ ] File upload/download
- [ ] Deployment pipeline
- [ ] Real-time updates
- [ ] Notification preferences

### End-to-End Tests
- [ ] Complete GitHub workflow
- [ ] Email notification flow
- [ ] File storage lifecycle
- [ ] Deployment process
- [ ] Real-time dashboard
- [ ] Client notification journey

---

## Deployment Checklist for Sprint 2

### Environment Setup
- [ ] GitHub OAuth app configured
- [ ] SendGrid API key set
- [ ] AWS credentials configured
- [ ] Vercel/Railway tokens added
- [ ] Socket.io configured
- [ ] Redis pub/sub enabled

### Infrastructure
- [ ] S3 buckets created
- [ ] Email templates uploaded
- [ ] Webhook URLs configured
- [ ] WebSocket endpoints exposed
- [ ] SSL certificates for WSS
- [ ] CORS properly configured

### Monitoring
- [ ] GitHub webhook logs
- [ ] Email delivery tracking
- [ ] S3 usage monitoring
- [ ] Deployment success rates
- [ ] WebSocket connections
- [ ] Notification delivery rates

---

**Sprint 2 Summary**: This sprint focuses on connecting the platform to the external world through integrations and enabling real-time communication for enhanced user experience. All critical external services will be integrated, and the platform will gain real-time capabilities.