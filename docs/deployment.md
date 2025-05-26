# Virtual IT Company Platform - Deployment Guide

## Overview

This guide covers deployment strategies for the Virtual IT Company Platform, from local development to production-scale infrastructure. Choose the deployment option that best fits your needs and budget.

## Deployment Options

### Quick Comparison

| Option | Cost/Month | Setup Time | Scalability | Best For |
|--------|------------|------------|-------------|----------|
| Local Development | $0 | 30 min | Limited | Testing, Development |
| Single VPS | $20-50 | 2 hours | Medium | Small teams, MVP |
| Cloud Platform | $50-200 | 4 hours | High | Growing business |
| Enterprise | $200+ | 1-2 days | Unlimited | Large operations |

## Prerequisites

### Required Tools
- Docker & Docker Compose (v20.10+)
- Git (v2.0+)
- Node.js (v18+)
- Domain name (for production)
- SSL certificate (Let's Encrypt recommended)

### Required Accounts
- GitHub (for repository management)
- Cloud provider account (DigitalOcean/AWS/GCP)
- SendGrid (for emails)
- Domain registrar

## Option 1: Local Development Deployment

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/virtual-it-company-platform.git
cd virtual-it-company-platform
```

### Step 2: Environment Setup

```bash
# Copy example environment file
cp .env.example .env

# Edit environment variables
nano .env
```

Required environment variables:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vitc_dev

# Redis
REDIS_URL=redis://localhost:6379

# AI Services (start with Ollama only)
OLLAMA_BASE_URL=http://localhost:11434

# n8n
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your_secure_password

# Next.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_key
```

### Step 3: Start Services

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 4: Initialize Database

```bash
# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

### Step 5: Install AI Models

```bash
# Pull Ollama models
docker exec vitc-ollama ollama pull mistral
docker exec vitc-ollama ollama pull codellama
docker exec vitc-ollama ollama pull llama2
```

### Step 6: Access Services

- Main App: http://localhost:3000
- n8n: http://localhost:5678
- API Docs: http://localhost:3000/api-docs

## Option 2: Single VPS Deployment (DigitalOcean)

### Step 1: Create Droplet

```bash
# Create a Ubuntu 22.04 droplet (minimum 2GB RAM)
# SSH into your droplet
ssh root@your-droplet-ip
```

### Step 2: Install Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install Nginx
apt install nginx -y

# Install Certbot for SSL
apt install certbot python3-certbot-nginx -y
```

### Step 3: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

### Step 4: Clone and Configure

```bash
# Create app directory
mkdir -p /var/www
cd /var/www

# Clone repository
git clone https://github.com/yourusername/virtual-it-company-platform.git
cd virtual-it-company-platform

# Create production environment file
cp .env.production.example .env

# Edit environment variables
nano .env
```

Production environment variables:
```env
# Production settings
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database (using Docker PostgreSQL)
DATABASE_URL=postgresql://user:secure_password@postgres:5432/vitc_prod

# Redis
REDIS_URL=redis://redis:6379

# AI Services
OLLAMA_BASE_URL=http://ollama:11434
CLAUDE_API_KEY=your_production_key # Optional
OPENAI_API_KEY=your_production_key # Optional

# n8n
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=very_secure_password
N8N_WEBHOOK_URL=https://n8n.yourdomain.com

# Email
SENDGRID_API_KEY=your_sendgrid_key

# Security
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=generate_random_64_char_string
```

### Step 5: Configure Nginx

Create Nginx configuration:

```nginx
# /etc/nginx/sites-available/vitc
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL configuration will be added by Certbot
    
    # Main app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API routes
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# n8n subdomain
server {
    listen 80;
    server_name n8n.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name n8n.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/vitc /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Step 6: Obtain SSL Certificates

```bash
# Get SSL certificates
certbot --nginx -d yourdomain.com -d www.yourdomain.com -d n8n.yourdomain.com

# Auto-renewal
certbot renew --dry-run
```

### Step 7: Create Docker Compose Production File

```yaml
# docker-compose.production.yml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: vitc_prod
      POSTGRES_USER: user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes --requirepass redis_password
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  n8n:
    image: n8nio/n8n
    restart: always
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_BASIC_AUTH_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_BASIC_AUTH_PASSWORD}
      - N8N_HOST=n8n.yourdomain.com
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - NODE_ENV=production
      - WEBHOOK_URL=https://n8n.yourdomain.com/
    volumes:
      - n8n_data:/home/node/.n8n
    ports:
      - "5678:5678"
    depends_on:
      - postgres
      - redis

  ollama:
    image: ollama/ollama:latest
    restart: always
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G

  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
      - ollama
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
  redis_data:
  n8n_data:
  ollama_data:
```

### Step 8: Create Production Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Step 9: Deploy Application

```bash
# Build and start services
docker-compose -f docker-compose.production.yml up -d --build

# Run database migrations
docker-compose -f docker-compose.production.yml exec app npx prisma migrate deploy

# Check service health
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

