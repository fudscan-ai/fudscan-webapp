# Data Sources Display Feature

## Overview

FUDSCAN now displays all API data sources used to generate each response. This provides transparency about which external APIs were consulted and whether they successfully returned data.

## Display Location

The data sources section appears **below the AI response** and **above the timestamp**, showing:
- Which APIs were called
- Success/failure status of each API
- Brief description of what each API provides

## Visual Example

```
┌─────────────────────────────────────────────────────────┐
│ 📊 DATA SOURCES USED                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 📈 DexScreener ✓                                       │
│    Search for trading pairs across decentralized       │
│    exchanges. Find tokens, pairs, and trading...       │
│                                                         │
│ 🐋 Nansen ✓                                            │
│    Retrieve aggregated token balances held by          │
│    smart traders and funds across multiple...          │
│                                                         │
│ 💰 DeBank ✗ Failed                                     │
│    Get user balance on a specific blockchain...        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## API Categories and Icons

### DexScreener 📈
- **Icon:** 📈 (Chart Increasing)
- **Category:** `dex`
- **What it provides:** Price data, trading volumes, liquidity, DEX pairs
- **Authentication:** None required (public API)

### Nansen 🐋
- **Icon:** 🐋 (Whale)
- **Category:** `nansen`
- **What it provides:** Smart money tracking, whale activity, fund holdings
- **Authentication:** API key required (`NANSEN_API_KEY`)

### DeBank 💰
- **Icon:** 💰 (Money Bag)
- **Category:** `debank`
- **What it provides:** Wallet balances, token holdings, DeFi positions
- **Authentication:** API key required (`DEBANK_API_KEY`)

### Generic External API 🔗
- **Icon:** 🔗 (Link)
- **Category:** `external`
- **Fallback for:** Any other API category

## Status Indicators

### Success ✓
- **Color:** Green (`text-green-400`)
- **Meaning:** API call succeeded and returned data
- **Display:** Shows green checkmark next to API name

### Failed ✗
- **Color:** Red (`text-red-400`)
- **Meaning:** API call failed (network error, auth issue, or no data)
- **Display:** Shows red X with "Failed" text next to API name

## When Data Sources Are Displayed

The section **ONLY appears** when:
1. The AI workflow used the `TOOL_ENHANCED` intent (not `DIRECT_ANSWER`)
2. At least one API tool was called during the workflow
3. The response includes `citations` with `type: 'api_tool'`

**It will NOT appear when:**
- The AI provides a direct answer without using tools
- Only RAG (knowledge base) was used, but no external APIs
- The workflow encountered errors before calling any APIs

## Code Structure

### Backend (src/pages/api/chat.js)

```javascript
// When API tools are called, citations are added:
context.citations.push({
  type: 'api_tool',
  source: tool?.name || toolName,           // e.g., "dex.search"
  description: tool?.description || 'API Tool',
  category: tool?.category || 'external',    // e.g., "dex", "nansen", "debank"
  success: toolResult?.success !== false,
  data: toolResult
});
```

### Frontend (src/pages/index.js)

```javascript
// Filter to only show API tool citations (not OpenAI)
{message.citations && message.citations.filter(c => c.type === 'api_tool').length > 0 && (
  <div className="nes-container is-dark with-title mt-3">
    <p className="title">📊 DATA SOURCES USED</p>
    <div className="space-y-2">
      {message.citations
        .filter(c => c.type === 'api_tool')
        .map((citation, index) => {
          const categoryIcons = {
            'dex': '📈',
            'nansen': '🐋',
            'debank': '💰',
            'external': '🔗'
          };
          const categoryNames = {
            'dex': 'DexScreener',
            'nansen': 'Nansen',
            'debank': 'DeBank',
            'external': 'External API'
          };

          return (
            <div key={index}>
              <span>{categoryIcons[citation.category]}</span>
              <span>{categoryNames[citation.category]}</span>
              {citation.success ? ' ✓' : ' ✗ Failed'}
              <div className="text-xs">{citation.description}</div>
            </div>
          );
        })}
    </div>
  </div>
)}
```

## Example Workflow

### User Query: "Tell me about BTC token"

**Workflow Steps:**
1. **Intent Analysis:** AI determines `TOOL_ENHANCED` needed
2. **API Calling Step:** Calls multiple tools:
   - `dex.search` → Find BTC trading pairs
   - `nansen.smart.holdings` → Check smart money positions
   - `nansen.smart.trades` → Recent whale activity
3. **Answer Generation:** Synthesizes data into FUD analysis
4. **Display:** Shows response with data sources section

**Data Sources Displayed:**
```
📊 DATA SOURCES USED

📈 DexScreener ✓
   Search for trading pairs across decentralized exchanges...

🐋 Nansen ✓
   Retrieve aggregated token balances held by smart traders...

🐋 Nansen ✓
   Access real-time DEX trading activity from smart traders...
```

## Troubleshooting

### "No data sources shown even though APIs were called"

**Possible causes:**
1. Citations array is empty in the response
2. API calls happened but citations weren't added in backend
3. All citations have `type` other than `'api_tool'`

**Solution:**
- Check backend logs for API call results
- Verify `context.citations.push()` is being called in `src/pages/api/chat.js`
- Ensure citations are included in the `done` event

### "All APIs showing as Failed ✗"

**Possible causes:**
1. API keys not configured correctly in `.env`
2. API rate limits exceeded
3. Network connectivity issues
4. API endpoints changed or deprecated

**Solution:**
- Verify API keys in `.env` file
- Test individual APIs using `scripts/testRealApis.js`
- Check backend logs for detailed error messages
- Review API provider status pages

### "Wrong icons or category names displayed"

**Possible causes:**
1. Tool's `category` field in database doesn't match expected values
2. New API category added but not included in icon/name mappings

**Solution:**
- Ensure tools have correct categories in database (`dex`, `nansen`, `debank`)
- Add new categories to `categoryIcons` and `categoryNames` objects in frontend
- Run `scripts/addRealApiTools.js` to update tool configurations

## Benefits of Data Sources Display

### For Users:
✅ **Transparency:** See exactly which sources informed the analysis
✅ **Confidence:** Verify multi-source data strategy is working
✅ **Debugging:** Identify which APIs failed vs succeeded
✅ **Education:** Learn which tools provide which types of data

### For Developers:
✅ **Monitoring:** Quick visual check of API health
✅ **Debugging:** Identify failed API calls in production
✅ **Validation:** Confirm tool selection logic is working
✅ **Documentation:** Self-documenting what data sources are used

## Related Files

- **Frontend Display:** `/src/pages/index.js` (lines 670-714)
- **Backend Citations:** `/src/pages/api/chat.js` (lines 124-139)
- **API Tools Config:** `/scripts/addRealApiTools.js`
- **API Testing:** `/scripts/testRealApis.js`
- **Environment Config:** `/.env`

## Future Enhancements

Potential improvements:
- Click to expand full API response data
- Show API response times
- Display rate limit usage
- Add link to API provider documentation
- Show token/credits consumed per API call
- Historical API success/failure rates
- Retry failed APIs automatically
