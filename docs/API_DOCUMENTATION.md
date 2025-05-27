# API Documentation

## Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Core Endpoints](#core-endpoints)
4. [Webhook Endpoints](#webhook-endpoints)
5. [WebSocket Events](#websocket-events)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [SDK Examples](#sdk-examples)

## API Overview

The Virtual IT Company Platform provides a comprehensive API for managing projects, agents, and workflows. The API follows RESTful principles and uses JSON for request/response payloads.

### Base URLs

```yaml
Production: https://api.virtualitcompany.ai
Staging: https://staging-api.virtualitcompany.ai
Local Development: http://localhost:3000/api
```

### API Versioning

All API endpoints are versioned. The current version is `v1`.

```
https://api.virtualitcompany.ai/v1/projects
```

### Content Type

All requests must include the following headers:

```http
Content-Type: application/json
Accept: application/json
```

## Authentication

### API Key Authentication

For server-to-server communication, use API key authentication:

```http
Authorization: Bearer YOUR_API_KEY
```

### OAuth 2.0

For client applications, use OAuth 2.0 flow:

```typescript
// Example OAuth flow
const authUrl = `https://api.virtualitcompany.ai/oauth/authorize?
  client_id=${CLIENT_ID}&
  redirect_uri=${REDIRECT_URI}&
  response_type=code&
  scope=projects:read projects:write`;
```

### JWT Authentication

For session-based authentication:

```typescript
// Login endpoint
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "secure_password"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

## Core Endpoints

### Projects

#### Create Project

```http
POST /api/v1/projects
```

**Request Body:**
```json
{
  "requirements": "Create an e-commerce website with payment integration",
  "client_email": "client@example.com",
  "project_type": "web_application",
  "budget_limit": 5000,
  "deadline": "2024-02-01T00:00:00Z",
  "preferences": {
    "tech_stack": ["Next.js", "PostgreSQL", "Stripe"],
    "design_style": "modern_minimal"
  }
}
```

**Response:**
```json
{
  "id": "proj_abc123",
  "status": "analyzing",
  "created_at": "2024-01-15T10:30:00Z",
  "estimated_completion": "2024-01-20T18:00:00Z",
  "assigned_agents": [
    {
      "id": "agent_pm_001",
      "role": "project_manager",
      "name": "PM Agent"
    }
  ],
  "webhook_url": "https://api.virtualitcompany.ai/webhooks/projects/proj_abc123"
}
```

#### Get Project Status

```http
GET /api/v1/projects/{project_id}
```

**Response:**
```json
{
  "id": "proj_abc123",
  "status": "in_progress",
  "current_phase": "development",
  "progress": 45,
  "tasks": {
    "total": 12,
    "completed": 5,
    "in_progress": 2,
    "pending": 5
  },
  "budget": {
    "allocated": 5000,
    "used": 1250.50,
    "remaining": 3749.50
  },
  "timeline": {
    "started_at": "2024-01-15T10:30:00Z",
    "estimated_completion": "2024-01-20T18:00:00Z",
    "phases": [
      {
        "name": "analysis",
        "status": "completed",
        "duration": "2 hours"
      },
      {
        "name": "planning",
        "status": "completed",
        "duration": "1 hour"
      },
      {
        "name": "development",
        "status": "in_progress",
        "completion": 60
      }
    ]
  },
  "deliverables": [
    {
      "type": "source_code",
      "url": "https://github.com/client/proj_abc123",
      "status": "in_progress"
    }
  ]
}
```

#### List Projects

```http
GET /api/v1/projects
```

**Query Parameters:**
- `status` (optional): Filter by status (draft, analyzing, in_progress, completed)
- `client_email` (optional): Filter by client email
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "projects": [
    {
      "id": "proj_abc123",
      "title": "E-commerce Platform",
      "status": "in_progress",
      "client_email": "client@example.com",
      "progress": 45,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

#### Update Project

```http
PATCH /api/v1/projects/{project_id}
```

**Request Body:**
```json
{
  "requirements": "Updated requirements with mobile app",
  "budget_limit": 7500,
  "deadline": "2024-02-15T00:00:00Z"
}
```

### Agents

#### List Available Agents

```http
GET /api/v1/agents
```

**Response:**
```json
{
  "agents": [
    {
      "id": "agent_dev_001",
      "name": "Senior Developer",
      "role": "developer",
      "status": "available",
      "skills": ["JavaScript", "Python", "React", "Node.js"],
      "performance": {
        "tasks_completed": 145,
        "success_rate": 0.96,
        "average_time": "2.5 hours"
      },
      "current_workload": 2
    }
  ]
}
```

#### Get Agent Performance

```http
GET /api/v1/agents/{agent_id}/performance
```

**Query Parameters:**
- `period`: Time period (day, week, month, year)
- `metrics`: Comma-separated metrics to include

**Response:**
```json
{
  "agent_id": "agent_dev_001",
  "period": "month",
  "metrics": {
    "tasks_completed": 45,
    "success_rate": 0.96,
    "average_completion_time": "2.5 hours",
    "cost_efficiency": 0.85,
    "quality_score": 9.2,
    "by_task_type": {
      "feature_development": {
        "count": 20,
        "avg_time": "3 hours"
      },
      "bug_fixes": {
        "count": 15,
        "avg_time": "1 hour"
      },
      "code_review": {
        "count": 10,
        "avg_time": "30 minutes"
      }
    }
  }
}
```

### Tasks

#### Create Task

```http
POST /api/v1/tasks
```

**Request Body:**
```json
{
  "project_id": "proj_abc123",
  "type": "feature",
  "title": "Implement user authentication",
  "description": "Add login/signup functionality with JWT",
  "priority": "high",
  "assigned_to": "agent_dev_001",
  "estimated_hours": 4
}
```

#### Get Task Status

```http
GET /api/v1/tasks/{task_id}
```

**Response:**
```json
{
  "id": "task_xyz789",
  "project_id": "proj_abc123",
  "status": "in_progress",
  "assigned_to": {
    "id": "agent_dev_001",
    "name": "Senior Developer"
  },
  "started_at": "2024-01-15T14:00:00Z",
  "progress": 75,
  "artifacts": [
    {
      "type": "code",
      "path": "src/auth/login.ts",
      "created_at": "2024-01-15T15:30:00Z"
    }
  ]
}
```

### Analytics

#### Get Project Analytics

```http
GET /api/v1/analytics/projects
```

**Query Parameters:**
- `period`: day, week, month, year
- `group_by`: status, client, project_type

**Response:**
```json
{
  "period": "month",
  "summary": {
    "total_projects": 45,
    "completed": 38,
    "in_progress": 7,
    "success_rate": 0.95,
    "average_completion_time": "18 hours",
    "total_revenue": 125000
  },
  "by_status": {
    "completed": 38,
    "in_progress": 7,
    "failed": 0
  },
  "by_type": {
    "web_application": 20,
    "mobile_app": 15,
    "api_service": 10
  },
  "trending": {
    "growth_rate": 0.25,
    "projected_next_month": 56
  }
}
```

## Webhook Endpoints

### Project Webhooks

Register webhooks to receive real-time updates:

```http
POST /api/v1/webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks/vitc",
  "events": ["project.created", "project.completed", "project.failed"],
  "secret": "your_webhook_secret"
}
```

### Webhook Events

#### project.created
```json
{
  "event": "project.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "project_id": "proj_abc123",
    "client_email": "client@example.com",
    "requirements": "..."
  }
}
```

#### project.phase_changed
```json
{
  "event": "project.phase_changed",
  "timestamp": "2024-01-15T11:30:00Z",
  "data": {
    "project_id": "proj_abc123",
    "previous_phase": "planning",
    "current_phase": "development",
    "progress": 30
  }
}
```

#### project.completed
```json
{
  "event": "project.completed",
  "timestamp": "2024-01-20T18:00:00Z",
  "data": {
    "project_id": "proj_abc123",
    "deliverables": [...],
    "total_cost": 4500,
    "completion_time": "4 days 7 hours"
  }
}
```

### Webhook Security

Verify webhook signatures:

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## WebSocket Events

### Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('wss://api.virtualitcompany.ai', {
  auth: {
    token: 'your_jwt_token'
  }
});

socket.on('connect', () => {
  console.log('Connected to real-time updates');
  
  // Subscribe to project updates
  socket.emit('subscribe', {
    room: 'project:proj_abc123'
  });
});
```

