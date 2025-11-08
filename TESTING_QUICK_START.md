# Testing Framework - Quick Start Guide

## ✅ Setup Complete

Your testing framework is fully configured and ready to use!

## 🚀 Quick Commands

```bash
# Component Tests (Jest + React Testing Library)
npm run test              # Interactive watch mode
npm run test:ci          # Run once with coverage

# E2E Tests (Playwright)
npm run test:e2e         # Run all E2E tests
npm run test:e2e:ui      # Interactive UI mode
npm run test:e2e:headed  # Watch tests run in browser
npm run test:e2e:debug   # Debug mode with pauses

# Run Everything
npm run test:all         # Component + E2E tests
```

## 📁 What Was Installed

### Testing Tools
- ✅ **Playwright** - Browser automation for E2E testing
- ✅ **Jest** - Test runner for component tests
- ✅ **React Testing Library** - Component testing utilities
- ✅ **@testing-library/user-event** - Simulate user interactions
- ✅ **@testing-library/jest-dom** - Extended matchers

### Configuration Files
- `jest.config.js` - Jest configuration
- `jest.setup.js` - Jest setup with environment variables
- `playwright.config.js` - Playwright configuration
- `.github/workflows/test.yml` - CI/CD test automation

### Test Files Created
```
e2e/
├── chatbox.spec.js      # ChatBox E2E tests
└── test-utils.js        # E2E helper functions

src/components/__tests__/
└── ChatBox.test.js      # ChatBox component tests

src/__tests__/
└── test-utils.js        # Component test helpers
```

### Documentation
- `TESTING.md` - Comprehensive testing guide
- `TEST_TEMPLATE.md` - Quick reference templates
- `TESTING_QUICK_START.md` - This file

## 🎯 How to Use This Framework

### For You (Developer)

When you give me requirements, I will:

1. **Write tests first** based on your requirements
2. **Run the tests** to verify they work
3. **Implement the feature** to make tests pass
4. **Verify everything works** by running all tests

### Example Workflow

**Your Requirement:**
> "I want the send button to be red when there's an error"

**My Response:**
```javascript
// 1. I create a test
test('send button should be red on error', async ({ page }) => {
  // Test implementation
});

// 2. Run the test
npm run test:e2e

// 3. Implement the feature
// Update component code

// 4. Verify test passes
npm run test:e2e
```

## 📋 Test Examples Already Created

### E2E Tests (e2e/chatbox.spec.js)
- ✅ Chat interface displays correctly
- ✅ Welcome message shows when empty
- ✅ User can send messages
- ✅ Streaming cursor appears during response
- ✅ Complete response displays after streaming
- ✅ No workflow indicator for direct answers
- ✅ Timestamps display correctly
- ✅ Multiple messages work
- ✅ Empty input validation

### Component Tests (src/components/__tests__/ChatBox.test.js)
- ✅ Component renders with title
- ✅ Welcome message displays
- ✅ Input field has correct placeholder
- ✅ Send button disabled without input
- ✅ Send button enabled with input
- ✅ User message displays after send
- ✅ Input clears after sending
- ✅ API key input shows when needed
- ✅ Custom props work (className, height)

## 🔧 Helper Functions Available

### E2E Test Helpers (e2e/test-utils.js)

```javascript
import {
  sendChatMessage,
  waitForStreamingComplete,
  getAllMessages,
  getLastAssistantMessage,
  hasWorkflowIndicator,
  clearMessages,
  isStreamingCursorVisible
} from './test-utils';

// Usage
await sendChatMessage(page, 'Hello');
await waitForStreamingComplete(page);
const messages = await getAllMessages(page);
```

### Component Test Helpers (src/__tests__/test-utils.js)

```javascript
import {
  mockStreamingResponse,
  mockDirectAnswerResponse,
  mockToolEnhancedResponse,
  renderWithProviders,
  waitForCondition
} from '@/__tests__/test-utils';

// Usage
global.fetch = jest.fn().mockResolvedValue(
  mockDirectAnswerResponse('Test reply')
);
```

