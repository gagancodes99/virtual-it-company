#!/usr/bin/env tsx

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

// Import mapping rules
const importMappings = {
  // AI Core imports
  '@/lib/ai/agent-executor': '@/core/ai/execution/agent-executor',
  '@/lib/ai/llm-client': '@/core/ai/llm/llm-client',
  '@/lib/ai/llm-router': '@/core/ai/llm/llm-router',
  '@/lib/agents/agent-pool': '@/core/ai/agents/agent-pool',
  '@/lib/workflows/project-state-machine': '@/core/ai/workflows/project-state-machine',

  // Infrastructure imports
  '@/lib/database/connection': '@/infrastructure/database/connection',
  '@/lib/database/models/AIAgent': '@/infrastructure/database/models/AIAgent',
  '@/lib/database/models/Project': '@/infrastructure/database/models/Project',
  '@/lib/database/models/Tenant': '@/infrastructure/database/models/Tenant',
  '@/lib/database/models/User': '@/infrastructure/database/models/User',
  '@/lib/queue/task-queue': '@/infrastructure/queue/task-queue',
  '@/lib/socket/socket-server': '@/infrastructure/realtime/socket-server',
  '@/lib/socket/socket-client': '@/infrastructure/realtime/socket-client',
  '@/lib/integrations/email/email-service': '@/infrastructure/email/email-service',
  '@/lib/integrations/storage/file-storage': '@/infrastructure/storage/file-storage',
  '@/lib/deployment/deployment-service': '@/infrastructure/deployment/deployment-service',

  // External integrations
  '@/lib/integrations/github/github-client': '@/integrations/github/github-client',
  '@/lib/integrations/github/project-repository': '@/integrations/github/project-repository',

  // API imports
  '@/lib/trpc/server': '@/api/trpc/server',
  '@/lib/trpc/client': '@/api/trpc/client',
  '@/lib/trpc/context': '@/api/trpc/context',
  '@/lib/trpc/routers': '@/api/trpc/routers',

  // Shared imports
  '@/lib/auth/config': '@/shared/auth/config',
  '@/lib/utils': '@/shared/utils',
  '@/stores/useAuthStore': '@/shared/stores/useAuthStore',
  '@/stores/useUIStore': '@/shared/stores/useUIStore',
  '@/types': '@/shared/types',
  '@/lib/validations': '@/shared/validations',

  // Relative imports within moved files
  './llm-client': '../llm/llm-client',
  './llm-router': '../llm/llm-router',
  './agent-executor': '../execution/agent-executor',
  './agent-pool': '../agents/agent-pool',
  './project-state-machine': '../workflows/project-state-machine',
};

async function findAllTsFiles(): Promise<string[]> {
  const patterns = [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.d.ts',
    '!node_modules/**',
  ];

  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, { cwd: process.cwd() });
    files.push(...matches);
  }

  return files;
}

async function updateImportsInFile(filePath: string): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    let updatedContent = content;

    // Update each import mapping
    for (const [oldImport, newImport] of Object.entries(importMappings)) {
      // Handle both single quotes and double quotes
      const patterns = [
        new RegExp(`from ['"]${oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'),
        new RegExp(`import\\s*\\(\\s*['"]${oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\s*\\)`, 'g'),
      ];

      for (const pattern of patterns) {
        updatedContent = updatedContent.replace(pattern, (match) => {
          return match.replace(oldImport, newImport);
        });
      }
    }

    // Only write if content changed
    if (updatedContent !== content) {
      await fs.writeFile(filePath, updatedContent, 'utf8');
      console.log(`✅ Updated imports in: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error);
  }
}

async function fixAllImports(): Promise<void> {
  console.log('🔧 Starting import path fixes...\n');

  const files = await findAllTsFiles();
  console.log(`Found ${files.length} TypeScript files to check\n`);

  for (const file of files) {
    await updateImportsInFile(file);
  }

  console.log('\n✨ Import path fixes completed!');
}

// Run the script
if (require.main === module) {
  fixAllImports().catch(console.error);
}

export { fixAllImports };