import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function setupTestClient() {
  try {
    console.log('🔍 Checking for existing client...');

    // Find or create a test client
    let client = await prisma.client.findFirst({
      where: { apiKey: 'test_api_key_12345' }
    });

    if (!client) {
      console.log('📝 Creating test client...');
      client = await prisma.client.create({
        data: {
          name: 'FUDSCAN Test Client',
          apiKey: 'test_api_key_12345',
          isActive: true,
          instructions: 'You are FUDSCAN - an AI-powered crypto risk scanner. Focus on identifying red flags, suspicious patterns, and providing thorough due diligence for crypto investments.'
        }
      });
      console.log('✓ Created client:', client.name);
    } else {
      console.log('✓ Found existing client:', client.name);
    }

    // Get all API tools
    const apiTools = await prisma.apiTool.findMany({
      where: { isActive: true }
    });

    console.log(`\n📊 Found ${apiTools.length} active API tools`);

    // Assign all API tools to the client
    console.log('\n🔗 Assigning API tools to client...');
    for (const tool of apiTools) {
      const existing = await prisma.clientApiTool.findUnique({
        where: {
          clientId_apiToolId: {
            clientId: client.id,
            apiToolId: tool.id
          }
        }
      });

      if (!existing) {
        await prisma.clientApiTool.create({
          data: {
            clientId: client.id,
            apiToolId: tool.id,
            isEnabled: true
          }
        });
        console.log(`  ✓ Assigned: ${tool.name}`);
      } else {
        console.log(`  ⏭️  Already assigned: ${tool.name}`);
      }
    }

    // Verify the setup
    const clientWithTools = await prisma.client.findUnique({
      where: { id: client.id },
      include: {
        clientApiTools: {
          where: { isEnabled: true },
          include: { apiTool: true }
        }
      }
    });

    console.log(`\n✅ Setup complete!`);
    console.log(`📌 Client: ${clientWithTools.name}`);
    console.log(`🔑 API Key: ${clientWithTools.apiKey}`);
    console.log(`🛠️  Enabled Tools: ${clientWithTools.clientApiTools.length}`);
    console.log(`\n📋 Available tools:`);
    clientWithTools.clientApiTools.forEach((ct, idx) => {
      console.log(`  ${idx + 1}. ${ct.apiTool.name} (${ct.apiTool.category})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestClient();
