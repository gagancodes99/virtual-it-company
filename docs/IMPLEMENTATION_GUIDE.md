# Implementation Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Components Implementation](#core-components-implementation)
3. [AI Agent Development](#ai-agent-development)
4. [Workflow Implementation](#workflow-implementation)
5. [Frontend Development](#frontend-development)
6. [Testing Strategy](#testing-strategy)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites Checklist

Before starting implementation, ensure you have:

- [ ] **Development Environment**
  - Node.js 20.x LTS
  - Python 3.11+
  - Docker Desktop
  - Git
  - VS Code or preferred IDE

- [ ] **API Keys** (Start with free tiers)
  - [ ] Anthropic Claude API (optional)
  - [ ] OpenAI API (optional)
  - [ ] GitHub Personal Access Token
  - [ ] SendGrid API Key

- [ ] **System Requirements**
  - 8GB RAM minimum (16GB recommended)
  - 50GB free disk space
  - macOS, Linux, or WSL2 on Windows

### Initial Setup

#### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/virtual-it-company-platform.git
cd virtual-it-company-platform

# Install dependencies
npm install

# Set up Python environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### 2. Environment Configuration

Create `.env.local` file:

```env
# Core Configuration
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/vitc
REDIS_URL=redis://localhost:6379

# AI Services (Optional - will use Ollama by default)
CLAUDE_API_KEY=
OPENAI_API_KEY=

# External Services
GITHUB_TOKEN=your-github-token
SENDGRID_API_KEY=your-sendgrid-key

# Feature Flags
ENABLE_LOCAL_LLM=true
ENABLE_COST_TRACKING=true
ENABLE_ANALYTICS=false
```

#### 3. Local Services Setup

```bash
# Start Docker services
docker-compose -f docker-compose.dev.yml up -d

# Verify services are running
docker ps

# Should see:
# - postgres:15
# - redis:7-alpine
# - ollama/ollama
# - n8nio/n8n
```

## Core Components Implementation

### 1. Multi-LLM Router Implementation

Create the intelligent LLM routing system:

```python
# src/services/llm_router.py
from typing import Dict, Any, Optional, List
from enum import Enum
import os
from dataclasses import dataclass

class TaskComplexity(Enum):
    SIMPLE = 1      # Basic tasks, templates
    MEDIUM = 2      # Standard development
    COMPLEX = 3     # Architecture, complex logic
    CRITICAL = 4    # Production-critical decisions

@dataclass
class LLMConfig:
    provider: str
    model: str
    cost_per_1k_input: float
    cost_per_1k_output: float
    max_tokens: int
    speed_score: int
    quality_score: int

class MultiLLMRouter:
    def __init__(self):
        self.providers = self._initialize_providers()
        self.usage_tracker = {}
        
    def _initialize_providers(self) -> Dict[str, Dict[str, LLMConfig]]:
        """Initialize available LLM configurations"""
        return {
            "ollama": {
                "mistral": LLMConfig(
                    provider="ollama",
                    model="mistral:latest",
                    cost_per_1k_input=0.0,
                    cost_per_1k_output=0.0,
                    max_tokens=4096,
                    speed_score=6,
                    quality_score=6
                ),
                "codellama": LLMConfig(
                    provider="ollama",
                    model="codellama:latest",
                    cost_per_1k_input=0.0,
                    cost_per_1k_output=0.0,
                    max_tokens=4096,
                    speed_score=5,
                    quality_score=7
                )
            },
            "claude": {
                "haiku": LLMConfig(
                    provider="claude",
                    model="claude-3-haiku-20240307",
                    cost_per_1k_input=0.25,
                    cost_per_1k_output=1.25,
                    max_tokens=4096,
                    speed_score=9,
                    quality_score=7
                ),
                "sonnet": LLMConfig(
                    provider="claude",
                    model="claude-3-5-sonnet-20241022",
                    cost_per_1k_input=3.0,
                    cost_per_1k_output=15.0,
                    max_tokens=8192,
                    speed_score=7,
                    quality_score=9
                )
            }
        }
    
    def select_optimal_llm(self, 
                          task_type: str, 
                          complexity: TaskComplexity,
                          budget_remaining: float = float('inf')) -> LLMConfig:
        """Select the best LLM based on task requirements"""
        
        # Start with local models if enabled
        if os.getenv('ENABLE_LOCAL_LLM', 'true').lower() == 'true':
            if complexity == TaskComplexity.SIMPLE:
                return self.providers["ollama"]["mistral"]
            elif task_type == "coding" and complexity == TaskComplexity.MEDIUM:
                return self.providers["ollama"]["codellama"]
        
        # Use cloud models for complex tasks if API keys available
        if os.getenv('CLAUDE_API_KEY') and budget_remaining > 10:
            if complexity >= TaskComplexity.COMPLEX:
                return self.providers["claude"]["sonnet"]
            else:
                return self.providers["claude"]["haiku"]
        
        # Fallback to local models
        return self.providers["ollama"]["mistral"]
    
    async def call_llm(self, 
                      config: LLMConfig, 
                      messages: List[Dict],
                      **kwargs) -> Dict[str, Any]:
        """Universal interface for calling any LLM"""
        
        if config.provider == "ollama":
            return await self._call_ollama(config, messages, **kwargs)
        elif config.provider == "claude":
            return await self._call_claude(config, messages, **kwargs)
        else:
            raise NotImplementedError(f"Provider {config.provider} not implemented")
```

### 2. Agent Service Implementation

Create the base agent class and specialized agents:

```python
# src/services/agents/base_agent.py
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import json

class BaseAgent(ABC):
    """Base class for all AI agents"""
    
    def __init__(self, name: str, role: str, llm_router: MultiLLMRouter):
        self.name = name
        self.role = role
        self.llm_router = llm_router
        self.context = {}
        self.performance_metrics = {
            "tasks_completed": 0,
            "success_rate": 1.0,
            "average_time": 0
        }
    
    @abstractmethod
    async def process_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Process a task and return results"""
        pass
    
    def build_prompt(self, task: Dict[str, Any]) -> str:
        """Build a prompt for the LLM"""
        return f"""
        You are a {self.role} named {self.name}.
        
        Task: {task.get('description', '')}
        Context: {json.dumps(self.context, indent=2)}
        
        Please complete this task professionally and provide detailed output.
        """
    
    async def execute(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute task with error handling and metrics"""
        try:
            start_time = time.time()
            
            # Select appropriate LLM based on task
            complexity = self._assess_complexity(task)
            llm_config = self.llm_router.select_optimal_llm(
                task_type=task.get('type', 'general'),
                complexity=complexity
            )
            
            # Build and send prompt
            prompt = self.build_prompt(task)
            messages = [{"role": "user", "content": prompt}]
            
            response = await self.llm_router.call_llm(
                llm_config, 
                messages
            )
            
            # Process response
            result = await self.process_task({
                **task,
                "llm_response": response['content']
            })
            
            # Update metrics
            self._update_metrics(True, time.time() - start_time)
            
            return {
                "status": "success",
                "result": result,
                "agent": self.name,
                "execution_time": time.time() - start_time
            }
            
        except Exception as e:
            self._update_metrics(False, 0)
            return {
                "status": "error",
                "error": str(e),
                "agent": self.name
            }
```

### 3. Specialized Agent Implementation

```python
# src/services/agents/developer_agent.py
from .base_agent import BaseAgent
import re

class DeveloperAgent(BaseAgent):
    """AI agent specialized in software development"""
    
    def __init__(self, llm_router):
        super().__init__(
            name="Senior Developer",
            role="Senior Full-Stack Developer with 10+ years experience",
            llm_router=llm_router
        )
        
    async def process_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Process development tasks"""
        task_type = task.get('type', 'feature')
        
        if task_type == 'feature':
            return await self._implement_feature(task)
        elif task_type == 'bugfix':
            return await self._fix_bug(task)
        elif task_type == 'refactor':
            return await self._refactor_code(task)
        else:
            return await self._general_development(task)
    
    async def _implement_feature(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Implement a new feature"""
        
        # Enhanced prompt for feature implementation
        prompt = f"""
        As a Senior Full-Stack Developer, implement this feature:
        
        Feature: {task['description']}
        Technology Stack: {task.get('tech_stack', 'Next.js, TypeScript, PostgreSQL')}
        Requirements:
        {task.get('requirements', 'Standard web application requirements')}
        
        Please provide:
        1. Complete implementation code
        2. File structure
        3. Database schema if needed
        4. API endpoints if needed
        5. Frontend components if needed
        6. Tests
        7. Documentation
        
        Follow best practices:
        - Clean, readable code
        - Proper error handling
        - Security considerations
        - Performance optimization
        - Accessibility (WCAG 2.1 AA)
        """
        
        # Get LLM response
        llm_response = task.get('llm_response', '')
        
        # Parse and structure the response
        code_blocks = self._extract_code_blocks(llm_response)
        
        return {
            "implementation": {
                "files": code_blocks,
                "summary": self._extract_summary(llm_response),
                "setup_instructions": self._extract_setup(llm_response),
                "testing_approach": self._extract_testing(llm_response)
            },
            "metadata": {
                "estimated_time": "2-4 hours",
                "complexity": "medium",
                "dependencies": self._extract_dependencies(llm_response)
            }
        }
    
    def _extract_code_blocks(self, text: str) -> Dict[str, str]:
        """Extract code blocks from LLM response"""
        code_blocks = {}
        
        # Pattern to match code blocks with file names
        pattern = r'```(?:(\w+))?\s*#?\s*([^\n]+\.[\w]+)?\n(.*?)```'
        matches = re.finditer(pattern, text, re.DOTALL)
        
        for match in matches:
            language = match.group(1) or 'plaintext'
            filename = match.group(2) or f'code_{len(code_blocks)}.{language}'
            code = match.group(3).strip()
            code_blocks[filename] = code
        
        return code_blocks
```

## Workflow Implementation

### 1. LangGraph Workflow Setup

```python
# src/workflows/project_workflow.py
from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Optional
import json

class ProjectState(TypedDict):
    """State definition for project workflow"""
    project_id: str
    requirements: str
    client_email: str
    current_phase: str
    tasks: List[Dict]
    completed_tasks: List[Dict]
    code_repository: Optional[str]
    deployment_url: Optional[str]
    errors: List[str]
    budget_used: float

class ProjectWorkflow:
    def __init__(self, agent_pool, llm_router):
        self.agent_pool = agent_pool
        self.llm_router = llm_router
        self.workflow = self._build_workflow()
    
    def _build_workflow(self) -> StateGraph:
        """Build the project delivery workflow"""
        workflow = StateGraph(ProjectState)
        
        # Add nodes
        workflow.add_node("analyze", self.analyze_requirements)
        workflow.add_node("plan", self.create_project_plan)
        workflow.add_node("develop", self.develop_features)
        workflow.add_node("test", self.test_application)
        workflow.add_node("deploy", self.deploy_application)
        workflow.add_node("deliver", self.deliver_to_client)
        
        # Add edges
        workflow.set_entry_point("analyze")
        workflow.add_edge("analyze", "plan")
        workflow.add_edge("plan", "develop")
        workflow.add_edge("develop", "test")
        
        # Conditional edges
        workflow.add_conditional_edges(
            "test",
            self.check_test_results,
            {
                "pass": "deploy",
                "fail": "develop"
            }
        )
        
        workflow.add_edge("deploy", "deliver")
        workflow.add_edge("deliver", END)
        
        return workflow.compile()
    
    async def analyze_requirements(self, state: ProjectState) -> ProjectState:
        """Analyze project requirements"""
        
        # Use PM agent for analysis
        pm_agent = self.agent_pool.get_agent("project_manager")
        
        result = await pm_agent.execute({
            "type": "analysis",
            "description": f"Analyze these requirements: {state['requirements']}"
        })
        
        state['current_phase'] = "planning"
        return state
```

### 2. n8n Workflow Integration

Create n8n workflow template:

```json
{
  "name": "Virtual IT Company - Project Workflow",
  "nodes": [
    {
      "parameters": {
        "path": "new-project",
        "responseMode": "responseNode",
        "options": {}
      },
      "name": "Project Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "webhookId": "project-webhook"
    },
    {
      "parameters": {
        "url": "http://langgraph-engine:8001/api/projects/create",
        "method": "POST",
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "project_id",
              "value": "={{$json.project_id}}"
            },
            {
              "name": "requirements",
              "value": "={{$json.requirements}}"
            },
            {
              "name": "client_email",
              "value": "={{$json.client_email}}"
            }
          ]
        }
      },
      "name": "Create Project",
      "type": "n8n-nodes-base.httpRequest",
      "position": [450, 300]
    }
  ]
}
```

## Frontend Development

### 1. Dashboard Component

```typescript
// src/components/dashboard/ProjectDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useProjectStore } from '@/stores/projectStore';

interface Project {
  id: string;
  title: string;
  status: 'planning' | 'development' | 'testing' | 'deployed';
  progress: number;
  client: string;
  budget_used: number;
  budget_limit: number;
}

export const ProjectDashboard: React.FC = () => {
  const { projects, fetchProjects } = useProjectStore();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
    const interval = setInterval(fetchProjects, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    const colors = {
      planning: 'bg-purple-500',
      development: 'bg-blue-500',
      testing: 'bg-yellow-500',
      deployed: 'bg-green-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {projects.map((project) => (
        <Card 
          key={project.id}
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setSelectedProject(project.id)}
        >
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">{project.title}</CardTitle>
              <Badge className={getStatusColor(project.status)}>
                {project.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Progress</p>
                <Progress value={project.progress} className="mt-1" />
              </div>
              
              <div className="flex justify-between text-sm">
                <span>Budget Used</span>
                <span>${project.budget_used.toFixed(2)} / ${project.budget_limit}</span>
              </div>
              
              <div className="text-sm text-gray-600">
                Client: {project.client}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
```

### 2. Real-time Updates

```typescript
// src/hooks/useRealtimeUpdates.ts
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useProjectStore } from '@/stores/projectStore';

export const useRealtimeUpdates = () => {
  useEffect(() => {
    const socket: Socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001');
    
    socket.on('connect', () => {
      console.log('Connected to real-time updates');
    });
    
    socket.on('project:update', (data) => {
      useProjectStore.getState().updateProject(data.projectId, data.updates);
    });
    
    socket.on('agent:status', (data) => {
      useProjectStore.getState().updateAgentStatus(data);
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);
};
```

## Testing Strategy

### 1. Unit Testing

```python
# tests/test_llm_router.py
import pytest
from src.services.llm_router import MultiLLMRouter, TaskComplexity

class TestLLMRouter:
    @pytest.fixture
    def router(self):
        return MultiLLMRouter()
    
    def test_simple_task_uses_local_model(self, router):
        """Simple tasks should use free local models"""
        config = router.select_optimal_llm(
            task_type="general",
            complexity=TaskComplexity.SIMPLE
        )
        assert config.provider == "ollama"
        assert config.cost_per_1k_input == 0
    
    def test_complex_task_with_budget(self, router, monkeypatch):
        """Complex tasks with budget should use cloud models"""
        monkeypatch.setenv("CLAUDE_API_KEY", "test-key")
        
        config = router.select_optimal_llm(
            task_type="architecture",
            complexity=TaskComplexity.COMPLEX,
            budget_remaining=50.0
        )
        assert config.provider == "claude"
        assert config.model == "claude-3-5-sonnet-20241022"
```

### 2. Integration Testing

```typescript
// tests/integration/project-flow.test.ts
import { describe, it, expect } from '@jest/globals';
import { createProject, getProjectStatus } from '@/lib/api';

describe('Project Flow Integration', () => {
  it('should create and process a project', async () => {
    // Create project
    const project = await createProject({
      requirements: 'Create a simple landing page',
      client_email: 'test@example.com'
    });
    
    expect(project.id).toBeDefined();
    expect(project.status).toBe('analyzing');
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check status
    const status = await getProjectStatus(project.id);
    expect(['planning', 'development']).toContain(status.current_phase);
  });
});
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Ollama Connection Issues

**Problem**: `ConnectionError: Cannot connect to Ollama`

**Solution**:
```bash
# Check if Ollama is running
docker ps | grep ollama

# If not running, start it
docker run -d -v ollama:/root/.ollama -p 11434:11434 ollama/ollama

# Pull required models
docker exec -it ollama ollama pull mistral
docker exec -it ollama ollama pull codellama
```

#### 2. Database Connection Errors

**Problem**: `PostgreSQL connection refused`

**Solution**:
```bash
# Check PostgreSQL status
docker ps | grep postgres

# View logs
docker logs vitc-postgres

# Reset database if needed
docker-compose down -v
docker-compose up -d postgres
npm run db:migrate
```

#### 3. Memory Issues with Local Models

**Problem**: `Out of memory when running Ollama`

**Solution**:
```yaml
# docker-compose.yml - Add memory limits
services:
  ollama:
    image: ollama/ollama
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G
```

#### 4. API Rate Limiting

**Problem**: `Rate limit exceeded for Claude API`

**Solution**:
```python
# Add retry logic with exponential backoff
import time
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10)
)
async def call_claude_with_retry(self, messages):
    try:
        return await self._call_claude(messages)
    except RateLimitError:
        # Fallback to local model
        return await self._call_ollama(messages)
```

### Debug Mode

Enable detailed logging:

```env
# .env.local
DEBUG=true
LOG_LEVEL=debug
ENABLE_TRACING=true
```

```typescript
// src/lib/logger.ts
export const logger = {
  debug: (message: string, data?: any) => {
    if (process.env.DEBUG === 'true') {
      console.log(`[DEBUG] ${message}`, data);
    }
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
    // Send to error tracking service
  }
};
```

### Performance Monitoring

```python
# src/utils/monitoring.py
import time
from functools import wraps

def track_performance(func):
    """Decorator to track function performance"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        
        try:
            result = await func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            # Log metrics
            logger.info(f"{func.__name__} completed in {execution_time:.2f}s")
            
            # Send to monitoring service
            metrics.record(
                name=f"function.{func.__name__}",
                value=execution_time,
                tags={"status": "success"}
            )
            
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            metrics.record(
                name=f"function.{func.__name__}",
                value=execution_time,
                tags={"status": "error", "error": str(e)}
            )
            raise
    
    return wrapper
```

---

This implementation guide provides a solid foundation for building the Virtual IT Company Platform. Follow the steps sequentially, test thoroughly, and refer to the troubleshooting section when encountering issues.