### Step 10: Set Up Monitoring

Install monitoring stack:

```bash
# Create monitoring compose file
cat > docker-compose.monitoring.yml << EOF
version: '3.9'

services:
  prometheus:
    image: prom/prometheus
    restart: always
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    restart: always
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3002:3000"

  node_exporter:
    image: prom/node-exporter
    restart: always
    ports:
      - "9100:9100"

volumes:
  prometheus_data:
  grafana_data:
EOF

# Start monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

## Option 3: Cloud Platform Deployment

### Vercel + Supabase + Railway

This option provides a managed infrastructure with automatic scaling.

#### Step 1: Deploy Database to Supabase

1. Create a Supabase project
2. Get your database connection string
3. Run migrations:

```bash
# Set DATABASE_URL to Supabase connection string
export DATABASE_URL="postgresql://..."

# Run migrations
npx prisma migrate deploy
```

#### Step 2: Deploy Backend to Railway

1. Connect GitHub repository to Railway
2. Add environment variables
3. Deploy with one click

Railway configuration:
```toml
# railway.toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

#### Step 3: Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### AWS Deployment

#### Step 1: Set Up Infrastructure

Use AWS CDK or Terraform:

```typescript
// infrastructure/stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';

export class VITCStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'VITC-VPC', {
      maxAzs: 2,
      natGateways: 1,
    });

    // RDS PostgreSQL
    const database = new rds.DatabaseInstance(this, 'VITC-DB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      vpc,
      allocatedStorage: 20,
      databaseName: 'vitc_prod',
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'VITC-Cluster', {
      vpc,
      containerInsights: true,
    });

    // Fargate Service
    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      'VITC-TaskDef',
      {
        memoryLimitMiB: 2048,
        cpu: 1024,
      }
    );

    // Add containers
    taskDefinition.addContainer('app', {
      image: ecs.ContainerImage.fromRegistry('your-ecr-repo/vitc:latest'),
      environment: {
        NODE_ENV: 'production',
        DATABASE_URL: database.instanceEndpoint.socketAddress,
      },
      portMappings: [{
        containerPort: 3000,
      }],
    });
  }
}
```

Deploy with CDK:
```bash
# Install CDK
npm install -g aws-cdk

# Deploy stack
cdk deploy
```

## Option 4: Kubernetes Deployment

### Step 1: Create Kubernetes Manifests

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: vitc-platform

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vitc-config
  namespace: vitc-platform
data:
  NODE_ENV: "production"
  NEXT_PUBLIC_APP_URL: "https://yourdomain.com"

---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: vitc-secrets
  namespace: vitc-platform
type: Opaque
stringData:
  DATABASE_URL: "postgresql://..."
  NEXTAUTH_SECRET: "your-secret"
  CLAUDE_API_KEY: "your-key"

---
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vitc-app
  namespace: vitc-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vitc-app
  template:
    metadata:
      labels:
        app: vitc-app
    spec:
      containers:
      - name: app
        image: your-registry/vitc:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: vitc-config
        - secretRef:
            name: vitc-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10

---
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: vitc-service
  namespace: vitc-platform
spec:
  selector:
    app: vitc-app
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer

---
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: vitc-hpa
  namespace: vitc-platform
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: vitc-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Step 2: Deploy to Kubernetes

```bash
# Apply manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get all -n vitc-platform

# View logs
kubectl logs -f deployment/vitc-app -n vitc-platform

# Scale deployment
kubectl scale deployment/vitc-app --replicas=5 -n vitc-platform
```

### Step 3: Set Up Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: vitc-ingress
  namespace: vitc-platform
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
spec:
  tls:
  - hosts:
    - yourdomain.com
    - www.yourdomain.com
    secretName: vitc-tls
  rules:
  - host: yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: vitc-service
            port:
              number: 80
```

## Post-Deployment Tasks

### 1. Configure Backups

Set up automated backups:

```bash
# backup.sh
#!/bin/bash
BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup database
docker exec vitc-postgres pg_dump -U user vitc_prod > $BACKUP_DIR/database.sql

# Backup volumes
docker run --rm -v vitc_n8n_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/n8n_data.tar.gz -C /data .

# Upload to S3
aws s3 sync $BACKUP_DIR s3://your-backup-bucket/vitc-backups/$(date +%Y%m%d)/

# Clean old backups (keep 30 days)
find /backups -type d -mtime +30 -exec rm -rf {} \;
```

Add to crontab:
```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup.sh
```

### 2. Set Up Monitoring Alerts

Configure alerts in Grafana:

```yaml
# alerts.yaml
groups:
  - name: vitc_alerts
    rules:
      - alert: HighCPUUsage
        expr: rate(process_cpu_seconds_total[5m]) > 0.8
        for: 10m
        annotations:
          summary: "High CPU usage detected"
          
      - alert: LowMemory
        expr: node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.1
        for: 5m
        annotations:
          summary: "Low memory available"
          
      - alert: ServiceDown
        expr: up{job="vitc-app"} == 0
        for: 1m
        annotations:
          summary: "VITC service is down"
