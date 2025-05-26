# Virtual IT Company Platform - Implementation Guide

## Overview

This guide provides a step-by-step approach to implementing the Virtual IT Company Platform from scratch. Follow these instructions to build a fully autonomous AI-powered software development company.

## Prerequisites

### System Requirements
- **Operating System**: macOS, Linux, or Windows with WSL2
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: 50GB free space (SSD recommended)
- **Docker**: Version 20.10 or higher
- **Node.js**: Version 18.x or higher
- **Git**: Version 2.x or higher

### Required Accounts
- GitHub account (for repository management)
- Anthropic Claude API key (optional for production)
- OpenAI API key (optional for backup)
- SendGrid account (for email notifications)
- Stripe account (for billing, optional)
- Vercel account (for frontend deployment)

## Phase 1: Local Development Setup (Week 1)

### Step 1: Clone and Initialize Project

```bash
# Clone the repository
git clone https://github.com/yourusername/virtual-it-company-platform.git
cd virtual-it-company-platform

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Step 2: Configure Environment Variables

Edit `.env` file with your configuration:

```env
# Core Configuration
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/vitc_dev

# AI API Keys (Start with local Ollama)
OLLAMA_BASE_URL=http://localhost:11434
CLAUDE_API_KEY=your_claude_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Redis Configuration
REDIS_URL=redis://localhost:6379

# n8n Configuration
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your_secure_password

# External Services
GITHUB_TOKEN=your_github_token
SENDGRID_API_KEY=your_sendgrid_key
```

### Step 3: Set Up Docker Services

Create `docker-compose.yml`:

```yaml
version: '3.9'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: vitc_dev
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # Redis Cache
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  # n8n Workflow Engine
  n8n:
    image: n8nio/n8n
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=password
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://localhost:5678/
    volumes:
      - n8n_data:/home/node/.n8n
    ports:
      - "5678:5678"
    depends_on:
      - postgres
      - redis

  # Ollama for Local AI
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

volumes:
  postgres_data:
  redis_data:
  n8n_data:
  ollama_data:
```

Start the services:

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 4: Install Ollama Models

```bash
# Pull required models
docker exec -it virtual-it-company-platform_ollama_1 ollama pull mistral
docker exec -it virtual-it-company-platform_ollama_1 ollama pull codellama
docker exec -it virtual-it-company-platform_ollama_1 ollama pull llama2

# Verify models
docker exec -it virtual-it-company-platform_ollama_1 ollama list
```

## Phase 2: Core Platform Development (Week 2)

### Step 1: Database Setup

Create database schema:

```bash
# Run Prisma migrations
npx prisma migrate dev --name init

# Seed initial data
npm run db:seed
```

Prisma schema (`prisma/schema.prisma`):

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      UserRole @default(CLIENT)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  tenantId  String?
  tenant    Tenant?  @relation(fields: [tenantId], references: [id])
  projects  Project[]
}

model Tenant {
  id        String   @id @default(cuid())
  name      String
  plan      String   @default("free")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  users     User[]
  projects  Project[]
  agents    AIAgent[]
}

model Project {
  id           String   @id @default(cuid())
  name         String
  description  String?
  requirements String   @db.Text
  status       ProjectStatus @default(INITIATED)
  budget       Float?
  deadline     DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  clientId     String
  client       User     @relation(fields: [clientId], references: [id])
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  
  tasks        Task[]
  deployments  Deployment[]
  githubRepo   String?
}

model Task {
  id          String   @id @default(cuid())
  title       String
  description String?
  status      TaskStatus @default(PENDING)
  assignedTo  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  completedAt DateTime?
  
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])
  
  code        String?  @db.Text
  tests       String?  @db.Text
}

model AIAgent {
  id           String   @id @default(cuid())
  name         String
  role         String
  model        String
  status       AgentStatus @default(AVAILABLE)
  capabilities Json
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
}

model Deployment {
  id          String   @id @default(cuid())
  environment String
  url         String?
  status      String
  createdAt   DateTime @default(now())
  
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])
}

enum UserRole {
  ADMIN
  CLIENT
  VIEWER
}

enum ProjectStatus {
  INITIATED
  PLANNING
  DEVELOPMENT
  TESTING
  REVIEW
  DEPLOYED
  COMPLETED
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  REVIEW
  COMPLETED
  CANCELLED
}

enum AgentStatus {
  AVAILABLE
  BUSY
  OFFLINE
}
```

### Step 2: Implement AI Agent System

