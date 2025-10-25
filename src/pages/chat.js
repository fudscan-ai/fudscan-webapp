import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ChevronDownIcon, ChevronUpIcon, ExclamationTriangleIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import WalletConnectButton from '@/components/WalletConnectButton';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
    if (!inputValue.trim() || isLoading) return;

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
      isStreaming: true
    };

    addMessage(userMessage);
    addMessage(assistantMessage);

    const query = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      abortControllerRef.current = new AbortController();

      // Build conversation history (last 5 messages for context)
      const conversationHistory = messages.slice(-10).map(msg => ({
        type: msg.type,
        content: msg.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: query,
          conversationHistory: conversationHistory
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Request failed');
      }

      const data = await response.json();

      console.log('✅ Received from API:', data);

      // Backend now properly extracts the message, just use it directly
      const messageContent = data.message || '⚠️ No message received from server.';

      console.log('📝 Displaying message:', messageContent);

      updateLastMessage({
        content: messageContent,
        intent: data.intent,
        coin: data.coin,
        isStreaming: false
      });

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
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({children}) => <div style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', marginTop: '20px'}}>{children}</div>,
          h2: ({children}) => <div style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '14px', marginTop: '18px'}}>{children}</div>,
          h3: ({children}) => <div style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', marginTop: '16px'}}>{children}</div>,
          p: ({children}) => <div style={{fontSize: '16px', marginBottom: '16px', lineHeight: '1.7'}}>{children}</div>,
          ul: ({children}) => <ul style={{fontSize: '16px', marginBottom: '16px', paddingLeft: '20px', lineHeight: '1.7'}}>{children}</ul>,
          ol: ({children}) => <ol style={{fontSize: '16px', marginBottom: '16px', paddingLeft: '20px', lineHeight: '1.7'}}>{children}</ol>,
          li: ({children}) => <li style={{marginBottom: '8px'}}>{children}</li>,
          code: ({inline, children}) =>
            inline ?
              <code style={{fontFamily: 'Monaco, Courier, monospace', fontSize: '15px', padding: '2px 6px', backgroundColor: 'rgba(0,0,0,0.1)'}}>{children}</code> :
              <code style={{display: 'block', fontFamily: 'Monaco, Courier, monospace', fontSize: '15px', padding: '16px', backgroundColor: 'rgba(0,0,0,0.05)', overflow: 'auto', marginBottom: '16px', lineHeight: '1.5'}}>{children}</code>,
          pre: ({children}) => <pre style={{marginBottom: '16px'}}>{children}</pre>,
          blockquote: ({children}) => <div style={{fontSize: '16px', paddingLeft: '16px', marginBottom: '16px', opacity: 0.9}}>{children}</div>,
          a: ({href, children}) => <a href={href} style={{fontSize: '16px', textDecoration: 'underline'}} target="_blank" rel="noopener noreferrer">{children}</a>,
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
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{textAlign: 'center', flex: 1}}>
              <div className="mac-heading" style={{marginBottom: '8px'}}>FUDScan: The Ultimate FOMO/FUD Risk Scanner</div>
              <div className="mac-text-sm">Turn every investor into a professional FUD-buster</div>
            </div>
            <div style={{marginLeft: '20px'}}>
              <WalletConnectButton />
            </div>
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
            <div style={{textAlign: 'center', padding: '80px 40px', maxWidth: '800px', margin: '0 auto'}}>
              <div style={{fontSize: '32px', fontWeight: 'bold', marginBottom: '24px', lineHeight: '1.3'}}>
                Welcome to FUDScan
              </div>
              <div style={{fontSize: '20px', lineHeight: '1.8', opacity: 0.8}}>
                Drop any whitepaper, contract address, or project website.
                <br/>
                Get instant AI due diligence.
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} style={{marginBottom: '30px', padding: '20px', backgroundColor: message.type === 'assistant' ? 'rgba(0,0,0,0.02)' : 'transparent'}}>
              {message.type === 'user' ? (
                <div>
                  <div style={{fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', opacity: 0.6}}>YOU</div>
                  <div style={{fontSize: '16px', lineHeight: '1.6'}}>{message.content}</div>
                  <div style={{fontSize: '12px', marginTop: '10px', opacity: 0.5}}>{formatTimestamp(message.timestamp)}</div>
                </div>
              ) : (
                <div>
                  <div style={{fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', opacity: 0.6}}>FUDSCAN AI</div>

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
                    <div style={{fontSize: '16px'}}>
                      {message.error ? (
                        <div style={{padding: '16px', backgroundColor: 'rgba(255,0,0,0.1)', marginBottom: '16px'}}>
                          <div style={{fontSize: '14px', fontWeight: 'bold', marginBottom: '8px'}}>ERROR</div>
                          <div style={{fontSize: '16px'}}>{message.content}</div>
                        </div>
                      ) : (
                        <div>
                          {message.content ? (
                            <div>
                              {renderMarkdownContent(message.content)}
                              {message.isStreaming && (
                                <span style={{display: 'inline-block', width: '10px', height: '18px', backgroundColor: '#000', marginLeft: '4px', animation: 'blink 1s infinite'}} />
                              )}
                            </div>
                          ) : message.isStreaming ? (
                            <div style={{fontSize: '16px', opacity: 0.6}}>Processing...</div>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* Citations */}
                    {message.citations && message.citations.length > 0 && (
                      <div style={{marginTop: '20px', padding: '12px', backgroundColor: 'rgba(0,0,0,0.03)'}}>
                        <div style={{fontSize: '14px', fontWeight: 'bold', marginBottom: '8px'}}>References:</div>
                        {message.citations.map((citation, index) => (
                          <div key={index} style={{fontSize: '14px', marginBottom: '4px'}}>• {citation.filename || citation.source}</div>
                        ))}
                      </div>
                    )}

                    <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '12px', opacity: 0.5}}>
                      <div>{formatTimestamp(message.timestamp)}</div>
                      {message.latencyMs && (
                        <div>Response: {message.latencyMs}ms</div>
                      )}
                    </div>
                  </div>
                )}
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
                disabled={isLoading}
                style={{flex: 1, padding: '5px', fontFamily: 'Chicago_12, Monaco, monospace'}}
              />
            </div>

            <div className="field-row">
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="btn-default"
              >
                {isLoading ? 'Processing...' : 'Scan'}
              </button>
            </div>
          </form>

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
