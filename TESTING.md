# Testing Guide for FUDSCAN

This guide explains how to use the testing framework to test the FUDSCAN frontend application.

## Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Examples](#test-examples)
- [Best Practices](#best-practices)
- [For Claude Code](#for-claude-code)

---

## Overview

The testing framework consists of two main types of tests:

1. **Component Tests (Jest + React Testing Library)** - Test individual React components in isolation
2. **E2E Tests (Playwright)** - Test the entire application flow in a real browser

## Testing Stack

### Component Testing
- **Jest** - JavaScript testing framework
- **React Testing Library** - Library for testing React components
- **@testing-library/jest-dom** - Custom matchers for DOM testing
- **@testing-library/user-event** - Simulate user interactions

### E2E Testing
- **Playwright** - Browser automation framework
- Supports Chrome, Firefox, and Safari
- Includes built-in test runner and reporting

---

## Running Tests

### Component Tests

```bash
# Run tests in watch mode (interactive)
npm run test

# Run tests once (CI mode with coverage)
npm run test:ci
```

### E2E Tests

```bash
# Run E2E tests (headless)
npm run test:e2e

# Run with UI mode (interactive debugging)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug specific test
npm run test:e2e:debug

# View test report
npm run test:report
```

### Run All Tests

```bash
# Run both component and E2E tests
npm run test:all
```

---

## Writing Tests

### Component Test Structure

Create test files alongside components with `.test.js` suffix:

```
src/components/
├── ChatBox.js
└── __tests__/
    └── ChatBox.test.js
```

**Example Component Test:**

```javascript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatBox from '../ChatBox';

describe('ChatBox Component', () => {
  test('renders ChatBox with title', () => {
    render(<ChatBox apiKey="test-key" />);
    expect(screen.getByText('FUDSCAN Chat')).toBeInTheDocument();
  });

  test('handles user input', async () => {
    const user = userEvent.setup();
    render(<ChatBox apiKey="test-key" />);

    const input = screen.getByPlaceholderText(/Ask me anything/);
    await user.type(input, 'Test message');

    expect(input).toHaveValue('Test message');
  });
});
```

### E2E Test Structure

Create test files in the `e2e/` directory with `.spec.js` suffix:

```
e2e/
├── chatbox.spec.js
└── test-utils.js
```

**Example E2E Test:**

```javascript
import { test, expect } from '@playwright/test';

test('should send message and receive response', async ({ page }) => {
  await page.goto('/');

  // Type message
  await page.locator('input[type="text"]').first().fill('Hello');

  // Click send
  await page.locator('button.btn', { hasText: 'Send' }).click();

  // Wait for response
  await page.waitForSelector('.standard-dialog', { timeout: 5000 });

  // Verify message appears
  expect(await page.locator('.standard-dialog').first().textContent())
    .toContain('Hello');
});
```

---

## Test Examples

### Testing User Interactions

```javascript
// Component test
test('button is disabled without input', () => {
  render(<ChatBox apiKey="test-key" />);
  const sendButton = screen.getByRole('button', { name: /send/i });
  expect(sendButton).toBeDisabled();
});

// E2E test
test('button is disabled without input', async ({ page }) => {
  await page.goto('/');
  const sendButton = page.locator('button.btn', { hasText: 'Send' });
  await expect(sendButton).toBeDisabled();
});
```

### Testing Streaming Responses

```javascript
// E2E test with test utilities
import { sendChatMessage, waitForStreamingComplete } from './test-utils';

test('displays streaming cursor during response', async ({ page }) => {
  await page.goto('/');

  await sendChatMessage(page, 'Test message', { waitForResponse: false });

  // Check cursor is visible during streaming
  const cursor = page.locator('.cursor-blink');
  await expect(cursor).toBeVisible({ timeout: 5000 });

  // Wait for streaming to complete
  await waitForStreamingComplete(page);

  // Cursor should disappear
  await expect(cursor).not.toBeVisible();
});
```

### Testing API Mocking

```javascript
// Component test with mocked API
import { mockDirectAnswerResponse } from '@/__tests__/test-utils';

test('displays AI response', async () => {
  const user = userEvent.setup();

  // Mock fetch
  global.fetch = jest.fn().mockResolvedValueOnce(
    mockDirectAnswerResponse('This is a test reply')
  );

  render(<ChatBox apiKey="test-key" />);

  const input = screen.getByPlaceholderText(/Ask me anything/);
  await user.type(input, 'Test');
  await user.click(screen.getByRole('button', { name: /send/i }));

  // Wait for response
  await waitFor(() => {
    expect(screen.getByText('This is a test reply')).toBeInTheDocument();
  });
});
```

---

## Best Practices

### Component Tests

1. **Test behavior, not implementation**
   - Focus on what users see and do
   - Avoid testing internal state

2. **Use semantic queries**
   ```javascript
   // Good
   screen.getByRole('button', { name: /send/i })

   // Avoid
   container.querySelector('.btn')
   ```

3. **Mock external dependencies**
   - Mock API calls with `jest.fn()`
   - Use test utilities for common mocks

### E2E Tests

1. **Use meaningful selectors**
   ```javascript
   // Good - resilient to changes
   page.locator('button', { hasText: 'Send' })

   // Avoid - brittle
   page.locator('.btn.primary.large')
   ```

2. **Wait for elements properly**
   ```javascript
   // Wait for element to appear
   await page.waitForSelector('.message', { timeout: 5000 });

   // Wait for streaming to complete
   await waitForStreamingComplete(page);
   ```

3. **Use test utilities**
   - Leverage helper functions in `e2e/test-utils.js`
   - Create reusable actions

### General

1. **Keep tests independent**
   - Each test should run in isolation
   - Don't rely on test execution order

2. **Clear test names**
   ```javascript
   // Good
   test('should display error message when API fails')

   // Avoid
   test('test error')
   ```

3. **Arrange-Act-Assert pattern**
   ```javascript
   test('example', async () => {
     // Arrange - set up test data
     const user = userEvent.setup();

     // Act - perform action
     await user.click(button);

     // Assert - verify result
     expect(result).toBe(expected);
   });
   ```

---

## For Claude Code

### Running Tests

When asked to test features, Claude Code should:

1. **Run E2E tests to verify UI flows:**
   ```bash
   npm run test:e2e
   ```

2. **Run component tests for specific components:**
   ```bash
   npm run test
   ```

3. **Check test coverage:**
   ```bash
   npm run test:ci
   ```

### Writing Tests Based on Requirements

When given requirements, follow this pattern:

1. **Identify test type needed:**
   - UI flow → E2E test
   - Component behavior → Component test

2. **Create descriptive test:**
   ```javascript
   // Requirement: "User should see streaming cursor during AI response"

   // E2E Test
   test('should show streaming cursor during AI response', async ({ page }) => {
     await sendChatMessage(page, 'Test', { waitForResponse: false });
     await expect(page.locator('.cursor-blink')).toBeVisible();
   });
   ```

3. **Use test utilities for common operations:**
   ```javascript
   import { sendChatMessage, waitForStreamingComplete } from './test-utils';
   ```

4. **Verify test passes:**
   ```bash
   npm run test:e2e -- chatbox.spec.js
   ```

### Test Organization

- **E2E tests:** `e2e/*.spec.js`
- **Component tests:** `src/components/__tests__/*.test.js`
- **Utilities:** `e2e/test-utils.js` and `src/__tests__/test-utils.js`

### Common Testing Scenarios

#### Scenario 1: Testing a New Feature
```javascript
// 1. Write E2E test first (TDD approach)
test('new feature should work', async ({ page }) => {
  // Test the feature end-to-end
});

// 2. Write component test
test('component handles new feature', () => {
  // Test component behavior
});

// 3. Run tests and implement feature
// npm run test:e2e
```

#### Scenario 2: Bug Fix Verification
```javascript
// 1. Write test that reproduces bug
test('bug: should not show percentage for direct answers', async ({ page }) => {
  await sendChatMessage(page, 'Hi');
  await expect(page.locator('.inner-border')).not.toBeVisible();
});

// 2. Fix bug
// 3. Verify test passes
```

#### Scenario 3: Regression Testing
```javascript
// Run all tests after making changes
npm run test:all

// Check if existing features still work
```

### Debugging Failed Tests

1. **Run in UI mode:**
   ```bash
   npm run test:e2e:ui
   ```

2. **Run in headed mode (see browser):**
   ```bash
   npm run test:e2e:headed
   ```

3. **Debug specific test:**
   ```bash
   npm run test:e2e:debug
   ```

4. **Check screenshots and videos:**
   - Located in `test-results/` after failed tests
   - Videos in `test-results/*/video.webm`

### Test Coverage

Check coverage report:
```bash
npm run test:ci

# Coverage report in coverage/lcov-report/index.html
```

---

## File Structure

```
fudscan-webapp/
├── e2e/                          # E2E tests
│   ├── chatbox.spec.js          # ChatBox E2E tests
│   └── test-utils.js            # E2E test utilities
├── src/
│   ├── components/
│   │   ├── ChatBox.js
│   │   └── __tests__/
│   │       └── ChatBox.test.js  # ChatBox component tests
│   └── __tests__/
│       └── test-utils.js        # Component test utilities
├── jest.config.js               # Jest configuration
├── jest.setup.js                # Jest setup file
├── playwright.config.js         # Playwright configuration
└── TESTING.md                   # This file
```

---

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## Next Steps

1. Run the example tests to verify setup:
   ```bash
   npm run test:e2e
   ```

2. Add tests for new features as you develop

3. Use test utilities to reduce boilerplate

4. Keep tests green - fix failing tests immediately

Happy testing! 🎯
