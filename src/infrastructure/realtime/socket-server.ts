import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { NextApiRequest } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/auth/config';

export interface SocketUser {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  role: string;
  socketId: string;
  connectedAt: Date;
  lastSeen: Date;
}

export interface ProjectUpdate {
  projectId: string;
  type: 'status_change' | 'task_update' | 'agent_assigned' | 'progress' | 'error' | 'completion';
  data: any;
  timestamp: Date;
  userId?: string;
}

export interface AgentActivity {
  agentId: string;
  type: 'task_started' | 'task_completed' | 'task_failed' | 'status_change' | 'performance_update';
  taskId?: string;
  data: any;
  timestamp: Date;
}

export interface NotificationMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  userId?: string;
  tenantId?: string;
  metadata?: any;
  timestamp: Date;
  read: boolean;
}

export class SocketManager {
  private io: SocketIOServer;
  private users: Map<string, SocketUser> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds
  private tenantRooms: Map<string, Set<string>> = new Map(); // tenantId -> userIds
  private projectRooms: Map<string, Set<string>> = new Map(); // projectId -> userIds

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupSocketHandlers();
    this.setupHeartbeat();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', async (socket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Authenticate user
      const user = await this.authenticateSocket(socket);
      if (!user) {
        socket.emit('error', { message: 'Authentication failed' });
        socket.disconnect();
        return;
      }

      // Register user
      this.registerUser(socket.id, user);

      // Join tenant and project rooms
      await this.joinUserRooms(socket, user);

      // Set up event handlers
      this.setupUserEventHandlers(socket, user);

