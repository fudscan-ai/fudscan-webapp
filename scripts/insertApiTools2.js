import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

const virtualsApiToolsData = [
  // Virtuals.io Trending APIs
  {
    id: 'virtuals_trending',
    name: 'virtuals.trending',
    displayName: 'Virtuals Trending Agents',
    description: 'Get trending AI agents from Virtuals.io sorted by 24h trading volume. Use when user asks about trending AI agents, hot virtual agents, or popular AI tokens on Virtuals platform.',
    category: 'virtuals',
    endpoint: '/api/virtuals/trending',
    method: 'GET',
    parameters: { 
      limit: 'number?', 
      offset: 'number?', 
      dataSource: 'string?', 
      minVolume24h: 'number?', 
      chain: 'string?' 
    },
    scopes: ['virtuals:read'],
    isActive: true,
    isExternal: false
  },
  {
    id: 'virtuals_latest',
    name: 'virtuals.latest',
    displayName: 'Virtuals Latest Agents',
    description: 'Get the latest AI agents from Virtuals.io sorted by creation time. Use when user asks about new AI agents, recently launched virtual agents, or latest additions to Virtuals platform.',
    category: 'virtuals',
    endpoint: '/api/virtuals/latest',
    method: 'GET',
    parameters: { 
      limit: 'number?', 
      offset: 'number?', 
      dataSource: 'string?', 
      status: 'number?', 
      chain: 'string?' 
    },
    scopes: ['virtuals:read'],
    isActive: true,
    isExternal: false
  },
  {
    id: 'virtuals_search',
    name: 'virtuals.search',
    displayName: 'Virtuals Search Agents',
    description: 'Search AI agents on Virtuals.io by name, description, category, or Twitter handle. Use when user wants to find specific AI agents or search for agents by keywords.',
    category: 'virtuals',
    endpoint: '/api/virtuals/search',
    method: 'GET',
    parameters: { 
      q: 'string', 
      limit: 'number?', 
      offset: 'number?', 
      dataSource: 'string?', 
      chain: 'string?', 
      category: 'string?', 
      minVolume24h: 'number?', 
      maxVolume24h: 'number?', 
      sortBy: 'string?' 
    },
    scopes: ['virtuals:read'],
    isActive: true,
    isExternal: false
  },
  {
    id: 'virtuals_yield',
    name: 'virtuals.yield',
    displayName: 'Virtuals Yield Vaults',
    description: 'Get yield farming opportunities and APY data for Virtuals.io agents. Use when user asks about yield farming, staking rewards, APY rates, or passive income opportunities with AI agents.',
    category: 'virtuals',
    endpoint: '/api/virtuals/yield',
    method: 'GET',
    parameters: { 
      limit: 'number?', 
      offset: 'number?', 
      minApy: 'number?', 
      maxApy: 'number?', 
      vaultType: 'string?', 
      riskLevel: 'string?', 
      sortBy: 'string?' 
    },
    scopes: ['virtuals:read'],
    isActive: true,
    isExternal: false
  },
  {
    id: 'virtuals_stats',
    name: 'virtuals.stats',
    displayName: 'Virtuals Platform Statistics',
    description: 'Get comprehensive statistics and analytics for the Virtuals.io platform including total agents, volume, market cap, and distribution data. Use when user asks about platform overview, market statistics, or general Virtuals.io metrics.',
    category: 'virtuals',
    endpoint: '/api/virtuals/stats',
    method: 'GET',
    parameters: {},
    scopes: ['virtuals:read'],
    isActive: true,
    isExternal: false
  },
  // AI Agent Analysis APIs
  {
    id: 'virtuals_agent_analysis',
    name: 'virtuals.agent.analysis',
    displayName: 'AI Agent Performance Analysis',
    description: 'Analyze AI agent performance including success rates, transaction counts, and holder metrics. Use when user asks about agent performance, success metrics, or detailed agent analytics.',
    category: 'virtuals',
    endpoint: '/api/virtuals/search',
    method: 'GET',
    parameters: { 
      q: 'string', 
      sortBy: 'string?',
      limit: 'number?' 
    },
    scopes: ['virtuals:read', 'analytics:read'],
    isActive: true,
    isExternal: false
  },
  {
    id: 'virtuals_market_trends',
    name: 'virtuals.market.trends',
    displayName: 'AI Agent Market Trends',
    description: 'Get market trends and insights for AI agents including price changes, volume trends, and holder growth. Use when user asks about market trends, price movements, or trading patterns in AI agents.',
    category: 'virtuals',
    endpoint: '/api/virtuals/trending',
    method: 'GET',
    parameters: { 
      limit: 'number?', 
      minVolume24h: 'number?',
      dataSource: 'string?' 
    },
    scopes: ['virtuals:read', 'market:read'],
    isActive: true,
    isExternal: false
  },
  // Investment and Portfolio APIs
  {
    id: 'virtuals_investment_opportunities',
    name: 'virtuals.investment.opportunities',
    displayName: 'AI Agent Investment Opportunities',
    description: 'Identify investment opportunities in AI agents based on fundamentals, yield potential, and growth metrics. Use when user asks about investment opportunities, which agents to invest in, or portfolio recommendations.',
    category: 'virtuals',
    endpoint: '/api/virtuals/search',
    method: 'GET',
    parameters: { 
      dataSource: 'string?', 
      sortBy: 'string?', 
      minVolume24h: 'number?',
      limit: 'number?' 
    },
    scopes: ['virtuals:read', 'investment:read'],
    isActive: true,
    isExternal: false
  },
  {
    id: 'virtuals_portfolio_tracking',
    name: 'virtuals.portfolio.tracking',
    displayName: 'AI Agent Portfolio Tracking',
    description: 'Track and analyze AI agent portfolios including performance metrics and yield tracking. Use when user asks about portfolio performance, tracking investments, or monitoring AI agent holdings.',
    category: 'virtuals',
    endpoint: '/api/virtuals/yield',
    method: 'GET',
    parameters: { 
      sortBy: 'string?', 
      limit: 'number?' 
    },
    scopes: ['virtuals:read', 'portfolio:read'],
    isActive: true,
    isExternal: false
  },
   // Trending APIs
  {
    id: 'trending_pools',
    name: 'trending.pools',
    displayName: 'Trending Pools',
    description: 'Get trending cryptocurrency pools and hot tokens across different blockchain networks. Use when user asks about trending tokens, hot pools, or popular cryptocurrencies.',
    category: 'trending',
    endpoint: '/api/trending-pools',
    method: 'GET',
    parameters: { chain: 'string?', limit: 'number?' },
    scopes: ['trending:read'],
    isActive: true,
    isExternal: false
  }
];

