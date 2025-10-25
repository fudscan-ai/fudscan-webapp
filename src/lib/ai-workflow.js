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
    this.systemPrompt = `You are an AI workflow orchestrator for a Web3 and DeFi analysis platform. Your job is to analyze user queries and determine the appropriate workflow.

Available workflow types:
1. DIRECT_ANSWER - You can answer directly without additional tools
2. TOOL_ENHANCED - You need to use tools (APIs or RAG) to provide a complete answer

Only use RAG and tools if you have no idea how to answer the query.
Only use RAG and tools if you are sure the query is matched to the available tools descriptions.
请你自信一点，只要你能答的就勇敢答。优先以你的答案为主。

When TOOL_ENHANCED is needed, you must specify:
- Which tools to use (from the available API tools)
- Whether RAG (knowledge base search) is needed
- The order of operations
- The actual parameters to pass to each tool
- answer_generating step is the final step, and necessary to generate the final answer.
  
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
      
      const ragResult = await response.json();
      
      return {
        output: ragResult.context || [],
        sources: ragResult.sources || [],
        contextText: ragResult.context?.map(c => c.content).join('\n\n') || ''
      };
      
    } catch (error) {
      return { error: `RAG retrieval failed: ${error.message}` };
    }
  }

  async executeApiStep(step, query, context) {
    const results = {};
    
    // Execute all tools in parallel
    const toolPromises = step.tools.map(async (toolName) => {
      try {
        const tool = context.availableTools?.find(t => t.name === toolName);
        if (!tool) {
          return { [toolName]: { error: 'Tool not found' } };
        }

        const response = await this.callTool(tool, step.parameters);
        return { [toolName]: response };
        
      } catch (error) {
        return { [toolName]: { error: error.message } };
      }
    });

    const toolResults = await Promise.all(toolPromises);
    toolResults.forEach(result => Object.assign(results, result));

    return { output: results };
  }

  async executeAnswerStep(step, query, context) {
    // Generate final answer using OpenAI with all collected context
    const contextText = context.ragContext || '';
    const toolResults = context.toolResults || {};
    const clientInstructions = context.clientInstructions || '';

    let answerPrompt = `You are a helpful AI assistant specializing in Web3 and DeFi analysis.

Client Instructions: ${clientInstructions}

User Query: "${query}"

Available Context:
${contextText}

Tool Results:
${JSON.stringify(toolResults, null, 2)}

-If the given context is invalid or useless, don't point it out; you can answer directly based on your ability.
-Please provide a comprehensive and helpful answer based on the available information. If you used external data, mention the sources appropriately.`;

console.log(answerPrompt);
  if (answerPrompt.length > 30000) {
    answerPrompt = answerPrompt.slice(0, 30000);
  }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant specializing in Web3 and DeFi analysis.' },
          { role: 'user', content: answerPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      return {
        output: response.choices[0].message.content,
        usage: response.usage
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
            'AccessKey': process.env.DEBANK_ACCESS_KEY || 'your-debank-key',
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
