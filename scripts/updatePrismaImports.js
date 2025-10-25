#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find all files that import PrismaClient
const findPrismaFiles = () => {
  try {
    const result = execSync('grep -r "new PrismaClient" src/pages/api --include="*.js" -l', { 
      encoding: 'utf8',
      cwd: process.cwd()
    });
    return result.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.log('No files found with PrismaClient imports');
    return [];
  }
};

// Update a single file
const updateFile = (filePath) => {
  console.log(`Updating ${filePath}...`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Replace import statement
    const oldImport = /import\s*{\s*PrismaClient\s*}\s*from\s*['"]@prisma\/client['"];?\s*\n/g;
    if (oldImport.test(content)) {
      content = content.replace(oldImport, '');
      
      // Add new import at the top (after existing imports)
      const importMatch = content.match(/^((?:import.*\n)*)/);
      if (importMatch) {
        const existingImports = importMatch[1];
        if (!existingImports.includes("import prisma from '@/lib/prisma'")) {
          content = content.replace(importMatch[1], existingImports + "import prisma from '@/lib/prisma';\n");
        }
      } else {
        // No existing imports, add at the top
        content = "import prisma from '@/lib/prisma';\n" + content;
      }
      modified = true;
    }

    // Remove const prisma = new PrismaClient(); lines
    const prismaConstRegex = /const\s+prisma\s*=\s*new\s+PrismaClient\([^)]*\);\s*\n?/g;
    if (prismaConstRegex.test(content)) {
      content = content.replace(prismaConstRegex, '');
      modified = true;
    }

    // Remove finally blocks with prisma.$disconnect()
    const finallyRegex = /\s*} finally {\s*await prisma\.\$disconnect\(\);\s*}/g;
    if (finallyRegex.test(content)) {
      content = content.replace(finallyRegex, '\n  }');
      modified = true;
    }

    // Remove standalone prisma.$disconnect() calls in finally blocks
    const disconnectRegex = /finally\s*{\s*await\s+prisma\.\$disconnect\(\);\s*}/g;
    if (disconnectRegex.test(content)) {
      content = content.replace(disconnectRegex, '');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  No changes needed for ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
};

// Main execution
const main = () => {
  console.log('🔍 Finding files with PrismaClient imports...');
  const files = findPrismaFiles();
  
  if (files.length === 0) {
    console.log('No files found to update.');
    return;
  }

  console.log(`Found ${files.length} files to update:`);
  files.forEach(file => console.log(`  - ${file}`));
  console.log('');

  let updatedCount = 0;
  files.forEach(file => {
    if (updateFile(file)) {
      updatedCount++;
    }
  });

  console.log(`\n🎉 Update complete! ${updatedCount}/${files.length} files updated.`);
  console.log('\n📝 Summary of changes:');
  console.log('  - Replaced PrismaClient imports with unified prisma import');
  console.log('  - Removed individual PrismaClient instantiations');
  console.log('  - Removed prisma.$disconnect() calls (using singleton pattern)');
  console.log('  - SQL logging is now enabled in development mode');
};

// Run the main function
main();
