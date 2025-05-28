'use client';

import { io, Socket } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  lastHeartbeat: Date | null;
  reconnectAttempts: number;
}

export interface UseSocketOptions {
  autoConnect?: boolean;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface ProjectUpdateEvent {
  projectId: string;
  type: 'status_change' | 'task_update' | 'agent_assigned' | 'progress' | 'error' | 'completion';
  data: any;
  timestamp: Date;
  userId?: string;
}

export interface AgentActivityEvent {
  agentId: string;
  type: 'task_started' | 'task_completed' | 'task_failed' | 'status_change' | 'performance_update';
  taskId?: string;
  data: any;
  timestamp: Date;
}

export interface NotificationEvent {
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

export class SocketClient {
  private socket: Socket | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastHeartbeat: Date | null = null;

  constructor(private options: UseSocketOptions = {}) {
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 1000;
  }

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.connectionState = 'connecting';
    this.notifyListeners('connectionStateChange', this.connectionState);

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
      this.notifyListeners('connectionStateChange', this.connectionState);
      this.notifyListeners('connect', { socketId: this.socket?.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.connectionState = 'disconnected';
      this.clearHeartbeatTimer();
      this.notifyListeners('connectionStateChange', this.connectionState);
      this.notifyListeners('disconnect', { reason });
      
      if (this.options.reconnect !== false && reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connectionState = 'error';
      this.notifyListeners('connectionStateChange', this.connectionState);
      this.notifyListeners('connectionError', { error: error.message });
      
      if (this.options.reconnect !== false) {
        this.scheduleReconnect();
      }
    });

    // Application events
    this.socket.on('connected', (data) => {
      console.log('Socket welcome message:', data);
      this.notifyListeners('welcome', data);
    });

    this.socket.on('heartbeat', (data) => {
      this.lastHeartbeat = new Date(data.timestamp);
      this.notifyListeners('heartbeat', data);
      this.resetHeartbeatTimer();
    });

    this.socket.on('project_update', (data: ProjectUpdateEvent) => {
      this.notifyListeners('projectUpdate', data);
      this.notifyListeners(`project:${data.projectId}:update`, data);
    });

    this.socket.on('agent_activity', (data: AgentActivityEvent) => {
      this.notifyListeners('agentActivity', data);
      this.notifyListeners(`agent:${data.agentId}:activity`, data);
    });

    this.socket.on('notification', (data: NotificationEvent) => {
      this.notifyListeners('notification', data);
    });

    this.socket.on('user_joined_project', (data) => {
      this.notifyListeners('userJoinedProject', data);
    });

    this.socket.on('user_left_project', (data) => {
      this.notifyListeners('userLeftProject', data);
    });

    this.socket.on('user_typing_start', (data) => {
      this.notifyListeners('userTypingStart', data);
    });

    this.socket.on('user_typing_stop', (data) => {
      this.notifyListeners('userTypingStop', data);
    });

    this.socket.on('user_presence_updated', (data) => {
      this.notifyListeners('userPresenceUpdated', data);
    });

    this.socket.on('server_shutdown', (data) => {
      console.log('Server shutdown notice:', data);
      this.notifyListeners('serverShutdown', data);
    });

    this.socket.on('error', (data) => {
      console.error('Socket error:', data);
      this.notifyListeners('error', data);
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      this.notifyListeners('maxReconnectAttemptsReached', { attempts: this.reconnectAttempts });
      return;
    }

    this.clearReconnectTimer();

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts); // Exponential backoff
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts + 1} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`Reconnect attempt ${this.reconnectAttempts}`);
      this.notifyListeners('reconnectAttempt', { attempt: this.reconnectAttempts });
      
