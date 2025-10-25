import { PrismaClient } from '../../generated/prisma/index.js';
import { INITIAL_PRICES, VALID_TOKENS, TOKEN_WEIGHTS } from '../../utils/tokenUtils';

// Calculate the change between two prices
function calculateChange(currentPrice, initialPrice) {
  const changePercent = ((currentPrice - initialPrice) / initialPrice) * 100;
  return changePercent >= 0 ? `+${changePercent.toFixed(0)}%` : `${changePercent.toFixed(0)}%`;
}

// Get the CSS class for price change
function getPriceChangeClass(currentPrice, initialPrice) {
  if (currentPrice > initialPrice) {
    return "text-green-600";
  } else if (currentPrice < initialPrice) {
    return "text-red-600";
  } else {
    return "text-gray-600";
  }
}

export default async function handler(req, res) {
  // 初始化 Prisma 客户端
  try {
    const symbols = VALID_TOKENS;
    const data = [];
    
    for (const symbol of symbols) {
      // Get the latest price from database
      const result = await prisma.tokenPrice.findFirst({
        where: { symbol },
        orderBy: { timestamp: 'desc' }
      });
      
      // Get current price, if database has no data use initial price
      const initialPrice = INITIAL_PRICES[symbol];
      const currentPrice = result ? parseFloat(result.price) : initialPrice;
      
      // Calculate price change
      const change = calculateChange(currentPrice, initialPrice);
      const changeClass = getPriceChangeClass(currentPrice, initialPrice);
      
      data.push({
        name: symbol,
        initialPrice,
        currentPrice,
        change,
        changeClass,
        weight: TOKEN_WEIGHTS[symbol],
        greenLight: currentPrice >= initialPrice ? 100 : 0,
        redLight: currentPrice < initialPrice ? 100 : 0
      });
    }
    
    // 如果数据库中没有数据，使用初始价格
    if (data.length === 0) {
      console.warn('No price data found in database, using initial prices');
      data.push(
        {
          name: "MAMO", 
          initialPrice: INITIAL_PRICES.MAMO,
          currentPrice: INITIAL_PRICES.MAMO,
          change: "0%", 
          changeClass: "text-gray-600", 
          weight: 3 
        },
        {
          name: "BYTE", 
          initialPrice: INITIAL_PRICES.BYTE,
          currentPrice: INITIAL_PRICES.BYTE,
          change: "0%", 
          changeClass: "text-gray-600", 
          weight: 3 
        },
        {
          name: "COINTEXT", 
          initialPrice: INITIAL_PRICES.COINTEXT,
          currentPrice: INITIAL_PRICES.COINTEXT,
          change: "0%", 
          changeClass: "text-gray-600", 
          weight: 3 
        },
        {
          name: "VIRTUAL", 
          initialPrice: INITIAL_PRICES.VIRTUAL,
          currentPrice: INITIAL_PRICES.VIRTUAL,
          change: "0%", 
          changeClass: "text-gray-600", 
          weight: 1 
        }
      );
    }
    
    res.status(200).json({ data });
  } catch (error) {
    console.error('Error fetching prices from database:', error);
    
    // 出错时使用初始价格
    const data = [
      {
        name: "MAMO", 
        initialPrice: INITIAL_PRICES.MAMO,
        currentPrice: INITIAL_PRICES.MAMO * 1.10,
        change: "+10%", 
        changeClass: "text-green-600", 
        weight: 3 
      },
      {
        name: "BYTE", 
        initialPrice: INITIAL_PRICES.BYTE,
        currentPrice: INITIAL_PRICES.BYTE * 1.50,
        change: "+50%", 
        changeClass: "text-green-600", 
        weight: 3 
      },
      {
        name: "COINTEXT", 
        initialPrice: INITIAL_PRICES.COINTEXT,
        currentPrice: INITIAL_PRICES.COINTEXT * 4.00,
        change: "+300%", 
        changeClass: "text-green-600", 
        weight: 3 
      },
      {
        name: "VIRTUAL", 
        initialPrice: INITIAL_PRICES.VIRTUAL,
        currentPrice: INITIAL_PRICES.VIRTUAL * 0.90,
        change: "-10%", 
        changeClass: "text-red-600", 
        weight: 1 
      },
    ];
    
    res.status(500).json({ data, error: error.message });
  } finally {
    // 关闭 Prisma 客户端连接
    await prisma.$disconnect();
  }
}
