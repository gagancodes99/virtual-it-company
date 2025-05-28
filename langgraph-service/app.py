from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import os
import json
from datetime import datetime

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
import redis
from motor.motor_asyncio import AsyncIOMotorClient

app = FastAPI(title="LangGraph Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize connections
redis_client = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
mongo_client = AsyncIOMotorClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017"))
db = mongo_client.get_database("virtual-it-company")

# Pydantic models
class ProjectState(BaseModel):
    project_id: str
    requirements: str
    status: str = "draft"
    current_phase: str = "analyzing"
    tasks: List[Dict[str, Any]] = []
    errors: List[str] = []
    context: Dict[str, Any] = {}
    metadata: Dict[str, Any] = {}

class WorkflowRequest(BaseModel):
    project_id: str
    requirements: str
    project_type: str = "web_application"
    priority: str = "medium"
    deadline: Optional[datetime] = None
    context: Optional[Dict[str, Any]] = None

class WorkflowResponse(BaseModel):
    workflow_id: str
    status: str
    state: ProjectState
    next_steps: List[str]

# LLM Configuration
def get_llm(provider: str = "openai", model: str = "gpt-4"):
    if provider == "openai":
        return ChatOpenAI(
            model=model,
            api_key=os.getenv("OPENAI_API_KEY"),
            temperature=0.7
        )
    elif provider == "anthropic":
        return ChatAnthropic(
            model=model,
            api_key=os.getenv("ANTHROPIC_API_KEY"),
            temperature=0.7
        )
    else:
        raise ValueError(f"Unsupported provider: {provider}")

# Workflow nodes
async def analyze_requirements(state: ProjectState) -> ProjectState:
    """Analyze project requirements and extract key information."""
    llm = get_llm()
    
    prompt = f"""
    Analyze the following project requirements and extract:
    1. Key features and functionality
    2. Technical constraints
    3. Estimated complexity (1-10 scale)
    4. Required technologies
    5. Potential challenges
    
    Requirements: {state.requirements}
    
    Provide a structured analysis in JSON format.
    """
    
    try:
        response = await llm.ainvoke(prompt)
        
        # Parse analysis (simplified for demo)
        analysis = {
            "complexity": 7,
            "technologies": ["React", "Node.js", "MongoDB"],
            "features": state.requirements.split("."),
            "challenges": ["User authentication", "Real-time updates"],
            "estimated_hours": 160
        }
        
        state.context["analysis"] = analysis
        state.status = "analyzed"
        state.current_phase = "planning"
        
        return state
    except Exception as e:
        state.errors.append(f"Analysis failed: {str(e)}")
        state.status = "failed"
        return state

async def create_plan(state: ProjectState) -> ProjectState:
    """Create detailed project plan and task breakdown."""
    if state.status == "failed":
        return state
    
    llm = get_llm()
    analysis = state.context.get("analysis", {})
    
    prompt = f"""
    Based on the analysis: {json.dumps(analysis, indent=2)}
    
    Create a detailed project plan with:
    1. Phase breakdown
    2. Task list with dependencies
    3. Resource requirements
    4. Timeline estimation
    
    Format as structured JSON.
    """
    
    try:
        response = await llm.ainvoke(prompt)
        
        # Create sample plan
        plan = {
            "phases": [
                {"name": "Setup", "duration": "1 week", "tasks": 3},
                {"name": "Development", "duration": "4 weeks", "tasks": 12},
                {"name": "Testing", "duration": "2 weeks", "tasks": 6},
                {"name": "Deployment", "duration": "1 week", "tasks": 2}
            ],
            "total_tasks": 23,
            "estimated_duration": "8 weeks"
        }
        
        # Generate tasks
        tasks = []
        for i in range(5):  # Generate 5 sample tasks
            task = {
                "id": f"task_{i+1}",
                "title": f"Implement feature {i+1}",
                "type": "code",
                "priority": "medium",
                "status": "pending",
                "estimated_hours": 8
            }
            tasks.append(task)
        
        state.tasks = tasks
        state.context["plan"] = plan
        state.status = "planned"
        state.current_phase = "development"
        
        return state
    except Exception as e:
        state.errors.append(f"Planning failed: {str(e)}")
        state.status = "failed"
        return state

async def execute_tasks(state: ProjectState) -> ProjectState:
    """Execute planned tasks using agent pool."""
    if state.status == "failed":
        return state
    
    try:
        # In real implementation, this would dispatch tasks to agent pool
        # For now, we'll simulate task execution
        
        executed_tasks = 0
        for task in state.tasks:
            if task["status"] == "pending":
                # Simulate task assignment and execution
                task["status"] = "assigned"
                task["assigned_agent"] = f"agent_{executed_tasks % 3 + 1}"
                executed_tasks += 1
                
                if executed_tasks >= 2:  # Limit for demo
                    break
        
        state.context["execution"] = {
            "tasks_assigned": executed_tasks,
            "agents_used": min(3, executed_tasks),
            "start_time": datetime.now().isoformat()
        }
        
        state.status = "executing"
        state.current_phase = "development"
        
        return state
    except Exception as e:
        state.errors.append(f"Execution failed: {str(e)}")
        state.status = "failed"
        return state

# Workflow definition
def create_project_workflow():
    """Create the project workflow graph."""
    workflow = StateGraph(ProjectState)
    
    # Add nodes
    workflow.add_node("analyze", analyze_requirements)
    workflow.add_node("plan", create_plan)
    workflow.add_node("execute", execute_tasks)
    
    # Add edges
    workflow.set_entry_point("analyze")
    workflow.add_edge("analyze", "plan")
    workflow.add_edge("plan", "execute")
    workflow.add_edge("execute", END)
    
    return workflow.compile()

# API endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Check Redis connection
        redis_client.ping()
        
        # Check MongoDB connection
        await mongo_client.admin.command('ping')
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "redis": "connected",
                "mongodb": "connected"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

@app.post("/workflow/start", response_model=WorkflowResponse)
async def start_workflow(request: WorkflowRequest):
    """Start a new project workflow."""
    try:
        # Initialize state
        initial_state = ProjectState(
            project_id=request.project_id,
            requirements=request.requirements,
            context=request.context or {},
            metadata={
                "project_type": request.project_type,
                "priority": request.priority,
                "deadline": request.deadline.isoformat() if request.deadline else None,
                "created_at": datetime.now().isoformat()
            }
        )
        
        # Create and execute workflow
        workflow = create_project_workflow()
        result = await workflow.ainvoke(initial_state.dict())
        
        # Store workflow state in Redis
        workflow_id = f"workflow_{request.project_id}_{int(datetime.now().timestamp())}"
        redis_client.setex(
            workflow_id,
            3600,  # 1 hour TTL
            json.dumps(result, default=str)
        )
        
        # Store in MongoDB for persistence
        await db.workflows.insert_one({
            "workflow_id": workflow_id,
            "project_id": request.project_id,
            "state": result,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        })
        
        # Determine next steps
        next_steps = []
        if result.get("status") == "executing":
            next_steps = ["Monitor task execution", "Assign agents to pending tasks"]
        elif result.get("status") == "failed":
            next_steps = ["Review errors", "Retry failed steps"]
        else:
            next_steps = ["Continue to next phase"]
        
        return WorkflowResponse(
            workflow_id=workflow_id,
            status=result.get("status", "unknown"),
            state=ProjectState(**result),
            next_steps=next_steps
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow failed: {str(e)}")

@app.get("/workflow/{workflow_id}")
async def get_workflow_status(workflow_id: str):
    """Get workflow status and current state."""
    try:
        # Try Redis first for fast access
        cached_state = redis_client.get(workflow_id)
        if cached_state:
            return json.loads(cached_state)
        
        # Fallback to MongoDB
        workflow_doc = await db.workflows.find_one({"workflow_id": workflow_id})
        if workflow_doc:
            return workflow_doc["state"]
        
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving workflow: {str(e)}")

@app.post("/workflow/{workflow_id}/continue")
async def continue_workflow(workflow_id: str):
    """Continue a paused or failed workflow."""
    try:
        # Get current state
        workflow_doc = await db.workflows.find_one({"workflow_id": workflow_id})
        if not workflow_doc:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        current_state = ProjectState(**workflow_doc["state"])
        
        # Continue from current phase
        workflow = create_project_workflow()
        result = await workflow.ainvoke(current_state.dict())
        
        # Update stored state
        await db.workflows.update_one(
            {"workflow_id": workflow_id},
            {
                "$set": {
                    "state": result,
                    "updated_at": datetime.now()
                }
            }
        )
        
        # Update Redis cache
        redis_client.setex(workflow_id, 3600, json.dumps(result, default=str))
        
        return {"status": "continued", "state": result}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error continuing workflow: {str(e)}")

@app.get("/workflows")
async def list_workflows(limit: int = 10, offset: int = 0):
    """List all workflows with pagination."""
    try:
        cursor = db.workflows.find().sort("created_at", -1).skip(offset).limit(limit)
        workflows = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string for JSON serialization
        for workflow in workflows:
            workflow["_id"] = str(workflow["_id"])
            
        total = await db.workflows.count_documents({})
        
        return {
            "workflows": workflows,
            "total": total,
            "offset": offset,
            "limit": limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing workflows: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)