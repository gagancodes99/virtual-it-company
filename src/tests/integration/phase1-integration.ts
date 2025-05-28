import { LLMRouter, createDefaultRouterConfig } from '../llm/llm-router';
import { AgentTask } from '../execution/agent-executor';
import { agentPool } from '../agents/agent-pool';
import { projectStateMachine, ProjectEvent } from '../workflows/project-state-machine';
import { validateEnvironment } from '../../scripts/validate-env';

// Demo data for comprehensive testing
const demoProject = {
  id: 'demo-project-phase1',
  requirements: `
    Create a modern web application with the following features:
    1. User authentication and authorization
    2. Real-time chat functionality
    3. File upload and management
    4. Responsive design for mobile and desktop
    5. REST API with proper error handling
    6. Unit and integration tests
    7. Docker deployment configuration
  `,
  type: 'web_application',
  priority: 'high' as const
};

const demoAgents = [
  {
    _id: 'senior-dev-001',
    name: 'Senior Developer Alice',
    type: 'developer',
    description: 'Senior full-stack developer specialized in React and Node.js',
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Docker'],
    status: 'available',
    tenantId: 'demo-tenant',
    model: {
      provider: 'ollama',
      model: 'codellama',
      temperature: 0.7,
      maxTokens: 2000
    },
    performance: {
      tasksCompleted: 150,
      averageRating: 4.5,
      reliability: 0.95,
      responseTimeMs: 3000,
      lastActive: new Date()
    },
    capabilities: {
      languages: ['JavaScript', 'TypeScript', 'Python'],
      frameworks: ['React', 'Next.js', 'Express', 'FastAPI'],
      specializations: ['Full-stack Development', 'API Design', 'Database Design'],
      tools: ['Git', 'Docker', 'VS Code', 'Postman']
    },
    settings: {
      workingHours: { start: '09:00', end: '18:00', timezone: 'UTC' },
      responseTime: 300,
      maxConcurrentTasks: 5,
      autoAssign: true
    },
    training: { datasets: [], accuracy: 0.92 },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'designer-001',
    name: 'UI Designer Bob',
    type: 'designer',
    description: 'Creative UI/UX designer with modern design principles',
    skills: ['UI/UX Design', 'Figma', 'CSS', 'Design Systems'],
    status: 'available',
    tenantId: 'demo-tenant',
    model: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      temperature: 0.8,
      maxTokens: 1500
    },
    performance: {
      tasksCompleted: 89,
      averageRating: 4.3,
      reliability: 0.88,
      responseTimeMs: 4500,
      lastActive: new Date()
    },
    capabilities: {
      languages: ['CSS', 'HTML', 'JavaScript'],
      frameworks: ['React', 'Tailwind CSS', 'Material-UI'],
      specializations: ['UI/UX Design', 'Responsive Design', 'Design Systems'],
      tools: ['Figma', 'Adobe XD', 'Sketch', 'InVision']
    },
    settings: {
      workingHours: { start: '10:00', end: '19:00', timezone: 'UTC' },
      responseTime: 600,
      maxConcurrentTasks: 3,
      autoAssign: true
    },
    training: { datasets: [], accuracy: 0.87 },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'tester-001',
    name: 'QA Tester Charlie',
    type: 'tester',
    description: 'Quality assurance specialist focusing on automated testing',
    skills: ['Testing', 'Jest', 'Cypress', 'Selenium', 'Test Automation'],
    status: 'available',
    tenantId: 'demo-tenant',
    model: {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      temperature: 0.5,
      maxTokens: 1800
    },
    performance: {
      tasksCompleted: 75,
      averageRating: 4.1,
      reliability: 0.91,
      responseTimeMs: 2800,
      lastActive: new Date()
    },
    capabilities: {
      languages: ['JavaScript', 'TypeScript', 'Python'],
      frameworks: ['Jest', 'Cypress', 'Selenium', 'Playwright'],
      specializations: ['Test Automation', 'QA', 'Performance Testing'],
      tools: ['Jest', 'Cypress', 'Postman', 'JMeter']
    },
    settings: {
      workingHours: { start: '08:00', end: '17:00', timezone: 'UTC' },
      responseTime: 400,
      maxConcurrentTasks: 4,
      autoAssign: true
    },
    training: { datasets: [], accuracy: 0.89 },
    createdAt: new Date(),
    updatedAt: new Date()
  }
] as any[];

