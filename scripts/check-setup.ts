import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-it-company';
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
const NEXTAUTH_URL = process.env.NEXTAUTH_URL;

async function checkMongoDB() {
  try {
    console.log('🔍 Checking MongoDB connection...');
    await mongoose.connect(MONGODB_URI);
    
    // Check collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Found ${collections.length} collections:`, collectionNames);
    
    // Check data counts
    const tenants = await mongoose.connection.db.collection('tenants').countDocuments();
    const users = await mongoose.connection.db.collection('users').countDocuments();
    const agents = await mongoose.connection.db.collection('aiagents').countDocuments();
    const projects = await mongoose.connection.db.collection('projects').countDocuments();
    
    console.log('📈 Data counts:');
    console.log(`   - Tenants: ${tenants}`);
    console.log(`   - Users: ${users}`);
    console.log(`   - AI Agents: ${agents}`);
    console.log(`   - Projects: ${projects}`);
    
    if (tenants === 0 || users === 0) {
      console.log('⚠️  No initial data found. Run: npm run init-data');
    }
    
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    return false;
  }
}

function checkEnvironmentVariables() {
  console.log('\n🔍 Checking environment variables...');
  
  const required = ['MONGODB_URI', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];
  const optional = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_CLIENT_ID', 'GITHUB_CLIENT_ID'];
  
  let allGood = true;
  
  // Check required variables
  for (const varName of required) {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: Set`);
    } else {
      console.log(`❌ ${varName}: Missing`);
      allGood = false;
    }
  }
  
  // Check optional variables
  console.log('\n🔧 Optional variables:');
  for (const varName of optional) {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: Set`);
    } else {
      console.log(`⚠️  ${varName}: Not set (AI features may be limited)`);
    }
  }
  
  if (!allGood) {
    console.log('\n💡 Create .env.local file with required variables');
    console.log('   Copy from .env.example and fill in your values');
  }
  
  return allGood;
}

function checkNodeModules() {
  console.log('\n🔍 Checking dependencies...');
  try {
    require('next');
    require('react');
    require('mongoose');
    require('next-auth');
    console.log('✅ Core dependencies installed');
    return true;
  } catch (error) {
    console.log('❌ Dependencies missing. Run: npm install');
    return false;
  }
}

async function main() {
  console.log('🚀 Virtual IT Company Platform - Setup Check\n');
  
  let allChecksPass = true;
  
  // Check Node modules
  if (!checkNodeModules()) {
    allChecksPass = false;
  }
  
  // Check environment variables
  if (!checkEnvironmentVariables()) {
    allChecksPass = false;
  }
  
  // Check MongoDB
  if (!await checkMongoDB()) {
    allChecksPass = false;
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allChecksPass) {
    console.log('🎉 All checks passed! Your setup looks good.');
    console.log('\n🚀 Ready to start:');
    console.log('   npm run dev');
    console.log('\n🌐 Then visit: http://localhost:3000');
  } else {
    console.log('⚠️  Some issues found. Please fix them before starting.');
    console.log('\n🔧 Common fixes:');
    console.log('   1. npm install');
    console.log('   2. Copy .env.example to .env.local');
    console.log('   3. Start MongoDB');
    console.log('   4. npm run init-data');
  }
}

main().catch(console.error);