export const insertVirtualsApiTools = async () => {
  try {
    console.log('Starting Virtuals API tools insertion...');
    
    // Use upsert to handle potential duplicates
    for (const tool of virtualsApiToolsData) {
      await prisma.apiTool.upsert({
        where: { id: tool.id },
        update: tool,
        create: tool
      });
      console.log(`✓ Inserted/Updated: ${tool.name}`);
    }
    
    console.log(`\n✅ Successfully processed ${virtualsApiToolsData.length} Virtuals API tools`);
    
    // Verify insertion
    const count = await prisma.apiTool.count({
      where: {
        category: 'virtuals'
      }
    });
    console.log(`📊 Total Virtuals API tools in database: ${count}`);
    
    // Show all virtuals tools
    const virtualsTools = await prisma.apiTool.findMany({
      where: {
        category: 'virtuals'
      },
      select: {
        name: true,
        displayName: true,
        isActive: true
      }
    });
    
    console.log('\n📋 Virtuals API Tools:');
    virtualsTools.forEach(tool => {
      console.log(`   ${tool.isActive ? '✅' : '❌'} ${tool.name} - ${tool.displayName}`);
    });
    
  } catch (error) {
    console.error('❌ Error inserting Virtuals API tools:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

// Run the script if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  try {
    await insertVirtualsApiTools();
    console.log('🎉 Virtuals API tools insertion completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

export { virtualsApiToolsData };
