import { BaseLLMClient, LLMClientFactory, LLMMessage, CostTracker } from '../llm/llm-client';
import { IAIAgent } from '@/infrastructure/database/models/AIAgent';

export interface AgentTask {
  id: string;
  type: 'code' | 'design' | 'test' | 'analysis' | 'review' | 'documentation';
  title: string;
  description: string;
  requirements: string[];
  context?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  deadline?: Date;
  projectId: string;
  assignedAgentId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  metadata?: Record<string, any>;
}

export interface AgentResponse {
  taskId: string;
  agentId: string;
  status: 'success' | 'error' | 'partial';
  result: {
    content: string;
    artifacts?: string[];
    suggestions?: string[];
    nextSteps?: string[];
  };
  metadata: {
    duration: number;
    cost: number;
    tokensUsed: number;
    model: string;
    retryCount: number;
  };
  timestamp: Date;
}

export class PromptTemplate {
  private static templates: Map<string, string> = new Map([
    ['system_base', `You are {{agentName}}, a {{agentType}} AI agent specialized in {{specializations}}.

Your capabilities include:
- Languages: {{languages}}
- Frameworks: {{frameworks}}
- Tools: {{tools}}

You are working within working hours: {{workingHours}} ({{timezone}}).
Your response time target is {{responseTime}} seconds.
Current performance: {{tasksCompleted}} tasks completed, {{averageRating}}/5.0 rating.

Always provide:
1. Clear, actionable solutions
2. Code examples when relevant
3. Best practices and considerations
4. Next steps or recommendations

Respond in a professional, helpful manner.`],

    ['code_task', `# Task: {{title}}

## Description
{{description}}

## Requirements
{{requirements}}

## Context
{{context}}

Please provide:
1. **Analysis** of the requirements
2. **Implementation** with clean, well-documented code
3. **Testing** approach and examples
4. **Deployment** considerations
5. **Next Steps** for further development

Focus on:
- Code quality and best practices
- Security considerations
- Performance optimization
- Maintainability`],

    ['design_task', `# Design Task: {{title}}

## Brief
{{description}}

## Requirements
{{requirements}}

## Context
{{context}}

Please provide:
1. **Design Concept** and rationale
2. **User Experience** considerations
3. **Visual Specifications** (colors, typography, layout)
4. **Component Structure** and reusability
5. **Responsive Design** approach
6. **Accessibility** considerations

Deliverables:
- Design mockups or wireframes description
- Style guide specifications
- Component documentation`],

    ['test_task', `# Testing Task: {{title}}

## Description
{{description}}

## Requirements
{{requirements}}

## Context
{{context}}

Please provide:
1. **Test Strategy** overview
2. **Test Cases** (unit, integration, e2e)
3. **Test Implementation** with code examples
4. **Coverage Analysis** and recommendations
5. **Quality Metrics** to track
6. **Automation** approach

Focus on:
- Comprehensive test coverage
- Edge cases and error scenarios
- Performance testing
- Security testing considerations`],

    ['analysis_task', `# Analysis Task: {{title}}

## Objective
{{description}}

## Requirements
{{requirements}}

## Context
{{context}}

Please provide:
1. **Current State Analysis**
2. **Problem Identification** and impact assessment
3. **Solution Options** with pros/cons
4. **Recommendations** with rationale
5. **Implementation Roadmap**
6. **Risk Assessment** and mitigation

Structure your analysis:
- Executive summary
- Detailed findings
- Actionable recommendations`]
  ]);

  static getTemplate(type: string): string {
    return this.templates.get(type) || this.templates.get('system_base')!;
  }

