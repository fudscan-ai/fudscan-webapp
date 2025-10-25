import { PrismaClient } from '@/generated/prisma/index.js';
import aiWorkflow from '@/lib/ai-workflow';

const prisma = new PrismaClient();

/**
 * Streaming AI-powered ask endpoint
 * Replaces the FastAPI ask endpoint with intent recognition and workflow streaming
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

    // Get API tools assigned to this client and enabled
    let apiTools = await prisma.apiTool.findMany({
      where: {
        isActive: true,
        clientApiTools: {
          some: {
            clientId: client.id,
            isEnabled: true
          }
        }
      },
      include: {
        clientApiTools: {
          where: {
            clientId: client.id,
            isEnabled: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Create conversation record (temporarily skip if table doesn't exist)
    let conversation = await prisma.conversation.create({
        data: {
          clientId: client.id,
          query: query,
          status: 'processing'
        }
      });
    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const startTime = Date.now();

      // Step 1: Intent Recognition and Workflow Planning
      sendEvent('step_start', { 
        type: 'thinking', 
        name: 'Analyzing query and planning workflow',
        conversationId: conversation.id
      });

      const workflowPlan = await aiWorkflow.analyzeIntent(
        query, 
        client.id, 
        apiTools, 
        client.knowledgeBases
      );

      console.log('workflowPlan', workflowPlan)

      // Update conversation with intent and workflow
      try {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            intent: workflowPlan.intent,
            workflow: workflowPlan.workflow
          }
        });
      } catch (error) {
        console.log('Could not update conversation:', error.message);
      }

      sendEvent('workflow_plan', {
        intent: workflowPlan.intent,
        confidence: workflowPlan.confidence,
        reasoning: workflowPlan.reasoning,
        workflow: workflowPlan.workflow
      });

      // If direct answer, skip tool execution
      if (workflowPlan.intent === 'DIRECT_ANSWER') {
        sendEvent('step_start', { 
          type: 'answer_generating', 
          name: 'Generating direct answer' 
        });

        // const answerStep = {
        //   type: 'answer_generating',
        //   name: 'Generating direct answer',
        //   parameters: {}
        // };

        // const answerResult = await aiWorkflow.executeWorkflowStep(
        //   answerStep, 
        //   query, 
        //   { 
        //     clientInstructions: client.instructions,
        //     availableTools: apiTools 
        //   }
        // );

        sendEvent('step_complete', {
          type: 'answer_generating',
          result: workflowPlan.reply
        });

        // Update conversation with final response
        try {
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              response: workflowPlan.reply,
              status: 'completed',
              latencyMs: Date.now() - startTime
            }
          });
        } catch (error) {
          console.log('Could not update conversation:', error.message);
        }

        sendEvent('done', {
          conversationId: conversation.id,
          latencyMs: Date.now() - startTime,
          intent: workflowPlan.intent
        });

        res.end();
        return;
      }

      // Execute workflow steps for TOOL_ENHANCED intent
      let ragContext = '';
      let toolResults = {};
      const toolsUsed = [];

      for (let i = 0; i < workflowPlan.workflow.steps.length; i++) {
        const step = workflowPlan.workflow.steps[i];
        
        // Create workflow step record
        let workflowStep = await prisma.workflowStep.create({
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

        sendEvent('step_start', { 
          type: step.type, 
          name: step.name,
          stepId: workflowStep.id
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
        try {
          await prisma.workflowStep.update({
            where: { id: workflowStep.id },
            data: {
              status: stepResult.error ? 'error' : 'completed',
              output: stepResult,
              error: stepResult.error,
              completedAt: new Date()
            }
          });
        } catch (error) {
          console.log('Could not update workflow step:', error.message);
        }

        sendEvent('step_complete', {
          type: step.type,
          stepId: workflowStep.id,
          result: stepResult
        });

        // Collect context for next steps
        if (step.type === 'rag_retrieving' && stepResult.contextText) {
          ragContext = stepResult.contextText;
        }

        if (step.type === 'api_calling' && stepResult.output) {
          toolResults = { ...toolResults, ...stepResult.output };
          toolsUsed.push(...step.tools);
        }

        // If this is the final answer step, we're done
        if (step.type === 'answer_generating' && stepResult.output) {
          try {
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
            // todo 
          } catch (error) {
            console.log('Could not update final conversation:', error.message);
          }


          sendEvent('done', {
            conversationId: conversation.id,
            latencyMs: Date.now() - startTime,
            intent: workflowPlan.intent,
            toolsUsed: [...new Set(toolsUsed)],
            ragUsed: workflowPlan.workflow.useRag
          });

          res.end();
          return;
        }
      }

      // If we reach here without a final answer, generate one using collected context
      sendEvent('step_start', { 
        type: 'answer_generating', 
        name: 'Generating final answer from collected context' 
      });

      // Create a final answer generation step
      const finalAnswerStep = {
        type: 'answer_generating',
        name: 'Generating final answer from collected context',
        parameters: {}
      };

      // Execute final answer generation with all collected context
      const finalResult = await aiWorkflow.executeWorkflowStep(
        finalAnswerStep, 
        query, 
        {
          apiKey: apiKey,
          ragContext: ragContext,
          toolResults: toolResults,
          clientInstructions: client.instructions,
          availableTools: apiTools
        }
      );

      sendEvent('step_complete', {
        type: 'answer_generating',
        result: finalResult
      });

      if (finalResult.output) {
        // Update conversation with final response
        try {
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              response: finalResult.output,
              toolsUsed: [...new Set(toolsUsed)],
              ragUsed: workflowPlan.workflow.useRag,
              status: 'completed',
              latencyMs: Date.now() - startTime
            }
          });
        } catch (error) {
          console.log('Could not update final conversation:', error.message);
        }

        sendEvent('done', {
          conversationId: conversation.id,
          latencyMs: Date.now() - startTime,
          intent: workflowPlan.intent,
          toolsUsed: [...new Set(toolsUsed)],
          ragUsed: workflowPlan.workflow.useRag
        });

        res.end();
        return;
      }

      // If final answer generation also failed, mark as error
      try {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            status: 'error',
            latencyMs: Date.now() - startTime
          }
        });
      } catch (error) {
        console.log('Could not update conversation status:', error.message);
      }

      sendEvent('error', { 
        message: 'Failed to generate final answer',
        details: finalResult.error || 'Unknown error'
      });

    } catch (error) {
      console.error('Workflow execution error:', error);
      
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'error',
          latencyMs: Date.now() - startTime
        }
      });

      sendEvent('error', { 
        message: 'Workflow execution failed', 
        error: error.message 
      });
    }

    res.end();

  } catch (error) {
    console.error('Ask endpoint error:', error);
    res.status(500).json({ 
      message: 'Request processing failed', 
      error: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}
