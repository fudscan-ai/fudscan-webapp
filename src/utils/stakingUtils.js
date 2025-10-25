// Staking utilities - No Prisma imports here to avoid browser-side Node.js dependencies

/**
 * Fetch staking APY data from the external API
 * @returns {Promise<Object|null>} - Staking APY data or null if not available
 */
export async function fetchStakingApyFromAPI() {
  const url = 'https://mamo-indexer.moonwell.workers.dev/apy/mamo_staking';
  
  try {
    console.log(`Fetching staking APY data from ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('Staking APY data fetched:', {
      totalApy: data.totalApy,
      baseApy: data.baseApy,
      rewardsApy: data.rewardsApy,
      rewardsCount: data.rewards?.length || 0
    });
    
    return {
      totalApy: data.totalApy,
      baseApy: data.baseApy,
      rewardsApy: data.rewardsApy,
      rewards: data.rewards || []
    };
  } catch (error) {
    console.error('Error fetching staking APY data:', error);
    return null;
  }
}

/**
 * Store staking APY data directly to database
 * @param {Object} apyData - Staking APY data object
 * @returns {Promise<void>}
 */
export async function storeStakingApy(apyData) {
  const { PrismaClient } = await import('../generated/prisma/index.js');
  const prisma = new PrismaClient();
  
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Store APY data directly to StakingApy table
    const result = await prisma.stakingApy.create({
      data: {
        totalApy: apyData.totalApy,
        baseApy: apyData.baseApy,
        rewardsApy: apyData.rewardsApy,
        rewards: apyData.rewards,
        timestamp
      }
    });
    
    console.log('Stored staking APY data:', {
      id: result.id,
      totalApy: Number(result.totalApy),
      baseApy: Number(result.baseApy),
      rewardsApy: Number(result.rewardsApy),
      timestamp: Number(result.timestamp)
    });
  } catch (error) {
    console.error('Error storing staking APY data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Get the latest staking APY data from the API endpoint
 * @returns {Promise<Object|null>} - Latest staking APY data or null if not available
 */
export async function getLatestStakingApy() {
  try {
    // Use the API endpoint instead of direct Prisma access
    const response = await fetch('/api/staking-apy');
    const data = await response.json();
    
    if (data && data.totalApy !== undefined) {
      return {
        totalApy: parseFloat(data.totalApy),
        baseApy: parseFloat(data.baseApy),
        rewardsApy: parseFloat(data.rewardsApy),
        rewards: data.rewards || []
      };
    } else {
      return null;
    }
  } catch (err) {
    console.error('Error retrieving staking APY data:', err);
    return null;
  }
}
