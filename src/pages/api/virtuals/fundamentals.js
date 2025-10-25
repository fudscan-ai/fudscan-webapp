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
      chain,
      minMcap,
      minLiquidity,
      status
    } = req.query;

    // 构建查询条件
    const where = {};
    
    if (chain) {
      where.chain = chain;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (minMcap) {
      where.mcapInVirtual = {
        gte: parseFloat(minMcap)
      };
    }
    
    if (minLiquidity) {
      where.liquidityUsd = {
        gte: parseFloat(minLiquidity)
      };
    }

    // 获取fundamentals数据，按市值排序
    const fundamentals = await prisma.virtualFundamental.findMany({
      where,
      orderBy: [
        { mcapInVirtual: 'desc' },
        { liquidityUsd: 'desc' }
      ],
      take: parseInt(limit),
      skip: parseInt(offset),
      select: {
        id: true,
        name: true,
        cores: true,
        chain: true,
        daoAddress: true,
        description: true,
        devHoldingPercentage: true,
        factory: true,
        holderCount: true,
        holderCountPercent24h: true,
        image: true,
        liquidityUsd: true,
        lpAddress: true,
        mcapInVirtual: true,
        netVolume24h: true,
        priceChangePercent24h: true,
        role: true,
        status: true,
        tokenAddress: true,
        top10HolderPercentage: true,
        totalSupply: true,
        totalValueLocked: true,
        volume24h: true,
        virtualId: true,
        virtualTokenValue: true,
        walletAddress: true,
        imageUrl: true,
        scrapedAt: true
      }
    });

    // 获取总数
    const totalCount = await prisma.virtualFundamental.count({ where });

    res.status(200).json({
      success: true,
      data: fundamentals,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: totalCount > parseInt(offset) + parseInt(limit)
      },
      filters: {
        chain,
        minMcap,
        minLiquidity,
        status
      }
    });

  } catch (error) {
    console.error('Error fetching fundamentals:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}
