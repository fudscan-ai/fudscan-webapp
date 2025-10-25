import { PrismaClient } from '@/generated/prisma/index.js';

const prisma = new PrismaClient();

/**
 * Finance Quote Tool
 * Gets real-time price quotes and market data for cryptocurrencies
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { symbol = 'BTC', query } = req.body;

    if (!symbol) {
      return res.status(400).json({ message: 'Symbol is required' });
    }

    // For now, return mock data that would come from a price API
    // In production, this would make actual API calls to CoinGecko, CoinMarketCap, etc.
    const mockPrices = {
      'BTC': { price: 43250.00, change_24h: 2.5, volume_24h: 15234567890 },
      'ETH': { price: 2650.00, change_24h: -1.2, volume_24h: 8234567890 },
      'SOL': { price: 98.50, change_24h: 5.8, volume_24h: 1234567890 },
      'MATIC': { price: 0.85, change_24h: 3.2, volume_24h: 234567890 },
      'AVAX': { price: 35.20, change_24h: -0.8, volume_24h: 456789012 }
    };

    const symbolUpper = symbol.toUpperCase();
    const priceData = mockPrices[symbolUpper] || mockPrices['BTC'];

    const mockResponse = {
      symbol: symbolUpper,
      name: getTokenName(symbolUpper),
      price_usd: priceData.price,
      price_change_24h: priceData.change_24h,
      price_change_percentage_24h: priceData.change_24h,
      volume_24h: priceData.volume_24h,
      market_cap: priceData.price * getCirculatingSupply(symbolUpper),
      circulating_supply: getCirculatingSupply(symbolUpper),
      last_updated: new Date().toISOString(),
      data_source: 'mock_api'
    };

    // TODO: Replace with actual price API call
    // const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`, {
    //   headers: {
    //     'X-CG-Demo-API-Key': process.env.COINGECKO_API_KEY
    //   }
    // });
    // const data = await response.json();

    res.status(200).json({
      success: true,
      data: mockResponse,
      tool: 'finance.quote',
      query: query,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Finance quote error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch price quote', 
      error: error.message,
      tool: 'finance.quote'
    });
  } finally {
    await prisma.$disconnect();
  }
}

function getTokenName(symbol) {
  const names = {
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'SOL': 'Solana',
    'MATIC': 'Polygon',
    'AVAX': 'Avalanche'
  };
  return names[symbol] || symbol;
}

function getCirculatingSupply(symbol) {
  const supplies = {
    'BTC': 19700000,
    'ETH': 120280000,
    'SOL': 460000000,
    'MATIC': 9300000000,
    'AVAX': 365000000
  };
  return supplies[symbol] || 1000000;
}