### Real-time Events

#### Project Updates
```typescript
socket.on('project:update', (data) => {
  console.log('Project updated:', data);
  // {
  //   project_id: 'proj_abc123',
  //   field: 'progress',
  //   value: 75,
  //   timestamp: '2024-01-15T14:30:00Z'
  // }
});
```

#### Agent Status
```typescript
socket.on('agent:status', (data) => {
  console.log('Agent status changed:', data);
  // {
  //   agent_id: 'agent_dev_001',
  //   status: 'busy',
  //   current_task: 'task_xyz789'
  // }
});
```

#### Live Logs
```typescript
socket.on('project:log', (data) => {
  console.log('New log entry:', data);
  // {
  //   project_id: 'proj_abc123',
  //   level: 'info',
  //   message: 'Completed user authentication implementation',
  //   agent: 'agent_dev_001',
  //   timestamp: '2024-01-15T15:00:00Z'
  // }
});
```

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid project requirements",
    "details": {
      "field": "requirements",
      "reason": "Requirements must be at least 20 characters"
    },
    "request_id": "req_abc123",
    "documentation_url": "https://docs.virtualitcompany.ai/errors/VALIDATION_ERROR"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | Missing or invalid authentication |
| `PERMISSION_DENIED` | 403 | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Temporary service issue |

