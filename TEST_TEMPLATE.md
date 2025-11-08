# Test Template - Quick Reference

Use this template when creating new tests based on requirements.

## E2E Test Template

```javascript
import { test, expect } from '@playwright/test';
import { sendChatMessage, waitForStreamingComplete } from './test-utils';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should [expected behavior]', async ({ page }) => {
    // Arrange - Set up test data

    // Act - Perform user actions

    // Assert - Verify expected outcome
    await expect(/* assertion */).toBeVisible();
  });
});
```

## Component Test Template

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Component from '../Component';

describe('Component Name', () => {
  beforeEach(() => {
    // Setup
  });

  test('should [expected behavior]', async () => {
    const user = userEvent.setup();

    // Arrange
    render(<Component prop="value" />);

    // Act
    await user.click(screen.getByRole('button'));

    // Assert
    expect(screen.getByText('Expected')).toBeInTheDocument();
  });
});
```

## Common Test Patterns

### 1. Testing User Input

```javascript
// E2E
test('user can input text', async ({ page }) => {
  const input = page.locator('input[type="text"]').first();
  await input.fill('Test text');
  await expect(input).toHaveValue('Test text');
});

// Component
test('user can input text', async () => {
  const user = userEvent.setup();
  render(<Component />);
  const input = screen.getByRole('textbox');
  await user.type(input, 'Test text');
  expect(input).toHaveValue('Test text');
});
```

### 2. Testing Button Clicks

```javascript
// E2E
test('button click triggers action', async ({ page }) => {
  await page.locator('button', { hasText: 'Click Me' }).click();
  await expect(page.locator('.result')).toBeVisible();
});

// Component
test('button click triggers action', async () => {
  const user = userEvent.setup();
  const handleClick = jest.fn();
  render(<Button onClick={handleClick} />);
  await user.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalled();
});
```

### 3. Testing Conditional Rendering

```javascript
// E2E
test('element appears based on condition', async ({ page }) => {
  await page.locator('button', { hasText: 'Show' }).click();
  await expect(page.locator('.hidden-element')).toBeVisible();
});

// Component
test('element appears based on condition', () => {
  const { rerender } = render(<Component show={false} />);
  expect(screen.queryByText('Hidden')).not.toBeInTheDocument();

  rerender(<Component show={true} />);
  expect(screen.getByText('Hidden')).toBeInTheDocument();
});
```

### 4. Testing API Responses

```javascript
// E2E
test('displays API data', async ({ page }) => {
  // API is automatically called by app
  await page.waitForSelector('.data-container');
  const text = await page.locator('.data-container').textContent();
  expect(text).toContain('Expected data');
});

// Component
test('displays API data', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: 'test' })
  });

  render(<Component />);

  await waitFor(() => {
    expect(screen.getByText('test')).toBeInTheDocument();
  });
});
```

### 5. Testing Chat Streaming

```javascript
// E2E with utilities
test('chat streams response', async ({ page }) => {
  await sendChatMessage(page, 'Test message', { waitForResponse: false });

  // Check cursor appears
  await expect(page.locator('.cursor-blink')).toBeVisible();

  // Wait for streaming to complete
  await waitForStreamingComplete(page);

  // Verify message
  const lastMessage = await getLastAssistantMessage(page);
  expect(lastMessage.length).toBeGreaterThan(0);
});
```

### 6. Testing Error States

```javascript
// E2E
test('displays error message on failure', async ({ page }) => {
  // Trigger error condition
  await page.locator('button', { hasText: 'Fail' }).click();

  // Check error appears
  await expect(page.locator('.error-message')).toBeVisible();
  await expect(page.locator('.error-message')).toContainText('Error');
});

// Component
test('displays error message on failure', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));

  render(<Component />);

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

## Checklist for New Tests

- [ ] Test file created in correct location
  - E2E: `e2e/*.spec.js`
  - Component: `src/components/__tests__/*.test.js`

- [ ] Test has descriptive name starting with "should"

- [ ] Test follows Arrange-Act-Assert pattern

- [ ] Test uses appropriate selectors (semantic queries)

- [ ] Test waits properly for async operations

- [ ] Test is independent (doesn't rely on other tests)

- [ ] Test cleans up after itself (if needed)

- [ ] Test runs successfully:
  ```bash
  npm run test:e2e -- filename.spec.js
  # or
  npm run test -- filename.test.js
  ```

## Converting Requirements to Tests

### Requirement Format:
> "When user sends a message, the chat should display a streaming cursor animation, and when complete, show the full response without a cursor."

### Convert to Tests:

1. **Identify key behaviors:**
   - User sends message
   - Cursor appears during streaming
   - Cursor disappears when done
   - Full response displayed

2. **Create test cases:**

```javascript
test.describe('Chat Streaming', () => {
  test('should show cursor during streaming', async ({ page }) => {
    await sendChatMessage(page, 'Test', { waitForResponse: false });
    await expect(page.locator('.cursor-blink')).toBeVisible();
  });

  test('should hide cursor when streaming completes', async ({ page }) => {
    await sendChatMessage(page, 'Test');
    await expect(page.locator('.cursor-blink')).not.toBeVisible();
  });

  test('should display full response after streaming', async ({ page }) => {
    await sendChatMessage(page, 'Hello');
    const response = await getLastAssistantMessage(page);
    expect(response.length).toBeGreaterThan(0);
  });
});
```

## Running Specific Tests

```bash
# Run single E2E test file
npm run test:e2e -- chatbox.spec.js

# Run single test by name
npm run test:e2e -- -g "should show cursor"

# Run single component test file
npm run test -- ChatBox.test.js

# Run tests matching pattern
npm run test -- --testNamePattern="streaming"
```

## Debugging Tips

1. **Add console.log in tests:**
   ```javascript
   console.log('Current state:', await page.locator('.status').textContent());
   ```

2. **Take screenshots:**
   ```javascript
   await page.screenshot({ path: 'debug.png' });
   ```

3. **Add pauses for inspection:**
   ```javascript
   await page.pause(); // Opens Playwright Inspector
   ```

4. **Use debug mode:**
   ```bash
   npm run test:e2e:debug
   ```