  static renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value));
    }
    return rendered;
  }

  static buildSystemPrompt(agent: IAIAgent): string {
    const template = this.getTemplate('system_base');
    return this.renderTemplate(template, {
      agentName: agent.name,
      agentType: agent.type,
      specializations: agent.capabilities.specializations.join(', '),
      languages: agent.capabilities.languages.join(', '),
      frameworks: agent.capabilities.frameworks.join(', '),
      tools: agent.capabilities.tools.join(', '),
      workingHours: `${agent.settings.workingHours.start}-${agent.settings.workingHours.end}`,
      timezone: agent.settings.workingHours.timezone,
      responseTime: agent.settings.responseTime,
      tasksCompleted: agent.performance.tasksCompleted,
      averageRating: agent.performance.averageRating
    });
  }

  static buildTaskPrompt(task: AgentTask): string {
    const template = this.getTemplate(`${task.type}_task`);
    return this.renderTemplate(template, {
      title: task.title,
      description: task.description,
      requirements: task.requirements.map(req => `- ${req}`).join('\n'),
      context: task.context || 'No additional context provided.'
    });
  }
}

export class AgentExecutor {
  private llmClient: BaseLLMClient;
  private costTracker: CostTracker;
  private maxRetries: number = 3;
  private timeoutMs: number = 30000;

  constructor(private agent: IAIAgent) {
    this.llmClient = LLMClientFactory.create({
      provider: agent.model.provider as 'openai' | 'anthropic' | 'ollama',
      model: agent.model.model,
      temperature: agent.model.temperature,
      maxTokens: agent.model.maxTokens
    });
    this.costTracker = CostTracker.getInstance();
  }

  async executeTask(task: AgentTask): Promise<AgentResponse> {
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < this.maxRetries) {
      try {
        const result = await this.processTask(task);
        const duration = Date.now() - startTime;

        // Update agent performance
        await this.updateAgentPerformance(true, duration);

        return {
          taskId: task.id,
          agentId: this.agent._id.toString(),
          status: 'success',
          result,
          metadata: {
            duration,
            cost: result.cost || 0,
            tokensUsed: result.tokensUsed || 0,
            model: this.agent.model.model,
            retryCount
          },
          timestamp: new Date()
        };
      } catch {
        lastError = error as Error;
        retryCount++;
        
        if (retryCount < this.maxRetries) {
          await this.delay(Math.pow(2, retryCount) * 1000); // Exponential backoff
        }
      }
    }

    // All retries failed
    const duration = Date.now() - startTime;
    await this.updateAgentPerformance(false, duration);

