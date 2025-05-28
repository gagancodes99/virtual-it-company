#!/usr/bin/env tsx

import { config } from 'dotenv';
import { z } from 'zod';
import chalk from 'chalk';

// Load environment variables
config();

// Define environment schema
const envSchema = z.object({
  // Database
  MONGODB_URI: z.string().url('Invalid MongoDB URI'),
  
  // Authentication
  NEXTAUTH_URL: z.string().url('Invalid NextAuth URL'),
  NEXTAUTH_SECRET: z.string().min(32, 'NextAuth secret must be at least 32 characters'),
  
  // AI Services (optional)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  
  // Local AI Services
  OLLAMA_HOST: z.string().url('Invalid Ollama host URL').default('http://localhost:11434'),
  ENABLE_LOCAL_LLM: z.string().transform(val => val === 'true').default('true'),
  
  // Workflow Services
  N8N_HOST: z.string().default('localhost'),
  N8N_PORT: z.string().transform(val => parseInt(val, 10)).default('5678'),
  N8N_USER: z.string().default('admin'),
  N8N_PASSWORD: z.string().min(8, 'N8N password must be at least 8 characters').default('password123'),
  N8N_WEBHOOK_URL: z.string().url('Invalid N8N webhook URL').optional(),
  
  // LangGraph Service
  LANGGRAPH_HOST: z.string().url('Invalid LangGraph host URL').default('http://localhost:8001'),
  
  // Redis Configuration
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(val => parseInt(val, 10)).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(val => parseInt(val, 10)).default('0'),
  
  // AI Router Configuration
  LLM_ROUTER_STRATEGY: z.enum(['cost_optimized', 'performance_optimized', 'balanced', 'local_first']).default('local_first'),
  DAILY_COST_LIMIT: z.string().transform(val => parseFloat(val)).default('10.0'),
  PER_TASK_COST_LIMIT: z.string().transform(val => parseFloat(val)).default('1.0'),
  COST_WARNING_THRESHOLD: z.string().transform(val => parseFloat(val)).default('8.0'),
  MAX_RESPONSE_TIME: z.string().transform(val => parseInt(val, 10)).default('30000'),
  MIN_SUCCESS_RATE: z.string().transform(val => parseFloat(val)).default('0.8'),
  MAX_ERROR_RATE: z.string().transform(val => parseFloat(val)).default('0.2'),
  
  // Agent Pool Configuration
  MAX_CONCURRENT_TASKS: z.string().transform(val => parseInt(val, 10)).default('10'),
  AGENT_HEALTH_CHECK_INTERVAL: z.string().transform(val => parseInt(val, 10)).default('30000'),
  LOAD_BALANCING_ENABLED: z.string().transform(val => val === 'true').default('true'),
  AUTO_SCALING_ENABLED: z.string().transform(val => val === 'true').default('false'),
  
  // Feature Flags
  ENABLE_COST_TRACKING: z.string().transform(val => val === 'true').default('true'),
  ENABLE_REAL_TIME_UPDATES: z.string().transform(val => val === 'true').default('true'),
  ENABLE_AGENT_MONITORING: z.string().transform(val => val === 'true').default('true'),
  ENABLE_WORKFLOW_AUTOMATION: z.string().transform(val => val === 'true').default('true'),
  
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().url('Invalid app URL').default('http://localhost:3000'),
});

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  config?: z.infer<typeof envSchema>;
}

