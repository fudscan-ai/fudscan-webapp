// Quick diagnostic script to check production database setup
import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('🔍 Checking Production Database...\n');

  try {
    // Test 1: Database connection
    console.log('1️⃣ Testing database connection...');
    await prisma.$connect();
    console.log('   ✅ Connected to database\n');

    // Test 2: Check if tables exist
    console.log('2️⃣ Checking if tables exist...');
    try {
      const clientCount = await prisma.client.count();
      console.log(`   ✅ Client table exists (${clientCount} clients)\n`);
    } catch (e) {
      console.log('   ❌ Client table NOT found. Run migrations!\n');
      return;
    }

    // Test 3: Check for test client
    console.log('3️⃣ Checking for test client...');
    const testClient = await prisma.client.findFirst({
      where: { apiKey: 'test_api_key_12345' }
    });
    if (testClient) {
      console.log('   ✅ Test client found:', testClient.name, '\n');
    } else {
      console.log('   ❌ Test client NOT found. Run setupTestClient.js\n');
      return;
    }

    // Test 4: Check API tools
    console.log('4️⃣ Checking API tools...');
    const toolCount = await prisma.apiTool.count();
    console.log(`   Total API tools: ${toolCount}`);

    if (toolCount === 0) {
      console.log('   ❌ No API tools found. Run addRealApiTools.js\n');
      return;
    }

    const clientTools = await prisma.clientApiTool.count({
      where: { clientId: testClient.id }
    });
    console.log(`   Client API tools: ${clientTools}\n`);

    if (clientTools === 0) {
      console.log('   ❌ No tools assigned to client. Run addRealApiTools.js\n');
      return;
    }

    // Test 5: Check environment variables
    console.log('5️⃣ Checking environment variables...');
    console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
    console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}\n`);

    console.log('✅ All checks passed! Your database is ready.\n');

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