### Error Handling Example

```typescript
try {
  const response = await fetch('/api/v1/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(projectData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    
    switch (error.error.code) {
      case 'RATE_LIMIT_EXCEEDED':
        // Wait and retry
        await sleep(error.error.details.retry_after * 1000);
        return retry();
        
      case 'VALIDATION_ERROR':
        // Show validation error to user
        showError(error.error.message);
        break;
        
      default:
        // Log and show generic error
        console.error('API Error:', error);
        showError('An error occurred. Please try again.');
    }
  }
} catch (error) {
  console.error('Network error:', error);
}
```

## Rate Limiting

### Rate Limit Headers

All responses include rate limit information:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Reset-After: 3600
```

### Rate Limits by Plan

| Plan | Requests/Hour | Concurrent Projects | Webhook Events/Hour |
|------|---------------|-------------------|-------------------|
| Free | 100 | 2 | 50 |
| Starter | 1,000 | 10 | 500 |
| Professional | 10,000 | 50 | 5,000 |
| Enterprise | Unlimited | Unlimited | Unlimited |

### Handling Rate Limits

```typescript
class APIClient {
  async makeRequest(url: string, options: RequestInit) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('X-RateLimit-Reset-After') || '60');
      
      console.log(`Rate limited. Retrying after ${retryAfter} seconds`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      
      return this.makeRequest(url, options);
    }
    
    return response;
  }
}
```

## SDK Examples

### JavaScript/TypeScript SDK

```typescript
import { VirtualITCompanyClient } from '@vitc/sdk';

const client = new VirtualITCompanyClient({
  apiKey: process.env.VITC_API_KEY,
  environment: 'production'
});

// Create a project
const project = await client.projects.create({
  requirements: 'Build a SaaS dashboard with user management',
  clientEmail: 'client@example.com',
  projectType: 'web_application',
  budgetLimit: 5000
});

// Subscribe to updates
client.projects.onUpdate(project.id, (update) => {
  console.log('Project updated:', update);
});

// Get project status
const status = await client.projects.getStatus(project.id);
```

### Python SDK

```python
from vitc_sdk import VirtualITCompanyClient

client = VirtualITCompanyClient(
    api_key=os.environ['VITC_API_KEY'],
    environment='production'
)

# Create a project
project = client.projects.create(
    requirements='Build a SaaS dashboard with user management',
    client_email='client@example.com',
    project_type='web_application',
    budget_limit=5000
)

# Poll for updates
import asyncio

async def monitor_project():
    while True:
        status = await client.projects.get_status(project.id)
        print(f"Progress: {status.progress}%")
        
        if status.status == 'completed':
            break
            
        await asyncio.sleep(30)

asyncio.run(monitor_project())
```

### cURL Examples

```bash
# Create a project
curl -X POST https://api.virtualitcompany.ai/v1/projects \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "requirements": "Create a landing page",
    "client_email": "client@example.com",
    "project_type": "website",
    "budget_limit": 1000
  }'

# Get project status
curl https://api.virtualitcompany.ai/v1/projects/proj_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY"

# Stream logs
curl -N https://api.virtualitcompany.ai/v1/projects/proj_abc123/logs/stream \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

For more examples and detailed guides, visit our [Developer Portal](https://developers.virtualitcompany.ai).