import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Import models - using dynamic imports to avoid module issues
import { UserRole, AgentStatus, ProjectStatus, Priority } from '../src/types';

// Simple schema definitions for initialization
const TenantSchema = new mongoose.Schema({
  name: String,
  domain: String,
  isActive: { type: Boolean, default: true },
  subscription: {
    plan: String,
    status: String,
    trialEnds: Date,
  },
  settings: {
    allowAIAgents: { type: Boolean, default: true },
    maxProjects: { type: Number, default: 25 },
    maxUsers: { type: Number, default: 50 },
    features: [String],
  },
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  email: String,
  name: String,
  password: String,
  role: String,
  tenantId: String,
  isActive: { type: Boolean, default: true },
  profile: {
    bio: String,
    skills: [String],
    hourlyRate: Number,
    timezone: { type: String, default: 'UTC' },
  },
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    slack: { type: Boolean, default: false },
  },
}, { timestamps: true });

const AIAgentSchema = new mongoose.Schema({
  name: String,
  type: String,
  description: String,
  skills: [String],
  status: String,
  tenantId: String,
  model: {
    provider: String,
    model: String,
    temperature: Number,
    maxTokens: Number,
  },
  performance: {
    tasksCompleted: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    reliability: { type: Number, default: 0 },
    responseTimeMs: { type: Number, default: 0 },
  },
  capabilities: {
    languages: [String],
    frameworks: [String],
    specializations: [String],
    tools: [String],
  },
  settings: {
    workingHours: {
      start: String,
      end: String,
      timezone: String,
    },
    responseTime: Number,
    maxConcurrentTasks: Number,
    autoAssign: Boolean,
  },
}, { timestamps: true });

const ProjectSchema = new mongoose.Schema({
  name: String,
  description: String,
  status: String,
  priority: String,
  budget: Number,
  deadline: Date,
  clientId: String,
  tenantId: String,
  teamMembers: [String],
  assignedAgents: [String],
  progress: { type: Number, default: 0 },
  tags: [String],
  client: {
    name: String,
    email: String,
    company: String,
    phone: String,
  },
  requirements: {
    functional: [String],
    technical: [String],
    designSpecs: String,
  },
  milestones: [{
    name: String,
    description: String,
    dueDate: Date,
    status: String,
    payment: Number,
  }],
}, { timestamps: true });

// Models
const Tenant = mongoose.models.Tenant || mongoose.model('Tenant', TenantSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const AIAgent = mongoose.models.AIAgent || mongoose.model('AIAgent', AIAgentSchema);
const Project = mongoose.models.Project || mongoose.model('Project', ProjectSchema);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-it-company';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function clearData() {
  console.log('🧹 Clearing existing data...');
  try {
    await User.deleteMany({});
    await Tenant.deleteMany({});
    await AIAgent.deleteMany({});
    await Project.deleteMany({});
    console.log('✅ Data cleared');
  } catch (error) {
    console.log('⚠️ Error clearing data:', error);
  }
}

