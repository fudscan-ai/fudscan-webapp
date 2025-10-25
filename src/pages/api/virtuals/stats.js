import { PrismaClient } from '../../../generated/prisma/index.js';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 获取各种统计数据
    const [
      totalAgents,
      agentsByDataSource,
      agentsByChain,
      agentsByStatus,
      topByVolume,
      topByHolders,
      recentlyAdded,
      yieldVaultStats
    ] = await Promise.all([
      // 总代理数量
      prisma.virtualAgent.count(),
      
      // 按数据源分组
      prisma.virtualAgent.groupBy({
        by: ['dataSource'],
        _count: {
          id: true
        }
      }),
      
      // 按链分组
      prisma.virtualAgent.groupBy({
        by: ['chain'],
        _count: {
          id: true
        },
        where: {
          chain: {
            not: null
          }
        }
      }),
      
      // 按状态分组
      prisma.virtualAgent.groupBy({
        by: ['status'],
        _count: {
          id: true
        },
        where: {
          status: {
            not: null
          }
        }
      }),
      
      // 交易量前5
      prisma.virtualAgent.findMany({
        where: {
          volume24h: {
            not: null
          }
        },
        orderBy: {
          volume24h: 'desc'
        },
        take: 5,
        select: {
          name: true,
          volume24h: true,
          dataSource: true
        }
      }),
      
      // 持有者数量前5
      prisma.virtualAgent.findMany({
        where: {
          holderCount: {
            not: null
          }
        },
        orderBy: {
          holderCount: 'desc'
        },
        take: 5,
        select: {
          name: true,
          holderCount: true,
          dataSource: true
        }
      }),
      
      // 最近添加的5个
      prisma.virtualAgent.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        take: 5,
        select: {
          name: true,
          createdAt: true,
          dataSource: true
        }
      }),
      
      // Yield vault统计
      prisma.virtualYieldVault.aggregate({
        _count: {
          id: true
        },
        _avg: {
          apy: true
        },
        _max: {
          apy: true
        },
        _sum: {
          totalDeposits: true
        }
      })
    ]);

    // 计算总交易量和总市值
    const volumeStats = await prisma.virtualAgent.aggregate({
      _sum: {
        volume24h: true,
        mcapInVirtual: true,
        liquidityUsd: true
      },
      _avg: {
        volume24h: true,
        holderCount: true
      },
      where: {
        volume24h: {
          not: null
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalAgents,
          totalVolume24h: volumeStats._sum.volume24h,
          totalMarketCap: volumeStats._sum.mcapInVirtual,
          totalLiquidity: volumeStats._sum.liquidityUsd,
          avgVolume24h: volumeStats._avg.volume24h,
          avgHolderCount: volumeStats._avg.holderCount
        },
        distribution: {
          byDataSource: agentsByDataSource.map(item => ({
            dataSource: item.dataSource,
            count: item._count.id
          })),
          byChain: agentsByChain.map(item => ({
            chain: item.chain,
            count: item._count.id
          })),
          byStatus: agentsByStatus.map(item => ({
            status: item.status,
            count: item._count.id
          }))
        },
        rankings: {
          topByVolume,
          topByHolders
        },
        recent: {
          recentlyAdded
        },
        yieldVaults: {
          totalVaults: yieldVaultStats._count.id,
          averageApy: yieldVaultStats._avg.apy,
          maxApy: yieldVaultStats._max.apy,
          totalDeposits: yieldVaultStats._sum.totalDeposits
        }
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}
