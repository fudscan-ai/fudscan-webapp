import { PrismaClient } from '@/generated/prisma/index.js';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * AI-powered workflow orchestrator that replaces regex-based light_route
 * Handles intent recognition, tool selection, and workflow planning
 */
export class AIWorkflowOrchestrator {
  constructor() {
    this.systemPrompt = `You are FUDSCAN's AI workflow orchestrator - an AI-powered crypto risk scanner that helps investors EXPOSE red flags, suspicious patterns, and risks in crypto projects.

Your PRIMARY MISSION: Protect investors by uncovering FUD (Fear, Uncertainty, and Doubt) through comprehensive due diligence using MULTIPLE data sources.

Available workflow types:
1. DIRECT_ANSWER - ONLY for general crypto education (NOT for token analysis)
2. TOOL_ENHANCED - For ALL token/project analysis (ALWAYS USE MULTIPLE TOOLS)

**CRITICAL Decision Guidelines:**
- For ANY token/project query: ALWAYS use TOOL_ENHANCED with AT LEAST 2-3 different data sources
- NEVER analyze a token with just one data source - that's incomplete due diligence
- Available real API categories:
  * DexScreener (dex.search, dex.token, dex.pair) - Price, volume, liquidity, trading pairs
  * Nansen (nansen.smart.holdings, nansen.smart.trades, nansen.smart.netflows) - Smart money activity, whale tracking
  * DeBank (debank.user.token_list, debank.user.chain_balance) - Wallet holdings, DeFi positions
- Use DIRECT_ANSWER ONLY for: "What is blockchain?" "How does DeFi work?" etc.

**Confidence Score Guidelines (0.0-1.0):**
- 0.9-1.0: Token query with 3+ complementary tools available (IDEAL)
- 0.7-0.9: Token query with 2 tools available (acceptable)
- 0.5-0.7: Query needs interpretation, 1 tool available
- 0.3-0.5: Limited tools available, incomplete analysis possible
- Below 0.3: Not enough data sources for proper due diligence

**Multi-Source Strategy:**
For token queries, you MUST plan to use:
1. DexScreener (dex.search) - Find token, get price, volume, liquidity data
2. Nansen smart money tools - Track whale activity, smart trader positions
3. DeBank tools (if wallet analysis needed) - DeFi positions, token holdings

When TOOL_ENHANCED is needed, you must specify:
- Use 2-3 different tools for comprehensive analysis (NOT just one!)
- Start with dex.search to find the token and get baseline metrics
- Add nansen tools to track smart money/whale activity
- Include both price/market data AND on-chain activity data
- The actual parameters to pass to each tool (extract token symbol/address from query)
- answer_generating step is the final step to synthesize FUD analysis
  
Respond in JSON format:
{
  "intent": "DIRECT_ANSWER" | "TOOL_ENHANCED",
  "confidence": 0.0-1.0,
  "reasoning": "explanation of your decision",
  "reply": "your direct answer",
  "workflow": {
    "steps": [
      {
        "type": "thinking" | "rag_retrieving" | "api_calling" | "answer_generating",
        "name": "human readable step name",
        "tools": ["tool.name1", "tool.name2"], // only for api_calling steps
        "parameters": {} // parameters to pass to tools
      }
    ],
    "useRag": boolean,
    "ragQuery": "optimized query for knowledge base search"
  }
}
  The answer must be in JSON String, so that I can parse it with JSON.parse directly.
  Do not add any additional text or comments to the answer.
  Do not use markdown format or any other formatting. Only raw text.
  `;
  }

