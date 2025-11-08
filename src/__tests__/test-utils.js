/**
 * Component Test Utilities
 * Helper functions for Jest + React Testing Library tests
 */

import { render } from '@testing-library/react';

/**
 * Mock SSE (Server-Sent Events) response for streaming
 * @param {Array<Object>} events - Array of {event, data} objects
 * @returns {Object} Mock response
 */
export function mockStreamingResponse(events) {
  const encoder = new TextEncoder();
  let eventIndex = 0;

  return {
    ok: true,
    body: {
      getReader: () => ({
        read: jest.fn(async () => {
          if (eventIndex >= events.length) {
            return { done: true };
          }

          const { event, data } = events[eventIndex];
          eventIndex++;

          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          return {
            done: false,
            value: encoder.encode(message)
          };
        })
      })
    }
  };
}

/**
 * Create a mock API response for direct answer
 * @param {string} reply - The reply text
 * @returns {Object} Mock response
 */
export function mockDirectAnswerResponse(reply) {
  return mockStreamingResponse([
    {
      event: 'workflow_plan',
      data: {
        intent: 'DIRECT_ANSWER',
        confidence: 0.9,
        workflow: { steps: [] }
      }
    },
    {
      event: 'step_start',
      data: { type: 'answer_generating', name: 'Generating direct answer' }
    },
    ...reply.split('').map(char => ({
      event: 'answer_chunk',
      data: { chunk: char }
    })),
    {
      event: 'step_complete',
      data: { type: 'answer_generating', result: { output: reply } }
    },
    {
      event: 'done',
      data: { conversationId: 'test-123', latencyMs: 1000 }
    }
  ]);
}

/**
 * Create a mock API response for tool-enhanced answer
 * @param {string} reply - The reply text
 * @param {Array<string>} tools - Tools used
 * @returns {Object} Mock response
 */
export function mockToolEnhancedResponse(reply, tools = ['API Tool']) {
  return mockStreamingResponse([
    {
      event: 'workflow_plan',
      data: {
        intent: 'TOOL_ENHANCED',
        confidence: 0.95,
        workflow: {
          steps: [
            { type: 'api_calling', name: 'Calling API', tools }
          ],
          useRag: false
        }
      }
    },
    {
      event: 'step_start',
      data: { type: 'api_calling', name: 'Calling API', stepId: 'step-1' }
    },
    {
      event: 'step_complete',
      data: { type: 'api_calling', stepId: 'step-1', result: { output: {} } }
    },
    {
      event: 'step_start',
      data: { type: 'answer_generating', name: 'Generating answer', stepId: 'step-2' }
    },
    ...reply.split('').map(char => ({
      event: 'answer_chunk',
      data: { chunk: char }
    })),
    {
      event: 'step_complete',
      data: { type: 'answer_generating', stepId: 'step-2', result: { output: reply } }
    },
    {
      event: 'done',
      data: {
        conversationId: 'test-123',
        latencyMs: 2000,
        toolsUsed: tools
      }
    }
  ]);
}

/**
 * Custom render function that includes common providers
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 */
export function renderWithProviders(ui, options = {}) {
  return render(ui, { ...options });
}

/**
 * Wait for a condition to be true
 * @param {Function} condition - Function that returns boolean
 * @param {number} timeout - Max time to wait in ms
 */
export async function waitForCondition(condition, timeout = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error('Condition not met within timeout');
}
