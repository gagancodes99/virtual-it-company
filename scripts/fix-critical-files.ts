#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from 'fs';

const criticalFiles = [
  'src/app/docs/page.tsx',
  'src/shared/stores/useUIStore.ts',
  'src/shared/stores/useAuthStore.ts',
  'src/api/trpc/routers/agent.ts',
  'src/api/trpc/routers/tenant.ts',
  'src/api/trpc/routers/user.ts',
  'src/api/trpc/routers/project.ts',
  'src/api/trpc/routers/task.ts',
  'src/components/docs/DocNavigation.tsx',
  'src/components/docs/ProjectProgress.tsx',
  'src/components/docs/TaskStatus.tsx',
  'src/app/(protected)/dashboard/page.tsx',
  'src/app/(protected)/dashboard/agents/page.tsx'
];

async function fixCriticalFiles() {
  console.log('🔧 Fixing critical build-breaking files...');

  for (const file of criticalFiles) {
    try {
      const fullPath = `/Users/gagancodes/Desktop/Learn/virtual-it-company-platform/${file}`;
      let content = readFileSync(fullPath, 'utf-8');
      const originalContent = content;
      
      // Fix corrupted &apos; entities
      content = content.replace(/&apos;/g, "'");
      
      // Fix use client directive
      content = content.replace(/^use client;/, "'use client';");
      content = content.replace(/^use strict;/, "'use strict';");
      
      if (content !== originalContent) {
        writeFileSync(fullPath, content);
        console.log(`✅ Fixed ${file}`);
      }
    } catch (error) {
      console.log(`❌ Error fixing ${file}:`, error);
    }
  }

  console.log('🎉 Critical files fixed!');
}

fixCriticalFiles().catch(console.error);