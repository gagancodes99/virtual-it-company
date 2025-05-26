# Unified Autonomous Virtual IT Company Platform

## Architecture: Best of Both Worlds

### Core Stack (Free/Minimal Cost)
```yaml
# Local Development (₹0/month)
Orchestration: n8n (Docker self-hosted)
AI Models: Ollama (Mistral, CodeLlama, Llama2) 
Database: Redis + SQLite (Docker)
Queue: Redis/Celery
Storage: Local SSD + Supabase Free (1GB)

# Cloud Infrastructure (₹350-500/month)
Hosting: DigitalOcean Droplet (1GB) - ₹350/month
Backup: Railway Free Tier
Frontend: Vercel Free
Git: GitHub Free (2000 CI minutes)
Email: SendGrid Free (100/day)
```

### Hybrid Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     n8n Orchestrator                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Project A   │  │ Project B   │  │ Project C   │        │
│  │ Workflow    │  │ Workflow    │  │ Workflow    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Redis Task Queue                         │
│    ┌─────────┐    ┌─────────┐    ┌─────────┐              │
│    │ Plan    │    │ Code    │    │ Test    │              │
│    │ Tasks   │    │ Tasks   │    │ Tasks   │              │
│    └─────────┘    └─────────┘    └─────────┘              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 AI Agent Pool (Ollama)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Planner     │  │ Developer   │  │ Tester      │        │
│  │ Agent       │  │ Agent       │  │ Agent       │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ DevOps      │  │ Reviewer    │  │ PM Agent    │        │
│  │ Agent       │  │ Agent       │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Strategy

### Phase 1: Local Development Setup (Week 1)
```bash
# Docker Compose Stack
version: "3.9"
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=password
    volumes:
      - ./n8n:/home/node/.n8n

  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ./ollama:/root/.ollama

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  agents:
    build: ./agents
    ports:
      - "8000:8000"
    depends_on:
      - redis
      - ollama

  dashboard:
    build: ./dashboard
    ports:
      - "3000:3000"
    depends_on:
      - agents
```

### Phase 2: AI Agent Services (Week 2)
```python
# agents/app.py - Flask-based agent services
from flask import Flask, request, jsonify
import ollama
import redis
import json
from datetime import datetime

app = Flask(__name__)
r = redis.Redis(host='redis', port=6379, decode_responses=True)

class AIAgent:
    def __init__(self, role, model="mistral"):
        self.role = role
        self.model = model
        
    def process_task(self, task, context=None):
        prompt = self.build_prompt(task, context)
        response = ollama.chat(
            model=self.model,
            messages=[{"role": "user", "content": prompt}]
        )
        return response["message"]["content"]
    
    def build_prompt(self, task, context):
        return f"""
        You are a {self.role} in a software development team.
        Task: {task}
        Context: {context or 'None'}
        
        Provide a professional response appropriate for your role.
        """

# Agent instances
planner = AIAgent("Senior Project Manager", "mistral")
developer = AIAgent("Senior Full-Stack Developer", "codellama")
tester = AIAgent("QA Engineer", "mistral")
devops = AIAgent("DevOps Engineer", "mistral")

@app.route("/plan-project", methods=["POST"])
def plan_project():
    data = request.json
    project_id = data.get("project_id")
    requirements = data.get("requirements")
    
    # Generate project plan
    plan = planner.process_task(f"""
    Create a detailed project plan for:
    {requirements}
    
    Include:
    1. Task breakdown
    2. Timeline estimates
    3. Team assignments
    4. Technology stack recommendations
    5. Risk assessment
    """)
    
    # Store in Redis
    r.hset(f"project:{project_id}", "plan", plan)
    r.hset(f"project:{project_id}", "status", "planned")
    
    return jsonify({"plan": plan, "status": "success"})

@app.route("/develop-feature", methods=["POST"])
def develop_feature():
    data = request.json
    task = data.get("task")
    project_id = data.get("project_id")
    
    # Get project context
    context = r.hget(f"project:{project_id}", "plan")
    
    # Generate code
    code = developer.process_task(f"""
    Implement this feature: {task}
    
    Requirements:
    - Write clean, production-ready code
    - Include error handling
    - Add comments and documentation
    - Follow best practices
    """, context)
    
    # Store result
    task_id = f"task:{project_id}:{datetime.now().timestamp()}"
    r.hset(task_id, "code", code)
    r.hset(task_id, "status", "completed")
    
    return jsonify({"code": code, "task_id": task_id})

@app.route("/test-feature", methods=["POST"])
def test_feature():
    data = request.json
    code = data.get("code")
    requirements = data.get("requirements")
    
    test_plan = tester.process_task(f"""
    Create comprehensive tests for this code:
    {code}
    
    Requirements: {requirements}
    
    Include:
    1. Unit tests
    2. Integration tests
    3. Edge cases
    4. Error scenarios
    """)
    
    return jsonify({"tests": test_plan})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
```

