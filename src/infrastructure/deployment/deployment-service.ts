import { GitHubClient } from '@/integrations/github/github-client';
import { createEmailService } from '@/infrastructure/email/email-service';
import { getSocketManager } from '@/infrastructure/realtime/socket-server';

export interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  provider: 'vercel' | 'railway' | 'docker' | 'manual';
  repository: {
    owner: string;
    name: string;
    branch: string;
  };
  buildSettings: {
    buildCommand: string;
    outputDirectory: string;
    nodeVersion: string;
    environmentVariables: Record<string, string>;
  };
  notifications: {
    email: string[];
    slack?: string;
    discord?: string;
  };
}

export interface DeploymentStatus {
  id: string;
  projectId: string;
  environment: string;
  status: 'pending' | 'building' | 'deploying' | 'success' | 'failed' | 'cancelled';
  version: string;
  commit: string;
  startedAt: Date;
  completedAt?: Date;
  logs: DeploymentLog[];
  url?: string;
  error?: string;
  metadata: Record<string, any>;
}

export interface DeploymentLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: 'build' | 'deploy' | 'system' | 'webhook';
}

export interface DeploymentResult {
  success: boolean;
  deploymentId: string;
  url?: string;
  error?: string;
  duration: number;
  logs: DeploymentLog[];
}

export class DeploymentService {
  private deployments: Map<string, DeploymentStatus> = new Map();
  private github: GitHubClient;
  private emailService: ReturnType<typeof createEmailService>;

  constructor(github: GitHubClient) {
    this.github = github;
    this.emailService = createEmailService();
  }

  async deployProject(
    projectId: string,
    config: DeploymentConfig,
    triggeredBy: string
  ): Promise<DeploymentStatus> {
    // const deploymentId = this.generateDeploymentId();
    const version = await this.generateVersion(config.repository);
    const commit = await this.getLatestCommit(config.repository);

    // const deployment: DeploymentStatus = {
      id: deploymentId,
      projectId,
      environment: config.environment,
      status: 'pending',
      version,
      commit,
      startedAt: new Date(),
      logs: [],
      metadata: {
        triggeredBy,
        provider: config.provider,
        repository: config.repository,
      },
    };

    this.deployments.set(deploymentId, deployment);
    this.addLog(deploymentId, 'info', `Deployment ${deploymentId} started by ${triggeredBy}`, 'system');

    // Start deployment process asynchronously
    this.executeDeployment(deploymentId, config).catch(error => {
      console.error(`Deployment ${deploymentId} failed:`, error);
      this.updateDeploymentStatus(deploymentId, 'failed', error.message);
    });

