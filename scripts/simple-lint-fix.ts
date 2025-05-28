#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

async function fixSimpleLintIssues() {
  console.log('🔍 Finding TypeScript files...');
  
  const files = await glob('src/**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts']
  });

  console.log(`📝 Processing ${files.length} files...`);

  let totalFixes = 0;

  for (const file of files) {
    try {
      let content = readFileSync(file, 'utf-8');
      let fixes = 0;
      
      // Remove unused error parameters in catch blocks (simple pattern)
      content = content.replace(/} catch \(error\) \{/g, '} catch {');
      
      // Remove commented out unused variable declarations  
      content = content.replace(/\/\/ const agents = .*\n/g, '');
      content = content.replace(/\/\/ const targetAgent = .*\n/g, '');
      
      // Fix React entities only in JSX files
      if (file.endsWith('.tsx')) {
        const originalContent = content;
        content = content.replace(/'(?=s|t\s)/g, '&apos;');
        if (content !== originalContent) {
          fixes++;
        }
      }
      
      if (fixes > 0) {
        writeFileSync(file, content);
        console.log(`✅ Fixed ${fixes} issues in ${file}`);
        totalFixes += fixes;
      }
    } catch (error) {
      console.log(`❌ Error processing ${file}:`, error);
    }
  }

  console.log(`🎉 Total fixes applied: ${totalFixes}`);
}

fixSimpleLintIssues().catch(console.error);