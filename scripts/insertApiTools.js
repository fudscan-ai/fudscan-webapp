import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

const apiToolsData = [
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
    description: 'Retrieve aggregated token balances held by smart traders and funds across multiple blockchains. Provides insights into what tokens are being accumulated by sophisticated market participants, excluding whales and large holders to focus specifically on trading expertise. Use when user asks about smart money holdings, token accumulation by funds, or sophisticated trader positions.',
    category: 'nansen',
    endpoint: 'https://api.nansen.ai/api/v1/smart-money/holdings',
    method: 'POST',
    parameters: { 
      chains: 'array', // ["ethereum", "solana", "polygon", "bsc", "arbitrum", "optimism"]
      filters: {
        balance_24h_percent_change: {
          max: 'number?', // e.g., 0.1 (10% increase)
          min: 'number?' // e.g., -0.1 (10% decrease)
        },
        exclude_smart_money_labels: 'array?', // ["30D Smart Trader", "Smart DEX Trader"]
        include_native_tokens: 'boolean?', // default: false
        include_smart_money_labels: 'array?', // ["Fund", "Smart Trader", "Smart LP", "Smart NFT Trader"]
        include_stablecoins: 'boolean?', // default: false
        token_age_days: {
          max: 'number?' // e.g., 30 (tokens newer than 30 days)
        },
        value_usd: {
          max: 'number?', // e.g., 100000 (max USD value)
          min: 'number?' // e.g., 1000 (min USD value)
        }
      },
      pagination: {
        page: 'number', // default: 1
        per_page: 'number' // default: 10, max: 100
      },
      order_by: 'array?' // [{ field: "chain|balance_usd|balance_24h_percent_change", direction: "ASC|DESC" }]
    },
    scopes: ['nansen:read'],
    isActive: true,
    isExternal: true
  },
  {
    id: 'nansen_smart_trades',
    name: 'nansen.smart.trades',
    displayName: 'Nansen Smart Money DEX Trades',
    description: 'Access real-time DEX trading activity from smart traders and funds over the last 24 hours. Provides granular transaction-level data showing exactly what sophisticated traders are buying and selling on decentralized exchanges. Use when user asks about smart money trades, DEX trading activity, institutional trading patterns, or real-time trading data.',
    category: 'nansen',
    endpoint: 'https://api.nansen.ai/api/v1/smart-money/dex-trades',
    method: 'POST',
    parameters: { 
      chains: 'array', // ["ethereum", "solana", "polygon", "bsc", "arbitrum", "optimism"]
      filters: {
        exclude_smart_money_labels: 'array?', // ["30D Smart Trader", "Smart DEX Trader"]
        include_smart_money_labels: 'array?', // ["Fund", "Smart Trader", "Smart LP", "Smart NFT Trader"]
        token_bought_age_days: {
          max: 'number?', // e.g., 30 (max token age in days)
          min: 'number?' // e.g., 1 (min token age in days)
        },
        trade_value_usd: {
          max: 'number?', // e.g., 10000 (max trade value in USD)
          min: 'number?' // e.g., 1000 (min trade value in USD)
        }
      },
      pagination: {
        page: 'number', // default: 1
        per_page: 'number' // default: 10, max: 100
      },
      order_by: 'array?' // [{ field: "chain|timestamp|trade_value_usd|token_bought_age_days", direction: "ASC|DESC" }]
    },
    scopes: ['nansen:read'],
    isActive: true,
    isExternal: true
  },
  {
    id: 'nansen_smart_netflows',
    name: 'nansen.smart.netflows',
    displayName: 'Nansen Smart Money Net Flows',
    description: 'Analyze aggregated token flow analysis for smart money wallets to see which tokens they are accumulating or distributing. Get net capital flows (inflows vs outflows) from smart traders and funds across different time periods. Includes DEX trading activity and CEX transfers. Use when user asks about smart money flows, capital movements, token accumulation/distribution, or net flow analysis.',
    category: 'nansen',
    endpoint: 'https://api.nansen.ai/api/v1/smart-money/netflow',
    method: 'POST',
    parameters: { 
      chains: 'array', // ["ethereum", "solana", "polygon", "bsc", "arbitrum", "optimism"]
      filters: {
        exclude_smart_money_labels: 'array?', // ["30D Smart Trader", "Smart DEX Trader"]
        include_native_tokens: 'boolean?', // default: false
        include_smart_money_labels: 'array?', // ["Fund", "Smart Trader", "Smart LP", "Smart NFT Trader"]
        include_stablecoins: 'boolean?' // default: false
      },
      pagination: {
        page: 'number', // default: 1
        per_page: 'number' // default: 10, max: 100
      },
      order_by: 'array?' // [{ field: "chain|volume_24h|net_flow_24h", direction: "ASC|DESC" }]
    },
    scopes: ['nansen:read'],
    isActive: true,
    isExternal: true
  },
  // DEX APIs
  {
    id: 'dex_search',
    name: 'dex.search',
    displayName: 'DexScreener Search',
    description: 'Search for trading pairs across decentralized exchanges using DexScreener API. Find tokens, pairs, and trading information by token name, symbol, or contract address. Use when user wants to find trading pairs, search DEX markets, or lookup token information.',
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
    description: 'Get detailed information about one or multiple trading pairs by chain and pair address using DexScreener API. Returns comprehensive pair data including price, volume, liquidity, and market metrics. Use when user asks about specific trading pair details or pair analysis.',
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
    description: 'Get all trading pairs for a specific token across multiple DEXes using DexScreener API. Returns comprehensive list of pairs where the token is traded with market data and liquidity information. Use when user asks about all pairs for a token, token trading options, or token market analysis.',
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

export const insertApiTools = async () => {
  try {
    console.log('Starting API tools insertion...');
    
    // Use upsert to handle potential duplicates
    for (const tool of apiToolsData) {
      await prisma.apiTool.upsert({
        where: { id: tool.id },
        update: tool,
        create: tool
      });
      console.log(`✓ Inserted/Updated: ${tool.name}`);
    }
    
    console.log(`\n✅ Successfully processed ${apiToolsData.length} API tools`);
    
    // Verify insertion
    const count = await prisma.apiTool.count();
    console.log(`📊 Total API tools in database: ${count}`);
    
  } catch (error) {
    console.error('❌ Error inserting API tools:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

// Run the script if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  try {
    await insertApiTools();
    console.log('🎉 API tools insertion completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

export { apiToolsData };
