const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// Import models
const User = require('../src/lib/database/models/User');
const Tenant = require('../src/lib/database/models/Tenant');
const AIAgent = require('../src/lib/database/models/AIAgent');
const Project = require('../src/lib/database/models/Project');

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

async function createInitialData() {
  try {
    console.log('🚀 Creating initial data...\n');

    // 1. Create Default Tenant
    console.log('1️⃣ Creating default tenant...');
    const defaultTenant = await Tenant.create({
      name: 'Virtual IT Company',
      domain: 'default',
      logo: null,
      isActive: true,
      subscription: {
        plan: 'professional',
        status: 'active',
        trialEnds: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
      },
      settings: {
        allowAIAgents: true,
        maxProjects: 25,
        maxUsers: 50,
        features: ['ai_agents', 'project_management', 'team_collaboration', 'client_portal', 'analytics'],
      },
      billing: {
        address: {
          street: '123 Tech Street',
          city: 'San Francisco',
          state: 'CA',
          country: 'USA',
          postalCode: '94105',
        },
      },
    });
    console.log(`✅ Created tenant: ${defaultTenant.name} (ID: ${defaultTenant._id})`);

    // 2. Create Super Admin User
    console.log('\n2️⃣ Creating super admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const superAdmin = await User.create({
      email: 'admin@virtualit.com',
      name: 'Super Admin',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      tenantId: defaultTenant._id.toString(),
      isActive: true,
      profile: {
        bio: 'Platform administrator with full system access',
        skills: ['System Administration', 'User Management', 'Analytics'],
        timezone: 'America/Los_Angeles',
      },
      notifications: {
        email: true,
        push: true,
        slack: false,
      },
    });
    console.log(`✅ Created super admin: ${superAdmin.email}`);

    // 3. Create Tenant Admin
    console.log('\n3️⃣ Creating tenant admin...');
    const tenantAdminPassword = await bcrypt.hash('password123', 12);
    const tenantAdmin = await User.create({
      email: 'admin@company.com',
      name: 'John Smith',
      password: tenantAdminPassword,
      role: 'TENANT_ADMIN',
      tenantId: defaultTenant._id.toString(),
      isActive: true,
      profile: {
        bio: 'Company administrator and founder',
        skills: ['Business Management', 'Project Planning', 'Client Relations'],
        hourlyRate: 150,
        timezone: 'America/New_York',
      },
      notifications: {
        email: true,
        push: true,
        slack: true,
      },
    });
    console.log(`✅ Created tenant admin: ${tenantAdmin.email}`);

    // 4. Create Team Members
    console.log('\n4️⃣ Creating team members...');
    const teamMembers = [
      {
        email: 'sarah.dev@company.com',
        name: 'Sarah Johnson',
        role: 'DEVELOPER',
        bio: 'Senior Full Stack Developer with 5+ years experience',
        skills: ['React', 'Node.js', 'TypeScript', 'MongoDB', 'AWS'],
        hourlyRate: 85,
      },
      {
        email: 'mike.design@company.com',
        name: 'Mike Chen',
        role: 'DESIGNER',
        bio: 'UI/UX Designer specialized in modern web applications',
        skills: ['Figma', 'Adobe Creative Suite', 'User Research', 'Prototyping'],
        hourlyRate: 75,
      },
      {
        email: 'emma.pm@company.com',
        name: 'Emma Wilson',
        role: 'PROJECT_MANAGER',
        bio: 'Experienced project manager with agile methodology expertise',
        skills: ['Agile', 'Scrum', 'Project Planning', 'Risk Management', 'Client Communication'],
        hourlyRate: 95,
      },
    ];

    for (const member of teamMembers) {
      const memberPassword = await bcrypt.hash('password123', 12);
      const user = await User.create({
        email: member.email,
        name: member.name,
        password: memberPassword,
        role: member.role,
        tenantId: defaultTenant._id.toString(),
        isActive: true,
        profile: {
          bio: member.bio,
          skills: member.skills,
          hourlyRate: member.hourlyRate,
          timezone: 'America/New_York',
        },
        notifications: {
          email: true,
          push: true,
          slack: false,
        },
      });
      console.log(`✅ Created team member: ${user.email} (${user.role})`);
    }

    // 5. Create AI Agents
    console.log('\n5️⃣ Creating AI agents...');
    const aiAgents = [
      {
        name: 'Alex Frontend Developer',
        type: 'Frontend Developer',
        description: 'Specialized in React, TypeScript, and modern frontend frameworks. Expert at creating responsive UIs, optimizing performance, and implementing best practices for web development.',
        skills: ['React', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'Next.js', 'HTML5', 'CSS3', 'Responsive Design'],
        model: {
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000,
        },
        capabilities: {
          languages: ['JavaScript', 'TypeScript', 'HTML', 'CSS'],
          frameworks: ['React', 'Next.js', 'Vue.js', 'Angular'],
          specializations: ['Frontend Development', 'UI Implementation', 'Performance Optimization', 'Component Design'],
          tools: ['VS Code', 'Figma', 'Chrome DevTools', 'Webpack', 'Vite'],
        },
        performance: {
          tasksCompleted: 47,
          averageRating: 4.8,
          reliability: 96,
          responseTimeMs: 2200,
        },
        status: 'ACTIVE',
      },
      {
        name: 'Sam Backend Engineer',
        type: 'Backend Developer',
        description: 'Expert in Node.js, Python, and database design. Handles API development, server architecture, microservices, and DevOps tasks with focus on scalability and security.',
        skills: ['Node.js', 'Python', 'PostgreSQL', 'MongoDB', 'Docker', 'AWS', 'REST APIs', 'GraphQL'],
        model: {
          provider: 'anthropic',
          model: 'claude-3-sonnet',
          temperature: 0.5,
          maxTokens: 3000,
        },
        capabilities: {
          languages: ['JavaScript', 'Python', 'SQL', 'Bash'],
          frameworks: ['Express.js', 'FastAPI', 'Django', 'NestJS'],
          specializations: ['Backend Development', 'API Design', 'Database Optimization', 'System Architecture'],
          tools: ['VS Code', 'Docker', 'Postman', 'AWS CLI', 'Kubernetes'],
        },
        performance: {
          tasksCompleted: 23,
          averageRating: 4.6,
          reliability: 89,
          responseTimeMs: 3100,
        },
        status: 'ACTIVE',
      },
      {
        name: 'Luna UI/UX Designer',
        type: 'Designer',
        description: 'Creative UI/UX designer with expertise in user research, wireframing, prototyping, and creating beautiful, user-centered digital experiences.',
        skills: ['UI Design', 'UX Research', 'Figma', 'Adobe XD', 'Prototyping', 'User Testing', 'Design Systems'],
        model: {
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.8,
          maxTokens: 2500,
        },
        capabilities: {
          languages: ['Design Language', 'HTML', 'CSS'],
          frameworks: ['Design Systems', 'Material Design', 'Human Interface Guidelines'],
          specializations: ['UI/UX Design', 'User Research', 'Interaction Design', 'Visual Design'],
          tools: ['Figma', 'Adobe Creative Suite', 'Sketch', 'InVision', 'Miro'],
        },
        performance: {
          tasksCompleted: 31,
          averageRating: 4.9,
          reliability: 94,
          responseTimeMs: 2800,
        },
        status: 'ACTIVE',
      },
      {
        name: 'DataBot Analyst',
        type: 'Data Analyst',
        description: 'AI specialist in data analysis, reporting, and business intelligence. Capable of processing large datasets, creating visualizations, and providing actionable insights.',
        skills: ['Data Analysis', 'SQL', 'Python', 'Data Visualization', 'Statistics', 'Business Intelligence'],
        model: {
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.3,
          maxTokens: 3500,
        },
        capabilities: {
          languages: ['Python', 'R', 'SQL', 'JavaScript'],
          frameworks: ['Pandas', 'NumPy', 'Matplotlib', 'Tableau', 'Power BI'],
          specializations: ['Data Analysis', 'Statistical Modeling', 'Data Visualization', 'Business Intelligence'],
          tools: ['Jupyter', 'Tableau', 'Power BI', 'Excel', 'Google Analytics'],
        },
        performance: {
          tasksCompleted: 15,
          averageRating: 4.7,
          reliability: 92,
          responseTimeMs: 4200,
        },
        status: 'TRAINING',
      },
    ];

    for (const agent of aiAgents) {
      const aiAgent = await AIAgent.create({
        ...agent,
        tenantId: defaultTenant._id.toString(),
        settings: {
          workingHours: {
            start: '09:00',
            end: '17:00',
            timezone: 'UTC',
          },
          responseTime: 300,
          maxConcurrentTasks: 3,
          autoAssign: agent.status === 'ACTIVE',
        },
        training: {
          datasets: ['web_development', 'best_practices', 'project_examples'],
          accuracy: Math.random() * 20 + 80, // 80-100%
        },
      });
      console.log(`✅ Created AI agent: ${aiAgent.name} (${aiAgent.type}) - Status: ${aiAgent.status}`);
    }

    // 6. Create Sample Projects
    console.log('\n6️⃣ Creating sample projects...');
    const projects = [
      {
        name: 'E-commerce Platform Redesign',
        description: 'Complete redesign and development of a modern e-commerce platform with improved user experience, mobile responsiveness, and integrated payment systems.',
        budget: 45000,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        priority: 'HIGH',
        status: 'ACTIVE',
        progress: 65,
        client: {
          name: 'Rachel Martinez',
          email: 'rachel@ecommerce-client.com',
          company: 'Fashion Forward Inc.',
          phone: '+1-555-0123',
        },
        requirements: {
          functional: [
            'User registration and authentication',
            'Product catalog with search and filtering',
            'Shopping cart and checkout process',
            'Payment integration (Stripe, PayPal)',
            'Order tracking and history',
            'Admin dashboard for inventory management',
          ],
          technical: [
            'React.js frontend with TypeScript',
            'Node.js backend with Express',
            'MongoDB database',
            'AWS S3 for image storage',
            'Responsive design for mobile devices',
            'SEO optimization',
          ],
          designSpecs: 'Modern, clean design with focus on user experience. Brand colors: #2563eb, #1e40af. Mobile-first approach.',
        },
        tags: ['E-commerce', 'React', 'Node.js', 'MongoDB', 'Stripe'],
        milestones: [
          {
            name: 'Discovery & Planning',
            description: 'Requirements gathering, wireframes, and project planning',
            dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            status: 'completed',
            payment: 9000,
          },
          {
            name: 'Design & Prototyping',
            description: 'UI/UX design, prototypes, and design system creation',
            dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            status: 'completed',
            payment: 11000,
          },
          {
            name: 'Frontend Development',
            description: 'React components, pages, and user interface implementation',
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
            status: 'in_progress',
            payment: 15000,
          },
          {
            name: 'Backend & Integration',
            description: 'API development, database setup, and third-party integrations',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'pending',
            payment: 10000,
          },
        ],
      },
      {
        name: 'Mobile Banking App',
        description: 'Development of a secure mobile banking application with biometric authentication, transaction history, and real-time notifications.',
        budget: 75000,
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        priority: 'URGENT',
        status: 'ACTIVE',
        progress: 25,
        client: {
          name: 'David Thompson',
          email: 'david.thompson@communitybank.com',
          company: 'Community Bank Solutions',
          phone: '+1-555-0456',
        },
        requirements: {
          functional: [
            'Biometric authentication (Face ID, Touch ID)',
            'Account balance and transaction history',
            'Money transfers between accounts',
            'Bill payment functionality',
            'ATM and branch locator',
            'Push notifications for transactions',
            'Customer support chat',
          ],
          technical: [
            'React Native for cross-platform development',
            'Secure API integration with banking systems',
            'Encrypted data storage',
            'PCI DSS compliance',
            'Multi-factor authentication',
            'Real-time transaction processing',
          ],
          designSpecs: 'Professional, trustworthy design with emphasis on security. Clean interface with easy navigation. Brand colors: #1a365d, #2d3748.',
        },
        tags: ['Mobile App', 'React Native', 'Banking', 'Security', 'FinTech'],
        milestones: [
          {
            name: 'Security Assessment & Planning',
            description: 'Security requirements, compliance review, and architecture planning',
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            status: 'in_progress',
            payment: 15000,
          },
          {
            name: 'Core Features Development',
            description: 'Authentication, account views, and basic transactions',
            dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
            status: 'pending',
            payment: 30000,
          },
          {
            name: 'Advanced Features & Testing',
            description: 'Additional features, security testing, and compliance verification',
            dueDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
            status: 'pending',
            payment: 20000,
          },
          {
            name: 'Deployment & Launch',
            description: 'App store submission, deployment, and launch support',
            dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            status: 'pending',
            payment: 10000,
          },
        ],
      },
      {
        name: 'Corporate Website Refresh',
        description: 'Modern website redesign for a consulting firm with focus on lead generation, SEO optimization, and content management.',
        budget: 18000,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        priority: 'MEDIUM',
        status: 'ACTIVE',
        progress: 80,
        client: {
          name: 'Amanda Foster',
          email: 'amanda@strategyconsulting.com',
          company: 'Strategy Consulting Group',
          phone: '+1-555-0789',
        },
        requirements: {
          functional: [
            'Homepage with company overview',
            'Services pages with detailed descriptions',
            'About us and team profiles',
            'Blog/insights section',
            'Contact forms and lead capture',
            'Case studies and portfolio',
            'Client testimonials',
          ],
          technical: [
            'Next.js for SEO optimization',
            'Headless CMS for content management',
            'Responsive design',
            'Fast loading times',
            'Google Analytics integration',
            'Contact form automation',
          ],
          designSpecs: 'Professional, modern design that builds trust. Clean layout with good use of whitespace. Brand colors: #059669, #047857.',
        },
        tags: ['Website', 'Next.js', 'CMS', 'SEO', 'Lead Generation'],
        milestones: [
          {
            name: 'Content Strategy & Wireframes',
            description: 'Content audit, strategy development, and wireframe creation',
            dueDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            status: 'completed',
            payment: 4500,
          },
          {
            name: 'Design & Development',
            description: 'Visual design and website development',
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            status: 'in_progress',
            payment: 10500,
          },
          {
            name: 'Content Migration & Launch',
            description: 'Content migration, testing, and website launch',
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
            status: 'pending',
            payment: 3000,
          },
        ],
      },
    ];

    const createdProjects = [];
    for (const project of projects) {
      const newProject = await Project.create({
        ...project,
        tenantId: defaultTenant._id.toString(),
        clientId: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        teamMembers: [], // Will be assigned later
        assignedAgents: [], // Will be assigned later
      });
      createdProjects.push(newProject);
      console.log(`✅ Created project: ${newProject.name} ($${newProject.budget.toLocaleString()})`);
    }

    // 7. Assign team members and agents to projects
    console.log('\n7️⃣ Assigning team members and AI agents to projects...');
    
    const allUsers = await User.find({ tenantId: defaultTenant._id.toString() });
    const allAgents = await AIAgent.find({ tenantId: defaultTenant._id.toString() });
    
    // Assign to E-commerce project
    if (createdProjects[0]) {
      const frontendDev = allUsers.find(u => u.email === 'sarah.dev@company.com');
      const designer = allUsers.find(u => u.email === 'mike.design@company.com');
      const pm = allUsers.find(u => u.email === 'emma.pm@company.com');
      const alexAgent = allAgents.find(a => a.name === 'Alex Frontend Developer');
      const samAgent = allAgents.find(a => a.name === 'Sam Backend Engineer');
      const lunaAgent = allAgents.find(a => a.name === 'Luna UI/UX Designer');
      
      await Project.findByIdAndUpdate(createdProjects[0]._id, {
        teamMembers: [frontendDev?._id, designer?._id, pm?._id].filter(Boolean),
        assignedAgents: [alexAgent?._id, samAgent?._id, lunaAgent?._id].filter(Boolean),
      });
      console.log(`✅ Assigned team to: ${createdProjects[0].name}`);
    }

    // Assign to Mobile Banking project
    if (createdProjects[1]) {
      const frontendDev = allUsers.find(u => u.email === 'sarah.dev@company.com');
      const pm = allUsers.find(u => u.email === 'emma.pm@company.com');
      const samAgent = allAgents.find(a => a.name === 'Sam Backend Engineer');
      const lunaAgent = allAgents.find(a => a.name === 'Luna UI/UX Designer');
      
      await Project.findByIdAndUpdate(createdProjects[1]._id, {
        teamMembers: [frontendDev?._id, pm?._id].filter(Boolean),
        assignedAgents: [samAgent?._id, lunaAgent?._id].filter(Boolean),
      });
      console.log(`✅ Assigned team to: ${createdProjects[1].name}`);
    }

    // Assign to Corporate Website project
    if (createdProjects[2]) {
      const designer = allUsers.find(u => u.email === 'mike.design@company.com');
      const alexAgent = allAgents.find(a => a.name === 'Alex Frontend Developer');
      const lunaAgent = allAgents.find(a => a.name === 'Luna UI/UX Designer');
      
      await Project.findByIdAndUpdate(createdProjects[2]._id, {
        teamMembers: [designer?._id].filter(Boolean),
        assignedAgents: [alexAgent?._id, lunaAgent?._id].filter(Boolean),
      });
      console.log(`✅ Assigned team to: ${createdProjects[2].name}`);
    }

    console.log('\n🎉 Initial data setup completed successfully!\n');

    // Print summary
    console.log('📊 SETUP SUMMARY:');
    console.log('================');
    console.log(`✅ Tenant: ${defaultTenant.name} (${defaultTenant.domain})`);
    console.log(`✅ Users: ${allUsers.length} total`);
    console.log(`   - 1 Super Admin (admin@virtualit.com)`);
    console.log(`   - 1 Tenant Admin (admin@company.com)`);
    console.log(`   - ${allUsers.length - 2} Team Members`);
    console.log(`✅ AI Agents: ${allAgents.length} total`);
    console.log(`   - ${allAgents.filter(a => a.status === 'ACTIVE').length} Active`);
    console.log(`   - ${allAgents.filter(a => a.status === 'TRAINING').length} Training`);
    console.log(`✅ Projects: ${createdProjects.length} total`);
    console.log(`   - Total Value: $${createdProjects.reduce((sum, p) => sum + p.budget, 0).toLocaleString()}`);
    
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
    console.log('Team Members (all use password: password123):');
    console.log('  - sarah.dev@company.com (Developer)');
    console.log('  - mike.design@company.com (Designer)');
    console.log('  - emma.pm@company.com (Project Manager)');
    
    console.log('\n🚀 Next Steps:');
    console.log('=============');
    console.log('1. Start your development server: npm run dev');
    console.log('2. Visit: http://localhost:3000');
    console.log('3. Login with any of the above credentials');
    console.log('4. Explore the dashboard, projects, and AI agents!');
    
  } catch (error) {
    console.error('❌ Error creating initial data:', error);
    throw error;
  }
}

async function clearExistingData() {
  console.log('🧹 Clearing existing data...');
  
  try {
    await User.deleteMany({});
    await Tenant.deleteMany({});
    await AIAgent.deleteMany({});
    await Project.deleteMany({});
    console.log('✅ Existing data cleared');
  } catch (error) {
    console.log('⚠️ No existing data to clear or error clearing:', error.message);
  }
}

async function main() {
  try {
    await connectDB();
    
    console.log('🚀 Virtual IT Company Platform - Initial Data Setup\n');
    console.log('This script will create sample data for your platform including:');
    console.log('- Default tenant organization');
    console.log('- Admin and team member accounts');
    console.log('- AI agents with different specializations');
    console.log('- Sample projects with realistic data\n');

    // Ask for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('⚠️  This will clear all existing data. Continue? (y/N): ', async (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        try {
          await clearExistingData();
          await createInitialData();
        } catch (error) {
          console.error('❌ Setup failed:', error);
        } finally {
          rl.close();
          await mongoose.disconnect();
          console.log('\n👋 Disconnected from MongoDB');
        }
      } else {
        console.log('❌ Setup cancelled');
        rl.close();
        await mongoose.disconnect();
      }
    });

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createInitialData, clearExistingData };