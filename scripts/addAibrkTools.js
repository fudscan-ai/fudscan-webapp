import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

const aibrkTools = [
  {
    id: 'aibrk_token_info',
    name: 'aibrk.token.info',
    displayName: 'AIBrk Token Information',
    description: 'Get comprehensive token information including price, market cap, holder data, and risk metrics from AIBrk. Use for detailed token analysis and red flag detection.',
    category: 'aibrk',
    endpoint: 'https://api.aibrk.xyz/v1/token/info',
    method: 'GET',
    parameters: {
      symbol: 'string',
      chain: 'string?'
    },
    scopes: ['aibrk:read'],
    isActive: true,
    isExternal: true
  },
  {
    id: 'aibrk_token_holders',
    name: 'aibrk.token.holders',
    displayName: 'AIBrk Token Holder Analysis',
    description: 'Analyze token holder distribution, whale concentration, and suspicious patterns. Critical for detecting centralization and rug pull risks.',
    category: 'aibrk',
    endpoint: 'https://api.aibrk.xyz/v1/token/holders',
    method: 'GET',
    parameters: {
      symbol: 'string',
      chain: 'string?',
      limit: 'number?'
    },
    scopes: ['aibrk:read'],
    isActive: true,
    isExternal: true
  },
  {
    id: 'aibrk_token_liquidity',
    name: 'aibrk.token.liquidity',
    displayName: 'AIBrk Liquidity Analysis',
    description: 'Check liquidity pool status, lock status, and withdrawal risks. Essential for identifying potential rug pulls and liquidity concerns.',
    category: 'aibrk',
    endpoint: 'https://api.aibrk.xyz/v1/token/liquidity',
    method: 'GET',
    parameters: {
      symbol: 'string',
      chain: 'string?'
    },
    scopes: ['aibrk:read'],
    isActive: true,
    isExternal: true
  },
  {
    id: 'aibrk_contract_audit',
    name: 'aibrk.contract.audit',
    displayName: 'AIBrk Smart Contract Audit',
    description: 'Automated contract security audit detecting hidden functions, backdoors, and malicious code patterns. Critical for security analysis.',
    category: 'aibrk',
    endpoint: 'https://api.aibrk.xyz/v1/contract/audit',
    method: 'GET',
    parameters: {
      address: 'string',
      chain: 'string?'
    },
    scopes: ['aibrk:read'],
    isActive: true,
    isExternal: true
  }
];

async function addAibrkTools() {
  try {
    console.log('🔧 Adding AIBrk API tools...\n');

    for (const tool of aibrkTools) {
      const result = await prisma.apiTool.upsert({
        where: { id: tool.id },
        update: tool,
        create: tool
      });
      console.log(`✓ Added/Updated: ${tool.name}`);
    }

    // Get the test client and assign these tools
    const client = await prisma.client.findFirst({
      where: { apiKey: 'test_api_key_12345' }
    });

    if (client) {
      console.log('\n📌 Assigning AIBrk tools to test client...');
      for (const tool of aibrkTools) {
        const exists = await prisma.clientApiTool.findUnique({
          where: {
            clientId_apiToolId: {
              clientId: client.id,
              apiToolId: tool.id
            }
          }
        });

        if (!exists) {
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
    }

    console.log('\n✅ AIBrk tools setup complete!');
    console.log(`📊 Total active tools: ${await prisma.apiTool.count({ where: { isActive: true } })}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addAibrkTools();
