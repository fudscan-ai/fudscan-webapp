#!/usr/bin/env node

import prisma, { checkDatabaseConnection } from '../src/lib/prisma.js';

async function testPrismaConfig() {
  console.log('🔍 Testing Prisma configuration...\n');

  try {
    // Test database connection
    console.log('1. Testing database connection...');
    const isConnected = await checkDatabaseConnection();
    
    if (isConnected) {
      console.log('✅ Database connection successful');
    } else {
      console.log('❌ Database connection failed');
      return;
    }

    // Test a simple query to see SQL logging
    console.log('\n2. Testing SQL logging with a simple query...');
    const clientCount = await prisma.client.count();
    console.log(`📊 Found ${clientCount} clients in database`);

    // Test another query
    console.log('\n3. Testing another query...');
    const kbCount = await prisma.knowledgeBase.count();
    console.log(`📚 Found ${kbCount} knowledge bases in database`);

    console.log('\n🎉 Prisma configuration test completed successfully!');
    console.log('\n📝 What to look for:');
    console.log('  - SQL queries should be logged above (if in development mode)');
    console.log('  - Each query should show: Query, Params, and Duration');
    console.log('  - No connection errors should occur');

  } catch (error) {
    console.error('❌ Error testing Prisma configuration:', error);
  }
}

// Run the test
testPrismaConfig();
