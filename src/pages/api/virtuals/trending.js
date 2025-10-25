import { PrismaClient } from '../../../generated/prisma/index.js';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      limit = 10, 
      offset = 0, 
      minVolume24h,
      chain 
    } = req.query;

    // 构建查询条件
    const where = {};
    
    if (minVolume24h) {
      where.volume24h = {
        gte: parseFloat(minVolume24h)
      };
    }
    
    if (chain) {
      where.chain = chain;
    }

    // 获取趋势数据，按24小时交易量排序
    const trendingAgents = await prisma.virtualTrending.findMany({
      where,
      orderBy: [
        { volume24h: 'desc' },
        { scrapedAt: 'desc' }
      ],
      take: parseInt(limit),
      skip: parseInt(offset),
      select: {
        id: true,
        virtualId: true,
        name: true,
        description: true,
        imageUrl: true,
        volume24h: true,
        netVolume24h: true,
        priceChangePercent24h: true,
        mcapInVirtual: true,
        liquidityUsd: true,
        holderCount: true,
        tokenAddress: true,
        chain: true,
        status: true,
        scrapedAt: true,
        cores: true,
        factory: true,
        role: true
      }
    });

    // 获取总数
    const totalCount = await prisma.virtualTrending.count({ where });

    res.status(200).json({
      success: true,
      data: trendingAgents,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: totalCount > parseInt(offset) + parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching trending agents:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}
