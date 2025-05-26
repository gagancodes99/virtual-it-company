# Virtual IT Company Platform

A comprehensive multi-tenant SaaS platform where AI agents work alongside real team members to deliver client projects. Perfect for solo founders to run a full IT consultancy with AI agents handling most roles initially.

## 🚀 Features

### Core Platform
- **Multi-tenant Architecture**: Isolated workspaces for different companies
- **Role-based Access Control**: Super Admin, Tenant Admin, Project Manager, Developer, Designer, Client, AI Agent
- **Real-time Collaboration**: Live chat and updates using Socket.io
- **Modern UI**: Built with Shadcn/ui and Tailwind CSS

### AI Agent Management
- **Intelligent Agents**: Create and configure AI agents for different roles
- **Performance Tracking**: Monitor agent productivity and reliability
- **Skill-based Assignment**: Automatic task assignment based on agent capabilities
- **Custom Models**: Support for OpenAI, Anthropic, and custom AI models

### Project Management
- **Project Lifecycle**: From drafts to completion with milestone tracking
- **Team Collaboration**: Human + AI team assignment and coordination
- **Client Portal**: Dedicated interface for clients to track progress
- **File Management**: Integrated file upload and sharing with AWS S3

## 🛠 Tech Stack

### Frontend
- **Next.js 15**: App Router with React 19
- **TypeScript**: Full type safety
- **Tailwind CSS**: Utility-first styling
- **Shadcn/ui**: High-quality component library
- **Zustand**: Lightweight state management

### Backend
- **Next.js API Routes**: Serverless functions
- **tRPC**: End-to-end typesafe APIs
- **NextAuth.js**: Authentication with multiple providers
- **MongoDB**: Document database with Mongoose ODM

### Infrastructure
- **Docker**: Containerized deployment
- **Socket.io**: Real-time communication
- **AWS S3**: File storage
- **Stripe**: Payment processing
- **SendGrid**: Email delivery

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or cloud)
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd virtual-it-company-platform
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/virtual-it-company

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# AI Services
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_BUCKET_NAME=your-bucket-name

# Stripe
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key

# Email
SENDGRID_API_KEY=your-sendgrid-api-key
```

4. **Start the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

### Docker Deployment

1. **Using Docker Compose**
```bash
docker-compose up -d
```

2. **For production with Nginx**
```bash
docker-compose --profile production up -d
```

## 📊 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (protected)/        # Protected routes with auth
│   │   ├── dashboard/      # Main dashboard
│   │   │   ├── projects/   # Project management
│   │   │   ├── team/       # Team management
│   │   │   ├── agents/     # AI agent management
│   │   │   ├── clients/    # Client portal
│   │   │   ├── analytics/  # Analytics dashboard
│   │   │   └── settings/   # Settings pages
│   │   └── admin/          # Admin-only pages
│   ├── auth/               # Authentication pages
│   └── api/                # API routes
├── components/             # React components
│   ├── ui/                 # Shadcn/ui components
│   ├── layout/             # Layout components
│   ├── agents/             # AI agent components
│   └── providers/          # Context providers
├── lib/                    # Utility libraries
│   ├── auth/               # Authentication config
│   ├── database/           # Database models
│   ├── trpc/               # tRPC configuration
│   └── utils/              # Utility functions
├── types/                  # TypeScript definitions
├── stores/                 # Zustand stores
└── hooks/                  # Custom React hooks
```

## 🔧 Key Features

### AI Agent System
- **Agent Profiles**: Create specialized AI agents for different roles
- **Performance Metrics**: Track tasks completed, ratings, and response times
- **Skill Matching**: Automatic assignment based on required skills
- **Model Configuration**: Support for multiple AI providers

### Multi-tenant Architecture
- **Tenant Isolation**: Complete data separation between organizations
- **Role-based Access**: Granular permissions system
- **Subscription Management**: Integrated billing and feature limits
- **Custom Branding**: Tenant-specific customization

### Project Management
- **Lifecycle Tracking**: From draft to completion
- **Team Coordination**: Mix of human and AI team members
- **Client Communication**: Built-in chat and progress sharing
- **File Management**: Secure file upload and sharing

## 🚀 Usage

### For Founders
1. Set up your company tenant
2. Create AI agents with specific skills
3. Onboard clients and create projects
4. Assign tasks to human and AI team members
5. Monitor performance and client satisfaction

### For Team Members
1. Join projects and collaborate with AI agents
2. Track tasks and manage workload
3. Use real-time chat for communication
4. Review and quality-control AI work

### For Clients
1. Track project progress in real-time
2. Communicate with the project team
3. Request changes and provide feedback
4. Access deliverables and milestones

## 🧪 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## 🐳 Docker

The project includes complete Docker configuration:

- **Development**: `docker-compose up`
- **Production**: `docker-compose --profile production up`
- **Services**: MongoDB, Redis, Next.js app, Nginx

## 📄 License

MIT License - Perfect for both personal and commercial use.

---

Built with ❤️ using Next.js, TypeScript, and AI