Create the base agent class (`src/lib/ai/agents/base.ts`):

```typescript
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";

export interface AgentConfig {
  name: string;
  role: string;
  model: string;
  provider: 'ollama' | 'claude' | 'openai';
  systemPrompt: string;
}

export abstract class BaseAgent {
  protected llm: any;
  protected config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    this.llm = this.initializeLLM();
  }

  private initializeLLM() {
    switch (this.config.provider) {
      case 'ollama':
        return new ChatOllama({
          baseUrl: process.env.OLLAMA_BASE_URL,
          model: this.config.model,
        });
      case 'claude':
        return new ChatAnthropic({
          apiKey: process.env.CLAUDE_API_KEY,
          modelName: this.config.model,
        });
      case 'openai':
        return new ChatOpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          modelName: this.config.model,
        });
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`);
    }
  }

  abstract async processTask(task: any): Promise<any>;

  protected async chat(prompt: string, context?: string): Promise<string> {
    const messages = [
      { role: 'system', content: this.config.systemPrompt },
      { role: 'user', content: context ? `Context: ${context}\n\n${prompt}` : prompt }
    ];

    const response = await this.llm.invoke(messages);
    return response.content;
  }
}
```

Implement specialized agents (`src/lib/ai/agents/`):

```typescript
// project-manager.ts
export class ProjectManagerAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Project Manager',
      role: 'Senior Project Manager',
      model: 'mistral',
      provider: 'ollama',
      systemPrompt: `You are a Senior Project Manager with 10+ years of experience.
        Your responsibilities include:
        - Analyzing project requirements
        - Creating detailed project plans
        - Estimating timelines and resources
        - Managing project risks
        - Coordinating with team members`
    });
  }

  async processTask(task: any): Promise<any> {
    switch (task.type) {
      case 'analyze_requirements':
        return this.analyzeRequirements(task.data);
      case 'create_plan':
        return this.createProjectPlan(task.data);
      case 'estimate_timeline':
        return this.estimateTimeline(task.data);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  private async analyzeRequirements(requirements: string) {
    const prompt = `Analyze these project requirements and provide:
      1. Clarity assessment (1-10)
      2. Missing information
      3. Technical feasibility
      4. Estimated complexity
      5. Recommended approach
      
      Requirements: ${requirements}`;
    
    return this.chat(prompt);
  }

  private async createProjectPlan(data: any) {
    const prompt = `Create a detailed project plan including:
      1. Task breakdown structure
      2. Timeline with milestones
      3. Resource allocation
      4. Risk assessment
      5. Success criteria
      
      Project: ${JSON.stringify(data)}`;
    
    return this.chat(prompt);
  }
}

// developer.ts
export class DeveloperAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Developer',
      role: 'Senior Full-Stack Developer',
      model: 'codellama',
      provider: 'ollama',
      systemPrompt: `You are a Senior Full-Stack Developer with expertise in:
        - React, Next.js, TypeScript
        - Node.js, Python, Go
        - PostgreSQL, MongoDB, Redis
        - REST APIs, GraphQL
        - Cloud deployment (AWS, Vercel)
        Write clean, production-ready code with proper error handling.`
    });
  }

  async processTask(task: any): Promise<any> {
    switch (task.type) {
      case 'implement_feature':
        return this.implementFeature(task.data);
      case 'fix_bug':
        return this.fixBug(task.data);
      case 'code_review':
        return this.reviewCode(task.data);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  private async implementFeature(data: any) {
    const prompt = `Implement this feature with production-ready code:
      Feature: ${data.feature}
      Tech Stack: ${data.techStack}
      Requirements: ${data.requirements}
      
      Provide complete implementation with:
      - File structure
      - Full code
      - Error handling
      - Comments`;
    
    return this.chat(prompt, data.context);
  }
}
```

### Step 3: Create Agent Orchestrator

Implement the orchestrator (`src/lib/ai/orchestrator.ts`):

```typescript
import { ProjectManagerAgent } from './agents/project-manager';
import { DeveloperAgent } from './agents/developer';
import { TesterAgent } from './agents/tester';
import { DevOpsAgent } from './agents/devops';
import Redis from 'ioredis';

export class AgentOrchestrator {
  private redis: Redis;
  private agents: Map<string, BaseAgent>;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
    this.agents = new Map([
      ['project-manager', new ProjectManagerAgent()],
      ['developer', new DeveloperAgent()],
      ['tester', new TesterAgent()],
      ['devops', new DevOpsAgent()],
    ]);
  }

  async executeProjectWorkflow(projectId: string, requirements: string) {
    // Store project in Redis
    await this.redis.hset(`project:${projectId}`, {
      status: 'initiated',
      requirements,
      createdAt: new Date().toISOString(),
    });

    // Start workflow
    const workflow = [
      { agent: 'project-manager', task: { type: 'analyze_requirements', data: requirements } },
      { agent: 'project-manager', task: { type: 'create_plan', data: { requirements } } },
      { agent: 'developer', task: { type: 'implement_feature', data: { /* ... */ } } },
      { agent: 'tester', task: { type: 'create_tests', data: { /* ... */ } } },
      { agent: 'devops', task: { type: 'deploy', data: { /* ... */ } } },
    ];

    const results = [];
    for (const step of workflow) {
      const agent = this.agents.get(step.agent);
      if (!agent) throw new Error(`Agent not found: ${step.agent}`);

      const result = await agent.processTask(step.task);
      results.push({ agent: step.agent, result });

      // Update project status
      await this.redis.hset(`project:${projectId}`, {
        lastUpdate: new Date().toISOString(),
        currentStep: step.agent,
      });
    }

    return results;
  }

  async getProjectStatus(projectId: string) {
    return this.redis.hgetall(`project:${projectId}`);
  }
}
```

### Step 4: Implement tRPC API

Create tRPC router (`src/lib/trpc/routers/project.ts`):

```typescript
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { AgentOrchestrator } from '../../ai/orchestrator';
import { prisma } from '../../database/connection';

