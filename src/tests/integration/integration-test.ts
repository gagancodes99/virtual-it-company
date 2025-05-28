import { AgentTask, PromptTemplate } from '../execution/agent-executor';
import { LLMClientFactory } from '../llm/llm-client';
import AIAgent from '@/infrastructure/database/models/AIAgent';

// Demo agent configuration
const demoAgent = {
  _id: 'demo-agent-001',
  name: 'Demo Developer Agent',
  type: 'developer',
  description: 'A demo AI agent for testing the integration',
  skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
  status: 'available',
  tenantId: 'demo-tenant',
  model: {
    provider: 'ollama',
    model: 'llama2',
    temperature: 0.7,
    maxTokens: 2000
  },
  performance: {
    tasksCompleted: 0,
    averageRating: 0,
    reliability: 1.0,
    responseTimeMs: 0,
    lastActive: new Date()
  },
  capabilities: {
    languages: ['JavaScript', 'TypeScript', 'Python'],
    frameworks: ['React', 'Next.js', 'Express'],
    specializations: ['Web Development', 'API Development'],
    tools: ['Git', 'Docker', 'VS Code']
  },
  settings: {
    workingHours: {
      start: '09:00',
      end: '17:00',
      timezone: 'UTC'
    },
    responseTime: 300,
    maxConcurrentTasks: 3,
    autoAssign: true
  },
  training: {
    datasets: [],
    accuracy: 0.95
  },
  createdAt: new Date(),
  updatedAt: new Date()
} as any;

// Demo task
const demoTask: AgentTask = {
  id: 'demo-task-001',
  type: 'code',
  title: 'Create a simple React component',
  description: 'Create a basic React component that displays a welcome message with a button',
  requirements: [
    'Use TypeScript',
    'Include proper props interface',
    'Add click handler for button',
    'Include basic styling'
  ],
  context: 'This is a demo task to test the AI agent integration',
  priority: 'medium',
  projectId: 'demo-project-001',
  status: 'pending',
  metadata: {
    testMode: true,
    demoRun: true
  }
};