    return deployment;
  }

  private async executeDeployment(deploymentId: string, config: DeploymentConfig): Promise<void> {
    try {
      this.updateDeploymentStatus(deploymentId, 'building');
      await this.runBuildProcess(deploymentId, config);

      this.updateDeploymentStatus(deploymentId, 'deploying');
    // const deploymentUrl = await this.runDeployProcess(deploymentId, config);

      this.updateDeploymentStatus(deploymentId, 'success');
      this.setDeploymentUrl(deploymentId, deploymentUrl);
      
      await this.runPostDeploymentTasks(deploymentId, config);
      await this.sendNotifications(deploymentId, config, 'success');

    } catch {
      this.updateDeploymentStatus(deploymentId, 'failed', (error as Error).message);
      await this.sendNotifications(deploymentId, config, 'failed');
      throw error;
    }
  }

  private async runBuildProcess(deploymentId: string, config: DeploymentConfig): Promise<void> {
    this.addLog(deploymentId, 'info', 'Starting build process...', 'build');

    // Simulate build steps
    const buildSteps = [
      'Installing dependencies...',
      'Running type check...',
      'Building application...',
      'Optimizing assets...',
      'Generating build artifacts...',
    ];

    for (const step of buildSteps) {
      this.addLog(deploymentId, 'info', step, 'build');
      await this.simulateAsync(1000 + Math.random() * 2000); // 1-3 seconds per step
    }

    // Simulate potential build warnings
    if (Math.random() > 0.8) {
      this.addLog(deploymentId, 'warn', 'Some assets could be optimized further', 'build');
    }

    this.addLog(deploymentId, 'info', 'Build completed successfully', 'build');
  }

  private async runDeployProcess(deploymentId: string, config: DeploymentConfig): Promise<string> {
    this.addLog(deploymentId, 'info', `Deploying to ${config.environment} environment...`, 'deploy');

    switch (config.provider) {
      case 'vercel':
        return this.deployToVercel(deploymentId, config);
      case 'railway':
        return this.deployToRailway(deploymentId, config);
      case 'docker':
        return this.deployToDocker(deploymentId, config);
      case 'manual':
        return this.deployManual(deploymentId, config);
      default:
        throw new Error(`Unsupported deployment provider: ${config.provider}`);
    }
  }

  private async deployToVercel(deploymentId: string, config: DeploymentConfig): Promise<string> {
    this.addLog(deploymentId, 'info', 'Deploying to Vercel...', 'deploy');
    
    // Simulate Vercel deployment
    const steps = [
      'Uploading build artifacts to Vercel...',
      'Creating deployment...',
      'Assigning domain...',
      'Running deployment checks...',
      'Deployment ready!',
    ];

    for (const step of steps) {
      this.addLog(deploymentId, 'info', step, 'deploy');
      await this.simulateAsync(2000 + Math.random() * 3000);
    }

    // const url = `https://${config.repository.name}-${deploymentId.slice(-8)}.vercel.app`;
    this.addLog(deploymentId, 'info', `Deployed to: ${url}`, 'deploy');
    
    return url;
  }

  private async deployToRailway(deploymentId: string, config: DeploymentConfig): Promise<string> {
    this.addLog(deploymentId, 'info', 'Deploying to Railway...', 'deploy');
    
    const steps = [
      'Pushing to Railway...',
      'Building Docker image...',
      'Deploying container...',
      'Health checks passing...',
      'Service is live!',
    ];

    for (const step of steps) {
      this.addLog(deploymentId, 'info', step, 'deploy');
      await this.simulateAsync(3000 + Math.random() * 2000);
    }

    const url = `https://${config.repository.name}-production.up.railway.app`;
    this.addLog(deploymentId, 'info', `Deployed to: ${url}`, 'deploy');
    
    return url;
  }

  private async deployToDocker(deploymentId: string, config: DeploymentConfig): Promise<string> {
    this.addLog(deploymentId, 'info', 'Building and deploying Docker container...', 'deploy');
    
    const steps = [
      'Building Docker image...',
      'Pushing to container registry...',
      'Pulling image on target server...',
      'Stopping previous container...',
      'Starting new container...',
      'Container is running!',
    ];

    for (const step of steps) {
      this.addLog(deploymentId, 'info', step, 'deploy');
      await this.simulateAsync(4000 + Math.random() * 3000);
    }

    const url = `https://${config.repository.name}.yourdomain.com`;
    this.addLog(deploymentId, 'info', `Deployed to: ${url}`, 'deploy');
    
    return url;
  }

  private async deployManual(deploymentId: string, config: DeploymentConfig): Promise<string> {
    this.addLog(deploymentId, 'info', 'Manual deployment process...', 'deploy');
    
    const steps = [
      'Generating deployment package...',
      'Creating deployment instructions...',
      'Notifying deployment team...',
      'Awaiting manual deployment...',
    ];

    for (const step of steps) {
      this.addLog(deploymentId, 'info', step, 'deploy');
      await this.simulateAsync(1000);
    }

    const url = `https://${config.repository.name}.manual-deploy.com`;
    this.addLog(deploymentId, 'info', `Manual deployment package ready: ${url}`, 'deploy');
    
    return url;
  }

  private async runPostDeploymentTasks(deploymentId: string, config: DeploymentConfig): Promise<void> {
    this.addLog(deploymentId, 'info', 'Running post-deployment tasks...', 'system');

    const tasks = [
      'Warming up application...',
      'Running smoke tests...',
      'Updating DNS records...',
      'Clearing CDN cache...',
      'Post-deployment checks complete!',
    ];

    for (const task of tasks) {
      this.addLog(deploymentId, 'info', task, 'system');
      await this.simulateAsync(1500);
    }
  }

  private async sendNotifications(
    deploymentId: string,
    config: DeploymentConfig,
    status: 'success' | 'failed'
  ): Promise<void> {
    // const deployment = this.deployments.get(deploymentId);
    if (!deployment) return;

    // Send email notifications
    for (const email of config.notifications.email) {
      try {
        await this.emailService.sendCustomEmail({
          to: { email },
          subject: `Deployment ${status.toUpperCase()}: ${config.repository.name} v${deployment.version}`,
          htmlContent: this.generateDeploymentEmailContent(deployment, status),
        });
      } catch {
        console.error('Failed to send deployment notification email:', error);
      }
    }

    // Send real-time notifications via Socket.io
    const socketManager = getSocketManager();
    if (socketManager) {
      socketManager.sendNotificationToTenant(deployment.metadata.tenantId || 'default', {
        id: `deployment-${deploymentId}`,
        type: status === 'success' ? 'success' : 'error',
        title: `Deployment ${status === 'success' ? 'Successful' : 'Failed'}`,
        message: `${config.repository.name} v${deployment.version} ${status === 'success' ? 'deployed successfully' : 'failed to deploy'}`,
        timestamp: new Date(),
        read: false,
        metadata: {
          deploymentId,
          projectId: deployment.projectId,
          url: deployment.url,
        },
      });
    }

    this.addLog(deploymentId, 'info', `Notifications sent (${status})`, 'system');
  }

  private generateDeploymentEmailContent(deployment: DeploymentStatus, status: 'success' | 'failed'): string {
    const statusColor = status === 'success' ? '#28a745' : '#dc3545';
    const statusIcon = status === 'success' ? '✅' : '❌';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${statusColor}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .logs { background: #f8f9fa; padding: 15px; font-family: monospace; font-size: 12px; max-height: 300px; overflow-y: auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${statusIcon} Deployment ${status === 'success' ? 'Successful' : 'Failed'}</h1>
          </div>
          <div class="content">
            <h2>Deployment Details</h2>
            <p><strong>Project:</strong> ${deployment.metadata.repository.name}</p>
            <p><strong>Environment:</strong> ${deployment.environment}</p>
            <p><strong>Version:</strong> ${deployment.version}</p>
            <p><strong>Commit:</strong> ${deployment.commit}</p>
            <p><strong>Duration:</strong> ${deployment.completedAt ? Math.round((deployment.completedAt.getTime() - deployment.startedAt.getTime()) / 1000) : 'N/A'} seconds</p>
            ${deployment.url ? `<p><strong>URL:</strong> <a href="${deployment.url}">${deployment.url}</a></p>` : ''}
            ${deployment.error ? `<p><strong>Error:</strong> ${deployment.error}</p>` : ''}
            
            <h3>Recent Logs</h3>
            <div class="logs">
              ${deployment.logs.slice(-10).map(log => 
                `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()}: ${log.message}`
              ).join('<br>')}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Public API methods
  getDeployment(deploymentId: string): DeploymentStatus | undefined {
    return this.deployments.get(deploymentId);
  }

  getProjectDeployments(projectId: string): DeploymentStatus[] {
    return Array.from(this.deployments.values())
      .filter(d => d.projectId === projectId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  getDeploymentLogs(deploymentId: string, since?: Date): DeploymentLog[] {
    // const deployment = this.deployments.get(deploymentId);
    if (!deployment) return [];

    if (since) {
      return deployment.logs.filter(log => log.timestamp > since);
    }

    return deployment.logs;
  }

  async cancelDeployment(deploymentId: string): Promise<boolean> {
    // const deployment = this.deployments.get(deploymentId);
    if (!deployment || deployment.status === 'success' || deployment.status === 'failed') {
      return false;
    }

    this.updateDeploymentStatus(deploymentId, 'cancelled');
    this.addLog(deploymentId, 'info', 'Deployment cancelled by user', 'system');
    
    return true;
  }

  async retryDeployment(deploymentId: string): Promise<string> {
    // const originalDeployment = this.deployments.get(deploymentId);
    if (!originalDeployment) {
      throw new Error('Original deployment not found');
    }

    // Create new deployment with same config
    const config = this.reconstructConfigFromDeployment(originalDeployment);
    const newDeployment = await this.deployProject(
      originalDeployment.projectId,
      config,
      'retry'
    );

    return newDeployment.id;
  }

  // Utility methods
  private generateDeploymentId(): string {
    return `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  private async generateVersion(repository: { owner: string; name: string; branch: string }): Promise<string> {
    try {
      // Get latest commit to generate version
      const commits = await this.github.listPullRequests(repository.owner, repository.name, 'closed');
      const version = `1.0.${commits.length}`;
      return version;
    } catch {
      // Fallback to timestamp-based version
      return `1.0.${Math.floor(Date.now() / 1000)}`;
    }
  }

  private async getLatestCommit(repository: { owner: string; name: string; branch: string }): Promise<string> {
    try {
      const branches = await this.github.listBranches(repository.owner, repository.name);
      const targetBranch = branches.find(b => b.name === repository.branch);
      return targetBranch?.commit.sha.substring(0, 8) || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private updateDeploymentStatus(deploymentId: string, status: DeploymentStatus['status'], error?: string): void {
    // const deployment = this.deployments.get(deploymentId);
    if (!deployment) return;

    deployment.status = status;
    if (error) deployment.error = error;
    if (status === 'success' || status === 'failed' || status === 'cancelled') {
      deployment.completedAt = new Date();
    }

    // Broadcast status update via Socket.io
    const socketManager = getSocketManager();
    if (socketManager) {
      socketManager.broadcastProjectUpdate({
        projectId: deployment.projectId,
        type: 'status_change',
        data: {
          deploymentId,
          status,
          error,
          url: deployment.url,
        },
        timestamp: new Date(),
      });
    }
  }

  private setDeploymentUrl(deploymentId: string, url: string): void {
    // const deployment = this.deployments.get(deploymentId);
    if (deployment) {
      deployment.url = url;
    }
  }

  private addLog(deploymentId: string, level: DeploymentLog['level'], message: string, source: DeploymentLog['source']): void {
    // const deployment = this.deployments.get(deploymentId);
    if (!deployment) return;

    const log: DeploymentLog = {
      timestamp: new Date(),
      level,
      message,
      source,
    };

    deployment.logs.push(log);
    console.log(`[${deploymentId}] ${level.toUpperCase()}: ${message}`);

    // Broadcast log update via Socket.io for real-time monitoring
    const socketManager = getSocketManager();
    if (socketManager) {
      socketManager.broadcastProjectUpdate({
        projectId: deployment.projectId,
        type: 'progress',
        data: {
          deploymentId,
          log,
        },
        timestamp: new Date(),
      });
    }
  }

  private async simulateAsync(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private reconstructConfigFromDeployment(deployment: DeploymentStatus): DeploymentConfig {
    return {
      environment: deployment.environment as any,
      provider: deployment.metadata.provider,
      repository: deployment.metadata.repository,
      buildSettings: {
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        nodeVersion: '18',
        environmentVariables: {},
      },
      notifications: {
        email: ['admin@example.com'],
      },
    };
  }

  // Statistics and monitoring
  getDeploymentStats(): {
    total: number;
    success: number;
    failed: number;
    pending: number;
    averageDuration: number;
  } {
    // const deployments = Array.from(this.deployments.values());
    // const total = deployments.length;
    // const success = deployments.filter(d => d.status === 'success').length;
    // const failed = deployments.filter(d => d.status === 'failed').length;
    // const pending = deployments.filter(d => d.status === 'pending' || d.status === 'building' || d.status === 'deploying').length;

    // const completedDeployments = deployments.filter(d => d.completedAt);
    const averageDuration = completedDeployments.length > 0
      ? completedDeployments.reduce((sum, d) => {
          return sum + (d.completedAt!.getTime() - d.startedAt.getTime());
        }, 0) / completedDeployments.length / 1000
      : 0;

    return {
      total,
      success,
      failed,
      pending,
      averageDuration: Math.round(averageDuration),
    };
  }
}

// Factory function
export function createDeploymentService(github: GitHubClient): DeploymentService {
  return new DeploymentService(github);
}