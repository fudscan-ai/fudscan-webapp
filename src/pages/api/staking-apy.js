/**
 * API endpoint to fetch staking APY data from Moonwell
 */

import { PrismaClient } from '../../generated/prisma/index.js';
import { fetchStakingApyFromAPI } from '../../utils/stakingUtils.js';

export default async function handler(req, res) {
  // 初始化 Prisma 客户端
  try {
    // GET 请求 - 获取质押 APY 数据
    if (req.method === 'GET') {
      // 获取最新的 APY 数据
      const result = await prisma.stakingApy.findFirst({
        orderBy: { timestamp: 'desc' }
      });
      
      if (result) {
        return res.status(200).json({
          totalApy: parseFloat(result.totalApy),
          baseApy: parseFloat(result.baseApy),
          rewardsApy: parseFloat(result.rewardsApy),
          stringApy: `Staking: ${parseFloat(result.rewardsApy).toFixed(2)}% APY`,
          rewards: result.rewards || [],
          timestamp: Number(result.timestamp)
        });
      } else {
        // 如果数据库中没有数据，从 API 获取并返回
        const apyData = await fetchStakingApyFromAPI();
        if (apyData !== null) {
          return res.status(200).json({
            totalApy: apyData.totalApy,
            baseApy: apyData.baseApy,
            rewardsApy: apyData.rewardsApy,
            stringApy: `Staking: ${parseFloat(apyData.rewardsApy).toFixed(2)}% APY`,
            rewards: apyData.rewards,
            timestamp: Math.floor(Date.now() / 1000)
          });
        }
        return res.status(404).json({ error: 'No staking APY data found' });
      }
    } 
    // POST 请求 - 存储质押 APY 数据
    // else if (req.method === 'POST') {
    //   const { totalApy, baseApy, rewardsApy, rewards } = req.body;
      
    //   if (totalApy === undefined || baseApy === undefined || rewardsApy === undefined) {
    //     return res.status(400).json({ error: 'totalApy, baseApy, and rewardsApy are required' });
    //   }
      
    //   const timestamp = Math.floor(Date.now() / 1000);
      
    //   // 存储 APY 数据
    //   const result = await prisma.stakingApy.create({
    //     data: {
    //       totalApy,
    //       baseApy,
    //       rewardsApy,
    //       rewards: rewards || [],
    //       timestamp
    //     }
    //   });
      
    //   return res.status(201).json({
    //     success: true,
    //     data: {
    //       totalApy: parseFloat(result.totalApy),
    //       baseApy: parseFloat(result.baseApy),
    //       rewardsApy: parseFloat(result.rewardsApy),
    //       rewards: result.rewards,
    //       timestamp: Number(result.timestamp)
    //     }
    //   });
    // } 
    // 其他请求方法
    else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in staking-apy API:', error);
    return res.status(500).json({ 
      error: 'Failed to process staking APY data',
      message: error.message 
    });
  } finally {
    // 关闭 Prisma 客户端连接
    await prisma.$disconnect();
  }
}
