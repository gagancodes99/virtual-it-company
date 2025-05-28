import { BaseLLMClient, LLMClientFactory, LLMConfig, LLMMessage, CostTracker } from '../llm/llm-client';
import { AgentTask } from '../execution/agent-executor';

export interface RouterConfig {
  strategy: 'cost_optimized' | 'performance_optimized' | 'balanced' | 'local_first';
  fallbackChain: string[];
  costLimits: {
    dailyLimit: number;
    perTaskLimit: number;
    warningThreshold: number;
  };
  performanceThresholds: {
    maxResponseTime: number;
    minSuccessRate: number;
    maxErrorRate: number;
  };
  modelPreferences: {
    [taskType: string]: string[];
  };
}

export interface ModelMetrics {
  provider: string;
  model: string;
  successRate: number;
  averageResponseTime: number;
  averageCost: number;
  errorRate: number;
  totalRequests: number;
  lastUsed: Date;
  isAvailable: boolean;
}

export interface RoutingDecision {
  selectedProvider: string;
  selectedModel: string;
  reason: string;
  alternatives: string[];
  estimatedCost: number;
  expectedPerformance: number;
  fallbackPosition: number;
}

export class LLMRouter {
  private clients: Map<string, BaseLLMClient> = new Map();
  private metrics: Map<string, ModelMetrics> = new Map();
  private costTracker: CostTracker;
  private circuitBreakers: Map<string, {
    failures: number;
    lastFailure: Date;
    isOpen: boolean;
  }> = new Map();

  constructor(private config: RouterConfig) {
    this.costTracker = CostTracker.getInstance();
    this.initializeClients();
    this.initializeMetrics();
  }

  private initializeClients(): void {
    // Initialize Ollama (local, free)
    try {
    // const ollamaClient = LLMClientFactory.create({
        provider: 'ollama',
        model: 'llama2',
        baseURL: process.env.OLLAMA_HOST || 'http://localhost:11434'
      });
      this.clients.set('ollama:llama2', ollamaClient);
      
