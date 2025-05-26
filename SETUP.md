# 🚀 Quick Setup Guide - Virtual IT Company Platform

## Prerequisites

Before starting, make sure you have:
- **Node.js 18+** installed
- **MongoDB** running (local or cloud)
- **Git** installed

## Step 1: Environment Setup

1. **Copy environment template:**
```bash
cp .env.example .env.local
```

2. **Edit `.env.local` with your values:**
```env
# Required - Database Connection
MONGODB_URI=mongodb://localhost:27017/virtual-it-company

# Required - Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-change-this

# Optional - AI Services (for AI agents to work)
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=your-anthropic-key-here

# Optional - OAuth (for social login)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## Step 2: Database Setup

### Option A: Local MongoDB
```bash
# Install MongoDB (macOS)
brew install mongodb/brew/mongodb-community

# Start MongoDB
brew services start mongodb/brew/mongodb-community
```

### Option B: MongoDB Atlas (Cloud)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get your connection string
4. Update `MONGODB_URI` in `.env.local`

## Step 3: Initialize the Platform

Run the automated setup:
```bash
npm run setup
```

This will:
- Install all dependencies
- Create initial database data
- Set up sample users, AI agents, and projects

## Step 4: Start Development

```bash
npm run dev
```

Visit: **http://localhost:3000**

## 🔑 Default Login Credentials

After running `npm run setup`, you can login with:

### Super Admin (Full Platform Access)
- **Email:** `admin@virtualit.com`
- **Password:** `admin123`

### Tenant Admin (Company Owner)
- **Email:** `admin@company.com`  
- **Password:** `password123`

### Developer (Team Member)
- **Email:** `sarah@company.com`
- **Password:** `password123`

## 🎯 What You'll See

After login, you'll have access to:

1. **Dashboard** - Overview of projects, team, and AI agents
2. **Projects** - Sample e-commerce project with realistic data  
3. **AI Agents** - 2 pre-configured AI agents (Frontend & Backend developers)
4. **Team** - Human team members and collaboration tools
5. **Analytics** - Performance metrics and insights

## 🤖 AI Agents Included

The setup creates these AI agents:

1. **Alex Frontend Developer**
   - Skills: React, TypeScript, Tailwind CSS, Next.js
   - Status: Active and ready for tasks

2. **Sam Backend Engineer** 
   - Skills: Node.js, Python, MongoDB, AWS
   - Status: Active and ready for tasks

## 📋 Sample Project

A realistic e-commerce project is created with:
- **Budget:** $45,000
- **Status:** In Progress (35% complete)
- **Team:** Human developer + 2 AI agents
- **Timeline:** 60-day project with milestones

## 🛠 Manual Setup (Alternative)

If you prefer manual setup:

```bash
# Install dependencies only
npm install

# Create data manually (optional)
npm run init-data

# Start development
npm run dev
```

## 🐳 Docker Setup (Optional)

For containerized deployment:

```bash
# Start all services (MongoDB, Redis, App)
docker-compose up -d

# For production with Nginx
docker-compose --profile production up -d
```

## 🚨 Troubleshooting

**MongoDB Connection Issues:**
- Check if MongoDB is running: `brew services list | grep mongodb`
- Verify MONGODB_URI format in `.env.local`

**Port 3000 Already in Use:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

**Permission Errors:**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

## 📚 Next Steps

1. **Explore the Dashboard** - Familiarize yourself with the interface
2. **Create Your First AI Agent** - Go to `/dashboard/agents` and click "Create Agent"
3. **Start a New Project** - Use the project management features
4. **Invite Team Members** - Add real team members to collaborate
5. **Configure AI Services** - Add your OpenAI/Anthropic API keys for full AI functionality

## 🎉 You're Ready!

Your Virtual IT Company Platform is now ready to revolutionize how you run your IT consultancy with AI agents working alongside human team members!

Need help? Check the main README.md for detailed documentation.