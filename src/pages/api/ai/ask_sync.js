import { PrismaClient } from '@/generated/prisma/index.js';
import aiWorkflow from '@/lib/ai-workflow';

const prisma = new PrismaClient();

/**
 * Synchronous AI-powered ask endpoint
 * Replaces the FastAPI ask_sync endpoint with intent recognition workflow
 */

/**
 * Extract bearer token from Authorization header
 */
function extractBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { query, options } = req.query;
    const parsedOptions = options ? JSON.parse(options) : {};

    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }

    // Extract API key from Authorization header
    const apiKey = extractBearerToken(req);
    if (!apiKey) {
      return res.status(401).json({ message: 'Authorization header with Bearer token is required' });
    }

    // Validate client and get available resources
    const client = await prisma.client.findFirst({
      where: { 
        apiKey: apiKey,
        isActive: true 
      },
      include: {
        knowledgeBases: {
          where: { isActive: true }
        }
      }
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found or inactive' });
    }

    // Get all active API tools (not client-specific for now)
    const apiTools = await prisma.apiTool.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    const startTime = Date.now();

    // Create conversation record
    const conversation = await prisma.conversation.create({
      data: {
        clientId: client.id,
        query: query,
        status: 'processing'
      }
    });

    try {
      // Step 1: Intent Recognition and Workflow Planning
      const workflowPlan = await aiWorkflow.analyzeIntent(
        query, 
        client.id, 
        apiTools, 
        client.knowledgeBases
      );

      // Update conversation with intent and workflow
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          intent: workflowPlan.intent,
          workflow: workflowPlan.workflow
        }
      });

      // If direct answer, skip tool execution
      if (workflowPlan.intent === 'DIRECT_ANSWER') {
        const answerStep = {
          type: 'answer_generating',
          name: 'Generating direct answer',
          parameters: {}
        };

        const answerResult = await aiWorkflow.executeWorkflowStep(
          answerStep, 
          query, 
          { 
            clientInstructions: client.instructions,
            availableTools: apiTools 
          }
        );

        // Update conversation with final response
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            response: answerResult.output,
            status: 'completed',
            latencyMs: Date.now() - startTime
          }
        });

        return res.status(200).json({
          answer: answerResult.output,
          conversationId: conversation.id,
          intent: workflowPlan.intent,
          confidence: workflowPlan.confidence,
          reasoning: workflowPlan.reasoning,
          latencyMs: Date.now() - startTime,
          toolsUsed: [],
          ragUsed: false
        });
      }

      // Execute workflow steps for TOOL_ENHANCED intent
      let ragContext = '';
      let toolResults = {};
      const toolsUsed = [];
      const workflowSteps = [];

      for (let i = 0; i < workflowPlan.workflow.steps.length; i++) {
        const step = workflowPlan.workflow.steps[i];
        
        // Create workflow step record
        const workflowStep = await prisma.workflowStep.create({
          data: {
            conversationId: conversation.id,
            stepType: step.type,
            stepName: step.name,
            status: 'running',
            input: step,
            order: i,
            startedAt: new Date()
          }
        });

        // Execute the step
        const stepResult = await aiWorkflow.executeWorkflowStep(
          step, 
          query, 
          {
            apiKey: apiKey,
            knowledgeBaseId: client.knowledgeBases[0]?.id,
            ragQuery: workflowPlan.workflow.ragQuery,
            ragContext: ragContext,
            toolResults: toolResults,
            clientInstructions: client.instructions,
            availableTools: apiTools
          }
        );

        // Update workflow step with result
        await prisma.workflowStep.update({
          where: { id: workflowStep.id },
          data: {
            status: stepResult.error ? 'error' : 'completed',
            output: stepResult,
            error: stepResult.error,
            completedAt: new Date()
          }
        });

        workflowSteps.push({
          type: step.type,
          name: step.name,
          status: stepResult.error ? 'error' : 'completed',
          result: stepResult,
          latencyMs: stepResult.latencyMs
        });

        // Collect context for next steps
        if (step.type === 'rag_retrieving' && stepResult.contextText) {
          ragContext = stepResult.contextText;
        }

        if (step.type === 'api_calling' && stepResult.output) {
          toolResults = { ...toolResults, ...stepResult.output };
          toolsUsed.push(...step.tools);
        }

        // If this is the final answer step, we have our response
        if (step.type === 'answer_generating' && stepResult.output) {
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              response: stepResult.output,
              toolsUsed: [...new Set(toolsUsed)],
              ragUsed: workflowPlan.workflow.useRag,
              status: 'completed',
              latencyMs: Date.now() - startTime
            }
          });

          return res.status(200).json({
            answer: stepResult.output,
            conversationId: conversation.id,
            intent: workflowPlan.intent,
            confidence: workflowPlan.confidence,
            reasoning: workflowPlan.reasoning,
            workflow: {
              steps: workflowSteps,
              useRag: workflowPlan.workflow.useRag
            },
            toolsUsed: [...new Set(toolsUsed)],
            ragUsed: workflowPlan.workflow.useRag,
            latencyMs: Date.now() - startTime,
            sources: stepResult.sources || []
          });
        }
      }

      // If we reach here without a final answer, something went wrong
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'error',
          latencyMs: Date.now() - startTime
        }
      });

      return res.status(500).json({
        error: 'Workflow completed without generating final answer',
        conversationId: conversation.id,
        workflow: {
          steps: workflowSteps,
          useRag: workflowPlan.workflow.useRag
        },
        latencyMs: Date.now() - startTime
      });

    } catch (workflowError) {
      console.error('Workflow execution error:', workflowError);
      
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'error',
          latencyMs: Date.now() - startTime
        }
      });

      return res.status(500).json({
        error: 'Workflow execution failed',
        message: workflowError.message,
        conversationId: conversation.id,
        latencyMs: Date.now() - startTime
      });
    }

  } catch (error) {
    console.error('Ask sync endpoint error:', error);
    return res.status(500).json({ 
      message: 'Request processing failed', 
      error: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}
