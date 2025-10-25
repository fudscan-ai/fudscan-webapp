# Data Sources Feature - Testing Guide

## ✅ What Was Implemented

The system now tracks and displays **all data sources** used to generate responses, including:

1. **🤖 AI Models** - OpenAI GPT-4o for direct answers and synthesis
2. **🛠️ API Tools** - External APIs like DeBank, Nansen, DexScreener
3. **📚 Knowledge Bases** - RAG document retrieval from uploaded whitepapers
4. **💡 RAG Context Indicator** - Shows when knowledge base was consulted

## 🎯 Key Features

### Backend (`/api/chat.js`)
- ✅ Tracks citations throughout workflow execution
- ✅ Captures RAG sources with metadata
- ✅ Records API tool calls with success/failure status
- ✅ Adds OpenAI model as a citation for answer generation
- ✅ Sends all citations in the `done` event

### Workflow Orchestrator (`/lib/ai-workflow.js`)
- ✅ Improved RAG step with proper source formatting
- ✅ Enhanced API step with better error handling
- ✅ Graceful fallbacks when tools/RAG not available
- ✅ Detailed logging for debugging

### Frontend (`/pages/chat.js`)
- ✅ **📊 Data Sources Used** section showing all sources
- ✅ Icon indicators: 🤖 AI / 🛠️ API Tools / 📚 Knowledge Base
- ✅ Success/failure indicators: ✓ / ❌
- ✅ Expandable raw data view for API responses
- ✅ **🔍 View All Tool Results** collapsible section
- ✅ **💡 RAG Context Indicator** when knowledge base used
- ✅ Works for both streaming and non-streaming responses

## 🧪 How to Test

### Test 1: Simple Direct Answer (AI Model Only)

**Query:**
```
"What is Bitcoin?"
```

**Expected Result:**
- Quick response
- Shows: `📊 Data Sources Used:`
  - `🤖 OpenAI GPT-4o ✓`
  - Description: "Direct answer from AI knowledge"

### Test 2: Query Requiring Tools (If Tools Configured)

**Query:**
```
"What's the current price of Ethereum?"
```

**Expected Result:**
- Shows workflow execution steps
- Shows: `📊 Data Sources Used:`
  - `🛠️ DexScreener Price API ✓`
  - `🤖 OpenAI GPT-4o ✓`
- Click "View raw data" to see API response
- Click "🔍 View All Tool Results" to see detailed data

### Test 3: Knowledge Base Query (If RAG Configured)

**Query:**
```
"Tell me about Cardano's consensus mechanism"
```

**Expected Result:**
- Shows: `💡 RAG knowledge base consulted`
- Shows: `📊 Data Sources Used:`
  - `📚 Cardano Whitepaper`
  - `🤖 OpenAI GPT-4o ✓`

### Test 4: Failed Tool Call

**Query (when tool fails):**
```
"Scan this project: 0xinvalidaddress"
```

**Expected Result:**
- Shows: `📊 Data Sources Used:`
  - `🛠️ Tool Name ❌` (with red X)
  - Description of the tool
  - Error message in raw data

## 📝 Console Logging

Open browser console (F12) to see:

```
🔍 Analyzing query: [your message]
🛠️ Available tools: X
📚 Knowledge bases: Y
📋 Workflow plan: {...}
📡 Starting SSE stream...
📨 Event: workflow_plan
📨 Event: step_start
🚀 Executing step: thinking - Analyzing Query
✅ Step result: {...}
📨 Event: step_complete
✅ Received from API: {...}
📝 Displaying message: [response]
```

## 🎨 UI Examples

### Example 1: Simple Query
```
[AI Response Text]

📊 Data Sources Used:
└─ 🤖 OpenAI GPT-4o ✓
   Direct answer from AI knowledge
```

### Example 2: With API Tools
```
[AI Response Text]

📊 Data Sources Used:
├─ 🛠️ DexScreener Price API ✓
│  Get token price and market data
│  Category: dex
│  [View raw data ▼]
│
└─ 🤖 OpenAI GPT-4o ✓
   AI model used for final answer synthesis

🔍 View All Tool Results (1 tools) ▼
```

### Example 3: With Knowledge Base
```
[AI Response Text]

📊 Data Sources Used:
├─ 📚 Cardano Whitepaper
│  Official project documentation
│
└─ 🤖 OpenAI GPT-4o ✓
   AI model used for final answer synthesis

💡 RAG knowledge base consulted
```

## 🔧 Configuration Required

### Environment Variables
```bash
# Required
OPENAI_API_KEY=your-openai-key

# Optional (for full functionality)
NEXT_PUBLIC_BASE_URL=http://localhost:3002
DEFAULT_CLIENT_ID=fudscan-default

# API Tools (if using external APIs)
DEBANK_ACCESS_KEY=your-debank-key
NANSEN_API_KEY=your-nansen-key
```

### Database Setup (Optional)
If you want to use API tools or RAG:

1. **Populate `apiTool` table** with crypto APIs
2. **Populate `knowledgeBase` table** with documents
3. **Set `isActive: true`** for tools/KBs you want to use

**Without database**: System will work but show only AI model as source

## 🐛 Troubleshooting

### No Data Sources Showing
- Check console for errors
- Verify `data.citations` is being received
- Check browser console: `✅ Received from API`

### Citations Array Empty
- Backend logs: Look for `📋 Workflow plan`
- Check if tools are available: `🛠️ Available tools: 0`
- Verify OpenAI API key is set

### Streaming Not Working
- Check for SSE errors in console
- Verify `Content-Type: text/event-stream` in Network tab
- Try non-streaming: Set `stream: false` in request body

### Tools Not Being Called
- Check workflow plan: Should show `intent: "TOOL_ENHANCED"`
- Verify tools exist in database
- Check backend logs: `Calling tool: [name]`

## 📊 Data Source Types

| Type | Icon | Description | Example |
|------|------|-------------|---------|
| `ai_model` | 🤖 | OpenAI GPT-4o | Direct answers, synthesis |
| `api_tool` | 🛠️ | External APIs | DexScreener, Nansen, DeBank |
| `knowledge_base` | 📚 | RAG documents | Whitepapers, docs |

## ✨ Features Summary

- ✅ Full transparency of data sources
- ✅ Real-time tracking during workflow execution
- ✅ Success/failure indicators for each source
- ✅ Expandable raw data view
- ✅ Works with streaming and non-streaming
- ✅ Graceful fallbacks when tools unavailable
- ✅ Clean, professional UI with icons
- ✅ Detailed logging for debugging

## 🚀 Next Steps

1. **Test basic queries** - Verify AI model citation appears
2. **Configure tools** - Add API tools to database if needed
3. **Upload documents** - Add whitepapers for RAG if needed
4. **Monitor console** - Check logs during execution
5. **Iterate** - Adjust UI/UX based on user feedback

---

**Status:** ✅ Ready for Testing
**Date:** 2025-10-25
**Version:** 1.0.0
