export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  TENANT_ADMIN = "TENANT_ADMIN",
  PROJECT_MANAGER = "PROJECT_MANAGER",
  DEVELOPER = "DEVELOPER",
  DESIGNER = "DESIGNER",
  CLIENT = "CLIENT",
  AI_AGENT = "AI_AGENT",
}

export enum ProjectStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ON_HOLD = "ON_HOLD",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum AgentStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  TRAINING = "TRAINING",
  MAINTENANCE = "MAINTENANCE",
}

export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  REVIEW = "REVIEW",
  DONE = "DONE",
  BLOCKED = "BLOCKED",
}

export enum Priority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  role: UserRole;
  tenantId: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  logo?: string;
  isActive: boolean;
  subscription: {
    plan: string;
    status: string;
    trialEnds?: Date;
  };
  settings: {
    allowAIAgents: boolean;
    maxProjects: number;
    maxUsers: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  budget: number;
  deadline?: Date;
  clientId: string;
  tenantId: string;
  teamMembers: string[];
  assignedAgents: string[];
  progress: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AIAgent {
  id: string;
  name: string;
  type: string;
  avatar?: string;
  description: string;
  skills: string[];
  status: AgentStatus;
  tenantId: string;
  performance: {
    tasksCompleted: number;
    averageRating: number;
    reliability: number;
  };
  capabilities: {
    languages: string[];
    frameworks: string[];
    specializations: string[];
  };
  settings: {
    workingHours: string;
    responseTime: number;
    maxConcurrentTasks: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  projectId: string;
  assignedTo?: string;
  assignedAgent?: string;
  estimatedHours: number;
  actualHours?: number;
  dueDate?: Date;
  tags: string[];
  dependencies: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId?: string;
  projectId?: string;
  type: "text" | "file" | "system";
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ClientPortal {
  id: string;
  clientId: string;
  tenantId: string;
  projects: string[];
  permissions: {
    viewProjects: boolean;
    viewTeam: boolean;
    requestChanges: boolean;
    uploadFiles: boolean;
  };
  customization: {
    logo?: string;
    primaryColor: string;
    welcomeMessage: string;
  };
}