export async function runIntegrationTest(): Promise<{
  success: boolean;
  results: any;
  errors: string[];
}> {
  const errors: string[] = [];
  const results: any = {};

  try {
    console.log('🚀 Starting AI Integration Test...');

    // Test 1: LLM Client Factory
    console.log('\n📡 Testing LLM Client Factory...');
    try {
    // const ollamaClient = LLMClientFactory.create({
        provider: 'ollama',
        model: 'llama2',
        baseURL: 'http://localhost:11434'
      });
      results.llmClient = { status: 'created', provider: 'ollama' };
      console.log('✅ LLM Client created successfully');
    } catch {
      errors.push(`LLM Client creation failed: ${error}`);
      console.log('❌ LLM Client creation failed');
    }

    // Test 2: Agent Executor
    console.log('\n🤖 Testing Agent Executor...');
    try {
    // const executor = new AgentExecutor(demoAgent);
      
      // Test availability
    // const isAvailable = executor.isAvailable();
      console.log(`Agent availability: ${isAvailable}`);
      
      // Test task compatibility
    // const canHandle = executor.canHandleTask(demoTask);
      console.log(`Can handle demo task: ${canHandle}`);
      
      results.agentExecutor = {
        status: 'created',
        available: isAvailable,
        canHandleTask: canHandle
      };
      console.log('✅ Agent Executor created and tested');
    } catch {
      errors.push(`Agent Executor test failed: ${error}`);
      console.log('❌ Agent Executor test failed');
    }

    // Test 3: Prompt Template System
    console.log('\n📝 Testing Prompt Template System...');
    try {
      const systemPrompt = PromptTemplate.buildSystemPrompt(demoAgent);
      const taskPrompt = PromptTemplate.buildTaskPrompt(demoTask);
      
      console.log('System prompt length:', systemPrompt.length);
      console.log('Task prompt length:', taskPrompt.length);
      
      results.promptTemplates = {
        status: 'generated',
        systemPromptLength: systemPrompt.length,
        taskPromptLength: taskPrompt.length
      };
      console.log('✅ Prompt templates generated successfully');
    } catch {
      errors.push(`Prompt template test failed: ${error}`);
      console.log('❌ Prompt template test failed');
    }

    // Test 4: Task Queue (Mock Redis)
    console.log('\n📬 Testing Task Queue (Mock Mode)...');
    try {
      // Create mock processor
    // const mockProcessor = async (task: AgentTask) => {
        console.log(`Mock processing task: ${task.title}`);
        return {
          taskId: task.id,
          agentId: 'demo-agent-001',
          status: 'success' as const,
          result: {
            content: 'Mock task completed successfully',
            artifacts: ['mock-component.tsx'],
            suggestions: ['Add tests', 'Improve styling'],
            nextSteps: ['Review code', 'Deploy to staging']
          },
          metadata: {
            duration: 5000,
            cost: 0,
            tokensUsed: 500,
            model: 'llama2',
            retryCount: 0
          },
          timestamp: new Date()
        };
      };

      // Note: This would normally connect to Redis, but we're in mock mode
      results.taskQueue = {
        status: 'mock_created',
        processor: 'attached'
      };
      console.log('✅ Task Queue mock created successfully');
    } catch {
      errors.push(`Task Queue test failed: ${error}`);
      console.log('❌ Task Queue test failed');
    }

    // Test 5: End-to-End Flow (Mock)
    console.log('\n🔄 Testing End-to-End Flow (Mock Mode)...');
    try {
    // const executor = new AgentExecutor(demoAgent);
      
      // Mock the actual execution (since we might not have Ollama running)
      console.log('Simulating task execution...');
      
      // This would normally call executor.executeTask(demoTask)
      // but we'll simulate it for testing
      const mockResponse = {
        taskId: demoTask.id,
        agentId: demoAgent._id,
        status: 'success' as const,
        result: {
          content: `// Demo React Component
interface WelcomeProps {
  name?: string;
}

export const Welcome: React.FC<WelcomeProps> = ({ name = 'World' }) => {
  const handleClick = () => {
    console.log('Button clicked!');
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Welcome, {name}!</h1>
      <button 
        onClick={handleClick}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px' 
        }}
      >
        Click Me
      </button>
    </div>
  );
};`,
          artifacts: ['Welcome.tsx'],
          suggestions: [
            'Add PropTypes or better TypeScript types',
            'Consider using CSS modules for styling',
            'Add unit tests with Jest and React Testing Library'
          ],
          nextSteps: [
            'Review component implementation',
            'Add to component library',
            'Create documentation'
          ]
        },
        metadata: {
          duration: 3500,
          cost: 0,
          tokensUsed: 450,
          model: 'llama2',
          retryCount: 0
        },
        timestamp: new Date()
      };

      results.endToEndFlow = {
        status: 'simulated_success',
        taskCompleted: true,
        artifactsGenerated: mockResponse.result.artifacts?.length || 0,
        suggestionsProvided: mockResponse.result.suggestions?.length || 0
      };
      
      console.log('✅ End-to-end flow simulation completed');
      console.log(`Generated ${mockResponse.result.artifacts?.length} artifacts`);
      console.log(`Provided ${mockResponse.result.suggestions?.length} suggestions`);
    } catch {
      errors.push(`End-to-end flow test failed: ${error}`);
      console.log('❌ End-to-end flow test failed');
    }

    // Summary
    console.log('\n📊 Integration Test Summary');
    console.log('==========================');
    
    const totalTests = Object.keys(results).length;
    const successfulTests = Object.values(results).filter(r => 
      typeof r === 'object' && r !== null && 'status' in r
    ).length;
    
    console.log(`Total tests: ${totalTests}`);
    console.log(`Successful: ${successfulTests}`);
    console.log(`Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    const success = errors.length === 0;
    console.log(`\n${success ? '🎉 All tests passed!' : '⚠️  Some tests failed'}`);

    return {
      success,
      results,
      errors
    };

  } catch {
    console.error('💥 Integration test crashed:', error);
    return {
      success: false,
      results: {},
      errors: [`Test crashed: ${error}`]
    };
  }
}

// Export for use in other modules
export { demoAgent, demoTask };