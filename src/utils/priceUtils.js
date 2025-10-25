/**
 * Price utility functions for COINTEXT fund
 */

// 初始价格定义
export const INITIAL_PRICES = {
  "MAMO": 0.1613,
  "BYTE": 0.0069,
  "COINTEXT": 0.0034,
  "VIRTUAL": 1.44
};

// Token contract addresses
export const TOKEN_ADDRESSES = {
  "MAMO": "0x678F431DA2aBb9B5726bbf5CCDbaEEBB60dA9813",
  "BYTE": "0xBC2f889b48301DEA827C2e77AB78f8F1Be8A77fB",
  "COINTEXT": "0xD0924FA4C6BA194294a414d0fB826739deD98b24",
  "VIRTUAL": "0x271aa3CEEa42781B41f075dcaCd9a9B3a2Ef27F8"
};

// API endpoints for price data
export const API_ENDPOINTS = {
  "MAMO": `https://api.dexscreener.com/latest/dex/search?q=${TOKEN_ADDRESSES.MAMO}`,
  "BYTE": `https://api.dexscreener.com/latest/dex/search?q=${TOKEN_ADDRESSES.BYTE}`,
  "COINTEXT": `https://api.dexscreener.com/latest/dex/search?q=${TOKEN_ADDRESSES.COINTEXT}`,
  "VIRTUAL": `https://api.dexscreener.com/latest/dex/search?q=${TOKEN_ADDRESSES.VIRTUAL}`
};

/**
 * 获取当前价格（假数据）- 仅用于开发环境
 * @param {string} symbol - Token symbol
 * @param {number} initialPrice - Initial price
 * @returns {number} - Current price
 */
export const getFakePriceData = (symbol, initialPrice) => {
  // 这里返回假数据，实际应该从服务端获取
  const randomFactor = {
    "MAMO": 1.10,     // +10%
    "BYTE": 1.50,     // +50%
    "COINTEXT": 4.00,    // +300%
    "VIRTUAL": 0.90   // -10%
  };
  
  return initialPrice * randomFactor[symbol];
};

/**
 * 从数据库获取价格数据
 * @param {Object} db - Database connection
 * @param {string} symbol - Token symbol
 * @returns {Promise<number>} - Current price
 */
export const getPriceFromDB = async (db, symbol) => {
  try {
    // 这里应该实现从数据库读取价格的逻辑
    // 示例实现，实际应根据数据库结构调整
    const query = `SELECT price FROM token_prices WHERE symbol = ? ORDER BY timestamp DESC LIMIT 1`;
    const result = await db.query(query, [symbol]);
    
    if (result && result.length > 0) {
      return result[0].price;
    }
    
    // 如果数据库中没有数据，返回初始价格
    return INITIAL_PRICES[symbol];
  } catch (error) {
    console.error(`Error fetching price for ${symbol} from database:`, error);
    // 出错时返回初始价格
    return INITIAL_PRICES[symbol];
  }
};

/**
 * 计算价格变化百分比
 * @param {number} currentPrice - Current price
 * @param {number} initialPrice - Initial price
 * @returns {string} - Formatted percentage change
 */
export const calculateChange = (currentPrice, initialPrice) => {
  const changePercent = ((currentPrice - initialPrice) / initialPrice) * 100;
  const sign = changePercent >= 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(0)}%`;
};

/**
 * 确定价格变化的CSS类
 * @param {number} currentPrice - Current price
 * @param {number} initialPrice - Initial price
 * @returns {string} - CSS class name
 */
export const getPriceChangeClass = (currentPrice, initialPrice) => {
  return currentPrice >= initialPrice ? "text-green-600" : "text-red-600";
};

/**
 * 从API获取实时价格
 * @param {string} symbol - Token symbol
 * @returns {Promise<number>} - Current price from API
 */
export const fetchPriceFromAPI = async (symbol) => {
  try {
    const response = await fetch(API_ENDPOINTS[symbol]);
    const data = await response.json();
    
    if (data && data.pairs && data.pairs.length > 0) {
      return parseFloat(data.pairs[0].priceUsd);
    }
    
    throw new Error(`No price data found for ${symbol}`);
  } catch (error) {
    console.error(`Error fetching price for ${symbol} from API:`, error);
    // 出错时返回初始价格
    return INITIAL_PRICES[symbol];
  }
};
