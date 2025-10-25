/**
 * Script to periodically fetch trending pool data from GeckoTerminal
 * and cache the snapshots in PostgreSQL via Prisma.
 *
 * Usage: node scripts/fetchTrendingPools.js
 */

import { PrismaClient } from '../src/generated/prisma/index.js';

const fetchFn = globalThis.fetch ?? (await import('node-fetch')).default;

const prisma = new PrismaClient();

const NETWORK_MAPPING = {
  bsc: 'bsc',
  sol: 'solana',
  base: 'base',
  eth: 'eth',
  arb: 'arb',
  polygon: 'polygon_pos'
};

const FETCH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const PER_CHAIN_DELAY_MS = 30 * 1000; // 30 seconds between chain calls

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initializeDatabase() {
  try {
    await prisma.$connect();
    console.log('Database connection established');
  } catch (error) {
    console.error('Failed to establish database connection:', error);
    throw error;
  }
}

async function fetchTrendingPools(network) {
  const url = `https://api.geckoterminal.com/api/v2/networks/${network}/trending_pools?page=1&duration=1h`;
  console.log(`Fetching trending pools for network "${network}" from ${url}`);

  try {
    const response = await fetchFn(url, {
      headers: {
        accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const json = await response.json();
    console.log(`Fetched ${Array.isArray(json?.data) ? json.data.length : 0} pools for network "${network}"`);
    return json;
  } catch (error) {
    console.error(`Error fetching trending pools for network "${network}":`, error);
    return null;
  }
}

async function storeTrendingPools(chainKey, network, payload) {
  if (!payload) {
    return;
  }

  const fetchedAt = Math.floor(Date.now() / 1000);

  try {
    const record = await prisma.trendingPoolSnapshot.create({
      data: {
        chainKey,
        network,
        data: payload,
        fetchedAt
      }
    });

    console.log(
      `Stored trending pool snapshot for "${chainKey}" (network: "${network}") with id ${record.id} at ${fetchedAt}`
    );
  } catch (error) {
    console.error(`Failed to store trending pools for "${chainKey}" (network: "${network}")`, error);
  }
}

async function processNetworks() {
  const entries = Object.entries(NETWORK_MAPPING);

  for (let index = 0; index < entries.length; index += 1) {
    const [chainKey, network] = entries[index];
    if (!network) {
      console.warn(`No network mapping for chain key "${chainKey}", skipping`);
      continue;
    }

    const payload = await fetchTrendingPools(network);
    await storeTrendingPools(chainKey, network, payload);

    if (index < entries.length - 1) {
      console.log(`Waiting ${PER_CHAIN_DELAY_MS / 1000} seconds before the next network...`);
      await sleep(PER_CHAIN_DELAY_MS);
    }
  }
}

let isRunning = false;

async function runCycle() {
  if (isRunning) {
    console.log('Previous fetching cycle still running, skipping this interval');
    return;
  }

  isRunning = true;
  console.log('Starting trending pools fetching cycle');

  try {
    await processNetworks();
    console.log('Completed trending pools fetching cycle');
  } catch (error) {
    console.error('Unexpected error during trending pools cycle:', error);
  } finally {
    isRunning = false;
  }
}

let intervalId;

async function main() {
  try {
    await initializeDatabase();
    await runCycle(); // Run immediately on start
    intervalId = setInterval(runCycle, FETCH_INTERVAL_MS);
  } catch (error) {
    console.error('Fatal error in trending pools script:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down...`);
  if (intervalId) {
    clearInterval(intervalId);
  }
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main().catch(async (error) => {
  console.error('Unhandled error in trending pools script:', error);
  await prisma.$disconnect();
  process.exit(1);
});
