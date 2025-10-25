/**
 * Script to fetch token prices from DexScreener API and store in PostgreSQL database using Prisma
 * 
 * Usage: node fetchPrices.js
 */

import { VALID_TOKENS, fetchTokenPriceFromAPI, storeTokenPrice } from '../src/utils/tokenUtils.js';
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
    
    // Fetch and store prices for all tokens
    const symbols = VALID_TOKENS;
    
    for (const symbol of symbols) {
      // Use tokenUtils to fetch price
      const price = await fetchTokenPriceFromAPI(symbol);
      if (price !== null) {
        // Use tokenUtils to store price
        await storeTokenPrice(symbol, price);
      } else {
        console.warn(`Skipping storage for ${symbol} due to null price`);
      }
      // Wait 10 seconds between API calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    console.log('All prices fetched and stored successfully');
  } catch (error) {
    console.error('Error in main process:', error);
  } finally {
    // Disconnect Prisma client
    await prisma.$disconnect();
  }
}

// Run the script
main().catch(console.error);