    return {
      taskId: task.id,
      agentId: this.agent._id.toString(),
      status: 'error',
      result: {
        content: `Task failed after ${retryCount} attempts: ${lastError?.message}`,
        artifacts: [],
        suggestions: ['Review task requirements', 'Check agent configuration', 'Try with different model'],
        nextSteps: ['Reassign to different agent', 'Break down into smaller tasks']
      },
      metadata: {
        duration,
        cost: 0,
        tokensUsed: 0,
        model: this.agent.model.model,
        retryCount
      },
      timestamp: new Date()
    };
  }

  private async processTask(task: AgentTask): Promise<{
    content: string;
    artifacts?: string[];
    suggestions?: string[];
    nextSteps?: string[];
    cost?: number;
    tokensUsed?: number;
  }> {
    // Build conversation
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: PromptTemplate.buildSystemPrompt(this.agent)
      },
      {
        role: 'user',
        content: PromptTemplate.buildTaskPrompt(task)
      }
    ];

    // Execute with timeout
    const response = await Promise.race([
      this.llmClient.chat(messages),
      this.createTimeoutPromise()
    ]);

    if (!response || typeof response === 'string') {
      throw new Error('Task execution timed out');
    }

    // Track costs
    this.costTracker.addCost(
      this.agent.model.provider,
      this.agent.model.model,
      response.cost
    );

    // Parse response
    const parsed = this.parseResponse(response.content, task.type);

    return {
      ...parsed,
      cost: response.cost,
      tokensUsed: response.usage.totalTokens
    };
  }

  private parseResponse(content: string, taskType: string): {
    content: string;
    artifacts?: string[];
    suggestions?: string[];
    nextSteps?: string[];
  } {
    // Extract code blocks as artifacts
    const codeBlockRegex = /```[\s\S]*?```/g;
    const artifacts = content.match(codeBlockRegex) || [];

    // Extract suggestions (look for bullet points after "suggestions" or "recommendations")
    const suggestionsRegex = /(?:suggestions|recommendations|consider):?\s*\n((?:\s*[-*•]\s*.*\n?)*)/gi;
    const suggestionsMatch = content.match(suggestionsRegex);
    const suggestions = suggestionsMatch?.[0]
      ?.split('\n')
      .filter(line => line.trim().match(/^[-*•]/))
      .map(line => line.replace(/^[-*•]\s*/, '').trim()) || [];

    // Extract next steps
    const nextStepsRegex = /(?:next steps|next|todo|action items):?\s*\n((?:\s*[-*•]\s*.*\n?)*)/gi;
    const nextStepsMatch = content.match(nextStepsRegex);
    const nextSteps = nextStepsMatch?.[0]
      ?.split('\n')
      .filter(line => line.trim().match(/^[-*•]/))
      .map(line => line.replace(/^[-*•]\s*/, '').trim()) || [];

    return {
      content,
      artifacts: artifacts.length > 0 ? artifacts : undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      nextSteps: nextSteps.length > 0 ? nextSteps : undefined
    };
  }

  private async updateAgentPerformance(success: boolean, duration: number): Promise<void> {
    // Update agent metrics (would integrate with database in real implementation)
    const newTaskCount = this.agent.performance.tasksCompleted + 1;
    const currentAvgTime = this.agent.performance.responseTimeMs;
    const newAvgTime = ((currentAvgTime * this.agent.performance.tasksCompleted) + duration) / newTaskCount;

    // Update reliability based on success rate
    const currentReliability = this.agent.performance.reliability;
    const newReliability = success 
      ? Math.min(1.0, currentReliability + 0.01)
      : Math.max(0.0, currentReliability - 0.05);

    // Note: In real implementation, these would be persisted to database
    this.agent.performance.tasksCompleted = newTaskCount;
    this.agent.performance.responseTimeMs = newAvgTime;
    this.agent.performance.reliability = newReliability;
    this.agent.performance.lastActive = new Date();
  }

  private createTimeoutPromise(): Promise<string> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Execution timeout')), this.timeoutMs);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async streamTask(task: AgentTask): AsyncIterable<string> {
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: PromptTemplate.buildSystemPrompt(this.agent)
      },
      {
        role: 'user',
        content: PromptTemplate.buildTaskPrompt(task)
      }
    ];

    try {
      for await (const chunk of this.llmClient.stream(messages)) {
        yield chunk;
      }
    } catch {
      yield `Error: ${error}`;
    }
  }

  // Utility methods
  isAvailable(): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const startHour = parseInt(this.agent.settings.workingHours.start.split(':')[0]);
    const endHour = parseInt(this.agent.settings.workingHours.end.split(':')[0]);
    
    return currentHour >= startHour && currentHour < endHour;
  }

  getWorkloadCapacity(): number {
    return this.agent.settings.maxConcurrentTasks;
  }

  canHandleTask(task: AgentTask): boolean {
    // Check if agent has required skills for task
    const taskSkills = task.requirements.map(req => req.toLowerCase());
    const agentSkills = [
      ...this.agent.capabilities.languages,
      ...this.agent.capabilities.frameworks,
      ...this.agent.capabilities.specializations,
      ...this.agent.capabilities.tools
    ].map(skill => skill.toLowerCase());

    // Require at least 50% skill match
    const matchedSkills = taskSkills.filter(skill => 
      agentSkills.some(agentSkill => agentSkill.includes(skill) || skill.includes(agentSkill))
    );

    return matchedSkills.length >= taskSkills.length * 0.5;
  }
}

// Task validation utilities
export class TaskValidator {
  static validate(task: AgentTask): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!task.title?.trim()) {
      errors.push('Task title is required');
    }

    if (!task.description?.trim()) {
      errors.push('Task description is required');
    }

    if (!task.requirements?.length) {
      errors.push('Task requirements are required');
    }

    if (!task.projectId?.trim()) {
      errors.push('Project ID is required');
    }

    if (!['code', 'design', 'test', 'analysis', 'review', 'documentation'].includes(task.type)) {
      errors.push('Invalid task type');
    }

    if (!['low', 'medium', 'high', 'critical'].includes(task.priority)) {
      errors.push('Invalid priority level');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export { AgentExecutor as default };