      // Add more Ollama models if available
      const ollamaModels = ['codellama', 'mistral', 'llama2:13b'];
      ollamaModels.forEach(model => {
        try {
          const client = LLMClientFactory.create({
            provider: 'ollama',
            model,
            baseURL: process.env.OLLAMA_HOST || 'http://localhost:11434'
          });
          this.clients.set(`ollama:${model}`, client);
        } catch {
          console.warn(`Failed to initialize Ollama model ${model}:`, error);
        }
      });
    } catch {
      console.warn('Ollama not available:', error);
    }

    // Initialize OpenAI (if API key available)
    if (process.env.OPENAI_API_KEY) {
      try {
        const openaiModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'];
        openaiModels.forEach(model => {
          const client = LLMClientFactory.create({
            provider: 'openai',
            model,
            apiKey: process.env.OPENAI_API_KEY
          });
          this.clients.set(`openai:${model}`, client);
        });
      } catch {
        console.warn('OpenAI initialization failed:', error);
      }
    }

    // Initialize Anthropic (if API key available)
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropicModels = ['claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022'];
        anthropicModels.forEach(model => {
          const client = LLMClientFactory.create({
            provider: 'anthropic',
            model,
            apiKey: process.env.ANTHROPIC_API_KEY
          });
          this.clients.set(`anthropic:${model}`, client);
        });
      } catch {
        console.warn('Anthropic initialization failed:', error);
      }
    }

    console.log(`Initialized ${this.clients.size} LLM clients`);
  }

  private initializeMetrics(): void {
    // Initialize metrics for each available client
    this.clients.forEach((client, key) => {
      const [provider, model] = key.split(':');
      this.metrics.set(key, {
        provider,
        model,
        successRate: 1.0,
        averageResponseTime: 1000,
        averageCost: provider === 'ollama' ? 0 : 0.01,
        errorRate: 0,
        totalRequests: 0,
        lastUsed: new Date(),
        isAvailable: true
      });
    });
  }

  async route(
    messages: LLMMessage[],
    task?: AgentTask,
    preferences?: Partial<RouterConfig>
  ): Promise<LLMResponse & { routingDecision: RoutingDecision }> {
    const routingDecision = this.selectModel(messages, task, preferences);
    const clientKey = `${routingDecision.selectedProvider}:${routingDecision.selectedModel}`;
    
    let lastError: Error | null = null;
    
    // Try selected model and fallbacks
    const modelsToTry = [
      `${routingDecision.selectedProvider}:${routingDecision.selectedModel}`,
      ...routingDecision.alternatives
    ];

    for (const modelKey of modelsToTry) {
      const client = this.clients.get(modelKey);
      if (!client || this.isCircuitBreakerOpen(modelKey)) {
        continue;
      }

      try {
        const startTime = Date.now();
        
        // Check cost limits before making request
        if (!this.checkCostLimits(modelKey, routingDecision.estimatedCost)) {
          console.warn(`Cost limit exceeded for ${modelKey}, trying next option`);
          continue;
        }

        const response = await client.chat(messages);
        const duration = Date.now() - startTime;

        // Update metrics
        this.updateMetrics(modelKey, true, duration, response.cost);
        this.resetCircuitBreaker(modelKey);

        // Track cost
        this.costTracker.addCost(
          routingDecision.selectedProvider,
          routingDecision.selectedModel,
          response.cost
        );

        return {
          ...response,
          routingDecision: {
            ...routingDecision,
            selectedProvider: modelKey.split(':')[0],
            selectedModel: modelKey.split(':')[1]
          }
        };

      } catch {
        lastError = error as Error;
        console.warn(`Model ${modelKey} failed:`, error);
        
        this.updateMetrics(modelKey, false, 0, 0);
        this.updateCircuitBreaker(modelKey);
      }
    }

    // All models failed
    throw new Error(`All models failed. Last error: ${lastError?.message}`);
  }

  private selectModel(
    messages: LLMMessage[],
    task?: AgentTask,
    preferences?: Partial<RouterConfig>
  ): RoutingDecision {
    const strategy = preferences?.strategy || this.config.strategy;
    const complexity = this.estimateComplexity(messages, task);
    const availableModels = this.getAvailableModels();

    let rankedModels: Array<{ key: string; score: number; cost: number }> = [];

    switch (strategy) {
      case 'cost_optimized':
        rankedModels = this.rankByCost(availableModels, complexity);
        break;
      case 'performance_optimized':
        rankedModels = this.rankByPerformance(availableModels, complexity);
        break;
      case 'local_first':
        rankedModels = this.rankLocalFirst(availableModels, complexity);
        break;
      case 'balanced':
      default:
        rankedModels = this.rankBalanced(availableModels, complexity);
        break;
    }

    if (rankedModels.length === 0) {
      throw new Error('No available models for routing');
    }

    const selected = rankedModels[0];
    const [provider, model] = selected.key.split(':');

    return {
      selectedProvider: provider,
      selectedModel: model,
      reason: this.getSelectionReason(strategy, selected, complexity),
      alternatives: rankedModels.slice(1, 4).map(m => m.key),
      estimatedCost: selected.cost,
      expectedPerformance: this.getExpectedPerformance(selected.key),
      fallbackPosition: 0
    };
  }

  private estimateComplexity(messages: LLMMessage[], task?: AgentTask): number {
    let complexity = 1;

    // Base complexity on message length
    const totalLength = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    complexity += Math.min(totalLength / 1000, 5);

    // Task-specific complexity
    if (task) {
      switch (task.type) {
        case 'code':
          complexity += 3;
          break;
        case 'analysis':
          complexity += 2;
          break;
        case 'design':
          complexity += 2;
          break;
        case 'test':
          complexity += 1;
          break;
        case 'documentation':
          complexity += 1;
          break;
      }

      // Priority affects complexity
      const priorityBonus = {
        'critical': 2,
        'high': 1,
        'medium': 0,
        'low': -1
      };
      complexity += priorityBonus[task.priority] || 0;
    }

    return Math.max(1, Math.min(complexity, 10));
  }

  private getAvailableModels(): string[] {
    return Array.from(this.clients.keys()).filter(key => {
      const metrics = this.metrics.get(key);
      return metrics?.isAvailable && !this.isCircuitBreakerOpen(key);
    });
  }

  private rankByCost(models: string[], complexity: number): Array<{ key: string; score: number; cost: number }> {
    return models.map(key => {
      const metrics = this.metrics.get(key)!;
      const estimatedCost = this.estimateCost(key, complexity);
      
      // Score: lower cost = higher score
      const costScore = metrics.provider === 'ollama' ? 100 : (1 / (estimatedCost + 0.001)) * 10;
      const reliabilityScore = metrics.successRate * 50;
      
      return {
        key,
        score: costScore + reliabilityScore,
        cost: estimatedCost
      };
    }).sort((a, b) => b.score - a.score);
  }

  private rankByPerformance(models: string[], complexity: number): Array<{ key: string; score: number; cost: number }> {
    return models.map(key => {
      const metrics = this.metrics.get(key)!;
      const estimatedCost = this.estimateCost(key, complexity);
      
      // Score: better performance = higher score
      const speedScore = Math.max(0, (5000 - metrics.averageResponseTime) / 100);
      const reliabilityScore = metrics.successRate * 100;
      const qualityScore = this.getModelQualityScore(key, complexity);
      
      return {
        key,
        score: speedScore + reliabilityScore + qualityScore,
        cost: estimatedCost
      };
    }).sort((a, b) => b.score - a.score);
  }

  private rankLocalFirst(models: string[], complexity: number): Array<{ key: string; score: number; cost: number }> {
    return models.map(key => {
      const metrics = this.metrics.get(key)!;
      const estimatedCost = this.estimateCost(key, complexity);
      
      // Heavily favor local models
      const localBonus = metrics.provider === 'ollama' ? 1000 : 0;
      const reliabilityScore = metrics.successRate * 50;
      const qualityScore = this.getModelQualityScore(key, complexity);
      
      return {
        key,
        score: localBonus + reliabilityScore + qualityScore,
        cost: estimatedCost
      };
    }).sort((a, b) => b.score - a.score);
  }

  private rankBalanced(models: string[], complexity: number): Array<{ key: string; score: number; cost: number }> {
    return models.map(key => {
      const metrics = this.metrics.get(key)!;
      const estimatedCost = this.estimateCost(key, complexity);
      
      // Balanced scoring
      const costScore = metrics.provider === 'ollama' ? 30 : Math.max(0, (0.05 - estimatedCost) * 1000);
      const speedScore = Math.max(0, (3000 - metrics.averageResponseTime) / 100);
      const reliabilityScore = metrics.successRate * 40;
      const qualityScore = this.getModelQualityScore(key, complexity) * 0.5;
      
      return {
        key,
        score: costScore + speedScore + reliabilityScore + qualityScore,
        cost: estimatedCost
      };
    }).sort((a, b) => b.score - a.score);
  }

  private getModelQualityScore(modelKey: string, complexity: number): number {
    const [provider, model] = modelKey.split(':');
    
    // Quality ratings based on model capabilities
    const qualityMap: { [key: string]: number } = {
      'openai:gpt-4': 95,
      'openai:gpt-4-turbo': 90,
      'anthropic:claude-3-5-sonnet-20241022': 92,
      'anthropic:claude-3-haiku-20240307': 80,
      'openai:gpt-3.5-turbo': 75,
      'ollama:codellama': complexity <= 7 ? 85 : 70,
      'ollama:llama2': complexity <= 5 ? 75 : 60,
      'ollama:mistral': complexity <= 6 ? 80 : 65,
    };

    return qualityMap[modelKey] || 50;
  }

  private estimateCost(modelKey: string, complexity: number): number {
    const [provider, model] = modelKey.split(':');
    
    if (provider === 'ollama') return 0;
    
    // Estimate tokens based on complexity (rough approximation)
    const estimatedTokens = Math.max(500, complexity * 200);
    
    // Cost per 1k tokens (simplified)
    const costMap: { [key: string]: { input: number; output: number } } = {
      'openai:gpt-4': { input: 0.03, output: 0.06 },
      'openai:gpt-4-turbo': { input: 0.01, output: 0.03 },
      'openai:gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'anthropic:claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
      'anthropic:claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
    };

    const costs = costMap[modelKey];
    if (!costs) return 0.01;

    const inputCost = (estimatedTokens * 0.7 / 1000) * costs.input;
    const outputCost = (estimatedTokens * 0.3 / 1000) * costs.output;
    
    return inputCost + outputCost;
  }

  private getSelectionReason(strategy: string, selected: any, complexity: number): string {
    const [provider, model] = selected.key.split(':');
    
    switch (strategy) {
      case 'cost_optimized':
        return `Selected ${provider}:${model} for optimal cost ($${selected.cost.toFixed(4)}) with complexity ${complexity}`;
      case 'performance_optimized':
        return `Selected ${provider}:${model} for best performance (score: ${selected.score.toFixed(1)})`;
      case 'local_first':
        return provider === 'ollama' 
          ? `Selected local ${model} to minimize latency and cost`
          : `Selected ${provider}:${model} as local models unavailable`;
      default:
        return `Selected ${provider}:${model} for balanced cost/performance (score: ${selected.score.toFixed(1)})`;
    }
  }

  private checkCostLimits(modelKey: string, estimatedCost: number): boolean {
    const totalCost = this.costTracker.getTotalCost();
    
    // Check daily limit
    if (totalCost + estimatedCost > this.config.costLimits.dailyLimit) {
      return false;
    }
    
    // Check per-task limit
    if (estimatedCost > this.config.costLimits.perTaskLimit) {
      return false;
    }
    
    return true;
  }

  private updateMetrics(modelKey: string, success: boolean, duration: number, cost: number): void {
    const metrics = this.metrics.get(modelKey);
    if (!metrics) return;

    metrics.totalRequests++;
    metrics.lastUsed = new Date();

    if (success) {
      // Update success rate (exponential moving average)
      metrics.successRate = metrics.successRate * 0.9 + 0.1;
      
      // Update average response time
      metrics.averageResponseTime = metrics.averageResponseTime * 0.8 + duration * 0.2;
      
      // Update average cost
      if (cost > 0) {
        metrics.averageCost = metrics.averageCost * 0.8 + cost * 0.2;
      }
    } else {
      // Update error rate
      metrics.errorRate = metrics.errorRate * 0.9 + 0.1;
      metrics.successRate = Math.max(0, metrics.successRate * 0.95);
    }
  }

  private isCircuitBreakerOpen(modelKey: string): boolean {
    const breaker = this.circuitBreakers.get(modelKey);
    if (!breaker) return false;

    // Circuit breaker opens after 5 failures
    if (breaker.failures >= 5) {
      // Stay open for 5 minutes
      if (Date.now() - breaker.lastFailure.getTime() > 5 * 60 * 1000) {
        breaker.isOpen = false;
        breaker.failures = 0;
      }
      return breaker.isOpen;
    }

    return false;
  }

  private updateCircuitBreaker(modelKey: string): void {
    const breaker = this.circuitBreakers.get(modelKey) || {
      failures: 0,
      lastFailure: new Date(),
      isOpen: false
    };

    breaker.failures++;
    breaker.lastFailure = new Date();
    
    if (breaker.failures >= 5) {
      breaker.isOpen = true;
      console.warn(`Circuit breaker opened for ${modelKey} after ${breaker.failures} failures`);
    }

    this.circuitBreakers.set(modelKey, breaker);
  }

  private resetCircuitBreaker(modelKey: string): void {
    this.circuitBreakers.delete(modelKey);
  }

  private getExpectedPerformance(modelKey: string): number {
    const metrics = this.metrics.get(modelKey);
    return metrics ? metrics.successRate * 100 : 50;
  }

  // Public methods for monitoring and management
  getMetrics(): Map<string, ModelMetrics> {
    return new Map(this.metrics);
  }

  getHealthStatus(): {
    totalModels: number;
    availableModels: number;
    circuitBreakersOpen: number;
    totalCost: number;
  } {
    const available = Array.from(this.metrics.values()).filter(m => m.isAvailable).length;
    const circuitBreakersOpen = Array.from(this.circuitBreakers.values()).filter(cb => cb.isOpen).length;
    
    return {
      totalModels: this.metrics.size,
      availableModels: available,
      circuitBreakersOpen,
      totalCost: this.costTracker.getTotalCost()
    };
  }

  async testModel(modelKey: string): Promise<boolean> {
    const client = this.clients.get(modelKey);
    if (!client) return false;

    try {
      await client.chat([{ role: 'user', content: 'Hello, this is a health check.' }]);
      return true;
    } catch {
      console.warn(`Model ${modelKey} health check failed:`, error);
      return false;
    }
  }
}