const orchestrator = new AgentOrchestrator();

export const projectRouter = router({
  create: protectedProcedure
    .input(z.object({
      name: z.string(),
      requirements: z.string(),
      budget: z.number().optional(),
      deadline: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Create project in database
      const project = await prisma.project.create({
        data: {
          name: input.name,
          requirements: input.requirements,
          budget: input.budget,
          deadline: input.deadline ? new Date(input.deadline) : null,
          clientId: ctx.session.user.id,
          tenantId: ctx.session.user.tenantId,
        },
      });

      // Start AI workflow
      orchestrator.executeProjectWorkflow(project.id, input.requirements)
        .catch(console.error); // Run async, don't block response

      return project;
    }),

  list: protectedProcedure
    .query(async ({ ctx }) => {
      return prisma.project.findMany({
        where: {
          clientId: ctx.session.user.id,
        },
        include: {
          tasks: true,
          deployments: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }),

  get: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.id,
          clientId: ctx.session.user.id,
        },
        include: {
          tasks: true,
          deployments: true,
        },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // Get real-time status from Redis
      const status = await orchestrator.getProjectStatus(project.id);

      return {
        ...project,
        realtimeStatus: status,
      };
    }),

  updateStatus: publicProcedure
    .input(z.object({
      projectId: z.string(),
      status: z.enum(['PLANNING', 'DEVELOPMENT', 'TESTING', 'REVIEW', 'DEPLOYED', 'COMPLETED']),
    }))
    .mutation(async ({ input }) => {
      return prisma.project.update({
        where: { id: input.projectId },
        data: { status: input.status },
      });
    }),
});
```

## Phase 3: n8n Workflow Integration (Week 3)

### Step 1: Create n8n Workflows

Access n8n at `http://localhost:5678` and import these workflows:

#### New Project Workflow

```json
{
  "name": "New Project Handler",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "new-project",
        "responseMode": "responseNode",
        "options": {}
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "typeVersion": 1
    },
    {
      "parameters": {
        "method": "POST",
        "url": "http://host.docker.internal:3000/api/trpc/project.create",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "json",
              "value": "={{ JSON.stringify($json) }}"
            }
          ]
        }
      },
      "name": "Create Project",
      "type": "n8n-nodes-base.httpRequest",
      "position": [450, 300],
      "typeVersion": 3
    },
    {
      "parameters": {
        "operation": "create",
        "owner": "={{ $json.github_org }}",
        "repository": "={{ $json.project_id }}-{{ $json.name.toLowerCase().replace(/ /g, '-') }}",
        "additionalFields": {
          "autoInit": true,
          "description": "={{ $json.requirements }}",
          "private": true
        }
      },
      "name": "Create GitHub Repo",
      "type": "n8n-nodes-base.github",
      "position": [650, 300],
      "typeVersion": 1
    },
    {
      "parameters": {
        "fromEmail": "projects@yourvirtualcompany.com",
        "toEmail": "={{ $json.client_email }}",
        "subject": "Project {{ $json.name }} - Started",
        "text": "Your project has been initiated. Project ID: {{ $json.id }}",
        "html": "<h2>Project Started!</h2><p>Your project <strong>{{ $json.name }}</strong> has been initiated.</p><p>Project ID: {{ $json.id }}</p><p>You can track progress at: {{ $json.tracking_url }}</p>"
      },
      "name": "Send Confirmation Email",
      "type": "n8n-nodes-base.emailSend",
      "position": [850, 300],
      "typeVersion": 2
    },
    {
      "parameters": {
        "values": {
          "string": [
            {
              "name": "status",
              "value": "success"
            },
            {
              "name": "project_id",
              "value": "={{ $node['Create Project'].json.id }}"
            }
          ]
        }
      },
      "name": "Response",
      "type": "n8n-nodes-base.set",
      "position": [1050, 300],
      "typeVersion": 1
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{ "node": "Create Project", "type": "main", "index": 0 }]]
    },
    "Create Project": {
      "main": [[{ "node": "Create GitHub Repo", "type": "main", "index": 0 }]]
    },
    "Create GitHub Repo": {
      "main": [[{ "node": "Send Confirmation Email", "type": "main", "index": 0 }]]
    },
    "Send Confirmation Email": {
      "main": [[{ "node": "Response", "type": "main", "index": 0 }]]
    }
  }
}
```

### Step 2: Set Up Webhook Integration

Configure webhook endpoints in your application:

```typescript
// src/app/api/webhooks/n8n/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database/connection';

const webhookSchema = z.object({
  event: z.string(),
  projectId: z.string(),
  data: z.any(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, projectId, data } = webhookSchema.parse(body);

    switch (event) {
      case 'workflow.completed':
        await handleWorkflowCompleted(projectId, data);
        break;
      case 'task.completed':
        await handleTaskCompleted(projectId, data);
        break;
      case 'deployment.ready':
        await handleDeploymentReady(projectId, data);
        break;
      default:
        console.warn(`Unknown webhook event: ${event}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Invalid webhook data' },
      { status: 400 }
    );
  }
}

