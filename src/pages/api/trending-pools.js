/**
 * API endpoint to expose cached GeckoTerminal trending pool snapshots.
 * The response is structured to be easily consumed as context for OpenAPI.
 *
 * Query parameters:
 *   ?chain=all,bsc        // Optional comma-separated list of chain keys to include
 *   ?limit=5              // Optional limit per chain (default: 10)
 */

import { PrismaClient } from '../../generated/prisma/index.js';

const prisma = new PrismaClient();

function safeNumber(value) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatPercent(value) {
  if (value === null || value === undefined) return 'n/a';
  const num = Number(value);
  if (!Number.isFinite(num)) return 'n/a';
  return `${num.toFixed(2)}%`;
}

function formatUsd(value) {
  const num = safeNumber(value);
  if (num === null) return 'n/a';

  if (Math.abs(num) >= 1_000_000_000) {
    return `$${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(num) >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(num) >= 1_000) {
    return `$${(num / 1_000).toFixed(2)}K`;
  }
  return `$${num.toFixed(2)}`;
}

function formatPool(pool) {
  const attributes = pool?.attributes ?? {};
  const priceChanges = attributes.price_change_percentage ?? {};
  const volumeUsd = attributes.volume_usd ?? {};

  return {
    id: pool?.id ?? null,
    name: attributes.name ?? null,
    address: attributes.address ?? null,
    fdvUsd: safeNumber(attributes.fdv_usd),
    reserveUsd: safeNumber(attributes.reserve_in_usd),
    baseTokenPriceUsd: safeNumber(attributes.base_token_price_usd),
    quoteTokenPriceUsd: safeNumber(attributes.quote_token_price_usd),
    priceChangePercentage: {
      m5: safeNumber(priceChanges.m5),
      m15: safeNumber(priceChanges.m15),
      m30: safeNumber(priceChanges.m30),
      h1: safeNumber(priceChanges.h1),
      h6: safeNumber(priceChanges.h6),
      h24: safeNumber(priceChanges.h24)
    },
    volumeUsd: {
      m5: safeNumber(volumeUsd.m5),
      m15: safeNumber(volumeUsd.m15),
      m30: safeNumber(volumeUsd.m30),
      h1: safeNumber(volumeUsd.h1),
      h6: safeNumber(volumeUsd.h6),
      h24: safeNumber(volumeUsd.h24)
    },
    transactions: attributes.transactions ?? null,
    relationships: pool?.relationships ?? null
  };
}

function formatSnapshot(snapshot, limit) {
  const payload = snapshot?.data ?? {};
  const pools = Array.isArray(payload.data) ? payload.data.slice(0, limit).map(formatPool) : [];
  const context = pools.map((pool, index) => {
    const oneHourChange = formatPercent(pool.priceChangePercentage?.h1);
    const oneHourVolume = formatUsd(pool.volumeUsd?.h1);
    const fdv = formatUsd(pool.fdvUsd);
    return `${index + 1}. ${pool.name || pool.address || pool.id} — price change (1h): ${oneHourChange}, volume (1h): ${oneHourVolume}, FDV: ${fdv}`;
  });

  return {
    chainKey: snapshot.chainKey,
    network: snapshot.network,
    fetchedAt: Number(snapshot.fetchedAt),
    createdAt: snapshot.createdAt?.toISOString?.() ?? null,
    poolCount: pools.length,
    pools,
    context
  };
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const chainsParam = req.query.chain?.toString().toLowerCase() ?? null;

    console.log('chainsParam', chainsParam);
    
    // Chain key normalization mapping - handles multiple variants and case insensitive
    const chainNormalization = {
      // Base variants
      'base': 'base',
      'basecoin': 'base',
      
      // Solana variants
      'sol': 'solana',
      'solana': 'solana',
      
      // BSC/Binance variants
      'bsc': 'bsc',
      'bnb': 'bsc',
      'binance': 'bsc',
      'binance smart chain': 'bsc',
      'smart chain': 'bsc',
      
      // Polygon variants
      'polygon': 'polygon_pos',
      'matic': 'polygon_pos',
      'polygon pos': 'polygon_pos',
      'polygon_pos': 'polygon_pos',
      
      // "ethereum"
      'ethereum': 'eth',
      'eth': 'eth',
      'ethereum mainnet': 'eth',
      'eth mainnet': 'eth',

    };
    
    const chainKeys = chainsParam
      ? chainsParam
          .split(',')
          .map((key) => key.trim())
          .filter(Boolean)
          .map((key) => chainNormalization[key.toLowerCase()] || key) // Normalize chain keys
      : null;

    const limit = (() => {
      const parsed = Number(req.query.limit);
      if (Number.isFinite(parsed) && parsed > 0) {
        return Math.min(parsed, 25); // cap to avoid huge payloads
      }
      return 10;
    })();

    let snapshots;

    if (chainKeys?.length) {
      const results = await Promise.all(
        chainKeys.map((chainKey) =>
          prisma.trendingPoolSnapshot.findFirst({
            where: { chainKey },
            orderBy: { fetchedAt: 'desc' }
          })
        )
      );

      snapshots = results.filter(Boolean);
    } else {
      snapshots = await prisma.trendingPoolSnapshot.groupBy({
        by: ['chainKey'],
        _max: { fetchedAt: true }
      });

      const latestSnapshots = await Promise.all(
        snapshots.map(({ chainKey, _max }) =>
          prisma.trendingPoolSnapshot.findFirst({
            where: { chainKey, fetchedAt: _max.fetchedAt },
            orderBy: { fetchedAt: 'desc' }
          })
        )
      );

      snapshots = latestSnapshots.filter(Boolean);
    }

    const formatted = snapshots.map((snapshot) => formatSnapshot(snapshot, limit));

    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      chainCount: formatted.length,
      chains: formatted,
      context: formatted.map((chain) => chain.context).join('\n')
    });
  } catch (error) {
    console.error('Error in trending-pools API:', error);
    return res.status(500).json({
      error: 'Failed to retrieve trending pools',
      message: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