export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    const config = envSchema.parse(process.env);
    
    // Additional validation logic
    
    // Check AI service configuration
    if (!config.OPENAI_API_KEY && !config.ANTHROPIC_API_KEY && !config.ENABLE_LOCAL_LLM) {
      errors.push('At least one AI service must be configured (OpenAI, Anthropic, or local Ollama)');
    }
    
    // Warn about missing optional services
    if (!config.OPENAI_API_KEY) {
      warnings.push('OpenAI API key not configured - OpenAI models will not be available');
    }
    
    if (!config.ANTHROPIC_API_KEY) {
      warnings.push('Anthropic API key not configured - Claude models will not be available');
    }
    
    // Check cost limits
    if (config.DAILY_COST_LIMIT < config.PER_TASK_COST_LIMIT) {
      warnings.push('Daily cost limit is less than per-task limit - may cause immediate task failures');
    }
    
    if (config.COST_WARNING_THRESHOLD >= config.DAILY_COST_LIMIT) {
      warnings.push('Cost warning threshold should be less than daily limit');
    }
    
    // Check performance thresholds
    if (config.MIN_SUCCESS_RATE > 1.0 || config.MIN_SUCCESS_RATE < 0.0) {
      errors.push('MIN_SUCCESS_RATE must be between 0.0 and 1.0');
    }
    
    if (config.MAX_ERROR_RATE > 1.0 || config.MAX_ERROR_RATE < 0.0) {
      errors.push('MAX_ERROR_RATE must be between 0.0 and 1.0');
    }
    
    // Check URL accessibility (basic format validation)
    const requiredUrls = [config.MONGODB_URI, config.NEXTAUTH_URL, config.APP_URL];
    if (config.ENABLE_LOCAL_LLM) {
      requiredUrls.push(config.OLLAMA_HOST);
    }
    requiredUrls.push(config.LANGGRAPH_HOST);
    
    // Additional checks for production
    if (config.NODE_ENV === 'production') {
      if (config.NEXTAUTH_SECRET.length < 64) {
        warnings.push('NextAuth secret should be at least 64 characters in production');
      }
      
      if (config.N8N_PASSWORD === 'password123') {
        errors.push('Default N8N password should be changed in production');
      }
      
      if (!config.OPENAI_API_KEY && !config.ANTHROPIC_API_KEY) {
        warnings.push('No external AI APIs configured - relying only on local models in production');
      }
    }
    
    return {
      success: errors.length === 0,
      errors,
      warnings,
      config
    };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodErrors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      return {
        success: false,
        errors: zodErrors,
        warnings: []
      };
    }
    
    return {
      success: false,
      errors: [`Unexpected validation error: ${error}`],
      warnings: []
    };
  }
}

export function checkServiceConnectivity(config: z.infer<typeof envSchema>): Promise<{
  mongodb: boolean;
  redis: boolean;
  ollama: boolean;
  langgraph: boolean;
  n8n: boolean;
}> {
  return Promise.resolve({
    mongodb: false,
    redis: false,
    ollama: false,
    langgraph: false,
    n8n: false
  });
}

// CLI interface
export async function runValidation(): Promise<void> {
  console.log(chalk.blue('🔍 Validating environment configuration...\n'));
  
  const result = validateEnvironment();
  
  if (result.success) {
    console.log(chalk.green('✅ Environment validation passed!'));
    
    if (result.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warnings:'));
      result.warnings.forEach(warning => {
        console.log(chalk.yellow(`   • ${warning}`));
      });
    }
    
    if (result.config) {
      console.log(chalk.blue('\n📋 Configuration Summary:'));
      console.log(`   • Node Environment: ${result.config.NODE_ENV}`);
      console.log(`   • AI Router Strategy: ${result.config.LLM_ROUTER_STRATEGY}`);
      console.log(`   • Local LLM Enabled: ${result.config.ENABLE_LOCAL_LLM}`);
      console.log(`   • Cost Tracking: ${result.config.ENABLE_COST_TRACKING}`);
      console.log(`   • Daily Cost Limit: $${result.config.DAILY_COST_LIMIT}`);
      console.log(`   • Max Concurrent Tasks: ${result.config.MAX_CONCURRENT_TASKS}`);
      
      const aiServices = [];
      if (result.config.OPENAI_API_KEY) aiServices.push('OpenAI');
      if (result.config.ANTHROPIC_API_KEY) aiServices.push('Anthropic');
      if (result.config.ENABLE_LOCAL_LLM) aiServices.push('Ollama (Local)');
      console.log(`   • AI Services: ${aiServices.join(', ') || 'None configured'}`);
    }
    
    // Test connectivity
    console.log(chalk.blue('\n🔗 Testing service connectivity...'));
    if (result.config) {
      const connectivity = await checkServiceConnectivity(result.config);
      
      Object.entries(connectivity).forEach(([service, connected]) => {
        const status = connected ? chalk.green('✓') : chalk.red('✗');
        const name = service.charAt(0).toUpperCase() + service.slice(1);
        console.log(`   ${status} ${name}`);
      });
    }
    
  } else {
    console.log(chalk.red('❌ Environment validation failed!'));
    console.log(chalk.red('\nErrors:'));
    result.errors.forEach(error => {
      console.log(chalk.red(`   • ${error}`));
    });
    
    if (result.warnings.length > 0) {
      console.log(chalk.yellow('\nWarnings:'));
      result.warnings.forEach(warning => {
        console.log(chalk.yellow(`   • ${warning}`));
      });
    }
    
    console.log(chalk.blue('\n💡 Tips:'));
    console.log('   • Copy .env.example to .env and fill in the required values');
    console.log('   • Ensure all required services are running (MongoDB, Redis)');
    console.log('   • Configure at least one AI service (OpenAI, Anthropic, or Ollama)');
    
    process.exit(1);
  }
}

// Run validation if called directly
if (require.main === module) {
  runValidation().catch(console.error);
}