async function handleWorkflowCompleted(projectId: string, data: any) {
  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: 'COMPLETED',
      updatedAt: new Date(),
    },
  });
}

async function handleTaskCompleted(projectId: string, data: any) {
  await prisma.task.update({
    where: { id: data.taskId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      code: data.code,
      tests: data.tests,
    },
  });
}

async function handleDeploymentReady(projectId: string, data: any) {
  await prisma.deployment.create({
    data: {
      projectId,
      environment: data.environment,
      url: data.url,
      status: 'active',
    },
  });
}
```

## Phase 4: Frontend Implementation (Week 4)

### Step 1: Create Dashboard Layout

Implement the main dashboard (`src/app/(protected)/dashboard/page.tsx`):

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc/client';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { ProjectCard } from '@/components/projects/ProjectCard';

export default function DashboardPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: projects, isLoading } = trpc.project.list.useQuery();

  const stats = {
    active: projects?.filter(p => ['DEVELOPMENT', 'TESTING'].includes(p.status)).length || 0,
    completed: projects?.filter(p => p.status === 'COMPLETED').length || 0,
    total: projects?.length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your AI-powered development projects
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          Create New Project
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              Currently in progress
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              Successfully delivered
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div>Loading projects...</div>
        ) : projects?.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground mb-4">
              No projects yet. Create your first project to get started!
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              Create Project
            </Button>
          </div>
        ) : (
          projects?.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))
        )}
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </div>
  );
}
```

### Step 2: Implement Real-time Updates

Create WebSocket connection for real-time updates:

```typescript
// src/hooks/useProjectUpdates.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useProjectUpdates(projectId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('disconnected');

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      query: { projectId },
    });

    newSocket.on('connect', () => {
      setStatus('connected');
      console.log('Connected to project updates');
    });

    newSocket.on('project:update', (update) => {
      setUpdates((prev) => [update, ...prev]);
    });

    newSocket.on('project:status', (newStatus) => {
      setStatus(newStatus);
    });

    newSocket.on('disconnect', () => {
      setStatus('disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [projectId]);

  return { socket, updates, status };
}
```

### Step 3: Create Agent Activity Monitor