// Default configuration
export const createDefaultRouterConfig = (): RouterConfig => ({
  strategy: (process.env.LLM_ROUTER_STRATEGY as any) || 'local_first',
  fallbackChain: ['ollama:llama2', 'openai:gpt-3.5-turbo', 'anthropic:claude-3-haiku-20240307'],
  costLimits: {
    dailyLimit: parseFloat(process.env.DAILY_COST_LIMIT || '10.0'),
    perTaskLimit: parseFloat(process.env.PER_TASK_COST_LIMIT || '1.0'),
    warningThreshold: parseFloat(process.env.COST_WARNING_THRESHOLD || '8.0')
  },
  performanceThresholds: {
    maxResponseTime: parseInt(process.env.MAX_RESPONSE_TIME || '30000'),
    minSuccessRate: parseFloat(process.env.MIN_SUCCESS_RATE || '0.8'),
    maxErrorRate: parseFloat(process.env.MAX_ERROR_RATE || '0.2')
  },
  modelPreferences: {
    'code': ['ollama:codellama', 'openai:gpt-4', 'anthropic:claude-3-5-sonnet-20241022'],
    'analysis': ['anthropic:claude-3-5-sonnet-20241022', 'openai:gpt-4', 'ollama:llama2'],
    'design': ['openai:gpt-4', 'anthropic:claude-3-5-sonnet-20241022', 'ollama:llama2'],
    'test': ['ollama:codellama', 'openai:gpt-3.5-turbo', 'ollama:llama2'],
    'documentation': ['openai:gpt-3.5-turbo', 'ollama:llama2', 'anthropic:claude-3-haiku-20240307']
  }
});