      // Send welcome message
      socket.emit('connected', {
        message: 'Connected to real-time updates',
        user: {
          id: user.id,
          name: user.name,
          tenantId: user.tenantId,
        },
        timestamp: new Date(),
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.unregisterUser(socket.id);
        console.log(`Socket disconnected: ${socket.id}`);
      });
    });
  }

  private async authenticateSocket(socket: any): Promise<SocketUser | null> {
    try {
      // Get session from handshake auth
      const token = socket.handshake.auth.token;
      if (!token) {
        return null;
      }

      // In a real implementation, you would verify the JWT token here
      // For now, we'll simulate with a mock user
      const mockUser: SocketUser = {
        id: 'user-1',
        email: 'demo@example.com',
        name: 'Demo User',
        tenantId: 'demo-tenant',
        role: 'admin',
        socketId: socket.id,
        connectedAt: new Date(),
        lastSeen: new Date(),
      };

      return mockUser;
    } catch {
      console.error('Socket authentication failed:', error);
      return null;
    }
  }

  private registerUser(socketId: string, user: SocketUser): void {
    // Store user by socket ID
    this.users.set(socketId, user);

    // Track user's sockets
    const userSockets = this.userSockets.get(user.id) || new Set();
    userSockets.add(socketId);
    this.userSockets.set(user.id, userSockets);

    // Add to tenant room
    const tenantUsers = this.tenantRooms.get(user.tenantId) || new Set();
    tenantUsers.add(user.id);
    this.tenantRooms.set(user.tenantId, tenantUsers);

    console.log(`User ${user.name} (${user.id}) connected to tenant ${user.tenantId}`);
  }

  private unregisterUser(socketId: string): void {
    const user = this.users.get(socketId);
    if (!user) return;

    // Remove from users map
    this.users.delete(socketId);

    // Remove socket from user's sockets
    const userSockets = this.userSockets.get(user.id);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.userSockets.delete(user.id);
        
        // Remove from tenant room if no more sockets
        const tenantUsers = this.tenantRooms.get(user.tenantId);
        if (tenantUsers) {
          tenantUsers.delete(user.id);
          if (tenantUsers.size === 0) {
            this.tenantRooms.delete(user.tenantId);
          }
        }
      }
    }
  }

  private async joinUserRooms(socket: any, user: SocketUser): Promise<void> {
    // Join tenant room
    await socket.join(`tenant:${user.tenantId}`);
    
    // Join user-specific room
    await socket.join(`user:${user.id}`);

    console.log(`User ${user.id} joined rooms: tenant:${user.tenantId}, user:${user.id}`);
  }

  private setupUserEventHandlers(socket: any, user: SocketUser): void {
    // Join project room
    socket.on('join_project', async (projectId: string) => {
      await socket.join(`project:${projectId}`);
      
      const projectUsers = this.projectRooms.get(projectId) || new Set();
      projectUsers.add(user.id);
      this.projectRooms.set(projectId, projectUsers);
      
      console.log(`User ${user.id} joined project ${projectId}`);
      
      // Notify others in the project
      socket.to(`project:${projectId}`).emit('user_joined_project', {
        projectId,
        user: { id: user.id, name: user.name },
        timestamp: new Date(),
      });
    });

    // Leave project room
    socket.on('leave_project', async (projectId: string) => {
      await socket.leave(`project:${projectId}`);
      
      const projectUsers = this.projectRooms.get(projectId);
      if (projectUsers) {
        projectUsers.delete(user.id);
        if (projectUsers.size === 0) {
          this.projectRooms.delete(projectId);
        }
      }
      
      console.log(`User ${user.id} left project ${projectId}`);
      
      // Notify others in the project
      socket.to(`project:${projectId}`).emit('user_left_project', {
        projectId,
        user: { id: user.id, name: user.name },
        timestamp: new Date(),
      });
    });

    // Handle typing indicators
    socket.on('typing_start', (data: { projectId: string; location: string }) => {
      socket.to(`project:${data.projectId}`).emit('user_typing_start', {
        ...data,
        user: { id: user.id, name: user.name },
        timestamp: new Date(),
      });
    });

    socket.on('typing_stop', (data: { projectId: string; location: string }) => {
      socket.to(`project:${data.projectId}`).emit('user_typing_stop', {
        ...data,
        user: { id: user.id, name: user.name },
        timestamp: new Date(),
      });
    });

    // Handle presence updates
    socket.on('update_presence', (status: 'online' | 'away' | 'busy') => {
      user.lastSeen = new Date();
      
      // Broadcast to tenant
      socket.to(`tenant:${user.tenantId}`).emit('user_presence_updated', {
        userId: user.id,
        status,
        timestamp: new Date(),
      });
    });

    // Handle custom events
    socket.on('custom_event', (data: any) => {
      console.log(`Custom event from ${user.id}:`, data);
      
      // Echo back or broadcast as needed
      if (data.broadcast && data.room) {
        socket.to(data.room).emit('custom_event', {
          ...data,
          fromUser: { id: user.id, name: user.name },
          timestamp: new Date(),
        });
      }
    });
  }

  private setupHeartbeat(): void {
    setInterval(() => {
      this.io.emit('heartbeat', { timestamp: new Date() });
      
      // Update last seen for all connected users
      this.users.forEach(user => {
        user.lastSeen = new Date();
      });
    }, 30000); // Every 30 seconds
  }

  // Public methods for broadcasting events

  broadcastProjectUpdate(update: ProjectUpdate): void {
    const room = `project:${update.projectId}`;
    
    this.io.to(room).emit('project_update', {
      ...update,
      timestamp: new Date(),
    });

    console.log(`Broadcasted project update to ${room}:`, update.type);
  }

  broadcastAgentActivity(activity: AgentActivity, tenantId: string): void {
    const room = `tenant:${tenantId}`;
    
    this.io.to(room).emit('agent_activity', {
      ...activity,
      timestamp: new Date(),
    });

    console.log(`Broadcasted agent activity to ${room}:`, activity.type);
  }

  sendNotificationToUser(userId: string, notification: NotificationMessage): void {
    const room = `user:${userId}`;
    
    this.io.to(room).emit('notification', {
      ...notification,
      timestamp: new Date(),
    });

    console.log(`Sent notification to user ${userId}:`, notification.title);
  }

  sendNotificationToTenant(tenantId: string, notification: NotificationMessage): void {
    const room = `tenant:${tenantId}`;
    
    this.io.to(room).emit('notification', {
      ...notification,
      timestamp: new Date(),
    });

    console.log(`Sent notification to tenant ${tenantId}:`, notification.title);
  }

  broadcastTaskUpdate(taskId: string, projectId: string, update: any): void {
    this.broadcastProjectUpdate({
      projectId,
      type: 'task_update',
      data: { taskId, ...update },
      timestamp: new Date(),
    });
  }

  broadcastAgentAssignment(projectId: string, agentId: string, taskId: string, agentName: string): void {
    this.broadcastProjectUpdate({
      projectId,
      type: 'agent_assigned',
      data: { agentId, taskId, agentName },
      timestamp: new Date(),
    });
  }

  broadcastProgressUpdate(projectId: string, progress: any): void {
    this.broadcastProjectUpdate({
      projectId,
      type: 'progress',
      data: progress,
      timestamp: new Date(),
    });
  }

  broadcastError(projectId: string, error: any): void {
    this.broadcastProjectUpdate({
      projectId,
      type: 'error',
      data: error,
      timestamp: new Date(),
    });
  }

  broadcastCompletion(projectId: string, result: any): void {
    this.broadcastProjectUpdate({
      projectId,
      type: 'completion',
      data: result,
      timestamp: new Date(),
    });
  }

  // Statistics and monitoring
  getStats(): {
    connectedUsers: number;
    totalSockets: number;
    tenantRooms: number;
    projectRooms: number;
    usersByTenant: Record<string, number>;
  } {
    const usersByTenant: Record<string, number> = {};
    
    this.tenantRooms.forEach((users, tenantId) => {
      usersByTenant[tenantId] = users.size;
    });

    return {
      connectedUsers: this.userSockets.size,
      totalSockets: this.users.size,
      tenantRooms: this.tenantRooms.size,
      projectRooms: this.projectRooms.size,
      usersByTenant,
    };
  }

  getConnectedUsers(tenantId?: string): SocketUser[] {
    if (tenantId) {
      return Array.from(this.users.values()).filter(user => user.tenantId === tenantId);
    }
    return Array.from(this.users.values());
  }

  getUsersInProject(projectId: string): SocketUser[] {
    const userIds = this.projectRooms.get(projectId) || new Set();
    return Array.from(this.users.values()).filter(user => userIds.has(user.id));
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  getUserLastSeen(userId: string): Date | null {
    const userSockets = this.userSockets.get(userId);
    if (!userSockets) return null;

    // Find the most recent last seen time across all user's sockets
    let lastSeen: Date | null = null;
    for (const socketId of userSockets) {
      const user = this.users.get(socketId);
      if (user && (!lastSeen || user.lastSeen > lastSeen)) {
        lastSeen = user.lastSeen;
      }
    }

    return lastSeen;
  }

  // Cleanup and shutdown
  async shutdown(): Promise<void> {
    console.log('Shutting down Socket.IO server...');
    
    // Notify all clients about shutdown
    this.io.emit('server_shutdown', {
      message: 'Server is shutting down',
      timestamp: new Date(),
    });

    // Give clients time to receive the message
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Close all connections
    this.io.close();
    
    // Clear internal state
    this.users.clear();
    this.userSockets.clear();
    this.tenantRooms.clear();
    this.projectRooms.clear();

    console.log('Socket.IO server shut down complete');
  }
}

// Singleton instance
let socketManager: SocketManager | null = null;

export function initializeSocketManager(httpServer: HTTPServer): SocketManager {
  if (!socketManager) {
    socketManager = new SocketManager(httpServer);
  }
  return socketManager;
}

export function getSocketManager(): SocketManager | null {
  return socketManager;
}

export { SocketManager };