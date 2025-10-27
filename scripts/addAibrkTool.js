import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function addAibrkTool() {
  try {
    console.log('🔧 Adding AIBRK API tool...\n');

    // Check if AIBRK tool already exists
    const existingTool = await prisma.apiTool.findFirst({
      where: { name: 'aibrk.analyze' }
    });

    if (existingTool) {
      console.log('⚠️  AIBRK tool already exists:', existingTool.id);
      return existingTool;
    }

    // Create AIBRK tool
    const aibrkTool = await prisma.apiTool.create({
      data: {
        id: 'aibrk-analyze-tool',
        name: 'aibrk.analyze',
        displayName: 'AIBRK Analysis',
        description: 'AIBRK AI-powered token analysis and workflow orchestration',
        category: 'aibrk',
        endpoint: 'https://www.aibrk.xyz/api/ai/ask',
        method: 'GET',
        parameters: {
          query: 'string',
          options: 'object'
        },
        scopes: ['read:tokens', 'analyze:risk'],
        isExternal: true,
        isActive: true
      }
    });

    console.log('✅ Created AIBRK tool:', aibrkTool.id);

    // Get the FUDSCAN client
    const client = await prisma.client.findFirst({
      where: {
        OR: [
          { apiKey: 'test_api_key_12345' },
          { id: 'fudscan-default' }
        ]
      }
    });

    if (!client) {
      console.log('❌ No client found! Please run checkClient.js first');
      return;
    }

    console.log('📌 Client found:', client.id);

    // Assign AIBRK tool to client
    const assignment = await prisma.clientApiTool.create({
      data: {
        clientId: client.id,
        apiToolId: aibrkTool.id,
        isEnabled: true
      }
    });

    console.log('✅ Assigned AIBRK tool to client');

    // Verify total tools assigned
    const totalTools = await prisma.clientApiTool.count({
      where: { clientId: client.id }
    });

    console.log(`\n📊 Total tools assigned to ${client.id}: ${totalTools}`);

    return aibrkTool;

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addAibrkTool();
