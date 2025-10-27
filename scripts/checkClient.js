import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function checkClient() {
  try {
    // Check if client exists
    const client = await prisma.client.findFirst({
      where: {
        OR: [
          { apiKey: 'test_api_key_12345' },
          { id: 'fudscan-default' }
        ]
      }
    });

    if (!client) {
      console.log('❌ No client found!');
      console.log('Creating default client...\n');

      const newClient = await prisma.client.create({
        data: {
          id: 'fudscan-default',
          name: 'FUDSCAN Default Client',
          apiKey: 'test_api_key_12345',
          isActive: true
        }
      });
      console.log('✅ Created client:', newClient.id);
      return newClient;
    }

    console.log('✅ Client found:', client.id, '-', client.name);

    // Check tools
    const toolAssignments = await prisma.clientApiTool.findMany({
      where: { clientId: client.id },
      include: { apiTool: true }
    });

    console.log(`\n📊 Tools assigned to ${client.id}: ${toolAssignments.length}`);

    if (toolAssignments.length === 0) {
      console.log('⚠️  No tools assigned! Assigning all tools...\n');

      const allTools = await prisma.apiTool.findMany({
        where: { isActive: true }
      });

      for (const tool of allTools) {
        await prisma.clientApiTool.create({
          data: {
            clientId: client.id,
            apiToolId: tool.id,
            isEnabled: true
          }
        });
        console.log(`  ✓ Assigned: ${tool.name}`);
      }

      console.log(`\n✅ Assigned ${allTools.length} tools`);
    } else {
      toolAssignments.forEach(t => {
        console.log(`  - ${t.apiTool.name} (${t.apiTool.category})`);
      });
    }

    return client;

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkClient();
