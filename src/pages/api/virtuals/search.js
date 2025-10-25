import { PrismaClient } from '../../../generated/prisma/index.js';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      q: query,
      limit = 10, 
      offset = 0, 
      dataSource,
      chain,
      category,
      minVolume24h,
      maxVolume24h,
      sortBy = 'relevance' // 'relevance', 'volume', 'created', 'holders'
    } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query parameter is required' 
      });
    }

    // 构建查询条件
    const where = {
      OR: [
        {
          name: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          twitterHandle: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          category: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          role: {
            contains: query,
            mode: 'insensitive'
          }
        }
      ]
    };
    
    // 添加额外过滤条件
    if (dataSource) {
      where.dataSource = dataSource;
    }
    
    if (chain) {
      where.chain = chain;
    }
    
    if (category) {
      where.category = category;
    }
    
    if (minVolume24h || maxVolume24h) {
      where.volume24h = {};
      if (minVolume24h) {
        where.volume24h.gte = parseFloat(minVolume24h);
      }
      if (maxVolume24h) {
        where.volume24h.lte = parseFloat(maxVolume24h);
      }
    }

    // 构建排序条件
    let orderBy = [];
    switch (sortBy) {
      case 'volume':
        orderBy = [{ volume24h: 'desc' }, { createdAt: 'desc' }];
        break;
      case 'created':
        orderBy = [{ createdAt: 'desc' }];
        break;
      case 'holders':
        orderBy = [{ holderCount: 'desc' }, { volume24h: 'desc' }];
        break;
      case 'relevance':
      default:
        // 对于相关性排序，我们优先显示名称匹配的结果
        orderBy = [{ volume24h: 'desc' }, { holderCount: 'desc' }, { createdAt: 'desc' }];
        break;
    }

    // 执行搜索
    const searchResults = await prisma.virtualAgent.findMany({
      where,
      orderBy,
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
        dataSource: true,
        status: true,
        category: true,
        role: true,
        twitterHandle: true,
        createdAt: true,
        scrapedAt: true
      }
    });

    // 获取总数
    const totalCount = await prisma.virtualAgent.count({ where });

    // 计算搜索相关性得分（简单实现）
    const resultsWithScore = searchResults.map(agent => {
      let score = 0;
      const queryLower = query.toLowerCase();
      
      // 名称完全匹配得分最高
      if (agent.name && agent.name.toLowerCase() === queryLower) {
        score += 100;
      } else if (agent.name && agent.name.toLowerCase().includes(queryLower)) {
        score += 50;
      }
      
      // 描述匹配
      if (agent.description && agent.description.toLowerCase().includes(queryLower)) {
        score += 20;
      }
      
      // 类别匹配
      if (agent.category && agent.category.toLowerCase().includes(queryLower)) {
        score += 30;
      }
      
      // Twitter句柄匹配
      if (agent.twitterHandle && agent.twitterHandle.toLowerCase().includes(queryLower)) {
        score += 40;
      }
      
      return {
        ...agent,
        relevanceScore: score
      };
    });

    // 如果是相关性排序，重新按得分排序
    if (sortBy === 'relevance') {
      resultsWithScore.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        // 得分相同时按交易量排序
        return (b.volume24h || 0) - (a.volume24h || 0);
      });
    }

    res.status(200).json({
      success: true,
      data: resultsWithScore,
      query: query,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: totalCount > parseInt(offset) + parseInt(limit)
      },
      filters: {
        dataSource,
        chain,
        category,
        minVolume24h,
        maxVolume24h,
        sortBy
      }
    });

  } catch (error) {
    console.error('Error searching agents:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}