  /**
   * Analyze user query and determine workflow
   */
  async analyzeIntent(query, clientId, availableTools = [], knowledgeBases = []) {
    try {
      // Get client instructions if available
      const client = await prisma.client.findUnique({
        where: { id: clientId }
      });

      const clientInstructions = client?.instructions || '';
      
      // Build context about available tools
      const toolDescriptions = availableTools.map(tool => 
        `- ${tool.name}: ${tool.description} (Category: ${tool.category}) (parameters: ${JSON.stringify(tool.parameters)})`
      ).join('\n');

      const kbDescriptions = knowledgeBases.map(kb =>
        `- ${kb.name}: ${kb.description}`
      ).join('\n');

      const contextPrompt = `
Client: ${client?.name || 'Unknown'}
Custom Instructions: ${clientInstructions}

Available API Tools:
${toolDescriptions}

Available Knowledge Bases:
${kbDescriptions}

User Query: "${query}"

- Analyze this query and determine the appropriate workflow.
- if user api tools, you should build the actual parameters in step parameters.
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: contextPrompt }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      });

      const result = JSON.parse(response.choices[0].message.content);
      console.log('Intent analysis result:', result, response.choices[0]);
      
      // Validate and sanitize the result
      return this.validateWorkflowResult(result, availableTools);
      
    } catch (error) {
      console.error('Intent analysis failed:', error);
      // Fallback to simple workflow
      return {
        intent: 'TOOL_ENHANCED',
        confidence: 0.5,
        reasoning: 'Fallback due to analysis error',
        workflow: {
          steps: [
            { type: 'thinking', name: 'Analyzing query', tools: [], parameters: {} },
            { type: 'rag_retrieving', name: 'Searching knowledge base', tools: [], parameters: {} },
            { type: 'answer_generating', name: 'Generating response', tools: [], parameters: {} }
          ],
          useRag: true,
          ragQuery: query
        }
      }; 
    }
  }

  /**
   * Validate and sanitize workflow result
   */
  validateWorkflowResult(result, availableTools) {
    const validIntents = ['DIRECT_ANSWER', 'TOOL_ENHANCED'];
    const validStepTypes = ['thinking', 'rag_retrieving', 'api_calling', 'answer_generating'];
    
    // Validate intent
    if (!validIntents.includes(result.intent)) {
      result.intent = 'TOOL_ENHANCED';
    }

    // Validate confidence
    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
      result.confidence = 0.5;
    }

    // Validate workflow steps
    if (!result.workflow || !Array.isArray(result.workflow.steps)) {
      result.workflow = {
        steps: [
          { type: 'thinking', name: 'Processing query', tools: [], parameters: {} }
        ],
        useRag: true,
        ragQuery: result.ragQuery || ''
      };
    }

    // Validate each step
    result.workflow.steps = result.workflow.steps.map(step => {
      if (!validStepTypes.includes(step.type)) {
        step.type = 'thinking';
      }
      
      // Validate tools exist in available tools
      if (step.tools && Array.isArray(step.tools)) {
        const availableToolNames = availableTools.map(t => t.name);
        step.tools = step.tools.filter(toolName => availableToolNames.includes(toolName));
      } else {
        step.tools = [];
      }

      if (!step.parameters) {
        step.parameters = {};
      }

      return step;
    });

    return result;
  }

  /**
   * Execute a workflow step
   */
  async executeWorkflowStep(step, query, context = {}) {
    const startTime = Date.now();
    
    try {
      let result = {};
      
      switch (step.type) {
        case 'thinking':
          result = await this.executeThinkingStep(step, query, context);
          break;
          
        case 'rag_retrieving':
          result = await this.executeRagStep(step, query, context);
          break;
          
        case 'api_calling':
          result = await this.executeApiStep(step, query, context);
          break;
          
        case 'answer_generating':
          result = await this.executeAnswerStep(step, query, context);
          break;
          
        default:
          result = { error: `Unknown step type: ${step.type}` };
      }
      
      return {
        ...result,
        latencyMs: Date.now() - startTime,
        stepType: step.type,
        stepName: step.name
      };
      
    } catch (error) {
      return {
        error: error.message,
        latencyMs: Date.now() - startTime,
        stepType: step.type,
        stepName: step.name
      };
    }
  }

  async executeThinkingStep(step, query, context) {
    // Simulate thinking process - could be enhanced with actual reasoning
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      output: `Analyzing: "${query}"`,
      reasoning: step.name
    };
  }

  async executeRagStep(step, query, context) {
    // Use existing RAG retrieve functionality
    const ragQuery = step.parameters?.query || context.ragQuery || query;

    try {
      // Check if RAG endpoint exists, otherwise return simulated result
      if (!process.env.NEXT_PUBLIC_BASE_URL) {
        console.warn('NEXT_PUBLIC_BASE_URL not configured, skipping RAG retrieval');
        return {
          output: [],
          sources: [],
          contextText: ''
        };
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/rag/retrieve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: ragQuery,
          apiKey: context.apiKey,
          knowledgeBaseId: context.knowledgeBaseId,
          options: { maxResults: 5 }
        })
      });

      if (!response.ok) {
        console.warn(`RAG endpoint returned ${response.status}, skipping`);
        return {
          output: [],
          sources: [],
          contextText: ''
        };
      }

      const ragResult = await response.json();

      // Format sources properly
      const formattedSources = (ragResult.sources || ragResult.context || []).map((source, idx) => ({
        filename: source.filename || source.title || source.source || `Document ${idx + 1}`,
        title: source.title || source.filename || 'Knowledge Base Document',
        content: source.content || source.text || '',
        metadata: source.metadata || {},
        score: source.score || source.similarity || 0
      }));

      return {
        output: ragResult.context || [],
        sources: formattedSources,
        contextText: formattedSources.map(s => s.content).join('\n\n') || ''
      };

    } catch (error) {
      console.error('RAG retrieval error:', error);
      return {
        error: `RAG retrieval failed: ${error.message}`,
        output: [],
        sources: [],
        contextText: ''
      };
    }
  }

  async executeApiStep(step, query, context) {
    const results = {};

    // Handle case where no tools are specified
    if (!step.tools || step.tools.length === 0) {
      console.warn('No tools specified for api_calling step');
      return { output: results };
    }

    // Execute all tools in parallel
    const toolPromises = step.tools.map(async (toolName) => {
      try {
        const tool = context.availableTools?.find(t => t.name === toolName);
        if (!tool) {
          console.warn(`Tool not found: ${toolName}`);
          return { [toolName]: { success: false, error: 'Tool not found' } };
        }

        console.log(`Calling tool: ${toolName}`);
        const response = await this.callTool(tool, step.parameters);

        // Ensure response has success field
        if (response && typeof response === 'object' && !('success' in response)) {
          response.success = !response.error;
        }

        return { [toolName]: response };

      } catch (error) {
        console.error(`Tool ${toolName} failed:`, error);
        return { [toolName]: { success: false, error: error.message } };
      }
    });

    const toolResults = await Promise.all(toolPromises);
    toolResults.forEach(result => Object.assign(results, result));

    console.log('API step results:', results);

    return { output: results };
  }

  async executeAnswerStep(step, query, context) {
    // Generate final answer using OpenAI with all collected context
    const contextText = context.ragContext || '';
    const toolResults = context.toolResults || {};
    const clientInstructions = context.clientInstructions || '';
    const onChunk = context.onChunk; // Callback for streaming chunks

    let answerPrompt = `You are FUDSCAN - an AI crypto risk scanner that EXPOSES red flags and protects investors from scams.

YOUR MISSION: Analyze ALL data sources provided and identify EVERY risk, concern, and negative indicator.

User Query: "${query}"

=== DATA SOURCES ANALYZED ===
${contextText}

=== TOOL RESULTS (RAW DATA) ===
${JSON.stringify(toolResults, null, 2)}

=== CRITICAL ANALYSIS REQUIREMENTS ===

You MUST analyze and report on:

**🚨 RED FLAGS TO EXPOSE:**
1. **Smart Money Behavior** - Are whales/funds dumping? Unusual selling patterns? (Check Nansen smart money data)
2. **Liquidity Concerns** - Low liquidity, fragmented across chains? Risk of price manipulation? (Check DexScreener data)
3. **Market Manipulation** - Suspicious trading volumes, wash trading signals? (Check DEX trading data)
4. **Price Action** - Recent dumps, declining trends, volatility spikes? (Check DexScreener price history)
5. **Holder Concentration** - Are top holders accumulating or distributing? (Check Nansen holdings data)
6. **Token Distribution** - Fragmented liquidity? Multiple versions across chains? (Check multi-chain DEX data)
7. **Wallet Analysis** - If specific wallet asked: risky DeFi positions, overexposure? (Check DeBank data)

**📊 YOUR RESPONSE FORMAT:**

Start with: "🔍 **FUDSCAN ANALYSIS: [TOKEN NAME]**"

Then organize your findings:

## 🔴 Critical Red Flags
[List EVERY concerning finding with severity]

## ⚠️ Warning Signs
[List moderate concerns and risks]

## 📈 Market Overview
[Objective data: price, volume, liquidity - emphasize negatives]

## 🐋 Whale & Smart Money Activity
[What insiders are doing - especially selling activity]

## 💀 Risk Assessment
[Overall FUD score and recommendation]

**TONE:** Skeptical, protective, direct. If something looks bad, SAY IT. Your job is to protect investors, not promote tokens.

**DATA USAGE:** Reference SPECIFIC numbers from the tool results. Show your work. If holder concentration is 80% in top 10 wallets, SAY THAT.

Provide your FUD analysis now:`;

console.log(answerPrompt);
  if (answerPrompt.length > 30000) {
    answerPrompt = answerPrompt.slice(0, 30000);
  }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are FUDSCAN - a skeptical AI crypto investigator that EXPOSES scams, red flags, and risks. Your duty is to protect investors by being brutally honest about token risks. Always emphasize concerns over positives. Reference specific data from multiple sources.' },
          { role: 'user', content: answerPrompt }
        ],
        temperature: 0.7,
        max_tokens: 3000,
        stream: true, // Enable streaming
      });

      // Collect full response while streaming
      let fullResponse = '';

      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;

          // Send chunk via callback if provided
          if (onChunk && typeof onChunk === 'function') {
            onChunk(content);
          }
        }
      }

      return {
        output: fullResponse,
        usage: response.usage || {}
      };

    } catch (error) {
      return { error: `Answer generation failed: ${error.message}` };
    }
  }

  /**
   * Extract parameters from query based on tool parameter schema
   */
  extractParametersFromQuery(query, parameterSchema) {
    const extracted = {};
    
    if (!parameterSchema) return extracted;

    // Extract blockchain addresses
    const addressMatch = query.match(/0x[a-fA-F0-9]{40}/);
    if (addressMatch && parameterSchema.address) {
      extracted.address = addressMatch[0];
    }

    // Extract token symbols
    const symbolMatch = query.match(/\b(BTC|ETH|SOL|MATIC|AVAX|DOT|ADA|LINK|UNI|AAVE)\b/i);
    if (symbolMatch && parameterSchema.symbol) {
      extracted.symbol = symbolMatch[0].toUpperCase();
    }

    // Extract chain mentions
    const chainKeywords = {
      'ethereum': 'eth',
      'bsc': 'bsc',
      'polygon': 'matic',
      'solana': 'sol',
      'avalanche': 'avax'
    };
    
    for (const [keyword, chainId] of Object.entries(chainKeywords)) {
      if (query.toLowerCase().includes(keyword) && parameterSchema.chain_id) {
        extracted.chain_id = chainId;
        break;
      }
    }

    return extracted;
  }

  /**
   * Call external API based on category
   */
  async callExternalAPI(tool, parameters) {
    try {
      let url = tool.endpoint;
      let headers = {};
      let body = null;
      let queryParams = '';

      // Category-specific handling
      switch (tool.category) {
        case 'debank':
          headers = {
            'AccessKey': process.env.DEBANK_API_KEY || 'your-debank-key',
            'accept': 'application/json'
          };
          // DeBank uses GET with query parameters
          if (tool.method === 'GET') {
            const params = new URLSearchParams();
            Object.entries(parameters).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                params.append(key, value);
              }
            });
            queryParams = params.toString();
            if (queryParams) url += `?${queryParams}`;
          }
          break;

        case 'nansen':
          headers = {
            'apiKey': process.env.NANSEN_API_KEY || 'your-nansen-key',
            'Content-Type': 'application/json',
            'Accept': '*/*'
          };
          if ("chains" in parameters) {
            parameters.chains = parameters.chains.map(chain => {
              if (chain === 'binance') return 'bnb';
              if (chain === 'basecoin') return 'base';
              if (chain === 'optimism') return 'optimism';
              return chain.toLowerCase();
            });
          }
          // Nansen uses POST with JSON body
          if (tool.method === 'POST') {
            body = JSON.stringify(parameters);
          }
          break;

        case 'dex':
          headers = {
            'Accept': '*/*'
          };
          // DexScreener uses GET with path parameters or query params
          if (tool.method === 'GET') {
            // Handle path parameters for DexScreener
            if (tool.endpoint.includes('{chainId}') && parameters.chainId) {
              url = url.replace('{chainId}', parameters.chainId);
            }
            if (tool.endpoint.includes('{pairId}') && parameters.pairId) {
              url = url.replace('{pairId}', parameters.pairId);
            }
            if (tool.endpoint.includes('{tokenAddresses}') && parameters.tokenAddresses) {
              url = url.replace('{tokenAddresses}', parameters.tokenAddresses);
            }
            // Handle query parameters
            if (parameters.q) {
              url += `?q=${encodeURIComponent(parameters.q)}`;
            }
          }
          break;

        case 'finance':
          headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          };
          if (tool.method === 'POST') {
            body = JSON.stringify(parameters);
          }
          break;

        case 'aibrk':
          // AIBRK uses JWT Bearer token authentication
          headers = {
            'Authorization': `Bearer ${process.env.JWT_SECRET || 'cmh1cyebi008qqsux3xn3x280'}`,
            'Accept': '*/*'
          };
          // AIBRK uses GET with query parameters
          if (tool.method === 'GET') {
            const params = new URLSearchParams();
            Object.entries(parameters).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                if (typeof value === 'object') {
                  params.append(key, JSON.stringify(value));
                } else {
                  params.append(key, value);
                }
              }
            });
            queryParams = params.toString();
            if (queryParams) url += `?${queryParams}`;
          }
          break;

        default:
          // Generic handling
          headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          };
          if (tool.method === 'POST') {
            body = JSON.stringify(parameters);
          } else if (tool.method === 'GET') {
            const params = new URLSearchParams();
            Object.entries(parameters).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                params.append(key, value);
              }
            });
            queryParams = params.toString();
            if (queryParams) url += `?${queryParams}`;
          }
          break;
      }

      console.log(`Calling external API: ${tool.name}`);
      console.log(`URL: ${url}`);
      console.log(`Method: ${tool.method}`);
      console.log(`Headers:`, headers);
      console.log(`Body:`, body);

      const response = await fetch(url, {
        method: tool.method,
        headers,
        body
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        return {
          success: false,
          error: errorText,
          tool: tool.name,
          parameters
        };
      }

      // Special handling for AIBRK SSE response
      if (tool.category === 'aibrk') {
        console.log('Parsing AIBRK SSE response...');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let toolResults = {};
        let finalAnswer = '';
        let workflowPlan = null;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const eventData = JSON.parse(line.slice(6));

                  // Collect tool results from step_complete events
                  if (eventData.result && eventData.result.output) {
                    toolResults = { ...toolResults, ...eventData.result.output };
                  }

                  // Get final answer if available
                  if (eventData.message) {
                    finalAnswer = eventData.message;
                  }

                  // Get workflow plan
                  if (eventData.workflow) {
                    workflowPlan = eventData;
                  }
                } catch (e) {
                  console.warn('Failed to parse SSE data:', line);
                }
              }
            }
          }

          return {
            success: true,
            data: {
              toolResults,
              answer: finalAnswer,
              workflowPlan,
              source: 'aibrk'
            },
            tool: tool.name,
            parameters
          };
        } catch (error) {
          console.error('Failed to parse AIBRK SSE:', error);
          return {
            success: false,
            error: error.message,
            tool: tool.name,
            parameters
          };
        }
      }

      // Regular JSON response for other tools
      const data = await response.json();

      return {
        success: true,
        data,
        tool: tool.name,
        parameters
      };

    } catch (error) {
      console.error(`External API call failed for ${tool.name}:`, error);
      return {
        success: false,
        error: error.message,
        tool: tool.name,
        parameters
      };
    }
  }

  /**
   * Call a specific tool
   */
  async callTool(tool, parameters) {

    console.log('tool', tool, parameters)
    if (tool.isExternal) {
      return await this.callExternalAPI(tool, parameters);
    }

    // For internal tools, make HTTP request to our own endpoints
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}${tool.endpoint}`, {
        method: tool.method,
        headers: { 'Content-Type': 'application/json' },
        body: tool.method !== 'GET' ? JSON.stringify(parameters) : undefined,
        parameters: tool.method === 'GET' ? parameters : undefined
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const innerRes = await response.json();
      if (innerRes.context){
        return innerRes.context;
      }
      return innerRes?.data || innerRes;
    } catch (error) {
      throw new Error(`Tool call failed: ${error.message}`);
    }
  }
}

const aiWorkflowOrchestrator = new AIWorkflowOrchestrator();
export default aiWorkflowOrchestrator;
