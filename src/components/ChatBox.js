import { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';

export default function ChatBox({
  apiKey,
  onApiKeyChange,
  className = "",
  placeholder = "Ask me anything about crypto...",
  height = "600px"
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const chunkBufferRef = useRef('');
  const renderIntervalRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (renderIntervalRef.current) {
        clearInterval(renderIntervalRef.current);
      }
    };
  }, []);

  // Start throttled rendering for smooth streaming effect
  const startThrottledRendering = () => {
    if (renderIntervalRef.current) {
      clearInterval(renderIntervalRef.current);
    }

    // Render buffered chunks every 30ms for smooth effect
    renderIntervalRef.current = setInterval(() => {
      if (chunkBufferRef.current.length > 0) {
        // Take 3-5 characters at a time for smooth appearance
        const charsToRender = Math.min(5, chunkBufferRef.current.length);
        const textToAdd = chunkBufferRef.current.slice(0, charsToRender);
        chunkBufferRef.current = chunkBufferRef.current.slice(charsToRender);

        updateLastMessage(prev => ({
          ...prev,
          content: (prev.content || '') + textToAdd
        }));
      }
    }, 30);
  };

  // Stop throttled rendering and flush remaining buffer
  const stopThrottledRendering = () => {
    if (renderIntervalRef.current) {
      clearInterval(renderIntervalRef.current);
      renderIntervalRef.current = null;
    }

    // Flush any remaining buffered content
    if (chunkBufferRef.current.length > 0) {
      updateLastMessage(prev => ({
        ...prev,
        content: (prev.content || '') + chunkBufferRef.current
      }));
      chunkBufferRef.current = '';
    }
  };

  const addMessage = (message) => {
    setMessages(prev => [...prev, message]);
  };

  const updateLastMessage = (updates) => {
    setMessages(prev => {
      const newMessages = [...prev];
      const lastIndex = newMessages.length - 1;
      if (lastIndex >= 0) {
        if (typeof updates === 'function') {
          newMessages[lastIndex] = updates(newMessages[lastIndex]);
        } else {
          newMessages[lastIndex] = { ...newMessages[lastIndex], ...updates };
        }
      }
      return newMessages;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !apiKey?.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    const assistantMessage = {
      id: Date.now() + 1,
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      workflow: null,
      steps: [],
      isStreaming: true
    };

    addMessage(userMessage);
    addMessage(assistantMessage);
    
    const query = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ query, options: {} }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        let errorMessage = 'Request failed';
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch (e) {
          errorMessage = `Request failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.trim() === '') continue;

          if (line.startsWith('event: ')) {
            const event = line.slice(7);
            // Look for the next data line
            if (i + 1 < lines.length && lines[i + 1].startsWith('data: ')) {
              try {
                const data = JSON.parse(lines[i + 1].slice(6));
                handleStreamEvent(event, data);
              } catch (error) {
                console.error('Failed to parse event data:', error, lines[i + 1]);
              }
              i++; // Skip the data line since we processed it
            }
          }
        }
      }

    } catch (error) {
      // Stop any ongoing throttled rendering
      stopThrottledRendering();

      if (error.name !== 'AbortError') {
        console.error('Chat error:', error);
        updateLastMessage({
          content: `Error: ${error.message || 'An unexpected error occurred'}`,
          isStreaming: false,
          error: true
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStreamEvent = (event, data) => {
    console.log('ChatBox stream event:', event, data); // Debug log

    switch (event) {
      case 'workflow_plan':
        updateLastMessage({ workflow: data, steps: [] });
        break;

      case 'step_start':
        updateLastMessage(prev => ({
          ...prev,
          steps: [...(prev.steps || []), {
            ...data,
            status: 'running',
            startTime: Date.now(),
            id: data.stepId || `${data.type}_${Date.now()}`
          }]
        }));
        break;

      case 'answer_chunk':
        // Buffer chunks for throttled rendering (OpenAI-style streaming effect)
        if (!renderIntervalRef.current) {
          startThrottledRendering();
        }
        chunkBufferRef.current += data.chunk;
        break;

      case 'step_complete':
        updateLastMessage(prev => ({
          ...prev,
          steps: (prev.steps || []).map(step =>
            (step.stepId === data.stepId || step.id === data.stepId || step.type === data.type)
              ? { ...step, status: 'completed', result: data.result, endTime: Date.now() }
              : step
          )
        }));

        // If this is the answer generating step and no streaming happened, use the full output
        if (data.type === 'answer_generating' && data.result?.output) {
          updateLastMessage(prev => ({
            ...prev,
            content: prev.content || data.result.output
          }));
        }
        break;

      case 'done':
        // Stop throttled rendering and flush buffer
        stopThrottledRendering();

        updateLastMessage({
          isStreaming: false,
          latencyMs: data.latencyMs,
          conversationId: data.conversationId
        });
        break;

      case 'error':
        // Stop throttled rendering on error
        stopThrottledRendering();

        updateLastMessage({
          content: `Error: ${data.message || 'An unexpected error occurred'}`,
          isStreaming: false,
          error: true
        });
        break;
    }
  };

  const cancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const getStepIcon = (stepType, status) => {
    if (status === 'running') {
      return <div className="w-3 h-3 mr-2 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />;
    }
    if (status === 'completed') {
      return <div className="w-3 h-3 mr-2 bg-green-500 rounded-full" />;
    }
    return <div className="w-3 h-3 mr-2 bg-gray-300 rounded-full" />;
  };

  const getStepName = (step) => {
    // If step has a specific name, use it
    if (step.name) {
      const icons = {
        'thinking': '🤔',
        'rag_retrieving': '📚',
        'api_calling': '🔧',
        'answer_generating': '✍️'
      };
      const icon = icons[step.type] || '•';
      return `${icon} ${step.name}`;
    }

    // Otherwise use generic type names
    const names = {
      'thinking': '🤔 Analyzing',
      'rag_retrieving': '📚 Searching Knowledge Base',
      'api_calling': '🔧 Calling API',
      'answer_generating': '✍️ Generating Answer'
    };
    return names[step.type] || step.type;
  };

  return (
    <div className={`window ${className}`} style={{ height, display: 'flex', flexDirection: 'column', maxWidth: '800px', margin: '0 auto' }}>
      {/* Mac Title Bar */}
      <div className="title-bar">
        <div className="title">FUDSCAN Chat</div>
      </div>

      {/* Messages Window Pane */}
      <div className="window-pane" style={{ flex: 1, overflowY: 'scroll' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--tertiary)' }}>
            <div style={{ marginBottom: '0.5rem', fontFamily: 'Chicago_12', fontSize: '14px' }}>
              Welcome to FUDSCAN Chat
            </div>
            <div style={{ fontSize: '12px', fontFamily: 'Geneva_9' }}>
              Ask me anything about Web3, DeFi, tokens, or wallet analysis
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} style={{ marginBottom: '1rem' }}>
            {message.type === 'user' ? (
              <div className="standard-dialog" style={{
                marginLeft: 'auto',
                maxWidth: '80%',
                padding: '8px',
                background: 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%)',
                borderColor: '#888'
              }}>
                <div style={{ fontFamily: 'Chicago_12', fontSize: '14px' }}>
                  {message.content}
                </div>
              </div>
            ) : (
              <div className="standard-dialog" style={{
                maxWidth: '90%',
                padding: '10px',
                ...(message.error && {
                  borderColor: 'red',
                  borderWidth: '3px'
                })
              }}>
                {/* Workflow indicator */}
                {message.workflow && (
                  <div className="inner-border" style={{ padding: '6px 10px', marginBottom: '10px', fontSize: '13px', fontFamily: 'Chicago_12' }}>
                    <strong style={{ fontSize: '14px' }}>{message.workflow.intent === 'DIRECT_ANSWER' ? 'Direct Answer' : 'Tool Enhanced'}</strong>
                    <span style={{ marginLeft: '8px', color: 'var(--tertiary)', fontSize: '13px' }}>
                      ({(message.workflow.confidence * 100).toFixed(0)}%)
                    </span>
                  </div>
                )}

                {/* Steps */}
                {message.steps && message.steps.length > 0 && (
                  <div style={{ marginBottom: '8px', fontSize: '11px', fontFamily: 'Geneva_9' }}>
                    {message.steps.map((step, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          marginRight: '6px',
                          backgroundColor: step.status === 'completed' ? 'var(--secondary)' : 'var(--tertiary)',
                          border: '1px solid var(--secondary)'
                        }} />
                        <span>{getStepName(step)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Content */}
                <div
                  style={{ fontFamily: 'Chicago_12', fontSize: '14px', lineHeight: '1.5' }}
                  dangerouslySetInnerHTML={{
                    __html: message.content ? marked.parse(message.content) : (message.isStreaming ? 'Processing...' : '')
                  }}
                />
                {message.isStreaming && (
                  <span style={{
                    display: 'inline-block',
                    width: '2px',
                    height: '14px',
                    backgroundColor: 'var(--secondary)',
                    marginLeft: '2px',
                    animation: 'blink 1s infinite'
                  }} />
                )}

                {/* Timestamp */}
                <div style={{ fontSize: '10px', color: 'var(--tertiary)', marginTop: '8px', fontFamily: 'Geneva_9' }}>
                  {message.timestamp.toLocaleTimeString()}
                  {message.latencyMs && ` • ${message.latencyMs}ms`}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="separator" style={{ padding: '8px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading || !apiKey}
            style={{
              flex: 1,
              fontFamily: 'Chicago_12',
              fontSize: '14px',
              padding: '4px 8px'
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim() || !apiKey}
            className="btn"
          >
            {isLoading ? 'Stop' : 'Send'}
          </button>
          {isLoading && (
            <button
              type="button"
              onClick={cancelRequest}
              className="btn"
            >
              Cancel
            </button>
          )}
        </form>
      </div>

      {!apiKey && onApiKeyChange && (
        <div className="details-bar" style={{ fontSize: '11px', fontFamily: 'Geneva_9', justifyContent: 'center' }}>
          <span style={{ marginRight: '8px' }}>API Key:</span>
          <input
            type="password"
            placeholder="Enter API Key"
            value={apiKey || ''}
            onChange={(e) => onApiKeyChange(e.target.value)}
            style={{
              fontFamily: 'Chicago_12',
              fontSize: '12px',
              padding: '2px 6px',
              width: '200px'
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        /* Markdown styling for assistant messages */
        :global(.standard-dialog h1),
        :global(.standard-dialog h2),
        :global(.standard-dialog h3) {
          font-family: Chicago, Chicago_12, monospace;
          font-weight: bold;
          margin: 0.5em 0 0.3em 0;
        }

        :global(.standard-dialog h1) {
          font-size: 18px;
        }

        :global(.standard-dialog h2) {
          font-size: 16px;
        }

        :global(.standard-dialog h3) {
          font-size: 14px;
        }

        :global(.standard-dialog p) {
          margin: 0.5em 0;
        }

        :global(.standard-dialog ul),
        :global(.standard-dialog ol) {
          margin: 0.5em 0;
          padding-left: 2em;
        }

        :global(.standard-dialog li) {
          margin: 0.2em 0;
        }

        :global(.standard-dialog strong) {
          font-weight: bold;
        }

        :global(.standard-dialog em) {
          font-style: italic;
        }

        :global(.standard-dialog code) {
          font-family: Monaco, Courier, monospace;
          background: rgba(0, 0, 0, 0.05);
          padding: 0.1em 0.3em;
          border: 1px solid var(--tertiary);
        }

        :global(.standard-dialog pre) {
          font-family: Monaco, Courier, monospace;
          background: rgba(0, 0, 0, 0.05);
          padding: 0.5em;
          border: 1px solid var(--tertiary);
          overflow-x: auto;
          margin: 0.5em 0;
        }

        :global(.standard-dialog pre code) {
          background: none;
          border: none;
          padding: 0;
        }

        :global(.standard-dialog a) {
          color: #0000EE;
          text-decoration: underline;
        }

        :global(.standard-dialog a:visited) {
          color: #551A8B;
        }

        :global(.standard-dialog blockquote) {
          border-left: 3px solid var(--secondary);
          padding-left: 1em;
          margin: 0.5em 0;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
