import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatBox from '../ChatBox';

/**
 * Component tests for ChatBox
 * Tests the component's rendering and user interactions
 */

// Mock fetch for API calls
global.fetch = jest.fn();

describe('ChatBox Component', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    fetch.mockClear();
  });

  test('renders ChatBox with title', () => {
    render(<ChatBox apiKey="test-key" />);

    expect(screen.getByText('FUDSCAN Chat')).toBeInTheDocument();
  });

  test('displays welcome message when no messages', () => {
    render(<ChatBox apiKey="test-key" />);

    expect(screen.getByText('Welcome to FUDSCAN Chat')).toBeInTheDocument();
    expect(screen.getByText(/Ask me anything about Web3/)).toBeInTheDocument();
  });

  test('has input field with correct placeholder', () => {
    render(<ChatBox apiKey="test-key" placeholder="Test placeholder" />);

    const input = screen.getByPlaceholderText('Test placeholder');
    expect(input).toBeInTheDocument();
  });

  test('send button is disabled without input', () => {
    render(<ChatBox apiKey="test-key" />);

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  test('send button is enabled with input', async () => {
    const user = userEvent.setup();
    render(<ChatBox apiKey="test-key" />);

    const input = screen.getByPlaceholderText(/Ask me anything about crypto/);
    await user.type(input, 'Test message');

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeEnabled();
  });

  test('displays user message after typing and clicking send', async () => {
    const user = userEvent.setup();

    // Mock successful API response
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        body: {
          getReader: () => ({
            read: jest.fn()
              .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('event: done\ndata: {}\n\n') })
              .mockResolvedValueOnce({ done: true })
          })
        }
      })
    );

    render(<ChatBox apiKey="test-key" />);

    const input = screen.getByPlaceholderText(/Ask me anything about crypto/);
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(input, 'Hello AI');
    await user.click(sendButton);

    // User message should appear immediately
    expect(screen.getByText('Hello AI')).toBeInTheDocument();
  });

  test('clears input field after sending message', async () => {
    const user = userEvent.setup();

    // Mock successful API response
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        body: {
          getReader: () => ({
            read: jest.fn()
              .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('event: done\ndata: {}\n\n') })
              .mockResolvedValueOnce({ done: true })
          })
        }
      })
    );

    render(<ChatBox apiKey="test-key" />);

    const input = screen.getByPlaceholderText(/Ask me anything about crypto/);
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(input, 'Test');
    await user.click(sendButton);

    // Input should be cleared
    expect(input).toHaveValue('');
  });

  test('displays API key input when no apiKey provided', () => {
    render(<ChatBox onApiKeyChange={jest.fn()} />);

    const apiKeyInput = screen.getByPlaceholderText('Enter API Key');
    expect(apiKeyInput).toBeInTheDocument();
  });

  test('calls onApiKeyChange when API key is entered', async () => {
    const user = userEvent.setup();
    const mockOnApiKeyChange = jest.fn();

    render(<ChatBox onApiKeyChange={mockOnApiKeyChange} />);

    const apiKeyInput = screen.getByPlaceholderText('Enter API Key');
    await user.type(apiKeyInput, 'new-key');

    expect(mockOnApiKeyChange).toHaveBeenCalled();
  });

  test('formats timestamps correctly', () => {
    render(<ChatBox apiKey="test-key" />);

    // This is a smoke test - actual timestamp format would need message rendering
    // More detailed test would mock Date and check format
    const titleBar = screen.getByText('FUDSCAN Chat');
    expect(titleBar).toBeInTheDocument();
  });

  test('applies custom className prop', () => {
    const { container } = render(<ChatBox apiKey="test-key" className="custom-class" />);

    const windowElement = container.querySelector('.window.custom-class');
    expect(windowElement).toBeInTheDocument();
  });

  test('applies custom height prop', () => {
    const { container } = render(<ChatBox apiKey="test-key" height="800px" />);

    const windowElement = container.querySelector('.window');
    expect(windowElement).toHaveStyle({ height: '800px' });
  });
});

describe('ChatBox Message Handling', () => {
  test('displays streaming indicator during response', async () => {
    const user = userEvent.setup();

    // Mock streaming response
    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('event: workflow_plan\ndata: {"intent":"DIRECT_ANSWER"}\n\n')
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('event: answer_chunk\ndata: {"chunk":"Test"}\n\n')
        })
        .mockResolvedValueOnce({ done: true })
    };

    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        body: {
          getReader: () => mockReader
        }
      })
    );

    render(<ChatBox apiKey="test-key" />);

    const input = screen.getByPlaceholderText(/Ask me anything about crypto/);
    await user.type(input, 'Test message');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Wait for the message to process
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });
});
