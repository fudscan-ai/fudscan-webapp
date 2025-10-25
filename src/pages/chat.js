import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ChevronDownIcon, ChevronUpIcon, ExclamationTriangleIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState(process.env.NEXT_PUBLIC_DEFAULT_API_KEY || '');
  const [currentWorkflow, setCurrentWorkflow] = useState(null);
  const [expandedSteps, setExpandedSteps] = useState({});
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (message) => {
    setMessages(prev => [...prev, message]);
  };

  const updateLastMessage = (updates) => {
    setMessages(prev => {
      const newMessages = [...prev];
      const lastIndex = newMessages.length - 1;
      if (lastIndex >= 0) {
        newMessages[lastIndex] = { ...newMessages[lastIndex], ...updates };
      }
      return newMessages;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !apiKey.trim() || isLoading) return;

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
    setCurrentWorkflow(null);

    try {
      abortControllerRef.current = new AbortController();

      const queryParams = new URLSearchParams({
        query: query,
        options: JSON.stringify({})
      });

      const response = await fetch(`/api/ai/ask?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Request failed');
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
            if (i + 1 < lines.length && lines[i + 1].startsWith('data: ')) {
              try {
                const data = JSON.parse(lines[i + 1].slice(6));
                handleStreamEvent(event, data);
              } catch (error) {
                console.error('Failed to parse event data:', error, lines[i + 1]);
              }
              i++;
            }
          }
        }
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        updateLastMessage({
          content: 'Request was cancelled.',
          isStreaming: false,
          error: true
        });
      } else {
        console.error('Chat error:', error);
        updateLastMessage({
          content: `Error: ${error.message}`,
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
    console.log('Stream event:', {event, data});

    switch (event) {
      case 'workflow_plan':
        setCurrentWorkflow(data);
        updateLastMessage({
          workflow: data,
          steps: []
        });
        break;

      case 'step_start':
        updateLastMessage(prev => ({
          steps: [...(prev.steps || []), {
            ...data,
            status: 'running',
            startTime: Date.now(),
            id: data.stepId || `${data.type}_${Date.now()}`,
            stepId: data.stepId,
            parameters: data.parameters || {},
            tools: data.tools || []
          }]
        }));
        break;

      case 'step_complete':
        updateLastMessage(prev => ({
          steps: (prev.steps || []).map(step => {
            if (step.stepId === data.stepId || step.id === data.stepId ||
                (step.type === data.stepType && data.stepType)) {
              const hasError = data.result?.error || (data.result?.output && Object.values(data.result.output).some(r => r.success === false));
              return {
                ...step,
                status: hasError ? 'error' : 'completed',
                result: data.result,
                endTime: Date.now(),
                latencyMs: data.latencyMs || data.result?.latencyMs,
                error: hasError ? (data.result?.error || 'API call failed') : null
              };
            }
            return step;
          })
        }));

        if (data.type === 'answer_generating' && data.result) {
          updateLastMessage({
            content: typeof data.result === 'string' ? data.result : data.result.output
          });
        }
        break;

      case 'tool_result':
        break;

      case 'citations':
        updateLastMessage(prev => ({
          citations: data
        }));
        break;

      case 'token':
        break;

      case 'done':
        updateLastMessage({
          isStreaming: false,
          latencyMs: data.latencyMs,
          conversationId: data.conversationId
        });
        setCurrentWorkflow(null);
        break;

      case 'error':
        updateLastMessage({
          content: `Error: ${data.message}`,
          isStreaming: false,
          error: true,
          errorDetails: data.details
        });
        setCurrentWorkflow(null);
        break;

      default:
        console.log('Unknown event:', event, data);
    }
  };

  const toggleStepExpansion = (messageId, stepId) => {
    const key = `${messageId}_${stepId}`;
    setExpandedSteps(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const cancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getStepIcon = (stepType, status) => {
    if (status === 'running') {
      return '⏳';
    }
    if (status === 'completed') {
      return '✓';
    }
    if (status === 'error') {
      return '✗';
    }
    return '◯';
  };

  const getStepName = (stepType, stepName) => {
    if (stepName) return stepName;

    const names = {
      'thinking': 'Analyzing Query',
      'rag_retrieving': 'Searching Knowledge',
      'api_calling': 'Calling Tools',
      'answer_generating': 'Generating Answer'
    };
    return names[stepType] || stepType;
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return null;
    const duration = endTime - startTime;
    return duration > 1000 ? `${(duration / 1000).toFixed(1)}s` : `${duration}ms`;
  };

  const getWorkflowProgress = (steps) => {
    if (!steps || steps.length === 0) return { completed: 0, total: 0, percentage: 0 };

    const completed = steps.filter(step => step.status === 'completed' || step.status === 'error').length;
    const total = steps.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return { completed, total, percentage };
  };

  const renderStepDetails = (step, messageId) => {
    const key = `${messageId}_${step.id}`;
    const isExpanded = expandedSteps[key];

    return (
      <div className="standard-dialog mt-2" style={{padding: '10px'}}>
        <button
          onClick={() => toggleStepExpansion(messageId, step.id)}
          className="btn mac-text-sm"
          style={{width: '100%', marginBottom: isExpanded ? '10px' : '0'}}
        >
          {isExpanded ? '▲ Hide Details' : '▼ View Details'}
        </button>

        {isExpanded && (
          <div style={{fontSize: '10px', lineHeight: '1.4'}}>
            {step.parameters && Object.keys(step.parameters).length > 0 && (
              <div style={{marginBottom: '10px'}}>
                <div style={{fontWeight: 'bold', marginBottom: '5px'}}>Parameters:</div>
                <pre className="standard-dialog" style={{padding: '5px', overflow: 'auto', fontSize: '9px'}}>
                  {JSON.stringify(step.parameters, null, 2)}
                </pre>
              </div>
            )}

            {step.tools && step.tools.length > 0 && (
              <div style={{marginBottom: '10px'}}>
                <div style={{fontWeight: 'bold', marginBottom: '5px'}}>Tools Used:</div>
                <div>
                  {step.tools.map((tool, idx) => (
                    <span key={idx} style={{marginRight: '5px', padding: '2px 5px', border: '1px solid', fontSize: '9px'}}>
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {step.result && (
              <div style={{marginBottom: '10px'}}>
                <div style={{fontWeight: 'bold', marginBottom: '5px'}}>Result:</div>
                {step.error ? (
                  <div className="standard-dialog" style={{padding: '5px', border: '2px solid'}}>
                    <div style={{fontSize: '9px'}}>ERROR: {step.error}</div>
                  </div>
                ) : (
                  <pre className="standard-dialog" style={{padding: '5px', overflow: 'auto', fontSize: '9px', maxHeight: '160px'}}>
                    {JSON.stringify(step.result, null, 2)}
                  </pre>
                )}
              </div>
            )}

            <div style={{fontSize: '9px'}}>
              Time: {step.latencyMs ? `${step.latencyMs}ms` : formatDuration(step.startTime, step.endTime) || 'N/A'}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMarkdownContent = (content) => {
    if (!content) return null;

    return (
      <ReactMarkdown
        className="markdown-content"
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          h1: ({children}) => <h1 style={{fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', marginTop: '12px'}}>{children}</h1>,
          h2: ({children}) => <h2 style={{fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', marginTop: '10px'}}>{children}</h2>,
          h3: ({children}) => <h3 style={{fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', marginTop: '8px'}}>{children}</h3>,
          p: ({children}) => <p style={{marginBottom: '8px', lineHeight: '1.5'}}>{children}</p>,
          ul: ({children}) => <ul style={{listStyleType: 'disc', listStylePosition: 'inside', marginBottom: '8px', paddingLeft: '12px'}}>{children}</ul>,
          ol: ({children}) => <ol style={{listStyleType: 'decimal', listStylePosition: 'inside', marginBottom: '8px', paddingLeft: '12px'}}>{children}</ol>,
          li: ({children}) => <li style={{marginBottom: '2px'}}>{children}</li>,
          code: ({inline, children}) =>
            inline ?
              <code style={{fontFamily: 'Monaco, Courier, monospace', fontSize: '11px', padding: '2px 4px', border: '1px solid'}}>{children}</code> :
              <code style={{display: 'block', fontFamily: 'Monaco, Courier, monospace', fontSize: '10px', padding: '8px', border: '2px solid', overflow: 'auto', marginBottom: '8px'}}>{children}</code>,
          pre: ({children}) => <pre style={{marginBottom: '8px'}}>{children}</pre>,
          blockquote: ({children}) => <blockquote style={{borderLeft: '4px solid', paddingLeft: '12px', marginBottom: '8px', fontStyle: 'italic'}}>{children}</blockquote>,
          a: ({href, children}) => <a href={href} style={{textDecoration: 'underline'}} target="_blank" rel="noopener noreferrer">{children}</a>,
          table: ({children}) => <table style={{width: '100%', border: '2px solid', marginBottom: '8px', borderCollapse: 'collapse'}}>{children}</table>,
          thead: ({children}) => <thead>{children}</thead>,
          tbody: ({children}) => <tbody>{children}</tbody>,
          tr: ({children}) => <tr style={{borderBottom: '1px solid'}}>{children}</tr>,
          th: ({children}) => <th style={{padding: '6px', textAlign: 'left', fontWeight: 'bold', borderRight: '1px solid'}}>{children}</th>,
          td: ({children}) => <td style={{padding: '6px', borderRight: '1px solid'}}>{children}</td>,
          hr: () => <hr style={{margin: '16px 0', borderTop: '2px solid'}} />,
          strong: ({children}) => <strong style={{fontWeight: 'bold'}}>{children}</strong>,
          em: ({children}) => <em style={{fontStyle: 'italic'}}>{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div className="mac-text" style={{minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '20px'}}>
      {/* Header Window */}
      <div className="window" style={{marginBottom: '20px'}}>
        <div className="title-bar">
          <button className="close" aria-label="Close"></button>
          <h1 className="title">FUDSCAN</h1>
          <button className="resize hidden" aria-label="Resize"></button>
        </div>
        <div className="separator"></div>
        <div className="modeless-dialog">
          <div style={{textAlign: 'center'}}>
            <div className="mac-heading" style={{marginBottom: '8px'}}>FUDScan: The Ultimate FOMO/FUD Risk Scanner</div>
            <div className="mac-text-sm">Turn every investor into a professional FUD-buster</div>
          </div>
          {isLoading && (
            <button
              onClick={cancelRequest}
              className="btn"
              style={{marginTop: '10px'}}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Messages Window */}
      <div className="window" style={{flex: 1, marginBottom: '20px', display: 'flex', flexDirection: 'column'}}>
        <div className="title-bar">
          <button className="close" aria-label="Close"></button>
          <h1 className="title">Chat</h1>
          <button className="resize" aria-label="Resize"></button>
        </div>
        <div className="separator"></div>

        <div className="window-pane" style={{flex: 1, overflowY: 'auto'}}>
          {messages.length === 0 && (
            <div style={{textAlign: 'center', padding: '40px 20px'}}>
              <div className="mac-text" style={{marginBottom: '10px'}}>Welcome to FUDScan</div>
              <div className="mac-text-sm">
                Drop any whitepaper, contract address, or project website.
                <br/>Get instant AI due diligence.
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} style={{marginBottom: '20px'}}>
              <div className="standard-dialog">
                {message.type === 'user' ? (
                  <div>
                    <div className="mac-text-sm" style={{fontWeight: 'bold', marginBottom: '5px'}}>YOU</div>
                    <div className="mac-text">{message.content}</div>
                    <div className="mac-text-sm" style={{marginTop: '5px', opacity: 0.7}}>{formatTimestamp(message.timestamp)}</div>
                  </div>
                ) : (
                  <div>
                    <div className="mac-text-sm" style={{fontWeight: 'bold', marginBottom: '5px'}}>FUDSCAN AI</div>

                    {/* Workflow Plan */}
                    {message.workflow && (
                      <div className="inner-border" style={{padding: '10px', marginBottom: '10px'}}>
                        <div className="mac-text-sm" style={{fontWeight: 'bold', marginBottom: '5px'}}>
                          Analysis Mode: {message.workflow.intent === 'DIRECT_ANSWER' ? 'Direct Answer' : 'Tool Enhanced'}
                        </div>
                        <div className="mac-text-sm" style={{marginBottom: '5px'}}>
                          Confidence: {(message.workflow.confidence * 100).toFixed(0)}%
                        </div>
                        <div className="mac-text-sm">
                          {message.workflow.reasoning}
                        </div>
                      </div>
                    )}

                    {/* Steps */}
                    {message.steps && message.steps.length > 0 && (
                      <div style={{marginBottom: '10px'}}>
                        {(() => {
                          const progress = getWorkflowProgress(message.steps);
                          return (
                            <div className="inner-border" style={{padding: '10px', marginBottom: '10px'}}>
                              <div className="mac-text-sm" style={{marginBottom: '5px'}}>
                                Progress: {progress.completed}/{progress.total} steps ({progress.percentage.toFixed(0)}%)
                              </div>
                              <div style={{height: '10px', border: '2px solid', position: 'relative'}}>
                                <div style={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  height: '100%',
                                  width: `${progress.percentage}%`,
                                  background: 'linear-gradient(45deg, var(--secondary) 25%, transparent 25%, transparent 75%, var(--secondary) 75%, var(--secondary)), linear-gradient(45deg, var(--secondary) 25%, transparent 25%, transparent 75%, var(--secondary) 75%, var(--secondary))',
                                  backgroundSize: '4px 4px',
                                  backgroundPosition: '0 0, 2px 2px'
                                }}></div>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="mac-text-sm" style={{fontWeight: 'bold', marginBottom: '5px'}}>Execution Steps:</div>
                        {message.steps.map((step, index) => (
                          <div key={index} className="standard-dialog" style={{marginBottom: '10px', padding: '8px'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                              <div className="mac-text-sm">
                                <span style={{marginRight: '5px'}}>{getStepIcon(step.type, step.status)}</span>
                                {getStepName(step.type, step.name)}
                                {step.status === 'running' && <span> (running...)</span>}
                              </div>
                              <div className="mac-text-sm">
                                {step.latencyMs && `${step.latencyMs}ms`}
                                {step.status === 'completed' && ' ✓'}
                                {step.status === 'error' && ' ✗'}
                              </div>
                            </div>

                            {step.error && (
                              <div className="standard-dialog" style={{marginTop: '5px', padding: '5px', border: '2px solid'}}>
                                <div className="mac-text-sm">ERROR: {step.error}</div>
                              </div>
                            )}

                            {(step.parameters || step.tools || step.result) && renderStepDetails(step, message.id)}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Content */}
                    <div className="mac-text">
                      {message.error ? (
                        <div className="standard-dialog" style={{padding: '10px', border: '2px solid'}}>
                          <div className="mac-text-sm" style={{fontWeight: 'bold', marginBottom: '5px'}}>ERROR</div>
                          <div className="mac-text">{message.content}</div>
                        </div>
                      ) : (
                        <div>
                          {message.content ? (
                            <div>
                              {renderMarkdownContent(message.content)}
                              {message.isStreaming && (
                                <span style={{display: 'inline-block', width: '8px', height: '12px', backgroundColor: 'var(--secondary)', marginLeft: '2px', animation: 'blink 1s infinite'}} />
                              )}
                            </div>
                          ) : message.isStreaming ? (
                            <div className="mac-text-sm">Processing...</div>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* Citations */}
                    {message.citations && message.citations.length > 0 && (
                      <div className="standard-dialog" style={{marginTop: '10px', padding: '8px'}}>
                        <div className="mac-text-sm" style={{fontWeight: 'bold', marginBottom: '5px'}}>References:</div>
                        {message.citations.map((citation, index) => (
                          <div key={index} className="mac-text-sm">• {citation.filename || citation.source}</div>
                        ))}
                      </div>
                    )}

                    <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '10px'}}>
                      <div className="mac-text-sm" style={{opacity: 0.7}}>{formatTimestamp(message.timestamp)}</div>
                      {message.latencyMs && (
                        <div className="mac-text-sm">Response: {message.latencyMs}ms</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Window */}
      <div className="window">
        <div className="title-bar">
          <button className="close" aria-label="Close"></button>
          <h1 className="title">Input</h1>
          <button className="resize hidden" aria-label="Resize"></button>
        </div>
        <div className="separator"></div>

        <div className="modeless-dialog">
          <form onSubmit={handleSubmit}>
            <div className="field-row" style={{marginBottom: '10px'}}>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask FUDSCAN..."
                disabled={isLoading || !apiKey}
                style={{flex: 1, padding: '5px', fontFamily: 'Chicago_12, Monaco, monospace'}}
              />
            </div>

            <div className="field-row">
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim() || !apiKey}
                className="btn-default"
              >
                {isLoading ? 'Processing...' : 'Scan'}
              </button>
            </div>
          </form>

          {!apiKey && (
            <div className="mac-text-sm" style={{marginTop: '10px', textAlign: 'center'}}>
              Please set API key in environment variables
            </div>
          )}

          <div className="mac-text-sm" style={{marginTop: '10px', textAlign: 'center'}}>
            Scan whitepapers, contracts, and teams for risk and red flags
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