## 🎨 Writing New Tests

### Step 1: Choose Test Type

**Use E2E tests when:**
- Testing user flows
- Testing full features end-to-end
- Verifying UI behavior in browser

**Use Component tests when:**
- Testing individual components
- Testing component logic
- Fast iteration on component behavior

### Step 2: Use Template

Copy from `TEST_TEMPLATE.md` or use these quick templates:

```javascript
// E2E Test
test('should do something', async ({ page }) => {
  await page.goto('/');
  await page.locator('button').click();
  await expect(page.locator('.result')).toBeVisible();
});

// Component Test
test('should do something', async () => {
  render(<Component />);
  await user.click(screen.getByRole('button'));
  expect(screen.getByText('Result')).toBeInTheDocument();
});
```

### Step 3: Run Test

```bash
# Run specific test file
npm run test:e2e -- filename.spec.js

# Run test by name
npm run test:e2e -- -g "test name"
```

## 🐛 Debugging Tests

### Visual Debugging

```bash
# Open Playwright UI (best for debugging)
npm run test:e2e:ui

# Watch tests run in browser
npm run test:e2e:headed

# Step through with debugger
npm run test:e2e:debug
```

### Screenshots & Videos

Failed tests automatically capture:
- Screenshots → `test-results/*/test-failed-*.png`
- Videos → `test-results/*/video.webm`
- Traces → `test-results/*/trace.zip`

### View Test Report

```bash
npm run test:report
```

## 📊 Coverage Reports

```bash
# Generate coverage report
npm run test:ci

# Open in browser
open coverage/lcov-report/index.html
```

## 🤖 For Claude Code Usage

### When You Give Requirements

**Format:**
> "Feature: [Description of what should happen]"

**I Will:**
1. Create appropriate tests (E2E and/or Component)
2. Run tests to verify setup
3. Implement feature
4. Run tests again to verify
5. Report results

### Common Request Patterns

**Pattern 1: New Feature**
```
You: "Add a clear chat button that removes all messages"
Me:
1. Creates test: e2e/chatbox.spec.js
2. Implements: src/components/ChatBox.js
3. Runs: npm run test:e2e
4. Reports: ✅ Test passing
```

**Pattern 2: Bug Fix**
```
You: "Fix: cursor doesn't disappear after streaming"
Me:
1. Creates regression test
2. Fixes bug
3. Runs all tests
4. Reports: ✅ All tests passing
```

**Pattern 3: Verification**
```
You: "Test if the wallet connection works"
Me:
1. Runs: npm run test:e2e -- wallet.spec.js
2. Reports results
```

## 🎯 Test Coverage Goals

Current coverage:
- ChatBox component: ✅ Core functionality covered
- Streaming behavior: ✅ Tested
- User interactions: ✅ Tested

Future areas to test:
- Wallet connection flow
- Header component
- Error handling edge cases
- API endpoint responses
- Loading states

## 📝 Best Practices Checklist

When writing tests, ensure:
- [ ] Test name clearly describes behavior
- [ ] Test is independent (doesn't depend on other tests)
- [ ] Uses semantic queries (role, text, label)
- [ ] Waits properly for async operations
- [ ] Cleans up after itself
- [ ] Follows Arrange-Act-Assert pattern

## 🚦 CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests
- Manual workflow dispatch

View results in GitHub Actions tab.

## 📚 More Information

- Full guide: `TESTING.md`
- Templates: `TEST_TEMPLATE.md`
- Test examples: `e2e/chatbox.spec.js` and `src/components/__tests__/ChatBox.test.js`

## 🎉 You're Ready!

The testing framework is fully set up. Give me requirements and I'll:
1. Write tests
2. Implement features
3. Verify everything works

Let's build with confidence! 🚀