const demoTasks: AgentTask[] = [
  {
    id: 'task-001',
    type: 'analysis',
    title: 'Analyze project requirements',
    description: 'Break down the project requirements into detailed specifications',
    requirements: ['Technical analysis', 'Architecture planning', 'Risk assessment'],
    context: demoProject.requirements,
    priority: 'high',
    projectId: demoProject.id,
    status: 'pending'
  },
  {
    id: 'task-002',
    type: 'design',
    title: 'Create UI mockups',
    description: 'Design user interface mockups for the web application',
    requirements: ['Responsive design', 'Modern UI principles', 'Accessibility'],
    context: 'Focus on user authentication, chat interface, and file management',
    priority: 'high',
    projectId: demoProject.id,
    status: 'pending'
  },
  {
    id: 'task-003',
    type: 'code',
    title: 'Implement authentication system',
    description: 'Build user authentication and authorization system',
    requirements: ['JWT tokens', 'Password hashing', 'Role-based access'],
    context: 'Use modern authentication best practices',
    priority: 'critical',
    projectId: demoProject.id,
    status: 'pending'
  },
  {
    id: 'task-004',
    type: 'test',
    title: 'Create authentication tests',
    description: 'Write comprehensive tests for authentication system',
    requirements: ['Unit tests', 'Integration tests', 'Security tests'],
    context: 'Ensure proper coverage of authentication flows',
    priority: 'high',
    projectId: demoProject.id,
    status: 'pending'
  }
];

export class Phase1Integration {
  private router: LLMRouter;
  private initialized: boolean = false;

  constructor() {
    this.router = new LLMRouter(createDefaultRouterConfig());
  }

  async runComprehensiveTest(): Promise<{
    success: boolean;
    results: any;
    errors: string[];
    performance: any;
  }> {
    const startTime = Date.now();
    const results: any = {};
    const errors: string[] = [];

    try {
      console.log('🚀 Phase 1 Sprint B Integration Test');
      console.log('=====================================\n');

      // Test 1: Environment Validation
      console.log('1️⃣ Testing Environment Configuration...');
      const envResult = validateEnvironment();
      results.environment = {
        valid: envResult.success,
        warnings: envResult.warnings,
        errors: envResult.errors
      };
      
      if (!envResult.success) {
        errors.push('Environment validation failed');
        console.log('❌ Environment validation failed');
      } else {
        console.log('✅ Environment configuration valid');
      }

      // Test 2: LLM Router Integration
      console.log('\n2️⃣ Testing Multi-LLM Router...');
      try {
        const routerHealth = this.router.getHealthStatus();
        console.log(`   Available models: ${routerHealth.availableModels}`);
        console.log(`   Circuit breakers open: ${routerHealth.circuitBreakersOpen}`);
        
        results.llmRouter = {
          status: 'initialized',
          availableModels: routerHealth.availableModels,
          totalCost: routerHealth.totalCost
        };
        console.log('✅ LLM Router operational');
      } catch {
        errors.push(`LLM Router test failed: ${error}`);
        console.log('❌ LLM Router test failed');
      }

      // Test 3: Agent Pool Management
      console.log('\n3️⃣ Testing Agent Pool Manager...');
      try {
        // Register demo agents
        for (const agentData of demoAgents) {
          await agentPool.registerAgent(agentData);
        }

    // const poolMetrics = agentPool.getPoolMetrics();
        console.log(`   Total agents: ${poolMetrics.totalAgents}`);
        console.log(`   Available agents: ${poolMetrics.availableAgents}`);
        console.log(`   Pool health: ${poolMetrics.poolHealth.toFixed(1)}%`);

        results.agentPool = {
          status: 'operational',
          totalAgents: poolMetrics.totalAgents,
          availableAgents: poolMetrics.availableAgents,
          poolHealth: poolMetrics.poolHealth
        };
        console.log('✅ Agent Pool Manager operational');
      } catch {
        errors.push(`Agent Pool test failed: ${error}`);
        console.log('❌ Agent Pool test failed');
      }

      // Test 4: Project State Machine
      console.log('\n4️⃣ Testing Project State Machine...');
      try {
        const context = await projectStateMachine.initializeProject(
          demoProject.id,
          demoProject.requirements
        );

        console.log(`   Project initialized in phase: ${context.currentPhase}`);
        
        // Test state transition
        const transitionSuccess = await projectStateMachine.transition(
          demoProject.id,
          ProjectEvent.START_ANALYSIS,
          'integration-test'
        );

        const currentPhase = projectStateMachine.getCurrentPhase(demoProject.id);
        console.log(`   Transitioned to phase: ${currentPhase}`);

        results.stateMachine = {
          status: 'operational',
          initialPhase: ProjectPhase.DRAFT,
          currentPhase: currentPhase,
          transitionSuccess: transitionSuccess
        };
        console.log('✅ Project State Machine operational');
      } catch {
        errors.push(`State Machine test failed: ${error}`);
        console.log('❌ State Machine test failed');
      }

      // Test 5: Task Queue Integration
      console.log('\n5️⃣ Testing Task Queue System...');
      try {
        // Initialize task queue with mock processor
    // const queueConfig = createQueueConfig({
          redis: {
            host: 'localhost',
            port: 6379
          }
        });

    // const mockProcessor = async (task: AgentTask) => {
          // Simulate task processing
          await new Promise(resolve => setTimeout(resolve, 100));
          
          return {
            taskId: task.id,
            agentId: 'mock-agent',
            status: 'success' as const,
            result: {
              content: `Mock result for task: ${task.title}`,
              artifacts: [`${task.type}-artifact.txt`]
            },
            metadata: {
              duration: 100,
              cost: 0,
              tokensUsed: 50,
              model: 'mock-model',
              retryCount: 0
            },
            timestamp: new Date()
          };
        };

