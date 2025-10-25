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
      status,
      chain 
    } = req.query;

    // 构建查询条件
    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (chain) {
      where.chain = chain;
    }

    // 获取最新数据，按创建时间排序
    const latestAgents = await prisma.virtualUpcomingAgent.findMany({
      where,
      orderBy: [
        { scrapedAt: 'desc' }
      ],
      take: parseInt(limit),
      skip: parseInt(offset),
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        volume24h: true,
        priceChangePercent24h: true,
        holderCount: true,
        chain: true,
        status: true,
        scrapedAt: true,
        role: true,
        cores: true,
        factory: true,
        liquidityUsd: true,
        netVolume24h: true
      }
    });

    // 获取总数
    const totalCount = await prisma.virtualUpcomingAgent.count({ where });

    res.status(200).json({
      success: true,
      data: latestAgents,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: totalCount > parseInt(offset) + parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching latest agents:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}
