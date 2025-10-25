// Token utilities - No Prisma imports here to avoid browser-side Node.js dependencies

// Token addresses for API calls
export const TOKEN_ADDRESSES = {
  "MAMO": "0x7300B37DfdfAb110d83290A29DfB31B1740219fE",
  "BYTE": "0x2D90785E30A9df6ccE329c0171CB8Ba0f4a5c17b",
  "COINTEXT": "0xD0924FA4C6BA194294a414d0fB826739deD98b24", // Using BYTE address as placeholder
  "VIRTUAL": "0x44ff8620b8ca30902395a7bd3f2407e1a091bf73" // Using BYTE address as placeholder
};

// Initial prices for tokens
export const INITIAL_PRICES = {
  "MAMO": 0.1613,
  "BYTE": 0.0069,
  "COINTEXT": 0.0034,
  "VIRTUAL": 1.44
};

// Valid token symbols
export const VALID_TOKENS = ["MAMO", "BYTE", "COINTEXT", "VIRTUAL"];

// Token weights for portfolio calculation
export const TOKEN_WEIGHTS = {"MAMO": 3, "BYTE": 3, "COINTEXT": 3, "VIRTUAL": 1};

/**
 * Fetch the current price of a token from DexScreener API
 * @param {string} symbol - Token symbol
 * @returns {Promise<number|null>} - Current price or null if not available
 */
export async function fetchTokenPriceFromAPI(symbol) {

  const address = TOKEN_ADDRESSES[symbol];
  let url;
  if (!address) {
    url = `https://api.dexscreener.com/latest/dex/search?q=${symbol}/USDC`;
  }else{
    url = `https://api.dexscreener.com/latest/dex/search?q=${address}`;
  }
  
  try {
    console.log(`Fetching price for ${symbol} from ${url}`);
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.pairs && data.pairs.length > 0) {
      for (let pair of data.pairs) {
        if (pair.baseToken.symbol === symbol){
          const price = parseFloat(pair.priceUsd);
          console.log(`${symbol} price: $${price}`);
          return price;
        }
      }
    }
    
    console.warn(`No price data found for ${symbol}, using initial price`);
    return null;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Get the latest price of a token from the API
 * @param {string} symbol - Token symbol
 * @returns {Promise<number|null>} - Current price or null if not available
 */
export async function getLatestTokenPrice(symbol) {
  try {
    // Use the API endpoint instead of direct Prisma access
    const response = await fetch(`/api/token-price?symbol=${symbol}`);
    const data = await response.json();
    
    if (data && data.price) {
      return parseFloat(data.price);
    } else {
      return null; // Return null if no price found for the symbol
    }
  } catch (err) {
    console.error('Error retrieving token price:', err);
    return null;
  }
}

/**
 * Store a token price directly to database
 * @param {string} symbol - Token symbol
 * @param {number} price - Token price
 * @returns {Promise<void>}
 */
export async function storeTokenPrice(symbol, price) {
  const { PrismaClient } = await import('../generated/prisma/index.js');
  const prisma = new PrismaClient();
  
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Store price directly to TokenPrice table
    const result = await prisma.tokenPrice.create({
      data: {
        symbol,
        price,
        timestamp
      }
    });
    
    console.log(`Stored price for ${symbol}: $${price}`, {
      id: result.id,
      timestamp: Number(result.timestamp)
    });
  } catch (error) {
    console.error(`Error storing price for ${symbol}:`, error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Calculate the return percentage for a token
 * @param {string} symbol - Token symbol
 * @returns {Promise<{returnPercentage: number, formattedReturn: string, initialPrice: number, currentPrice: number}|null>}
 */
export async function calculateTokenReturn(symbol) {
  if (!VALID_TOKENS.includes(symbol)) {
    return null;
  }

  try {
    // Get the latest price from API
    const currentPrice = await getLatestTokenPrice(symbol);
    
    if (currentPrice) {
      const initialPrice = INITIAL_PRICES[symbol];
      
      // Calculate return percentage
      const returnPercentage = ((currentPrice - initialPrice) / initialPrice) * 100;
      const formattedReturn = returnPercentage >= 0 ? 
        `+${returnPercentage.toFixed(2)}%` : 
        `${returnPercentage.toFixed(2)}%`;
      
      return {
        returnPercentage,
        formattedReturn,
        initialPrice,
        currentPrice
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error calculating return for ${symbol}:`, error);
    return null;
  }
}

/**
 * Calculate the change between two prices
 * @param {number} currentPrice - Current price
 * @param {number} initialPrice - Initial price
 * @returns {string} - Formatted change percentage
 */
export function calculateChange(currentPrice, initialPrice) {
  const changePercent = ((currentPrice - initialPrice) / initialPrice) * 100;
  return changePercent >= 0 ? `+${changePercent.toFixed(0)}%` : `${changePercent.toFixed(0)}%`;
}

/**
 * Get the CSS class for price change
 * @param {number} currentPrice - Current price
 * @param {number} initialPrice - Initial price
 * @returns {string} - CSS class name
 */
export function getPriceChangeClass(currentPrice, initialPrice) {
  if (currentPrice > initialPrice) {
    return "text-green-600";
  } else if (currentPrice < initialPrice) {
    return "text-red-600";
  } else {
    return "text-gray-600";
  }
}

/**
 * Get token data for all tokens - This function is now only used server-side in the API
 * @returns {Promise<Array>} - Array of token data objects
 * @deprecated Use the API endpoint /api/tokens instead
 */
export async function getAllTokenData() {
  // This function is kept for backward compatibility
  // But it should not be used directly in components
  // Instead, use the API endpoint /api/tokens
  console.warn('getAllTokenData() is deprecated. Use the API endpoint /api/tokens instead');
  
  try {
    const response = await fetch('/api/tokens');
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching token data:', error);
    return [];
  }
}
