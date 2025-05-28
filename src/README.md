# Source Code Architecture

This document describes the reorganized folder structure for the Virtual IT Company Platform.

## 📁 Folder Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (protected)/             # Protected routes with authentication
│   ├── api/                     # API routes (NextAuth, tRPC)
│   └── ...                      # Public routes and layouts
│
├── components/                   # React Components
│   ├── ui/                      # Base UI components (shadcn/ui)
│   ├── forms/                   # Form components
│   ├── layout/                  # Layout components
│   ├── agents/                  # Agent-specific components
│   ├── projects/                # Project-specific components
│   └── providers/               # React context providers
│
├── core/                        # Core Business Logic
│   └── ai/                      # AI Engine & Management
│       ├── agents/              # Agent Pool & Management
│       │   └── agent-pool.ts    # Agent lifecycle and coordination
│       ├── execution/           # Task Execution Engine
│       │   └── agent-executor.ts # AI agent task processing
│       ├── llm/                 # LLM Clients & Routing
│       │   ├── llm-client.ts    # Multi-provider LLM interface
│       │   └── llm-router.ts    # Intelligent LLM routing
│       └── workflows/           # AI Workflow Management
│           └── project-state-machine.ts # Project lifecycle
│
├── infrastructure/              # Infrastructure & External Services
│   ├── database/               # Database Layer
│   │   ├── models/             # Mongoose/Prisma models
│   │   │   ├── AIAgent.ts
│   │   │   ├── Project.ts
│   │   │   ├── Tenant.ts
│   │   │   └── User.ts
│   │   └── connection.ts       # Database connection
│   ├── queue/                  # Queue System
│   │   └── task-queue.ts       # Redis-based task queue
│   ├── realtime/              # Socket.io & Real-time
│   │   ├── socket-server.ts    # Socket.io server
│   │   └── socket-client.ts    # Client-side socket management
│   ├── email/                  # Email Service
│   │   └── email-service.ts    # Multi-provider email system
│   ├── storage/                # File Storage
│   │   └── file-storage.ts     # Multi-provider file storage
│   └── deployment/            # Deployment Pipeline
│       └── deployment-service.ts # Multi-provider deployment
│
├── integrations/               # External API Integrations
│   └── github/                # GitHub Integration
│       ├── github-client.ts    # GitHub API client
│       └── project-repository.ts # Repository management
│
├── shared/                     # Shared Utilities & Types
│   ├── types/                 # TypeScript type definitions
│   │   └── index.ts
│   ├── stores/                # State Management (Zustand)
│   │   ├── useAuthStore.ts
│   │   └── useUIStore.ts
│   ├── auth/                  # Authentication utilities
│   │   └── config.ts          # NextAuth configuration
│   ├── utils/                 # Utility functions
│   └── validations/           # Validation schemas (Zod)
│
├── api/                       # API Layer
│   └── trpc/                  # tRPC Configuration
│       ├── server.ts          # tRPC server setup
│       ├── client.ts          # tRPC client setup
│       ├── context.ts         # Request context
│       └── routers/           # API route handlers
│           ├── agent.ts
│           ├── project.ts
│           ├── task.ts
│           ├── tenant.ts
│           ├── user.ts
│           └── index.ts
│
└── tests/                     # Test Files
    ├── integration/           # Integration tests
    │   ├── phase1-integration.ts
    │   └── phase2-integration.ts
    ├── unit/                  # Unit tests
    └── fixtures/              # Test fixtures and mocks
```

## 🗂️ Import Patterns

### Path Mapping
TypeScript path mapping is configured in `tsconfig.json`:

```typescript
// Core business logic
import { AgentPool } from '@/core/ai/agents/agent-pool';
import { LLMRouter } from '@/core/ai/llm/llm-router';

// Infrastructure services
import { EmailService } from '@/infrastructure/email/email-service';
import { SocketManager } from '@/infrastructure/realtime/socket-server';

// External integrations
import { GitHubClient } from '@/integrations/github/github-client';

// Shared utilities
import { useAuthStore } from '@/shared/stores/useAuthStore';
import type { AgentTask } from '@/shared/types';

// API layer
import { trpc } from '@/api/trpc/client';

// Components
import { Button } from '@/components/ui/button';
```

### Module Exports
Each major section has an index file for clean imports:

```typescript
// Instead of multiple imports:
import { AgentPool } from '@/core/ai/agents/agent-pool';
import { LLMRouter } from '@/core/ai/llm/llm-router';
import { AgentExecutor } from '@/core/ai/execution/agent-executor';

// Use the core module:
import { AgentPool, LLMRouter, AgentExecutor } from '@/core/ai';
```

## 🔧 Organization Principles

### 1. **Separation of Concerns**
- **Core**: Business logic and AI engine
- **Infrastructure**: External services and data persistence
- **Integrations**: Third-party API integrations
- **Shared**: Common utilities and types

### 2. **Feature Grouping**
- Related functionality is grouped together
- AI components are centralized in `core/ai/`
- Infrastructure services are isolated
- External integrations are separate from core logic

### 3. **Dependency Direction**
```
Components → Core → Infrastructure → Integrations
     ↓         ↓         ↓
   Shared ← Shared ← Shared
```

- Components depend on core business logic
- Core depends on infrastructure services
- Infrastructure may depend on external integrations
- Shared utilities are used by all layers

### 4. **Import Consistency**
- Always use absolute imports with path mapping
- Prefer index file exports for cleaner imports
- Keep relative imports within the same feature group

## 📝 Benefits

1. **Better Code Organization**: Related files are grouped together
2. **Improved Maintainability**: Clear separation of concerns
3. **Easier Navigation**: Logical folder structure
4. **Scalable Architecture**: Easy to add new features
5. **Clear Dependencies**: Explicit dependency relationships
6. **Better Testing**: Organized test structure

## 🛠️ Scripts

- `npm run fix-imports` - Automatically fix import paths after reorganization
- `npm run validate-env` - Validate environment configuration
- `npm run lint` - Run ESLint with new structure

## 🚀 Next Steps

1. Update any remaining hardcoded import paths
2. Add unit tests in the appropriate test directories
3. Consider adding feature-specific documentation
4. Update CI/CD pipelines to understand new structure