```

### 3. Configure Log Management

Set up centralized logging:

```yaml
# docker-compose.logging.yml
version: '3.9'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

### 4. Security Hardening

#### Enable Firewall Rules

```bash
# Allow only necessary ports
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp  # SSH
ufw allow 80/tcp  # HTTP
ufw allow 443/tcp # HTTPS
ufw enable
```

#### Set Up Fail2ban

```bash
# Install fail2ban
apt install fail2ban -y

# Configure for nginx
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https"]
logpath = /var/log/nginx/error.log

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
action = iptables-multiport[name=HTTPAuth, port="http,https"]
logpath = /var/log/nginx/error.log
EOF

# Restart fail2ban
systemctl restart fail2ban
```

#### Enable Docker Security

```yaml
# docker-compose.security.yml
version: '3.9'

services:
  app:
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    read_only: true
    tmpfs:
      - /tmp
      - /app/.next/cache
```

### 5. Performance Optimization

#### Enable Caching

```nginx
# Add to nginx config
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Enable gzip
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
gzip_min_length 1000;
```

#### Configure CDN

```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['cdn.yourdomain.com'],
  },
  assetPrefix: process.env.NODE_ENV === 'production' 
    ? 'https://cdn.yourdomain.com' 
    : '',
};
```

## Scaling Strategies

### Horizontal Scaling

```yaml
# docker-compose.scale.yml
version: '3.9'

services:
  app:
    deploy:
      replicas: 4
      update_config:
        parallelism: 2
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx-load-balancer.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
    depends_on:
      - app
```

### Database Scaling

```sql
-- Enable connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';

-- Create read replica
CREATE PUBLICATION vitc_pub FOR ALL TABLES;

-- On replica:
CREATE SUBSCRIPTION vitc_sub 
CONNECTION 'host=primary dbname=vitc_prod' 
PUBLICATION vitc_pub;
```

## Maintenance Procedures

### 1. Regular Updates

```bash
#!/bin/bash
# update.sh

# Pull latest changes
git pull origin main

# Update dependencies
npm update
npm audit fix

# Rebuild and deploy
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Health check
curl -f http://localhost:3000/api/health || exit 1

echo "Update completed successfully"
```

### 2. Database Maintenance

```bash
# Vacuum and analyze
docker exec vitc-postgres psql -U user -d vitc_prod -c "VACUUM ANALYZE;"

# Reindex
docker exec vitc-postgres psql -U user -d vitc_prod -c "REINDEX DATABASE vitc_prod;"
```

### 3. Log Rotation

```bash
# /etc/logrotate.d/vitc
/var/log/vitc/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        docker-compose restart app
    endscript
}
```

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

```bash
# Check logs
docker-compose logs app

# Check resource usage
docker system df
docker system prune -a

# Verify environment
docker-compose config
```

#### 2. Database Connection Failed

```bash
# Test connection
docker exec -it vitc-postgres psql -U user -d vitc_prod

# Check pg_hba.conf
docker exec vitc-postgres cat /var/lib/postgresql/data/pg_hba.conf

# Restart database
docker-compose restart postgres
```

#### 3. High Memory Usage

```bash
# Check memory usage
docker stats

# Limit container memory
docker-compose down
# Edit docker-compose.yml to add memory limits
docker-compose up -d
```

## Cost Optimization

### 1. Use Spot Instances (AWS)

```yaml
# ecs-task-definition.json
{
  "capacityProviderStrategy": [
    {
      "capacityProvider": "FARGATE_SPOT",
      "weight": 4
    },
    {
      "capacityProvider": "FARGATE",
      "weight": 1
    }
  ]
}
```

### 2. Auto-scaling Configuration

```yaml
# scaling-policy.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: vitc-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: vitc-app
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
```

### 3. Optimize AI Costs

```javascript
// Use local models for simple tasks
const modelSelector = {
  simple: 'ollama/mistral',     // Free
  medium: 'claude-3-haiku',      // $0.25/1k tokens
  complex: 'claude-3-5-sonnet',  // $3/1k tokens
  critical: 'claude-3-opus'      // $15/1k tokens
};
```

## Security Checklist

- [ ] SSL certificates configured and auto-renewing
- [ ] Firewall rules properly configured
- [ ] Database passwords are strong and unique
- [ ] API keys stored securely in environment variables
- [ ] Regular security updates applied
- [ ] Backup system tested and working
- [ ] Monitoring alerts configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Input validation implemented
- [ ] SQL injection protection enabled
- [ ] XSS protection headers set
- [ ] CSRF protection enabled
- [ ] Regular security audits scheduled

## Conclusion

Choose the deployment option that best fits your current needs and budget. Start with a simple VPS deployment and scale up as your business grows. Remember to:

1. Always test deployments in staging first
2. Keep regular backups
3. Monitor system health
4. Apply security updates promptly
5. Document any custom configurations

For support and updates, refer to the project documentation and community resources.