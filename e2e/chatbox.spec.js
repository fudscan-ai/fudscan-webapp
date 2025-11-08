import { test, expect } from '@playwright/test';

/**
 * E2E tests for ChatBox component and AI interaction
 */

test.describe('ChatBox E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display the chat interface with title', async ({ page }) => {
    // Check if the title bar is visible
    await expect(page.locator('.title-bar')).toBeVisible();
    await expect(page.locator('.title-bar .title')).toHaveText('FUDSCAN Chat');
  });

  test('should show welcome message when no messages exist', async ({ page }) => {
    // Check for welcome message
    await expect(page.getByText('Welcome to FUDSCAN Chat')).toBeVisible();
    await expect(page.getByText('Ask me anything about Web3, DeFi, tokens, or wallet analysis')).toBeVisible();
  });

  test('should have input field and send button', async ({ page }) => {
    // Check input field
    const input = page.locator('input[type="text"]').first();
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'Ask me anything about crypto...');

    // Check send button
    const sendButton = page.locator('button.btn', { hasText: 'Send' });
    await expect(sendButton).toBeVisible();
  });

  test('should display user message after submission', async ({ page }) => {
    const testMessage = 'Hello, what is Bitcoin?';

    // Type message
    await page.locator('input[type="text"]').first().fill(testMessage);

    // Click send button
    await page.locator('button.btn', { hasText: 'Send' }).click();

    // Wait for user message to appear
    await page.waitForSelector('.standard-dialog', { timeout: 5000 });

    // Check if user message is displayed
    const userMessage = page.locator('.standard-dialog').first();
    await expect(userMessage).toContainText(testMessage);
  });

  test('should show streaming cursor during AI response', async ({ page }) => {
    const testMessage = 'What is Ethereum?';

    // Send message
    await page.locator('input[type="text"]').first().fill(testMessage);
    await page.locator('button.btn', { hasText: 'Send' }).click();

    // Wait for assistant message container
    await page.waitForSelector('.standard-dialog', { timeout: 5000 });

    // Check if cursor animation is present during streaming
    const cursor = page.locator('.cursor-blink');

    // The cursor should appear briefly during streaming
    // Note: This may need adjustment based on actual streaming speed
    await expect(cursor).toBeVisible({ timeout: 10000 });
  });

  test('should display complete AI response after streaming', async ({ page }) => {
    const testMessage = 'Hello';

    // Send message
    await page.locator('input[type="text"]').first().fill(testMessage);
    await page.locator('button.btn', { hasText: 'Send' }).click();

    // Wait for streaming to complete (cursor should disappear)
    await page.waitForTimeout(3000);

    // Get all message containers
    const messages = page.locator('.standard-dialog');
    await expect(messages).toHaveCount(2); // User message + AI message

    // Check if AI response is present
    const aiMessage = messages.nth(1);
    const aiContent = await aiMessage.textContent();
    expect(aiContent.length).toBeGreaterThan(0);
  });

  test('should clear input field after sending message', async ({ page }) => {
    const testMessage = 'Test message';

    const input = page.locator('input[type="text"]').first();

    // Fill and send
    await input.fill(testMessage);
    await page.locator('button.btn', { hasText: 'Send' }).click();

    // Check if input is cleared
    await expect(input).toHaveValue('');
  });

  test('should not show workflow indicator for direct answers', async ({ page }) => {
    const testMessage = 'Hi';

    // Send simple greeting
    await page.locator('input[type="text"]').first().fill(testMessage);
    await page.locator('button.btn', { hasText: 'Send' }).click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Check that "Direct Answer" or percentage indicator is NOT visible
    const workflowIndicator = page.locator('.inner-border').filter({ hasText: 'Tool Enhanced' });
    await expect(workflowIndicator).not.toBeVisible();
  });

  test('should display timestamp for messages', async ({ page }) => {
    const testMessage = 'Test timestamp';

    await page.locator('input[type="text"]').first().fill(testMessage);
    await page.locator('button.btn', { hasText: 'Send' }).click();

    // Wait for messages
    await page.waitForTimeout(2000);

    // Check for timestamps (should be in HH:MM:SS format)
    const timestamps = page.locator('.standard-dialog').locator('div', { hasText: /\d{1,2}:\d{2}:\d{2}/ });
    await expect(timestamps.first()).toBeVisible();
  });

  test('should handle multiple consecutive messages', async ({ page }) => {
    const messages = ['First message', 'Second message'];

    for (const msg of messages) {
      await page.locator('input[type="text"]').first().fill(msg);
      await page.locator('button.btn', { hasText: 'Send' }).click();
      await page.waitForTimeout(2000); // Wait for each response
    }

    // Should have 4 messages total (2 user + 2 AI)
    const allMessages = page.locator('.standard-dialog');
    await expect(allMessages).toHaveCount(4);
  });
});

test.describe('ChatBox Error Handling', () => {
  test('should handle empty message submission gracefully', async ({ page }) => {
    await page.goto('/');

    const sendButton = page.locator('button.btn', { hasText: 'Send' });

    // Button should be disabled with empty input
    await expect(sendButton).toBeDisabled();
  });
});
