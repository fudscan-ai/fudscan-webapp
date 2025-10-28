import aiWorkflowOrchestrator from '@/lib/ai-workflow';
import { PrismaClient } from '@/generated/prisma/index.js';

const prisma = new PrismaClient();

/**
 * AI-powered chat endpoint for FUDSCAN with streaming workflow execution
 * Uses AIWorkflowOrchestrator to analyze intent, execute tools, and generate responses
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { message, conversationHistory, stream = true } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        message: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.'
      });
    }

    // For FUDSCAN, look up client by API key
    // In production, you'd get this from user session/authentication
    const apiKey = process.env.NEXT_PUBLIC_DEFAULT_API_KEY || 'test_api_key_12345';
    const client = await prisma.client.findFirst({
      where: { apiKey }
    });

    if (!client) {
      return res.status(401).json({
        message: 'Invalid API key. Please check your configuration.'
      });
    }

    const clientId = client.id;

    // Get available tools and knowledge bases
    const availableTools = await getAvailableTools(clientId);
    const knowledgeBases = await getKnowledgeBases(clientId);

    console.log('🔍 Analyzing query:', message);
    console.log('🛠️ Available tools:', availableTools.length);
    console.log('📚 Knowledge bases:', knowledgeBases.length);

    // Analyze intent and get workflow plan
    const workflowPlan = await aiWorkflowOrchestrator.analyzeIntent(
      message,
      clientId,
      availableTools,
      knowledgeBases
    );

    console.log('📋 Workflow plan:', JSON.stringify(workflowPlan, null, 2));

    // If streaming is disabled or direct answer, return immediately
    if (!stream || workflowPlan.intent === 'DIRECT_ANSWER') {
      return res.status(200).json({
        message: workflowPlan.reply || 'No response generated',
        intent: workflowPlan.intent,
        coin: null,
        workflow: workflowPlan,
        citations: []
      });
    }

    // Set up Server-Sent Events (SSE) for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Helper to send SSE events
    const sendEvent = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Send workflow plan
    sendEvent('workflow_plan', workflowPlan);

    // Execute workflow steps
    const context = {
      query: message,
      availableTools,
      knowledgeBases,
      ragContext: '',
      toolResults: {},
      citations: [],
      clientInstructions: 'You are FUDSCAN - an AI-powered crypto risk scanner focused on identifying FUD and red flags.'
    };

    let finalAnswer = '';

    for (const step of workflowPlan.workflow.steps) {
      console.log(`🚀 Executing step: ${step.type} - ${step.name}`);

      // Send step start event
      sendEvent('step_start', {
        stepId: `${step.type}_${Date.now()}`,
        type: step.type,
        name: step.name,
        parameters: step.parameters,
        tools: step.tools
      });

      // Execute the step
      const stepResult = await aiWorkflowOrchestrator.executeWorkflowStep(step, message, context);

      console.log(`✅ Step result:`, stepResult);

      // Update context with results
      if (step.type === 'rag_retrieving' && stepResult.contextText) {
        context.ragContext = stepResult.contextText;

        // Add RAG sources to citations
        if (stepResult.sources && stepResult.sources.length > 0) {
          context.citations.push(...stepResult.sources.map(source => ({
            type: 'knowledge_base',
            source: source.filename || source.title || 'Knowledge Base',
            content: source.content || '',
            metadata: source.metadata || {}
          })));
        }
      }

      if (step.type === 'api_calling' && stepResult.output) {
        context.toolResults = { ...context.toolResults, ...stepResult.output };

        // Add API tool sources to citations
        if (step.tools && step.tools.length > 0) {
          step.tools.forEach(toolName => {
            const tool = availableTools.find(t => t.name === toolName);
            const toolResult = stepResult.output[toolName];

            context.citations.push({
              type: 'api_tool',
              source: tool?.name || toolName,
              description: tool?.description || 'API Tool',
              category: tool?.category || 'external',
              success: toolResult?.success !== false,
              data: toolResult
            });
          });
        }
      }

      if (step.type === 'answer_generating' && stepResult.output) {
        finalAnswer = stepResult.output;
      }

      // Send step complete event
      sendEvent('step_complete', {
        stepId: `${step.type}_${Date.now()}`,
        stepType: step.type,
        result: stepResult,
        latencyMs: stepResult.latencyMs
      });
    }

    // Citations for OpenAI removed per user request

    // Send final done event with sources
    sendEvent('done', {
      message: finalAnswer,
      citations: context.citations,
      toolResults: context.toolResults,
      ragContext: context.ragContext ? 'RAG knowledge base consulted' : null,
      latencyMs: Date.now(),
      conversationId: `conv_${Date.now()}`
    });

    res.end();

  } catch (error) {
    console.error('❌ Chat error:', error);

    // If headers not sent yet, send JSON error
    if (!res.headersSent) {
      return res.status(500).json({
        message: 'Failed to generate response',
        error: error.message
      });
    }

    // If streaming, send error event
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ message: error.message, details: error.stack })}\n\n`);
    res.end();
  }
}

/**
 * Get available API tools for the client
 * For now, returns empty array - you can populate this with actual tools from database
 */
async function getAvailableTools(clientId) {
  try {
    // Query through ClientApiTool junction table to get tools assigned to this client
    const clientApiTools = await prisma.clientApiTool.findMany({
      where: {
        clientId: clientId,
        isEnabled: true
      },
      include: {
        apiTool: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            endpoint: true,
            method: true,
            parameters: true,
            isExternal: true,
            isActive: true
          }
        }
      }
    });

    // Extract and filter only active tools
    const tools = clientApiTools
      .map(cat => cat.apiTool)
      .filter(tool => tool && tool.isActive);

    return tools;
  } catch (error) {
    console.warn('Could not fetch tools from database:', error.message);
    // Return empty array if database not available
    return [];
  }
}

/**
 * Get knowledge bases for the client
 */
async function getKnowledgeBases(clientId) {
  try {
    const kbs = await prisma.knowledgeBase.findMany({
      where: {
        clientId: clientId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true
      }
    });

    return kbs;
  } catch (error) {
    console.warn('Could not fetch knowledge bases:', error.message);
    return [];
  }
}