```typescript
// src/components/agents/AgentActivityMonitor.tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface AgentActivity {
  agentId: string;
  agentName: string;
  agentRole: string;
  activity: string;
  timestamp: string;
  projectId: string;
}

export function AgentActivityMonitor() {
  const [activities, setActivities] = useState<AgentActivity[]>([]);

  useEffect(() => {
    const eventSource = new EventSource('/api/agents/activity-stream');

    eventSource.onmessage = (event) => {
      const activity = JSON.parse(event.data);
      setActivities((prev) => [activity, ...prev].slice(0, 50)); // Keep last 50
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const getAgentColor = (role: string) => {
    const colors: Record<string, string> = {
      'Project Manager': 'bg-blue-500',
      'Developer': 'bg-green-500',
      'Tester': 'bg-yellow-500',
      'DevOps': 'bg-purple-500',
      'Designer': 'bg-pink-500',
    };
    return colors[role] || 'bg-gray-500';
  };

  return (
    <Card className="h-[600px]">
      <CardHeader>
        <CardTitle>Agent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 overflow-y-auto h-[500px]">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-start space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className={getAgentColor(activity.agentRole)}>
                  {activity.agentName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{activity.agentName}</span>
                  <Badge variant="outline" className="text-xs">
                    {activity.agentRole}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{activity.activity}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

## Phase 5: Production Deployment

### Step 1: Prepare for Production

Update environment variables for production:

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@your-db-host:5432/vitc_prod

# Use production AI services
CLAUDE_API_KEY=your_production_claude_key
OPENAI_API_KEY=your_production_openai_key

# Production Redis
REDIS_URL=redis://your-redis-host:6379

# Production URLs
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Step 2: Deploy to Cloud

#### Option A: DigitalOcean Deployment

```bash
# Create Droplet and SSH in
ssh root@your-droplet-ip

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt-get install docker-compose

# Clone repository
git clone https://github.com/yourusername/virtual-it-company-platform.git
cd virtual-it-company-platform

# Copy production environment
cp .env.production .env

# Build and start services
docker-compose -f docker-compose.production.yml up -d

# Set up SSL with Certbot
apt-get install certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

#### Option B: Vercel + Railway Deployment

```bash
# Deploy frontend to Vercel
vercel --prod

# Deploy backend to Railway
railway up

# Configure environment variables in both platforms
```

### Step 3: Set Up Monitoring

Implement monitoring with Sentry:

```typescript
// src/lib/monitoring.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

export function captureError(error: Error, context?: any) {
  Sentry.captureException(error, {
    extra: context,
  });
}

export function trackEvent(event: string, data?: any) {
  Sentry.captureMessage(event, 'info', {
    extra: data,
  });
}
```

### Step 4: Implement Analytics

Add analytics tracking:

```typescript
// src/lib/analytics.ts
export class Analytics {
  static trackProject(event: string, projectData: any) {
    // Track in your analytics platform
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event, {
        event_category: 'Project',
        event_label: projectData.projectId,
        value: projectData.value,
      });
    }
  }

  static trackRevenue(amount: number, projectId: string) {
    this.trackProject('revenue_generated', {
      projectId,
      value: amount,
    });
  }

  static trackAIUsage(model: string, tokens: number, cost: number) {
    // Track AI usage for cost optimization
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'ai_usage', {
        event_category: 'AI',
        event_label: model,
        value: cost,
        custom_parameter: {
          tokens,
        },
      });
    }
  }
}
```

## Testing & Quality Assurance

### Unit Tests

```typescript
// src/lib/ai/agents/__tests__/project-manager.test.ts
import { ProjectManagerAgent } from '../project-manager';

describe('ProjectManagerAgent', () => {
  let agent: ProjectManagerAgent;

  beforeEach(() => {
    agent = new ProjectManagerAgent();
  });

  test('analyzes requirements correctly', async () => {
    const requirements = 'Build an e-commerce website with payment integration';
    const result = await agent.processTask({
      type: 'analyze_requirements',
      data: requirements,
    });

    expect(result).toContain('clarity assessment');
    expect(result).toContain('technical feasibility');
  });

  test('creates project plan', async () => {
    const result = await agent.processTask({
      type: 'create_plan',
      data: {
        requirements: 'Build a todo app',
      },
    });

    expect(result).toContain('task breakdown');
    expect(result).toContain('timeline');
  });
});
```

### Integration Tests

```typescript
// src/app/api/__tests__/project.test.ts
import { createMockContext } from '@/test/context';
import { projectRouter } from '@/lib/trpc/routers/project';

test('creates project successfully', async () => {
  const ctx = createMockContext();
  const caller = projectRouter.createCaller(ctx);

  const project = await caller.create({
    name: 'Test Project',
    requirements: 'Build a test app',
    budget: 1000,
  });

  expect(project.name).toBe('Test Project');
  expect(project.status).toBe('INITIATED');
});
```

