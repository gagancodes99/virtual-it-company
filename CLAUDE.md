# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run setup        # Complete setup (install + init data)
npm run init-data    # Initialize database with sample data
npm run check-setup  # Verify setup configuration
```

## Architecture Overview

### Multi-Tenant Next.js Platform
This is a virtual IT company platform with sophisticated multi-tenancy. All data operations must respect tenant isolation using `tenantId` fields. The app uses Next.js App Router with protected route groups:

- `(protected)/` - Authenticated routes requiring login
- `admin/` - Admin-only pages with elevated permissions
- `dashboard/` - Main workspace for projects, agents, analytics

### tRPC API with Role-Based Access
The API uses tRPC with four security levels:
- `publicProcedure` - No authentication required
- `protectedProcedure` - Requires login
- `adminProcedure` - Requires admin role within tenant
- `superAdminProcedure` - Cross-tenant admin access

Key routers: `user`, `project`, `agent`, `tenant`, `task`

### Database Models (MongoDB + Mongoose)
Core entities with tenant isolation:
- **User**: Role-based access (7 levels from SUPER_ADMIN to AI_AGENT)
- **AIAgent**: Performance metrics, capabilities, multi-LLM support
- **Project**: Task orchestration and timeline management
- **Tenant**: Subscription limits and custom branding

### AI Agent System
- **Multi-LLM routing**: OpenAI, Anthropic, Ollama with intelligent model selection
- **Agent specialization**: Developer, Designer, Tester, Project Manager types
- **Performance tracking**: Completion rates, ratings, reliability scores
- **LangGraph integration**: Complex workflow orchestration

### Authentication (NextAuth.js)
- **Tenant-aware login**: Company domain required during authentication
- **Multiple providers**: Google, GitHub, Credentials
- **Session enrichment**: Role and tenant data propagated through JWT

## Key Patterns

### State Management
- **Zustand**: Client state (`useAuthStore`, `useUIStore`)
- **TanStack Query**: Server state via tRPC
- **Real-time updates**: Socket.io for live collaboration

### Component Structure
- **Shadcn/ui**: Base component library
- **Feature organization**: `/components/agents/`, `/components/dashboard/`
- **Consistent naming**: PascalCase for components, kebab-case for files

### Data Flow
- **Tenant isolation**: Always filter by `tenantId` in database queries
- **Role validation**: Check user permissions before mutations
- **Optimistic updates**: UI updates before server confirmation
- **Error boundaries**: Toast notifications for user feedback

## Development Notes

### Docker Setup
Use `docker-compose.yml` for full development environment with MongoDB, Redis, and Nginx. The platform requires initialization scripts to set up sample data and tenant configurations.

### AI Integration Points
- **Agent creation**: Must specify capabilities, supported languages, and performance thresholds
- **Task assignment**: Automatic agent selection based on complexity and specialization
- **Workflow orchestration**: LangGraph workflows defined in `/src/lib/ai/`
- **Model fallbacks**: Local Ollama models when external APIs are unavailable

### Security Considerations
- **Tenant data isolation**: Never expose cross-tenant data
- **Role-based UI**: Conditionally render based on user permissions
- **API key management**: Store securely in environment variables
- **Input validation**: Use Zod schemas for all user inputs