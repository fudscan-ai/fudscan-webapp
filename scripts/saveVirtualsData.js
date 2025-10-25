import { PrismaClient } from '../src/generated/prisma/index.js';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function saveVirtualsData(dataFilePath) {
  try {
    console.log('Reading data from:', dataFilePath);
    
    // 读取数据文件
    const rawData = fs.readFileSync(dataFilePath, 'utf8');
    const data = JSON.parse(rawData);
    
    const { agents, dataSource, scrapedAt } = data;
    
    if (!agents || !Array.isArray(agents)) {
      throw new Error('Invalid data format: agents array not found');
    }
    
    console.log(`Processing ${agents.length} agents for data source: ${dataSource}`);
    
    let savedCount = 0;
    let updatedCount = 0;
    let yieldVaultCount = 0;
    
    for (const agentData of agents) {
      try {
        // 准备VirtualAgent数据
        const virtualAgentData = {
          virtualId: agentData.virtualId,
          name: agentData.name || '',
          description: agentData.description,
          category: agentData.category,
          cluster: agentData.cluster,
          role: agentData.role,
          status: agentData.status,
          
          // Financial data
          grossAgenticAmount: agentData.grossAgenticAmount,
          volume24h: agentData.volume24h,
          netVolume24h: agentData.netVolume24h,
          priceChangePercent24h: agentData.priceChangePercent24h,
          mcapInVirtual: agentData.mcapInVirtual,
          liquidityUsd: agentData.liquidityUsd,
          totalValueLocked: agentData.totalValueLocked,
          virtualTokenValue: agentData.virtualTokenValue,
          
          // Holder data
          holderCount: agentData.holderCount,
          holderCountPercent24h: agentData.holderCountPercent24h,
          devHoldingPercentage: agentData.devHoldingPercentage,
          top10HolderPercentage: agentData.top10HolderPercentage,
          uniqueBuyerCount: agentData.uniqueBuyerCount,
          
          // Agent performance
          successRate: agentData.successRate,
          successfulJobCount: agentData.successfulJobCount,
          transactionCount: agentData.transactionCount,
          
          // Addresses and identifiers
          ownerAddress: agentData.ownerAddress,
          walletAddress: agentData.walletAddress,
          tokenAddress: agentData.tokenAddress,
          daoAddress: agentData.daoAddress,
          tbaAddress: agentData.tbaAddress,
          lpAddress: agentData.lpAddress,
          veTokenAddress: agentData.veTokenAddress,
          
          // Social and metadata
          twitterHandle: agentData.twitterHandle,
          profilePic: agentData.profilePic,
          imageUrl: agentData.imageUrl,
          
          // Technical data
          chain: agentData.chain,
          factory: agentData.factory,
          cores: agentData.cores,
          preToken: agentData.preToken,
          preTokenPair: agentData.preTokenPair,
          totalSupply: agentData.totalSupply,
          walletBalance: agentData.walletBalance,
          
          // Revenue and connection
          revenueConnectWallet: agentData.revenueConnectWallet,
          
          // Genesis and creator info
          genesisId: agentData.genesisId,
          genesisName: agentData.genesisName,
          creatorId: agentData.creatorId,
          creatorUsername: agentData.creatorUsername,
          creatorEmail: agentData.creatorEmail,
          
          // Metrics (JSON for flexibility)
          metrics: agentData.metrics,
          
          // Data source and timestamps
          dataSource: agentData.dataSource || dataSource,
          launchedAt: agentData.launchedAt ? new Date(agentData.launchedAt) : null,
          scrapedAt: new Date(scrapedAt)
        };
        
        // 使用upsert来处理重复数据
        const result = await prisma.virtualAgent.upsert({
          where: { 
            virtualId: agentData.virtualId 
          },
          update: {
            ...virtualAgentData,
            updatedAt: new Date()
          },
          create: virtualAgentData
        });
        
        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          savedCount++;
        } else {
          updatedCount++;
        }
        
        // 处理yield vault数据（如果存在）
        if (agentData.yieldData && dataSource === 'yield_apy') {
          const yieldVaultData = {
            virtualAgentId: result.id,
            apy: agentData.yieldData.apy,
            totalDeposits: agentData.yieldData.totalDeposits,
            availableCapacity: agentData.yieldData.availableCapacity,
            vaultType: agentData.yieldData.vaultType,
            riskLevel: agentData.yieldData.riskLevel,
            scrapedAt: new Date(scrapedAt)
          };
          
          await prisma.virtualYieldVault.upsert({
            where: {
              virtualAgentId: result.id
            },
            update: {
              ...yieldVaultData,
              updatedAt: new Date()
            },
            create: yieldVaultData
          });
          
          yieldVaultCount++;
        }
        
      } catch (error) {
        console.error(`Error processing agent ${agentData.virtualId}:`, error.message);
      }
    }
    
    console.log(`✅ Data processing completed for ${dataSource}:`);
    console.log(`   - New records: ${savedCount}`);
    console.log(`   - Updated records: ${updatedCount}`);
    if (yieldVaultCount > 0) {
      console.log(`   - Yield vaults processed: ${yieldVaultCount}`);
    }
    
    return { savedCount, updatedCount, yieldVaultCount };
    
  } catch (error) {
    console.error('❌ Error saving virtuals data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 获取命令行参数
const dataFilePath = process.argv[2];

if (!dataFilePath) {
  console.error('Usage: node saveVirtualsData.js <data-file-path>');
  process.exit(1);
}

if (!fs.existsSync(dataFilePath)) {
  console.error('Data file not found:', dataFilePath);
  process.exit(1);
}

// 执行保存操作
saveVirtualsData(dataFilePath)
  .then((result) => {
    console.log('🎉 Virtuals data saved successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to save virtuals data:', error);
    process.exit(1);
  });