## Performance Optimization

### Caching Strategy

```typescript
// src/lib/cache.ts
import { Redis } from 'ioredis';

export class CacheManager {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const data = JSON.stringify(value);
    if (ttl) {
      await this.redis.setex(key, ttl, data);
    } else {
      await this.redis.set(key, data);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- Add composite indexes
CREATE INDEX idx_projects_client_status ON projects(client_id, status);
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
```

## Security Implementation

### API Security

```typescript
// src/middleware/security.ts
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export async function securityMiddleware(req: NextRequest) {
  // Rate limiting
  const identifier = req.ip ?? 'anonymous';
  const { success } = await rateLimit.check(identifier);
  
  if (!success) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  // CORS headers
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}
```

### Data Encryption

```typescript
// src/lib/encryption.ts
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const secretKey = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

## Maintenance & Monitoring

### Health Checks

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/connection';
import { Redis } from 'ioredis';

export async function GET() {
  const checks = {
    database: false,
    redis: false,
    ollama: false,
    n8n: false,
  };

  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  try {
    // Check Redis
    const redis = new Redis(process.env.REDIS_URL!);
    await redis.ping();
    checks.redis = true;
    redis.disconnect();
  } catch (error) {
    console.error('Redis health check failed:', error);
  }

  try {
    // Check Ollama
    const response = await fetch(`${process.env.OLLAMA_BASE_URL}/api/tags`);
    checks.ollama = response.ok;
  } catch (error) {
    console.error('Ollama health check failed:', error);
  }

  try {
    // Check n8n
    const response = await fetch('http://localhost:5678/healthz');
    checks.n8n = response.ok;
  } catch (error) {
    console.error('n8n health check failed:', error);
  }

  const allHealthy = Object.values(checks).every(status => status);

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: allHealthy ? 200 : 503 }
  );
}
```

### Automated Backups

```bash
#!/bin/bash
# backup.sh - Automated backup script

# Set variables
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="vitc_prod"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec postgres pg_dump -U user $DB_NAME > $BACKUP_DIR/db_$TIMESTAMP.sql

# Backup n8n workflows
docker exec n8n n8n export:workflow --all --output=$BACKUP_DIR/n8n_workflows_$TIMESTAMP.json

# Backup Redis
docker exec redis redis-cli BGSAVE
docker cp redis:/data/dump.rdb $BACKUP_DIR/redis_$TIMESTAMP.rdb

# Upload to cloud storage (example: S3)
aws s3 sync $BACKUP_DIR s3://your-backup-bucket/vitc-backups/

# Clean up old backups (keep last 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $TIMESTAMP"
```

## Troubleshooting Guide

### Common Issues

1. **Ollama Connection Failed**
   ```bash
   # Check if Ollama is running
   docker ps | grep ollama
   
   # Check Ollama logs
   docker logs virtual-it-company-platform_ollama_1
   
   # Restart Ollama
   docker restart virtual-it-company-platform_ollama_1
   ```

2. **n8n Workflows Not Triggering**
   ```bash
   # Check n8n logs
   docker logs virtual-it-company-platform_n8n_1
   
   # Verify webhook URL
   curl http://localhost:5678/webhook/new-project
   
   # Check n8n credentials
   docker exec n8n cat /home/node/.n8n/config
   ```

3. **Database Connection Issues**
   ```bash
   # Check PostgreSQL status
   docker exec postgres pg_isready
   
   # View database logs
   docker logs virtual-it-company-platform_postgres_1
   
   # Connect manually
   docker exec -it postgres psql -U user -d vitc_dev
   ```

## Next Steps

1. **Enhance AI Capabilities**
   - Fine-tune models for specific tasks
   - Implement advanced prompting strategies
   - Add more specialized agents

2. **Scale Infrastructure**
   - Implement Kubernetes for orchestration
   - Add horizontal scaling
   - Set up multi-region deployment

3. **Add Features**
   - Client mobile app
   - Advanced analytics dashboard
   - White-label solution
   - Marketplace for templates

4. **Optimize Performance**
   - Implement caching strategies
   - Optimize database queries
   - Add CDN for assets
   - Implement lazy loading

This completes the comprehensive implementation guide for building your Virtual IT Company Platform from scratch!