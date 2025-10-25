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
      category,
      cluster,
      role,
      minGrossAmount
    } = req.query;

    // 构建查询条件
    const where = {};
    
    if (category) {
      where.category = category;
    }
    
    if (cluster) {
      where.cluster = cluster;
    }
    
    if (role) {
      where.role = role;
    }
    
    if (minGrossAmount) {
      where.grossAgenticAmount = {
        gte: parseFloat(minGrossAmount)
      };
    }

    // 获取spotlight agents数据，按grossAgenticAmount排序
    const spotlightAgents = await prisma.virtualAgentSpotlight.findMany({
      where,
      orderBy: [
        { grossAgenticAmount: 'desc' },
        { scrapedAt: 'desc' }
      ],
      take: parseInt(limit),
      skip: parseInt(offset),
      select: {
        id: true,
        name: true,
        category: true,
        cluster: true,
        description: true,
        grossAgenticAmount: true,
        metrics: true,
        ownerAddress: true,
        profilePic: true,
        role: true,
        tokenAddress: true,
        twitterHandle: true,
        virtualAgentId: true,
        walletAddress: true,
        walletBalance: true,
        scrapedAt: true
      }
    });

    // 获取总数
    const totalCount = await prisma.virtualAgentSpotlight.count({ where });

    res.status(200).json({
      success: true,
      data: spotlightAgents,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: totalCount > parseInt(offset) + parseInt(limit)
      },
      filters: {
        category,
        cluster,
        role,
        minGrossAmount
      }
    });

  } catch (error) {
    console.error('Error fetching spotlight agents:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}
