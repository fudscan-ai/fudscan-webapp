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
      minSuccessRate,
      minGrossAmount,
      twitterHandle
    } = req.query;

    // 构建查询条件
    const where = {};
    
    if (minSuccessRate) {
      where.successRate = {
        gte: parseFloat(minSuccessRate)
      };
    }
    
    if (minGrossAmount) {
      where.grossAgenticAmount = {
        gte: parseFloat(minGrossAmount)
      };
    }
    
    if (twitterHandle) {
      where.twitterHandle = {
        contains: twitterHandle,
        mode: 'insensitive'
      };
    }

    // 获取agents数据，按成功率排序
    const agents = await prisma.virtualAgent.findMany({
      where,
      orderBy: [
        { successRate: 'desc' },
        { grossAgenticAmount: 'desc' }
      ],
      take: parseInt(limit),
      skip: parseInt(offset),
      select: {
        id: true,
        name: true,
        description: true,
        grossAgenticAmount: true,
        createdAt: true,
        publishedAt: true,
        ownerAddress: true,
        profilePic: true,
        successRate: true,
        successfulJobCount: true,
        tokenAddress: true,
        transactionCount: true,
        twitterHandle: true,
        uniqueBuyerCount: true,
        virtualAgentId: true,
        walletAddress: true,
        walletBalance: true,
        scrapedAt: true
      }
    });

    // 获取总数
    const totalCount = await prisma.virtualAgent.count({ where });

    res.status(200).json({
      success: true,
      data: agents,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: totalCount > parseInt(offset) + parseInt(limit)
      },
      filters: {
        minSuccessRate,
        minGrossAmount,
        twitterHandle
      }
    });

  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}