        // Note: Would normally initialize TaskQueueManager here
        // For testing, we'll simulate the behavior
        
        results.taskQueue = {
          status: 'simulated',
          mockProcessor: 'attached',
          tasksToProcess: demoTasks.length
        };
        console.log('✅ Task Queue system ready (simulated)');
      } catch {
        errors.push(`Task Queue test failed: ${error}`);
        console.log('❌ Task Queue test failed');
      }

      // Test 6: End-to-End Workflow
      console.log('\n6️⃣ Testing End-to-End Workflow...');
      try {
        // Simulate complete workflow
        let workflowSteps = 0;

        // Step 1: Assign tasks to agents
        for (const task of demoTasks) {
    // const suitableAgent = await agentPool.getAvailableAgent(task);
          if (suitableAgent) {
            console.log(`   ✓ Task "${task.title}" can be assigned to ${suitableAgent.agent.name}`);
            workflowSteps++;
          }
        }

        // Step 2: Simulate project progression
        projectStateMachine.updateMetadata(demoProject.id, {
          analysis: { complexity: 7, estimatedHours: 120 }
        });

        await projectStateMachine.transition(
          demoProject.id,
          ProjectEvent.ANALYSIS_COMPLETE
        );

        const finalPhase = projectStateMachine.getCurrentPhase(demoProject.id);
        console.log(`   ✓ Project progressed to: ${finalPhase}`);

        results.endToEndWorkflow = {
          status: 'simulated_success',
          stepsCompleted: workflowSteps,
          finalPhase: finalPhase,
          tasksAssignable: workflowSteps
        };
        console.log('✅ End-to-end workflow simulation completed');
      } catch {
        errors.push(`End-to-end workflow test failed: ${error}`);
        console.log('❌ End-to-end workflow test failed');
      }

      // Performance Summary
      const duration = Date.now() - startTime;
      const performance = {
        totalDuration: duration,
        testsPassed: Object.keys(results).length - errors.length,
        testsTotal: Object.keys(results).length,
        successRate: ((Object.keys(results).length - errors.length) / Object.keys(results).length) * 100
      };

      console.log('\n📊 Integration Test Results');
      console.log('============================');
      console.log(`Duration: ${duration}ms`);
      console.log(`Tests Passed: ${performance.testsPassed}/${performance.testsTotal}`);
      console.log(`Success Rate: ${performance.successRate.toFixed(1)}%`);

      if (errors.length > 0) {
        console.log('\n❌ Errors encountered:');
        errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }

      const success = errors.length === 0;
      console.log(`\n${success ? '🎉 All Phase 1 Sprint B tests passed!' : '⚠️  Some tests failed'}`);

      // Cleanup
      await this.cleanup();

      return {
        success,
        results,
        errors,
        performance
      };

    } catch {
      console.error('💥 Integration test crashed:', error);
      await this.cleanup();
      
      return {
        success: false,
        results: {},
        errors: [`Test crashed: ${error}`],
        performance: {
          totalDuration: Date.now() - startTime,
          testsPassed: 0,
          testsTotal: 0,
          successRate: 0
        }
      };
    }
  }

  private async cleanup(): Promise<void> {
    try {
      // Cleanup project state
      projectStateMachine.destroy(demoProject.id);
      
      // Cleanup agent pool (would unregister agents in real implementation)
      console.log('🧹 Cleanup completed');
    } catch {
      console.warn('Cleanup warning:', error);
    }
  }
}

// Export for use in other modules
export { demoProject, demoAgents, demoTasks };

// CLI interface
export async function runPhase1Integration(): Promise<void> {
  const integration = new Phase1Integration();
  await integration.runComprehensiveTest();
}

// Run test if called directly
if (require.main === module) {
  runPhase1Integration().catch(console.error);
}