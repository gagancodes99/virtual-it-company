# Deployment Instructions

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Local Development](#local-development)
3. [Production Deployment](#production-deployment)
4. [Cloud Platform Deployment](#cloud-platform-deployment)
5. [Monitoring & Maintenance](#monitoring--maintenance)
6. [Backup & Recovery](#backup--recovery)
7. [Troubleshooting](#troubleshooting)

## Deployment Overview

The Virtual IT Company Platform supports multiple deployment strategies to match your scale and budget requirements.

### Deployment Options

| Option | Cost | Complexity | Scalability | Best For |
|--------|------|------------|-------------|----------|
| **Local Development** | Free | Low | Limited | Testing, POC |
| **Single Server** | $20-50/mo | Medium | Moderate | Start-ups |
| **Multi-Server** | $100-300/mo | High | High | Growing business |
| **Cloud Platform** | $200-500/mo | Medium | Unlimited | Enterprise |

### Architecture Overview

```mermaid
graph TD
    A[Load Balancer] --> B[Web Server]
    B --> C[API Server]
    C --> D[n8n Workflow Engine]
    C --> E[LangGraph Engine]
    D --> F[Agent Pool]
    E --> F
    F --> G[Ollama Models]
    F --> H[Cloud LLMs]
    C --> I[(PostgreSQL)]
    C --> J[(Redis)]
    B --> K[Static Assets/CDN]
```

## Local Development

### Quick Start with Docker Compose

#### 1. Clone Repository

```bash
git clone https://github.com/yourusername/virtual-it-company-platform.git
cd virtual-it-company-platform
```

#### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Edit with your values
nano .env.local
```

#### 3. Start Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Verify services
docker-compose ps
```

#### 4. Initialize Database

```bash
# Run migrations
docker-compose exec app npm run db:migrate

# Seed initial data (optional)
docker-compose exec app npm run db:seed
```

#### 5. Pull AI Models

```bash
# Pull Ollama models
docker-compose exec ollama ollama pull mistral
docker-compose exec ollama ollama pull codellama
docker-compose exec ollama ollama pull llama2
```

### Development Docker Compose

```yaml
# docker-compose.yml
version: '3.9'

services:
  # Frontend & API
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/vitc
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./src:/app/src
      - ./public:/app/public
    depends_on:
      - postgres
      - redis

  # n8n Workflow Engine
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=password
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=n8n
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres

  # AI Model Server
  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        limits:
          memory: 4G

  # Database
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=vitc
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # Cache & Queue
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  n8n_data:
  ollama_data:
  postgres_data:
  redis_data:
```

## Production Deployment

### Single Server Deployment

#### 1. Server Requirements

- **OS**: Ubuntu 22.04 LTS or similar
- **RAM**: 8GB minimum (16GB recommended)
- **CPU**: 4 cores minimum
- **Storage**: 100GB SSD
- **Network**: 100 Mbps minimum

#### 2. Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y curl git build-essential nginx certbot python3-certbot-nginx

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 3. Application Deployment

```bash
# Clone repository
cd /opt
sudo git clone https://github.com/yourusername/virtual-it-company-platform.git
cd virtual-it-company-platform

# Create production environment file
sudo cp .env.production.example .env
sudo nano .env  # Edit with production values

# Build and start services
sudo docker-compose -f docker-compose.prod.yml up -d
```

#### 4. Nginx Configuration

```nginx
# /etc/nginx/sites-available/vitc
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3000/api;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /n8n {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
    }
}
```

#### 5. SSL Setup

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/vitc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

### Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.9'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  n8n:
    image: n8nio/n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_PROTOCOL=https
      - N8N_HOST=${N8N_HOST}
      - WEBHOOK_URL=https://${N8N_HOST}
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres
      - redis

  langraph:
    build:
      context: ./services/langraph
      dockerfile: Dockerfile
    restart: always
    ports:
      - "8001:8001"
    environment:
      - REDIS_URL=${REDIS_URL}
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - redis
      - postgres
      - ollama

  ollama:
    image: ollama/ollama
    restart: always
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        limits:
          memory: 8G
        reservations:
          memory: 4G

  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "127.0.0.1:6379:6379"

volumes:
  n8n_data:
  ollama_data:
  postgres_data:
  redis_data:
```

## Cloud Platform Deployment

### DigitalOcean Deployment

#### 1. Create Droplet

```bash
# Using DigitalOcean CLI
doctl compute droplet create vitc-platform \
  --size s-4vcpu-8gb \
  --image ubuntu-22-04-x64 \
  --region nyc3 \
  --ssh-keys your-ssh-key-id
```

#### 2. Automated Setup Script

```bash
#!/bin/bash
# setup-digitalocean.sh

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Setup firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Clone repository
cd /opt
git clone https://github.com/yourusername/virtual-it-company-platform.git
cd virtual-it-company-platform

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

### Railway Deployment

#### 1. Railway Configuration

```toml
# railway.toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "./Dockerfile"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
healthcheckTimeout = 30

[[services]]
name = "web"
port = 3000

[[services]]
name = "n8n"
port = 5678

[variables]
NODE_ENV = "production"
```

#### 2. Deploy Command

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

### Vercel + Supabase Deployment

#### 1. Frontend Deployment (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add DATABASE_URL production
vercel env add REDIS_URL production
```

#### 2. Backend Services (Supabase)

```sql
-- Create necessary tables
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  requirements TEXT NOT NULL,
  client_email TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'available',
  performance JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  agent_id TEXT REFERENCES agents(id),
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  result JSONB
);
```

## Monitoring & Maintenance

### 1. Health Checks

```bash
# Create health check script
cat > /opt/vitc/health-check.sh << 'EOF'
#!/bin/bash

# Check all services
services=("app:3000/api/health" "n8n:5678/healthz" "ollama:11434/api/tags")

for service in "${services[@]}"; do
  IFS=':' read -r name endpoint <<< "$service"
  if curl -f -s "http://localhost:$endpoint" > /dev/null; then
    echo "✓ $name is healthy"
  else
    echo "✗ $name is down"
    # Send alert
    curl -X POST $SLACK_WEBHOOK -d "{\"text\":\"Alert: $name is down\"}"
  fi
done
EOF

chmod +x /opt/vitc/health-check.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/vitc/health-check.sh") | crontab -
```

### 2. Log Management

```bash
# Setup log rotation
cat > /etc/logrotate.d/vitc << EOF
/var/log/vitc/*.log {
  daily
  rotate 14
  compress
  delaycompress
  notifempty
  create 0640 www-data www-data
  sharedscripts
  postrotate
    docker-compose -f /opt/vitc/docker-compose.prod.yml restart app
  endscript
}
EOF
```

### 3. Monitoring Stack

```yaml
# monitoring/docker-compose.yml
version: '3.9'

services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3001:3000"

  node_exporter:
    image: prom/node-exporter
    ports:
      - "9100:9100"

volumes:
  prometheus_data:
  grafana_data:
```

### 4. Performance Monitoring

```typescript
// src/lib/monitoring.ts
import { register, Counter, Histogram, Gauge } from 'prom-client';

// Metrics
export const projectsCreated = new Counter({
  name: 'vitc_projects_created_total',
  help: 'Total number of projects created'
});

export const projectDuration = new Histogram({
  name: 'vitc_project_duration_seconds',
  help: 'Project completion time in seconds',
  buckets: [300, 600, 1800, 3600, 7200, 14400]
});

export const activeAgents = new Gauge({
  name: 'vitc_active_agents',
  help: 'Number of active AI agents'
});

export const apiCosts = new Counter({
  name: 'vitc_api_costs_usd',
  help: 'Total API costs in USD',
  labelNames: ['provider', 'model']
});

// Expose metrics endpoint
export async function metricsHandler(req: Request, res: Response) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}
```

## Backup & Recovery

### 1. Automated Backups

```bash
#!/bin/bash
# backup.sh

# Configuration
BACKUP_DIR="/backup/vitc"
RETENTION_DAYS=7
S3_BUCKET="s3://your-backup-bucket"

# Create backup directory
mkdir -p $BACKUP_DIR/$(date +%Y%m%d)

# Backup database
docker-compose exec -T postgres pg_dump -U postgres vitc | gzip > $BACKUP_DIR/$(date +%Y%m%d)/database.sql.gz

# Backup volumes
docker run --rm -v vitc_n8n_data:/data -v $BACKUP_DIR/$(date +%Y%m%d):/backup alpine tar czf /backup/n8n_data.tar.gz -C /data .

# Backup environment files
cp /opt/vitc/.env $BACKUP_DIR/$(date +%Y%m%d)/

# Upload to S3
aws s3 sync $BACKUP_DIR/$(date +%Y%m%d) $S3_BUCKET/$(date +%Y%m%d)

# Clean old backups
find $BACKUP_DIR -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \;
```

### 2. Disaster Recovery

```bash
#!/bin/bash
# restore.sh

# Download from S3
aws s3 sync s3://your-backup-bucket/20240115 /tmp/restore

# Stop services
docker-compose down

# Restore database
gunzip < /tmp/restore/database.sql.gz | docker-compose exec -T postgres psql -U postgres vitc

# Restore volumes
docker run --rm -v vitc_n8n_data:/data -v /tmp/restore:/backup alpine tar xzf /backup/n8n_data.tar.gz -C /data

# Restore environment
cp /tmp/restore/.env /opt/vitc/

# Start services
docker-compose up -d
```

## Troubleshooting

### Common Issues

#### 1. Service Won't Start

```bash
# Check logs
docker-compose logs app
docker-compose logs n8n

# Check resources
docker system df
df -h
free -m

# Clean up
docker system prune -a
docker volume prune
```

#### 2. Database Connection Issues

```bash
# Test connection
docker-compose exec postgres psql -U postgres -c "SELECT 1"

# Check configuration
docker-compose exec app env | grep DATABASE

# Reset database
docker-compose down -v
docker-compose up -d postgres
docker-compose exec app npm run db:migrate
```

#### 3. Ollama Model Issues

```bash
# Check models
docker-compose exec ollama ollama list

# Re-pull models
docker-compose exec ollama ollama pull mistral

# Increase memory
# Edit docker-compose.yml
deploy:
  resources:
    limits:
      memory: 8G
```

#### 4. Performance Issues

```bash
# Check resource usage
docker stats

# Scale services
docker-compose up -d --scale app=2

# Enable swap (if needed)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Debugging Production Issues

```bash
# Enable debug mode
export DEBUG=true
docker-compose up

# Access container shell
docker-compose exec app sh

# View real-time logs
docker-compose logs -f app

# Check network
docker network ls
docker network inspect vitc_default
```

---

For additional deployment support, join our [Discord community](https://discord.gg/vitc) or check the [deployment FAQ](https://docs.virtualitcompany.ai/deployment/faq).