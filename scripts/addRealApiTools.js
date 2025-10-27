import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

// Real API tools based on Cointext-main (no fake aibrk.xyz)
const realApiTools = [
  // DeBank APIs
  {
    id: 'debank_user_chain_balance',
    name: 'debank.user.chain_balance',
    displayName: 'DeBank User Chain Balance',
    description: 'Get user balance on a specific blockchain. Returns total balance and asset distribution for the specified chain. Use when user asks about wallet balance on specific chain.',
    category: 'debank',
    endpoint: 'https://pro-openapi.debank.com/v1/user/chain_balance',
    method: 'GET',
    parameters: { id: 'string', chain_id: 'string' },
    scopes: ['debank:read'],
    isActive: true,
    isExternal: true
  },
  {
    id: 'debank_user_token_list',
    name: 'debank.user.token_list',
    displayName: 'DeBank User Token List',
    description: 'Get detailed token holdings for a specific address and chain. Returns list of tokens with balances and values. Use when user asks about token holdings, token balance, or specific token positions.',
    category: 'debank',
    endpoint: 'https://pro-openapi.debank.com/v1/user/token_list',
    method: 'GET',
    parameters: { id: 'string', chain_id: 'string', is_all: 'boolean?' },
    scopes: ['debank:read'],
    isActive: true,
    isExternal: true
  },
  {
    id: 'debank_user_protocol',
    name: 'debank.user.protocol',
    displayName: 'DeBank User Protocol',
    description: 'Get specific DeFi protocol position and investment details for an address. Use when user asks about specific protocol participation or positions.',
    category: 'debank',
    endpoint: 'https://pro-openapi.debank.com/v1/user/protocol',
    method: 'GET',
    parameters: { id: 'string', protocol_id: 'string' },
    scopes: ['debank:read'],
    isActive: true,
    isExternal: true
  },
  {
    id: 'debank_user_complex_protocol_list',
    name: 'debank.user.complex_protocol_list',
    displayName: 'DeBank User Complex Protocol List',
    description: 'Get comprehensive list of DeFi protocol positions and investments for an address on a specific chain. Use when user asks about all DeFi participation, protocol holdings, or yield farming positions.',
    category: 'debank',
    endpoint: 'https://pro-openapi.debank.com/v1/user/complex_protocol_list',
    method: 'GET',
    parameters: { id: 'string', chain_id: 'string' },
    scopes: ['debank:read'],
    isActive: true,
    isExternal: true
  },

  // Nansen APIs
  {
    id: 'nansen_smart_holdings',
    name: 'nansen.smart.holdings',
    displayName: 'Nansen Smart Money Holdings',
    description: 'Retrieve aggregated token balances held by smart traders and funds across multiple blockchains. Provides insights into what tokens are being accumulated by sophisticated market participants. Use when user asks about smart money holdings, token accumulation by funds, or sophisticated trader positions.',
    category: 'nansen',
    endpoint: 'https://api.nansen.ai/api/v1/smart-money/holdings',
    method: 'POST',
    parameters: {
      chains: 'array', // ["ethereum", "solana", "polygon", "bsc", "arbitrum", "optimism"]
      filters: {
        balance_24h_percent_change: { max: 'number?', min: 'number?' },
        exclude_smart_money_labels: 'array?',
        include_native_tokens: 'boolean?',
        include_smart_money_labels: 'array?',
        include_stablecoins: 'boolean?',
        token_age_days: { max: 'number?' },
        value_usd: { max: 'number?', min: 'number?' }
      },
      pagination: { page: 'number', per_page: 'number' },
      order_by: 'array?'
    },
    scopes: ['nansen:read'],
    isActive: true,
    isExternal: true
  },
  {
    id: 'nansen_smart_trades',
    name: 'nansen.smart.trades',
    displayName: 'Nansen Smart Money DEX Trades',
    description: 'Access real-time DEX trading activity from smart traders and funds over the last 24 hours. Provides granular transaction-level data showing exactly what sophisticated traders are buying and selling. Use when user asks about smart money trades, DEX trading activity, institutional trading patterns.',
    category: 'nansen',
    endpoint: 'https://api.nansen.ai/api/v1/smart-money/dex-trades',
    method: 'POST',
    parameters: {
      chains: 'array',
      filters: {
        exclude_smart_money_labels: 'array?',
        include_smart_money_labels: 'array?',
        token_bought_age_days: { max: 'number?', min: 'number?' },
        trade_value_usd: { max: 'number?', min: 'number?' }
      },
      pagination: { page: 'number', per_page: 'number' },
      order_by: 'array?'
    },
    scopes: ['nansen:read'],
    isActive: true,
    isExternal: true
  },
  {
    id: 'nansen_smart_netflows',
    name: 'nansen.smart.netflows',
    displayName: 'Nansen Smart Money Net Flows',
    description: 'Analyze aggregated token flow analysis for smart money wallets to see which tokens they are accumulating or distributing. Get net capital flows (inflows vs outflows) from smart traders and funds. Use when user asks about smart money flows, capital movements, token accumulation/distribution.',
    category: 'nansen',
    endpoint: 'https://api.nansen.ai/api/v1/smart-money/netflow',
    method: 'POST',
    parameters: {
      chains: 'array',
      filters: {
        exclude_smart_money_labels: 'array?',
        include_native_tokens: 'boolean?',
        include_smart_money_labels: 'array?',
        include_stablecoins: 'boolean?'
      },
      pagination: { page: 'number', per_page: 'number' },
      order_by: 'array?'
    },
    scopes: ['nansen:read'],
    isActive: true,
    isExternal: true
  },

  // DexScreener APIs (Public - No Auth Required)
  {
    id: 'dex_search',
    name: 'dex.search',
    displayName: 'DexScreener Search',
    description: 'Search for trading pairs across decentralized exchanges. Find tokens, pairs, and trading information by token name, symbol, or contract address. Use when user wants to find trading pairs, search DEX markets, or lookup token information.',
    category: 'dex',
    endpoint: 'https://api.dexscreener.com/latest/dex/search',
    method: 'GET',
    parameters: {
      q: 'string' // Search query: token name, symbol, or contract address
    },
    scopes: ['dex:read'],
    isActive: true,
    isExternal: true
  },
  {
    id: 'dex_pair_info',
    name: 'dex.pair',
    displayName: 'DexScreener Pair Info',
    description: 'Get detailed information about one or multiple trading pairs by chain and pair address. Returns comprehensive pair data including price, volume, liquidity, and market metrics. Use when user asks about specific trading pair details or pair analysis.',
    category: 'dex',
    endpoint: 'https://api.dexscreener.com/latest/dex/pairs/{chainId}/{pairId}',
    method: 'GET',
    parameters: {
      chainId: 'string', // Chain identifier (e.g., ethereum, bsc, polygon, solana)
      pairId: 'string' // Pair address or comma-separated list of pair addresses
    },
    scopes: ['dex:read'],
    isActive: true,
    isExternal: true
  },
  {
    id: 'dex_token_pairs',
    name: 'dex.token',
    displayName: 'DexScreener Token Pairs',
    description: 'Get all trading pairs for a specific token across multiple DEXes. Returns comprehensive list of pairs where the token is traded with market data and liquidity information. Use when user asks about all pairs for a token, token trading options, or token market analysis.',
    category: 'dex',
    endpoint: 'https://api.dexscreener.com/latest/dex/tokens/{tokenAddresses}',
    method: 'GET',
    parameters: {
      tokenAddresses: 'string' // Token address or comma-separated list of token addresses
    },
    scopes: ['dex:read'],
    isActive: true,
    isExternal: true
  }
];

async function addRealApiTools() {
  try {
    console.log('🔧 Removing old aibrk tools and adding real API tools...\n');

    // Remove old aibrk tools that don't exist
    const deletedAibrk = await prisma.apiTool.deleteMany({
      where: { category: 'aibrk' }
    });
    console.log(`🗑️  Deleted ${deletedAibrk.count} non-existent aibrk tools\n`);

    // Add real tools
    for (const tool of realApiTools) {
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
      console.log('\n📌 Assigning real API tools to test client...');

      // Remove old aibrk tool assignments
      await prisma.clientApiTool.deleteMany({
        where: {
          clientId: client.id,
          apiTool: { category: 'aibrk' }
        }
      });

      for (const tool of realApiTools) {
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

    console.log('\n✅ Real API tools setup complete!');
    console.log(`📊 Total active tools: ${await prisma.apiTool.count({ where: { isActive: true } })}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addRealApiTools();
