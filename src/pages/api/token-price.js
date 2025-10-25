import { PrismaClient } from '../../generated/prisma/index.js';
import { fetchTokenPriceFromAPI } from '../../utils/tokenUtils.js';

export default async function handler(req, res) {
  // 初始化 Prisma 客户端
  try {
    // GET 请求 - 获取代币价格
    if (req.method === 'GET') {
      const { symbol } = req.query;
      
      if (!symbol) {
        return res.status(400).json({ error: 'Symbol parameter is required' });
      }
      
      // 获取最新价格
      const result = await prisma.tokenPrice.findFirst({
        where: { symbol },
        orderBy: { timestamp: 'desc' }
      });
      
      if (result) {
        return res.status(200).json({ 
          symbol, 
          price: parseFloat(result.price),
          timestamp: Number(result.timestamp)
        });
      } else {
        const price = await fetchTokenPriceFromAPI(symbol);
        if (price !== null) {
          return res.status(200).json({ 
            symbol, 
            price: parseFloat(price),
            timestamp: Number(Date.now() / 1000)
          });
        }
        return res.status(404).json({ error: `No price found for symbol: ${symbol}` });
      }
    } 
    // POST 请求 - 存储代币价格
    else if (req.method === 'POST') {
      const { symbol, price } = req.body;
      
      if (!symbol || price === undefined) {
        return res.status(400).json({ error: 'Symbol and price are required' });
      }
      
      const timestamp = Math.floor(Date.now() / 1000);
      
      // 存储价格
      const result = await prisma.tokenPrice.create({
        data: {
          symbol,
          price,
          timestamp
        }
      });
      
      return res.status(201).json({ 
        success: true, 
        data: {
          symbol,
          price: typeof price === 'bigint' ? Number(price) : price,
          timestamp: Number(timestamp)
        }
      });
    } 
    // 其他请求方法
    else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in token-price API:', error);
    return res.status(500).json({ error: error.message });
  } finally {
    // 关闭 Prisma 客户端连接
    await prisma.$disconnect();
  }
}