async function createInitialData() {
  console.log('🚀 Creating initial data...\n');

  // 1. Create Default Tenant
  console.log('1️⃣ Creating default tenant...');
  const defaultTenant = await Tenant.create({
    name: 'Virtual IT Company',
    domain: 'default',
    subscription: {
      plan: 'professional',
      status: 'active',
      trialEnds: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    settings: {
      allowAIAgents: true,
      maxProjects: 25,
      maxUsers: 50,
      features: ['ai_agents', 'project_management', 'team_collaboration'],
    },
  });
  console.log(`✅ Created tenant: ${defaultTenant.name}`);

  // 2. Create Users
  console.log('\n2️⃣ Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const superAdmin = await User.create({
    email: 'admin@virtualit.com',
    name: 'Super Admin',
    password: await bcrypt.hash('admin123', 12),
    role: UserRole.SUPER_ADMIN,
    tenantId: defaultTenant._id.toString(),
    profile: {
      bio: 'Platform administrator',
      skills: ['System Administration'],
      timezone: 'UTC',
    },
  });

  const tenantAdmin = await User.create({
    email: 'admin@company.com',
    name: 'John Smith',
    password: hashedPassword,
    role: UserRole.TENANT_ADMIN,
    tenantId: defaultTenant._id.toString(),
    profile: {
      bio: 'Company founder and admin',
      skills: ['Business Management', 'Strategy'],
      hourlyRate: 150,
      timezone: 'America/New_York',
    },
  });

  const developer = await User.create({
    email: 'sarah@company.com',
    name: 'Sarah Johnson',
    password: hashedPassword,
    role: UserRole.DEVELOPER,
    tenantId: defaultTenant._id.toString(),
    profile: {
      bio: 'Senior Full Stack Developer',
      skills: ['React', 'Node.js', 'TypeScript', 'MongoDB'],
      hourlyRate: 85,
      timezone: 'America/New_York',
    },
  });

  console.log(`✅ Created ${superAdmin.name} (Super Admin)`);
  console.log(`✅ Created ${tenantAdmin.name} (Tenant Admin)`);
  console.log(`✅ Created ${developer.name} (Developer)`);

  // 3. Create AI Agents
  console.log('\n3️⃣ Creating AI agents...');
  
  const alexAgent = await AIAgent.create({
    name: 'Alex Frontend Developer',
    type: 'Frontend Developer',
    description: 'Expert React and TypeScript developer specializing in modern web applications.',
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js'],
    status: AgentStatus.ACTIVE,
    tenantId: defaultTenant._id.toString(),
    model: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
    },
    performance: {
      tasksCompleted: 45,
      averageRating: 4.8,
      reliability: 96,
      responseTimeMs: 2200,
    },
    capabilities: {
      languages: ['JavaScript', 'TypeScript', 'HTML', 'CSS'],
      frameworks: ['React', 'Next.js', 'Vue.js'],
      specializations: ['Frontend Development', 'UI Implementation'],
      tools: ['VS Code', 'Figma', 'Chrome DevTools'],
    },
    settings: {
      workingHours: {
        start: '09:00',
        end: '17:00',
        timezone: 'UTC',
      },
      responseTime: 300,
      maxConcurrentTasks: 3,
      autoAssign: true,
    },
  });

  const samAgent = await AIAgent.create({
    name: 'Sam Backend Engineer',
    type: 'Backend Developer',
    description: 'Skilled in Node.js, Python, and database design for scalable applications.',
    skills: ['Node.js', 'Python', 'MongoDB', 'PostgreSQL', 'AWS'],
    status: AgentStatus.ACTIVE,
    tenantId: defaultTenant._id.toString(),
    model: {
      provider: 'anthropic',
      model: 'claude-3-sonnet',
      temperature: 0.5,
      maxTokens: 3000,
    },
    performance: {
      tasksCompleted: 23,
      averageRating: 4.6,
      reliability: 89,
      responseTimeMs: 3100,
    },
    capabilities: {
      languages: ['JavaScript', 'Python', 'SQL'],
      frameworks: ['Express.js', 'FastAPI', 'Django'],
      specializations: ['Backend Development', 'API Design'],
      tools: ['VS Code', 'Docker', 'Postman'],
    },
    settings: {
      workingHours: {
        start: '08:00',
        end: '16:00',
        timezone: 'UTC',
      },
      responseTime: 450,
      maxConcurrentTasks: 2,
      autoAssign: false,
    },
  });

  console.log(`✅ Created ${alexAgent.name} (Active)`);
  console.log(`✅ Created ${samAgent.name} (Active)`);

  // 4. Create Sample Project
  console.log('\n4️⃣ Creating sample project...');
  
  const sampleProject = await Project.create({
    name: 'E-commerce Platform Development',
    description: 'Modern e-commerce platform with React frontend and Node.js backend.',
    status: ProjectStatus.ACTIVE,
    priority: Priority.HIGH,
    budget: 45000,
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    clientId: 'client_demo_001',
    tenantId: defaultTenant._id.toString(),
    teamMembers: [developer._id.toString()],
    assignedAgents: [alexAgent._id.toString(), samAgent._id.toString()],
    progress: 35,
    tags: ['E-commerce', 'React', 'Node.js'],
    client: {
      name: 'Rachel Martinez',
      email: 'rachel@client.com',
      company: 'Demo E-commerce Inc.',
      phone: '+1-555-0123',
    },
    requirements: {
      functional: [
        'User authentication and registration',
        'Product catalog with search',
        'Shopping cart functionality',
        'Payment processing',
        'Order management',
      ],
      technical: [
        'React.js frontend with TypeScript',
        'Node.js backend with Express',
        'MongoDB database',
        'Stripe payment integration',
        'Responsive design',
      ],
      designSpecs: 'Modern, clean design with mobile-first approach. Brand colors: #2563eb, #1e40af.',
    },
    milestones: [
      {
        name: 'Planning & Design',
        description: 'Project setup, wireframes, and initial design',
        dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        status: 'completed',
        payment: 9000,
      },
      {
        name: 'Frontend Development',
        description: 'React components and user interface',
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        status: 'in_progress',
        payment: 18000,
      },
      {
        name: 'Backend & Integration',
        description: 'API development and system integration',
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        status: 'pending',
        payment: 18000,
      },
    ],
  });

  console.log(`✅ Created project: ${sampleProject.name} ($${sampleProject.budget.toLocaleString()})`);

  // Summary
  console.log('\n🎉 Initial data setup completed!\n');
  console.log('📊 SUMMARY:');
  console.log('===========');
  console.log(`✅ Tenant: ${defaultTenant.name}`);
  console.log('✅ Users: 3 total (1 Super Admin, 1 Tenant Admin, 1 Developer)');
  console.log('✅ AI Agents: 2 active agents');
  console.log('✅ Projects: 1 sample project ($45,000)');
  
  console.log('\n🔑 LOGIN CREDENTIALS:');
  console.log('====================');
  console.log('Super Admin:');
  console.log('  Email: admin@virtualit.com');
  console.log('  Password: admin123');
  console.log('');
  console.log('Tenant Admin:');
  console.log('  Email: admin@company.com');
  console.log('  Password: password123');
  console.log('');
  console.log('Developer:');
  console.log('  Email: sarah@company.com');
  console.log('  Password: password123');
  
  console.log('\n🚀 NEXT STEPS:');
  console.log('==============');
  console.log('1. Start development server: npm run dev');
  console.log('2. Visit: http://localhost:3000');
  console.log('3. Login with any credentials above');
  console.log('4. Explore the dashboard and AI agents!');
}

async function main() {
  try {
    console.log('🚀 Virtual IT Company Platform - Initial Data Setup\n');
    
    await connectDB();
    await clearData();
    await createInitialData();
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Setup complete - disconnected from MongoDB');
  }
}

main();