      if (this.socket) {
        this.socket.connect();
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private resetHeartbeatTimer(): void {
    this.clearHeartbeatTimer();
    
    // Expect heartbeat every 30 seconds, timeout after 60 seconds
    this.heartbeatTimer = setTimeout(() => {
      console.warn('Heartbeat timeout - connection may be stale');
      this.notifyListeners('heartbeatTimeout', { lastHeartbeat: this.lastHeartbeat });
    }, 60000);
  }

  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private notifyListeners(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch {
          console.error(`Error in socket event listener for ${event}:`, error);
        }
      });
    }
  }

  // Public methods
  on(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event) || new Set();
    listeners.add(callback);
    this.eventListeners.set(event, listeners);
  }

  off(event: string, callback?: Function): void {
    if (!callback) {
      this.eventListeners.delete(event);
      return;
    }

    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event}: socket not connected`);
    }
  }

  // Project-specific methods
  joinProject(projectId: string): void {
    this.emit('join_project', projectId);
  }

  leaveProject(projectId: string): void {
    this.emit('leave_project', projectId);
  }

  startTyping(projectId: string, location: string): void {
    this.emit('typing_start', { projectId, location });
  }

  stopTyping(projectId: string, location: string): void {
    this.emit('typing_stop', { projectId, location });
  }

  updatePresence(status: 'online' | 'away' | 'busy'): void {
    this.emit('update_presence', status);
  }

  // Getters
  get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  get connectionStatus(): string {
    return this.connectionState;
  }

  get socketId(): string | undefined {
    return this.socket?.id;
  }

  get reconnectCount(): number {
    return this.reconnectAttempts;
  }

  get lastHeartbeatTime(): Date | null {
    return this.lastHeartbeat;
  }

  // Cleanup
  disconnect(): void {
    this.clearReconnectTimer();
    this.clearHeartbeatTimer();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.eventListeners.clear();
    this.connectionState = 'disconnected';
  }
}

// React hook for Socket.io
export function useSocket(options: UseSocketOptions = {}): SocketContextType {
  const { data: session } = useSession();
  const [socketClient] = useState(() => new SocketClient(options));
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    // Set up event listeners
    socketClient.on('connectionStateChange', (state: string) => {
      setIsConnected(state === 'connected');
      if (state !== 'error') {
        setConnectionError(null);
      }
    });

    socketClient.on('connectionError', (data: { error: string }) => {
      setConnectionError(data.error);
    });

    socketClient.on('heartbeat', (data: { timestamp: string }) => {
      setLastHeartbeat(new Date(data.timestamp));
    });

    socketClient.on('reconnectAttempt', (data: { attempt: number }) => {
      setReconnectAttempts(data.attempt);
    });

    socketClient.on('connect', () => {
      setReconnectAttempts(0);
    });

    // Connect with session token
    const token = 'mock-token'; // In real implementation, get from session
    if (options.autoConnect !== false) {
      socketClient.connect(token);
    }

    return () => {
      socketClient.disconnect();
    };
  }, [session, socketClient, options.autoConnect]);

  return {
    socket: socketClient.isConnected ? (socketClient as any) : null,
    isConnected,
    connectionError,
    lastHeartbeat,
    reconnectAttempts,
  };
}

// Hook for project-specific socket events
export function useProjectSocket(projectId: string, options: UseSocketOptions = {}) {
  const socketContext = useSocket(options);
  const [projectUsers, setProjectUsers] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!socketContext.socket || !projectId) return;

    const client = socketContext.socket as any as SocketClient;

    // Join project room
    client.joinProject(projectId);

    // Set up project-specific listeners
    const handleUserJoined = (data: any) => {
      if (data.projectId === projectId) {
        setProjectUsers(prev => [...prev.filter(u => u.id !== data.user.id), data.user]);
      }
    };

    const handleUserLeft = (data: any) => {
      if (data.projectId === projectId) {
        setProjectUsers(prev => prev.filter(u => u.id !== data.user.id));
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.user.id);
          return newSet;
        });
      }
    };

    const handleTypingStart = (data: any) => {
      if (data.projectId === projectId) {
        setTypingUsers(prev => new Set([...prev, data.user.id]));
      }
    };

    const handleTypingStop = (data: any) => {
      if (data.projectId === projectId) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.user.id);
          return newSet;
        });
      }
    };

    client.on('userJoinedProject', handleUserJoined);
    client.on('userLeftProject', handleUserLeft);
    client.on('userTypingStart', handleTypingStart);
    client.on('userTypingStop', handleTypingStop);

    return () => {
      client.leaveProject(projectId);
      client.off('userJoinedProject', handleUserJoined);
      client.off('userLeftProject', handleUserLeft);
      client.off('userTypingStart', handleTypingStart);
      client.off('userTypingStop', handleTypingStop);
    };
  }, [socketContext.socket, projectId]);

  return {
    ...socketContext,
    projectUsers,
    typingUsers: Array.from(typingUsers),
    joinProject: (id: string) => (socketContext.socket as any)?.joinProject(id),
    leaveProject: (id: string) => (socketContext.socket as any)?.leaveProject(id),
    startTyping: (location: string) => (socketContext.socket as any)?.startTyping(projectId, location),
    stopTyping: (location: string) => (socketContext.socket as any)?.stopTyping(projectId, location),
  };
}

// Export for direct use
export { SocketClient };