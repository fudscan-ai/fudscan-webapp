/**
 * E2E Test Utilities
 * Helper functions for Playwright tests
 */

/**
 * Wait for the chat to finish streaming a response
 * @param {import('@playwright/test').Page} page
 * @param {number} timeout - Maximum time to wait in ms
 */
export async function waitForStreamingComplete(page, timeout = 10000) {
  // Wait for cursor to disappear
  await page.waitForSelector('.cursor-blink', { state: 'detached', timeout });
}

/**
 * Send a message in the chat and wait for response
 * @param {import('@playwright/test').Page} page
 * @param {string} message
 * @param {Object} options
 */
export async function sendChatMessage(page, message, options = {}) {
  const {
    waitForResponse = true,
    timeout = 30000
  } = options;

  // Type message
  await page.locator('input[type="text"]').first().fill(message);

  // Click send button
  await page.locator('button.btn', { hasText: 'Send' }).click();

  if (waitForResponse) {
    // Wait for user message to appear
    await page.waitForSelector('.standard-dialog', { timeout: 5000 });

    // Wait for streaming to complete
    await waitForStreamingComplete(page, timeout);
  }
}

/**
 * Get all messages from the chat
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Array>}
 */
export async function getAllMessages(page) {
  const messageElements = await page.locator('.standard-dialog').all();
  const messages = [];

  for (const el of messageElements) {
    const text = await el.textContent();
    messages.push(text);
  }

  return messages;
}

/**
 * Check if a workflow indicator is visible
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function hasWorkflowIndicator(page) {
  const indicator = page.locator('.inner-border').filter({ hasText: 'Tool Enhanced' });
  return await indicator.isVisible();
}

/**
 * Get the last assistant message
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
export async function getLastAssistantMessage(page) {
  const messages = page.locator('.standard-dialog');
  const count = await messages.count();

  if (count < 2) {
    throw new Error('No assistant message found');
  }

  // Last message should be assistant (assuming user message comes before it)
  const lastMessage = messages.nth(count - 1);
  return await lastMessage.textContent();
}

/**
 * Clear all messages (by refreshing the page)
 * @param {import('@playwright/test').Page} page
 */
export async function clearMessages(page) {
  await page.reload();
  await page.waitForLoadState('networkidle');
}

/**
 * Check if streaming cursor is visible
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function isStreamingCursorVisible(page) {
  const cursor = page.locator('.cursor-blink');
  try {
    await cursor.waitFor({ state: 'visible', timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}
