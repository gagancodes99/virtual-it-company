# Configuration Guide

## Table of Contents

1. [Configuration Overview](#configuration-overview)
2. [Environment Variables](#environment-variables)
3. [Service Configuration](#service-configuration)
4. [AI Model Configuration](#ai-model-configuration)
5. [Security Configuration](#security-configuration)
6. [Performance Tuning](#performance-tuning)
7. [Feature Flags](#feature-flags)
8. [Troubleshooting Configuration](#troubleshooting-configuration)

## Configuration Overview

The Virtual IT Company Platform uses a layered configuration approach that supports multiple environments and deployment scenarios.

### Configuration Hierarchy

```mermaid
graph TD
    A[Default Config] --> B[Environment Config]
    B --> C[Local Overrides]
    C --> D[Runtime Config]
    
    E[.env.defaults] --> A
    F[.env.production] --> B
    G[.env.local] --> C
    H[Environment Variables] --> D
```

### Configuration Files

| File | Purpose | Git Tracked |
|------|---------|-------------|
| `.env.defaults` | Default values for all environments | Yes |
| `.env.development` | Development environment | Yes (template) |
| `.env.production` | Production environment | No |
| `.env.local` | Local overrides | No |
| `config.json` | Static configuration | Yes |
| `secrets.json` | Sensitive data | No |

## Environment Variables

### Core Configuration

```bash
# .env.production
# Application Settings
NODE_ENV=production
APP_NAME="Virtual IT Company Platform"
APP_URL=https://your-domain.com
API_URL=https://api.your-domain.com
PORT=3000

# Security
NEXTAUTH_SECRET=your-64-character-secret-key-here
NEXTAUTH_URL=https://your-domain.com
ENCRYPTION_KEY=your-32-character-encryption-key
JWT_SECRET=your-jwt-secret-key

# Feature Flags
ENABLE_LOCAL_LLM=true
ENABLE_CLOUD_LLM=true
ENABLE_ANALYTICS=true
ENABLE_MONITORING=true
ENABLE_DEBUG_MODE=false
```

### Database Configuration

```bash
# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/vitc
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vitc
DB_USER=vitc_user
DB_PASSWORD=secure_password
DB_SSL=true
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis
REDIS_URL=redis://default:password@localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
REDIS_DB=0
REDIS_KEY_PREFIX=vitc:
```

### AI Services Configuration

```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...
OPENAI_DEFAULT_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=4096
OPENAI_TEMPERATURE=0.7

# Anthropic Claude
CLAUDE_API_KEY=sk-ant-...
CLAUDE_DEFAULT_MODEL=claude-3-haiku-20240307
CLAUDE_MAX_TOKENS=4096

# Ollama (Local)
OLLAMA_HOST=http://localhost:11434
OLLAMA_DEFAULT_MODEL=mistral
OLLAMA_TIMEOUT=300000

# Model Selection
LLM_ROUTER_STRATEGY=cost_optimized # cost_optimized | quality_first | speed_first
LLM_BUDGET_LIMIT=100.00
LLM_FALLBACK_ENABLED=true
```

### Third-Party Services

```bash
# GitHub
GITHUB_TOKEN=ghp_...
GITHUB_ORG=your-org
GITHUB_DEFAULT_BRANCH=main
GITHUB_AUTO_COMMIT=true

# Email (SendGrid)
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@your-domain.com
SENDGRID_FROM_NAME="Virtual IT Company"
SENDGRID_WEBHOOK_SECRET=webhook_secret

# Payment (Stripe)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=usd

# Storage
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=vitc-storage
AWS_REGION=us-east-1
```

## Service Configuration

### n8n Workflow Engine

```bash
# n8n Configuration
N8N_HOST=localhost
N8N_PORT=5678
N8N_PROTOCOL=https
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=secure_password

# n8n Database
N8N_DB_TYPE=postgresdb
N8N_DB_POSTGRESDB_HOST=postgres
N8N_DB_POSTGRESDB_PORT=5432
N8N_DB_POSTGRESDB_DATABASE=n8n
N8N_DB_POSTGRESDB_USER=n8n_user
N8N_DB_POSTGRESDB_PASSWORD=n8n_password

# n8n Performance
N8N_EXECUTIONS_DATA_SAVE_ON_ERROR=all
N8N_EXECUTIONS_DATA_SAVE_ON_SUCCESS=none
N8N_EXECUTIONS_DATA_SAVE_ON_PROGRESS=false
N8N_EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=true
```

### LangGraph Configuration

```python
# config/langgraph.py
LANGGRAPH_CONFIG = {
    "checkpoint_storage": {
        "type": "redis",
        "url": os.getenv("REDIS_URL"),
        "ttl": 3600  # 1 hour
    },
    "execution": {
        "max_steps": 50,
        "timeout": 300,  # 5 minutes
        "retry_attempts": 3,
        "retry_delay": 5
    },
    "state_management": {
        "persist_states": True,
        "state_history_limit": 10,
        "enable_replay": True
    }
}
```

### Agent Pool Configuration

```yaml
# config/agents.yaml
agents:
  project_manager:
    name: "Senior Project Manager"
    model: "claude-3-haiku-20240307"
    temperature: 0.3
    max_concurrent_tasks: 5
    skills:
      - project_planning
      - requirements_analysis
      - timeline_estimation
    
  senior_developer:
    name: "Senior Full-Stack Developer"
    model: "claude-3-5-sonnet-20241022"
    temperature: 0.7
    max_concurrent_tasks: 3
    skills:
      - javascript
      - python
      - architecture_design
      - code_review
    
  qa_engineer:
    name: "QA Engineer"
    model: "ollama:mistral"
    temperature: 0.5
    max_concurrent_tasks: 4
    skills:
      - test_planning
      - automation
      - bug_detection
```

## AI Model Configuration

### Model Selection Matrix

```json
{
  "model_selection": {
    "simple_tasks": {
      "primary": "ollama:mistral",
      "fallback": "claude-3-haiku-20240307",
      "max_cost": 0.50
    },
    "complex_tasks": {
      "primary": "claude-3-5-sonnet-20241022",
      "fallback": "gpt-4o",
      "max_cost": 5.00
    },
    "critical_tasks": {
      "primary": "claude-3-opus-20240229",
      "fallback": "gpt-4",
      "max_cost": 15.00
    }
  }
}
```

### Ollama Model Management

```bash
#!/bin/bash
# scripts/setup-ollama-models.sh

# Model configurations
MODELS=(
  "mistral:latest"
  "codellama:13b"
  "llama2:7b"
  "phi-2:latest"
)

# Pull all models
for model in "${MODELS[@]}"; do
  echo "Pulling $model..."
  docker exec ollama ollama pull $model
done

# Set default model
docker exec ollama ollama cp mistral:latest default
```

### Cost Optimization Settings

```typescript
// config/cost-optimization.ts
export const COST_OPTIMIZATION = {
  // Budget limits per project
  budgetLimits: {
    small: 10.00,
    medium: 50.00,
    large: 200.00,
    enterprise: Infinity
  },
  
  // Cost thresholds for model switching
  costThresholds: {
    switchToLocal: 0.10,      // Switch to local when cost > $0.10
    requireApproval: 50.00,   // Require approval for costs > $50
    hardLimit: 100.00         // Hard stop at $100
  },
  
  // Caching configuration
  caching: {
    enabled: true,
    ttl: 3600,               // 1 hour
    maxSize: '1GB',
    keyStrategy: 'content-hash'
  }
};
```

## Security Configuration

### Authentication & Authorization

```typescript
// config/auth.config.ts
import { NextAuthOptions } from 'next-auth';

export const authConfig: NextAuthOptions = {
  providers: [
    // Email/Password
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        // Implementation
      }
    }),
    
    // OAuth Providers
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email'
        }
      }
    })
  ],
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.role = user.role;
        token.tenantId = user.tenantId;
      }
      return token;
    },
    
    async session({ session, token }) {
      session.user.role = token.role;
      session.user.tenantId = token.tenantId;
      return session;
    }
  }
};
```

### API Security

```yaml
# config/security.yaml
api_security:
  rate_limiting:
    enabled: true
    window: 60 # seconds
    max_requests:
      anonymous: 10
      authenticated: 100
      premium: 1000
    
  cors:
    enabled: true
    origins:
      - https://your-domain.com
      - https://app.your-domain.com
    methods:
      - GET
      - POST
      - PUT
      - DELETE
    credentials: true
    
  headers:
    X-Frame-Options: DENY
    X-Content-Type-Options: nosniff
    X-XSS-Protection: 1; mode=block
    Strict-Transport-Security: max-age=31536000; includeSubDomains
    
  encryption:
    algorithm: AES-256-GCM
    key_rotation: 90 # days
```

### Secrets Management

```bash
# Using HashiCorp Vault
export VAULT_ADDR='https://vault.your-domain.com'
export VAULT_TOKEN='your-vault-token'

# Store secrets
vault kv put secret/vitc/production \
  database_password='secure_password' \
  jwt_secret='your_jwt_secret' \
  encryption_key='your_encryption_key'

# Retrieve secrets in application
vault kv get -format=json secret/vitc/production
```

## Performance Tuning

### Database Optimization

```sql
-- PostgreSQL performance tuning
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '7864kB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;

-- Create indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_client_email ON projects(client_email);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX idx_agents_status ON agents(status);
```

### Redis Optimization

```conf
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
```

### Node.js Performance

```javascript
// config/performance.js
module.exports = {
  // Cluster configuration
  cluster: {
    enabled: process.env.NODE_ENV === 'production',
    workers: process.env.WORKER_COUNT || 'auto'
  },
  
  // Memory limits
  memory: {
    max_old_space_size: 4096, // 4GB
    max_heap_size: 4096
  },
  
  // Connection pooling
  pools: {
    database: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000
    },
    redis: {
      min: 1,
      max: 5
    }
  },
  
  // Request handling
  requests: {
    timeout: 30000, // 30 seconds
    maxPayloadSize: '10mb',
    compression: true
  }
};
```

## Feature Flags

### Feature Flag Configuration

```typescript
// config/features.ts
export const FEATURES = {
  // Core Features
  LOCAL_LLM: {
    enabled: process.env.ENABLE_LOCAL_LLM === 'true',
    description: 'Use local Ollama models'
  },
  
  CLOUD_LLM: {
    enabled: process.env.ENABLE_CLOUD_LLM === 'true',
    description: 'Use cloud-based LLM services'
  },
  
  // Advanced Features
  AUTO_SCALING: {
    enabled: process.env.ENABLE_AUTO_SCALING === 'true',
    description: 'Automatic agent scaling based on workload'
  },
  
  REAL_TIME_COLLABORATION: {
    enabled: process.env.ENABLE_REALTIME === 'true',
    description: 'WebSocket-based real-time updates'
  },
  
  ADVANCED_ANALYTICS: {
    enabled: process.env.ENABLE_ANALYTICS === 'true',
    description: 'Advanced business analytics and reporting'
  },
  
  // Experimental Features
  VOICE_INTERFACE: {
    enabled: process.env.ENABLE_VOICE === 'true',
    description: 'Voice-based project creation'
  },
  
  BLOCKCHAIN_AUDIT: {
    enabled: process.env.ENABLE_BLOCKCHAIN === 'true',
    description: 'Blockchain-based audit trail'
  }
};

// Feature flag helper
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature]?.enabled || false;
}
```

### Dynamic Feature Control

```typescript
// lib/feature-flags.ts
import { Redis } from 'ioredis';

class FeatureFlags {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }
  
  async isEnabled(feature: string, context?: any): Promise<boolean> {
    // Check Redis for dynamic flag
    const dynamicFlag = await this.redis.get(`feature:${feature}`);
    if (dynamicFlag !== null) {
      return dynamicFlag === 'true';
    }
    
    // Check user-specific flags
    if (context?.userId) {
      const userFlag = await this.redis.get(`feature:${feature}:user:${context.userId}`);
      if (userFlag !== null) {
        return userFlag === 'true';
      }
    }
    
    // Fall back to environment config
    return process.env[`ENABLE_${feature.toUpperCase()}`] === 'true';
  }
  
  async enable(feature: string, scope?: string): Promise<void> {
    const key = scope ? `feature:${feature}:${scope}` : `feature:${feature}`;
    await this.redis.set(key, 'true');
  }
  
  async disable(feature: string, scope?: string): Promise<void> {
    const key = scope ? `feature:${feature}:${scope}` : `feature:${feature}`;
    await this.redis.set(key, 'false');
  }
}

export const featureFlags = new FeatureFlags();
```

## Troubleshooting Configuration

### Debug Configuration

```bash
# Enable debug mode
DEBUG=true
LOG_LEVEL=debug
VERBOSE_ERRORS=true
TRACE_REQUESTS=true

# Debug specific components
DEBUG_DATABASE=true
DEBUG_REDIS=true
DEBUG_LLM=true
DEBUG_AGENTS=true
```

### Configuration Validation

```typescript
// scripts/validate-config.ts
import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  CLAUDE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
});

export function validateConfig() {
  try {
    ConfigSchema.parse(process.env);
    console.log('✅ Configuration is valid');
  } catch (error) {
    console.error('❌ Configuration validation failed:', error);
    process.exit(1);
  }
}
```

### Common Configuration Issues

#### Issue: API Keys Not Working

```bash
# Test API keys
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $CLAUDE_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model": "claude-3-haiku-20240307", "messages": [{"role": "user", "content": "Hello"}], "max_tokens": 10}'
```

#### Issue: Database Connection Failed

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Check connection string format
echo $DATABASE_URL | grep -E "postgresql://[^:]+:[^@]+@[^:]+:[0-9]+/[^?]+"
```

#### Issue: Redis Connection Issues

```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping

# Check Redis memory
redis-cli -u $REDIS_URL info memory
```

### Configuration Best Practices

1. **Use Environment-Specific Files**
   - Never commit production secrets
   - Use `.env.example` as template
   - Document all variables

2. **Validate Early**
   - Check configuration on startup
   - Fail fast with clear errors
   - Provide helpful error messages

3. **Secure Secrets**
   - Use secret management tools
   - Rotate keys regularly
   - Audit access logs

4. **Monitor Configuration**
   - Track configuration changes
   - Alert on invalid values
   - Log configuration loads

---

For configuration templates and examples, visit our [Configuration Repository](https://github.com/yourusername/vitc-config-templates).