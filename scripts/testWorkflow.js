import { PrismaClient } from '../src/generated/prisma/index.js';
import { AIWorkflowOrchestrator } from '../src/lib/ai-workflow.js';

const aiWorkflow = new AIWorkflowOrchestrator();

const prisma = new PrismaClient();

async function testWorkflow() {
  try {
    console.log('🧪 Testing AI Workflow Orchestrator\n');

    // Get test client
    const client = await prisma.client.findFirst({
      where: { apiKey: 'test_api_key_12345' },
      include: {
        knowledgeBases: { where: { isActive: true } }
      }
    });

    if (!client) {
      console.error('❌ Test client not found. Run: node scripts/setupTestClient.js');
      return;
    }

    // Get API tools
    const apiTools = await prisma.apiTool.findMany({
      where: {
        isActive: true,
        clientApiTools: {
          some: {
            clientId: client.id,
            isEnabled: true
          }
        }
      }
    });

    console.log(`✓ Found client: ${client.name}`);
    console.log(`✓ Available tools: ${apiTools.length}\n`);

    // Test queries
    const testQueries = [
      {
        query: 'Tell me about ADA token',
        expected: 'TOOL_ENHANCED with high confidence (should use dex.search tool)'
      },
      {
        query: 'What is blockchain?',
        expected: 'DIRECT_ANSWER with medium-high confidence'
      },
      {
        query: 'Search for trading pairs for Bitcoin',
        expected: 'TOOL_ENHANCED with high confidence (should use dex.search)'
      },
      {
        query: 'Check wallet balance for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        expected: 'TOOL_ENHANCED with high confidence (should use debank tools)'
      }
    ];

    for (let i = 0; i < testQueries.length; i++) {
      const test = testQueries[i];
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📝 Test ${i + 1}: "${test.query}"`);
      console.log(`📌 Expected: ${test.expected}`);
      console.log('─'.repeat(80));

      try {
        const result = await aiWorkflow.analyzeIntent(
          test.query,
          client.id,
          apiTools,
          client.knowledgeBases
        );

        console.log(`\n🤖 AI Decision:`);
        console.log(`   Process: ${result.intent}`);
        console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`   Reasoning: ${result.reasoning}`);

        if (result.workflow && result.workflow.steps) {
          console.log(`\n📋 Planned Steps (${result.workflow.steps.length}):`);
          result.workflow.steps.forEach((step, idx) => {
            console.log(`   ${idx + 1}. [${step.type}] ${step.name}`);
            if (step.tools && step.tools.length > 0) {
              console.log(`      Tools: ${step.tools.join(', ')}`);
            }
            if (step.parameters && Object.keys(step.parameters).length > 0) {
              console.log(`      Params: ${JSON.stringify(step.parameters)}`);
            }
          });
        }

        // Validate confidence score
        if (result.confidence < 0 || result.confidence > 1) {
          console.log(`\n⚠️  WARNING: Invalid confidence score: ${result.confidence}`);
        } else if (result.confidence > 0.3) {
          console.log(`\n✅ PASS: Confidence score looks reasonable`);
        } else {
          console.log(`\n⚠️  WARNING: Low confidence score (${result.confidence})`);
        }

      } catch (error) {
        console.error(`\n❌ Error:`, error.message);
      }
    }

    console.log(`\n${'='.repeat(80)}\n`);
    console.log('✅ Workflow testing complete!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWorkflow();
