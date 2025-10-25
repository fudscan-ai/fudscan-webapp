/**
 * Script to fetch staking APY data from Moonwell API and store in PostgreSQL database using Prisma
 * 
 * Usage: node fetchStakingApy.js
 */

import { fetchStakingApyFromAPI, storeStakingApy } from '../src/utils/stakingUtils.js';
import { PrismaClient } from '../src/generated/prisma/index.js';

// Initialize Prisma client
const prisma = new PrismaClient();

console.log('Initializing Prisma client for PostgreSQL database');

/**
 * Initialize the database connection
 */
async function initializeDatabase() {
  try {
    // Test the database connection
    await prisma.$connect();
    console.log('Database connection established');
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Initialize database connection
    await initializeDatabase();
    
    // Fetch and store staking APY data
    console.log('Fetching staking APY data...');
    const apyData = await fetchStakingApyFromAPI();
    
    if (apyData !== null) {
      // Use stakingUtils to store APY data
      await storeStakingApy(apyData);
      console.log('Staking APY data fetched and stored successfully');
    } else {
      console.warn('Skipping storage due to null APY data');
    }
    
  } catch (error) {
    console.error('Error in main process:', error);
  } finally {
    // Disconnect Prisma client
    await prisma.$disconnect();
  }
}

// Run the script
main().catch(console.error);
