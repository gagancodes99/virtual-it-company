import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'ollama';
  model: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  baseURL?: string;
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  duration: number;
  model: string;
  provider: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export abstract class BaseLLMClient {
  protected config: LLMConfig;
  
  constructor(config: LLMConfig) {
    this.config = config;
  }

  abstract chat(messages: LLMMessage[]): Promise<LLMResponse>;
  abstract stream(messages: LLMMessage[]): AsyncIterable<string>;
  abstract calculateCost(usage: any): number;
}

export class OpenAIClient extends BaseLLMClient {
  private client: OpenAI;

  constructor(config: LLMConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      baseURL: config.baseURL
    });
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const startTime = Date.now();
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens ?? 2000,
      });

      const duration = Date.now() - startTime;
      const usage = response.usage!;
      const cost = this.calculateCost(usage);

      return {
        content: response.choices[0]?.message?.content || '',
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens
        },
        cost,
        duration,
        model: this.config.model,
        provider: 'openai'
      };
    } catch {
      throw new Error(`OpenAI API error: ${error}`);
    }
  }

  async *stream(messages: LLMMessage[]): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: this.config.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: this.config.temperature ?? 0.7,
      max_tokens: this.config.maxTokens ?? 2000,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }
  }

  calculateCost(usage: any): number {
    const model = this.config.model;
    
    // GPT-4 pricing (per 1k tokens)
    if (model.includes('gpt-4')) {
      const inputCost = (usage.prompt_tokens / 1000) * 0.03;
      const outputCost = (usage.completion_tokens / 1000) * 0.06;
      return inputCost + outputCost;
    }
    
    // GPT-3.5 pricing
    if (model.includes('gpt-3.5')) {
      const inputCost = (usage.prompt_tokens / 1000) * 0.0015;
      const outputCost = (usage.completion_tokens / 1000) * 0.002;
      return inputCost + outputCost;
    }

    return 0; // Unknown model
  }
}

export class AnthropicClient extends BaseLLMClient {
  private client: Anthropic;

  constructor(config: LLMConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const startTime = Date.now();
    
    try {
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const userMessages = messages.filter(m => m.role !== 'system');

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens ?? 2000,
        temperature: this.config.temperature ?? 0.7,
        system: systemMessage,
        messages: userMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      });

      const duration = Date.now() - startTime;
      const usage = response.usage;
      const cost = this.calculateCost(usage);

      return {
        content: response.content[0]?.type === 'text' ? response.content[0].text : '',
        usage: {
          promptTokens: usage.input_tokens,
          completionTokens: usage.output_tokens,
          totalTokens: usage.input_tokens + usage.output_tokens
        },
        cost,
        duration,
        model: this.config.model,
        provider: 'anthropic'
      };
    } catch {
      throw new Error(`Anthropic API error: ${error}`);
    }
  }

  async *stream(messages: LLMMessage[]): AsyncIterable<string> {
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const userMessages = messages.filter(m => m.role !== 'system');

    const stream = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens ?? 2000,
      temperature: this.config.temperature ?? 0.7,
      system: systemMessage,
      messages: userMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      stream: true
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }

  calculateCost(usage: any): number {
    const model = this.config.model;
    
    // Claude 3.5 Sonnet pricing (per 1k tokens)
    if (model.includes('claude-3-5-sonnet')) {
      const inputCost = (usage.input_tokens / 1000) * 0.003;
      const outputCost = (usage.output_tokens / 1000) * 0.015;
      return inputCost + outputCost;
    }
    
    // Claude 3 Haiku pricing
    if (model.includes('claude-3-haiku')) {
      const inputCost = (usage.input_tokens / 1000) * 0.00025;
      const outputCost = (usage.output_tokens / 1000) * 0.00125;
      return inputCost + outputCost;
    }

    return 0; // Unknown model
  }
}

export class OllamaClient extends BaseLLMClient {
  private baseURL: string;

  constructor(config: LLMConfig) {
    super(config);
    this.baseURL = config.baseURL || process.env.OLLAMA_HOST || 'http://localhost:11434';
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          stream: false,
          options: {
            temperature: this.config.temperature ?? 0.7,
            num_predict: this.config.maxTokens ?? 2000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      return {
        content: data.message?.content || '',
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        },
        cost: 0, // Ollama is free for local usage
        duration,
        model: this.config.model,
        provider: 'ollama'
      };
    } catch {
      throw new Error(`Ollama connection error: ${error}`);
    }
  }

  async *stream(messages: LLMMessage[]): AsyncIterable<string> {
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        stream: true,
        options: {
          temperature: this.config.temperature ?? 0.7,
          num_predict: this.config.maxTokens ?? 2000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              yield data.message.content;
            }
          } catch (e) {
            // Ignore malformed JSON chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  calculateCost(usage: any): number {
    return 0; // Ollama is free for local usage
  }
}

export class LLMClientFactory {
  static create(config: LLMConfig): BaseLLMClient {
    switch (config.provider) {
      case 'openai':
        return new OpenAIClient(config);
      case 'anthropic':
        return new AnthropicClient(config);
      case 'ollama':
        return new OllamaClient(config);
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }
}

export class CostTracker {
  private static instance: CostTracker;
  private costs: Map<string, number> = new Map();

  static getInstance(): CostTracker {
    if (!CostTracker.instance) {
      CostTracker.instance = new CostTracker();
    }
    return CostTracker.instance;
  }

  addCost(provider: string, model: string, cost: number): void {
    const key = `${provider}:${model}`;
    const currentCost = this.costs.get(key) || 0;
    this.costs.set(key, currentCost + cost);
  }

  getCosts(): Record<string, number> {
    return Object.fromEntries(this.costs);
  }

  getTotalCost(): number {
    return Array.from(this.costs.values()).reduce((sum, cost) => sum + cost, 0);
  }

  resetCosts(): void {
    this.costs.clear();
  }
}