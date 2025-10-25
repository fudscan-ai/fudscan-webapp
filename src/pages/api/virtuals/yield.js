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
      status,
      sortBy = 'name' // 'name', 'scraped'
    } = req.query;

    // 获取yield apy数据
    const yieldAgents = await prisma.virtualYieldApy.findMany({
      where: {
        ...(chain && { chain })
      },
      orderBy: [
        { scrapedAt: 'desc' },
        { name: 'asc' }
      ],
      take: parseInt(limit),
      skip: parseInt(offset),
      select: {
        id: true,
        name: true,
        chain: true,
        image: true,
        status: true,
        tokenAddress: true,
        virtualTokenValue: true,
        imageUrl: true,
        genesisId: true,
        scrapedAt: true
      }
    });

    // 获取总数
    const totalCount = await prisma.virtualYieldApy.count({
      where: {
        ...(chain && { chain })
      }
    });

    res.status(200).json({
      success: true,
      data: yieldAgents,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: totalCount > parseInt(offset) + parseInt(limit)
      },
      filters: {
        chain,
        status,
        sortBy
      }
    });

  } catch (error) {
    console.error('Error fetching yield vaults:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}