### Phase 3: n8n Workflow Templates (Week 3)
```json
{
  "name": "Autonomous Project Workflow",
  "nodes": [
    {
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "new-project"
      }
    },
    {
      "name": "Extract Project Data",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "return [{\n  project_id: $json.project_id,\n  requirements: $json.requirements,\n  client_email: $json.client_email\n}];"
      }
    },
    {
      "name": "Plan Project",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://agents:8000/plan-project",
        "method": "POST",
        "body": {
          "project_id": "={{$json.project_id}}",
          "requirements": "={{$json.requirements}}"
        }
      }
    },
    {
      "name": "Create GitHub Repo",
      "type": "n8n-nodes-base.github",
      "parameters": {
        "operation": "create",
        "resource": "repository",
        "name": "={{$json.project_id}}-client-project"
      }
    },
    {
      "name": "Generate Tasks",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Parse plan and create task list\nconst plan = $node['Plan Project'].json.plan;\nconst tasks = plan.split('\\n').filter(line => line.includes('Task:'));\nreturn tasks.map((task, index) => ({\n  task_id: `task_${index}`,\n  description: task,\n  project_id: $json.project_id\n}));"
      }
    },
    {
      "name": "Execute Development Tasks",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://agents:8000/develop-feature",
        "method": "POST"
      }
    },
    {
      "name": "Run Tests",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://agents:8000/test-feature",
        "method": "POST"
      }
    },
    {
      "name": "Commit to GitHub",
      "type": "n8n-nodes-base.github",
      "parameters": {
        "operation": "create",
        "resource": "file"
      }
    },
    {
      "name": "Deploy to Vercel",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://api.vercel.com/v1/deployments",
        "method": "POST"
      }
    },
    {
      "name": "Notify Client",
      "type": "n8n-nodes-base.sendGrid",
      "parameters": {
        "to": "={{$json.client_email}}",
        "subject": "Project Progress Update"
      }
    }
  ]
}
```

### Phase 4: Multi-Project Management (Week 4)
```python
# Multi-project orchestrator
class ProjectOrchestrator:
    def __init__(self):
        self.redis = redis.Redis(host='redis', decode_responses=True)
        
    async def handle_multiple_projects(self):
        """Run multiple projects concurrently"""
        active_projects = self.get_active_projects()
        
        tasks = []
        for project in active_projects:
            task = asyncio.create_task(
                self.manage_project(project['id'])
            )
            tasks.append(task)
        
        await asyncio.gather(*tasks)
    
    async def manage_project(self, project_id):
        """Manage individual project lifecycle"""
        project_state = self.get_project_state(project_id)
        
        if project_state == 'planning':
            await self.planning_phase(project_id)
        elif project_state == 'development':
            await self.development_phase(project_id)
        elif project_state == 'testing':
            await self.testing_phase(project_id)
        elif project_state == 'deployment':
            await self.deployment_phase(project_id)
    
    def get_active_projects(self):
        """Get all active projects from Redis"""
        project_keys = self.redis.keys("project:*")
        projects = []
        for key in project_keys:
            project_data = self.redis.hgetall(key)
            if project_data.get('status') != 'completed':
                projects.append({
                    'id': key.split(':')[1],
                    'data': project_data
                })
        return projects
```

## Cost Breakdown

### Option 1: Pure Local (₹0/month)
- Run everything on your Mac + external SSD
- Use Ollama for AI (free)
- Local Redis + SQLite
- Only pay for domain (₹1000/year)

### Option 2: Hybrid (₹350-500/month)
- n8n + Redis on DigitalOcean (₹350/month)
- Ollama models locally or on server
- Vercel for dashboard (free)
- GitHub Actions (free tier)
- SendGrid for emails (free tier)

### Option 3: Full Cloud (₹800-1500/month)
- Multiple DigitalOcean droplets
- Claude API for complex tasks
- MongoDB Atlas
- Premium monitoring

## Estimated Timeline
- **Week 1**: Docker setup, basic agents
- **Week 2**: n8n workflows, GitHub integration  
- **Week 3**: Multi-project orchestration
- **Week 4**: Client portal, billing automation
- **Month 2**: Scale to handle 5-10 concurrent projects
- **Month 3**: Full autonomous operation

## Expected Results
- Handle 3-5 projects simultaneously
- 90% automation rate
- 24/7 operation capability
- Monthly revenue potential: ₹50k-2L+
- Operating costs: ₹350-500/month