import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ChevronRightIcon, PaperAirplaneIcon, ChevronDownIcon, ChevronUpIcon, ExclamationTriangleIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
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
      // Create AbortController for this request
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
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

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
    console.log('Stream event:', {event, data}); // Debug log
    
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

        // If this is the answer generating step, extract the answer
        if (data.type === 'answer_generating' && data.result) {
          updateLastMessage({
            content: typeof data.result === 'string' ? data.result : data.result.output
          });
        }
        break;

      case 'tool_result':
        // Handle individual tool results if needed
        break;

      case 'citations':
        updateLastMessage(prev => ({
          citations: data
        }));
        break;

      case 'token':
        // This would be for streaming text tokens, but our current implementation
        // sends complete answers in step_complete
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
    const baseClasses = "w-4 h-4 mr-2";
    
    if (status === 'running') {
      return <div className={`${baseClasses} animate-spin rounded-full border-2 border-blue-500 border-t-transparent`} />;
    }
    
    if (status === 'completed') {
      return <CheckCircleIcon className={`${baseClasses} text-green-500`} />;
    }
    
    if (status === 'error') {
      return <ExclamationTriangleIcon className={`${baseClasses} text-red-500`} />;
    }
    
    return <ClockIcon className={`${baseClasses} text-gray-400`} />;
  };

  const getStepName = (stepType, stepName) => {
    if (stepName) return stepName;
    
    const names = {
      'thinking': '🤔 Analyzing Query Intent',
      'rag_retrieving': '📚 Searching Knowledge Base',
      'api_calling': '🔧 Calling External Tools',
      'answer_generating': '✍️ Generating Answer'
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
      <div className="nes-container is-dark mt-2">
        <button
          onClick={() => toggleStepExpansion(messageId, step.id)}
          className="nes-btn is-normal w-full pixel-text-sm"
        >
          <span>VIEW DETAILS</span>
          {isExpanded ? <ChevronUpIcon className="w-4 h-4 ml-2" /> : <ChevronDownIcon className="w-4 h-4 ml-2" />}
        </button>
        
        {isExpanded && (
          <div className="p-3 space-y-2">
            {/* Step Parameters */}
            {step.parameters && Object.keys(step.parameters).length > 0 && (
              <div>
                <div className="pixel-text-sm text-yellow-400 mb-1">PARAMETERS:</div>
                <pre className="nes-container is-dark pixel-text-sm text-white overflow-x-auto">
                  {JSON.stringify(step.parameters, null, 2)}
                </pre>
              </div>
            )}
            
            {/* Tools Used */}
            {step.tools && step.tools.length > 0 && (
              <div>
                <div className="pixel-text-sm text-yellow-400 mb-1">TOOLS USED:</div>
                <div className="flex flex-wrap gap-1">
                  {step.tools.map((tool, idx) => (
                    <span key={idx} className="nes-badge is-primary">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Step Result */}
            {step.result && (
              <div>
                <div className="pixel-text-sm text-yellow-400 mb-1">RESULT:</div>
                {step.error ? (
                  <div className="nes-container is-error">
                    <div className="pixel-text-sm text-white">ERROR:</div>
                    <div className="pixel-text-sm text-red-300">{step.error}</div>
                  </div>
                ) : (
                  <pre className="nes-container is-dark pixel-text-sm text-white overflow-x-auto max-h-40">
                    {JSON.stringify(step.result, null, 2)}
                  </pre>
                )}
              </div>
            )}
            
            {/* Timing */}
            <div className="flex items-center justify-between">
              <span className="pixel-text-sm text-gray-400">TIME: {step.latencyMs ? `${step.latencyMs}ms` : formatDuration(step.startTime, step.endTime) || 'N/A'}</span>
              {step.startTime && (
                <span className="pixel-text-sm text-gray-400">START: {new Date(step.startTime).toLocaleTimeString()}</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWorkflowTimeline = (steps) => {
    if (!steps || steps.length === 0) return null;
    
    return (
      <div className="nes-container is-warning with-title mb-4">
        <p className="title">TIMELINE</p>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-600"></div>
          
          {steps.map((step, index) => (
            <div key={index} className="relative flex items-start mb-4 last:mb-0">
              {/* Timeline dot */}
              <div className={`relative z-10 w-8 h-8 flex items-center justify-center pixel-text-sm ${
                step.status === 'completed' ? 'nes-badge is-success' :
                step.status === 'error' ? 'nes-badge is-error' :
                step.status === 'running' ? 'nes-badge is-primary animate-pulse' :
                'nes-badge'
              }`}>
                {index + 1}
              </div>
              
              {/* Step content */}
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <div className={`pixel-text-sm ${
                    step.status === 'completed' ? 'text-green-400' :
                    step.status === 'error' ? 'text-red-400' :
                    step.status === 'running' ? 'text-blue-400' :
                    'text-white'
                  }`}>
                    {getStepName(step.type, step.name)}
                  </div>
                  <div className="pixel-text-sm text-gray-400">
                    {step.latencyMs ? `${step.latencyMs}ms` : 
                     step.startTime ? formatDuration(step.startTime, step.endTime) || 'IN PROGRESS...' : ''}
                  </div>
                </div>
                
                {step.error && (
                  <div className="mt-1 pixel-text-sm text-red-400">
                    {step.error}
                  </div>
                )}
                
                {step.tools && step.tools.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {step.tools.map((tool, idx) => (
                      <span key={idx} className="nes-badge is-normal">
                        {tool}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMarkdownContent = (content) => {
    if (!content) return null;
    
    return (
      <ReactMarkdown
        // className="markdown-content"
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          // Custom components for better styling
          h1: ({children}) => <h1 className="text-xl font-bold text-gray-200 mb-3 mt-4 first:mt-0">{children}</h1>,
          h2: ({children}) => <h2 className="text-lg font-semibold text-gray-200 mb-2 mt-3">{children}</h2>,
          h3: ({children}) => <h3 className="text-base font-medium text-gray-200 mb-2 mt-3">{children}</h3>,
          h4: ({children}) => <h4 className="text-sm font-medium text-gray-200 mb-2 mt-2">{children}</h4>,
          p: ({children}) => <p className="text-gray-300 mb-3 leading-relaxed">{children}</p>,
          ul: ({children}) => <ul className="list-disc list-inside mb-3 space-y-1 pl-4">{children}</ul>,
          ol: ({children}) => <ol className="list-decimal list-inside mb-3 space-y-1 pl-4">{children}</ol>,
          li: ({children}) => <li className="text-gray-300">{children}</li>,
          code: ({inline, children}) => 
            inline ? 
              <code className="bg-gray-800/40 text-pink-400 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code> :
              <code className="block bg-gray-800/30 p-3 rounded border border-gray-700 text-sm font-mono overflow-x-auto whitespace-pre text-gray-300">{children}</code>,
          pre: ({children}) => <pre className="bg-gray-800/30 p-3 rounded border border-gray-700 overflow-x-auto mb-3 text-gray-300">{children}</pre>,
          blockquote: ({children}) => <blockquote className="border-l-4 border-blue-500 bg-blue-900/20 pl-4 py-3 mb-3 italic text-gray-300">{children}</blockquote>,
          a: ({href, children}) => <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
          table: ({children}) => <table className="min-w-full border border-gray-600 mb-3 rounded overflow-hidden">{children}</table>,
          thead: ({children}) => <thead className="bg-gray-800/40">{children}</thead>,
          tbody: ({children}) => <tbody>{children}</tbody>,
          tr: ({children}) => <tr className="border-b border-gray-600">{children}</tr>,
          th: ({children}) => <th className="px-4 py-2 text-left font-medium text-gray-200 border-r border-gray-600 last:border-r-0">{children}</th>,
          td: ({children}) => <td className="px-4 py-2 text-gray-300 border-r border-gray-600 last:border-r-0">{children}</td>,
          hr: ({children}) => <hr className="my-6 border-gray-600" />,
          img: ({src, alt}) => <Image src={src} alt={alt || ''} width={800} height={600} className="max-w-full h-auto my-3 rounded" style={{width: 'auto', height: 'auto'}} />,
          strong: ({children}) => <strong className="font-semibold text-gray-200">{children}</strong>,
          em: ({children}) => <em className="italic">{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col pixel-text">
      {/* Header */}
      <div className="nes-container is-dark with-title mb-4">
        <p className="title">COINTEXT</p>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-white">
            <div className="pixel-text-lg">COINTEXT</div>
            <div className="pixel-text-sm text-gray-300 mt-2">Context for every coin</div>
          </div>
          <div className="flex items-center space-x-4">
            <input
              type="password"
              placeholder="API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{
                display: "none"
              }}
              className="nes-input is-dark pixel-text-sm"
            />
            {isLoading && (
              <button
                onClick={cancelRequest}
                className="nes-btn is-error pixel-text-sm"
              >
                CANCEL
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="nes-container is-dark with-title text-center">
              <p className="title">WELCOME</p>
              <div className="pixel-text text-white mb-4">The knowledge base for every chain, every platform.</div>
              <div className="pixel-text-sm text-gray-300">
                Real-time intelligence with institutional-grade precision.
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl ${message.type === 'user' ? 'nes-container is-primary' : 'nes-container is-dark'}`}>
                {message.type === 'user' ? (
                  <div>
                    <div className="pixel-text-sm text-white mb-2">YOU</div>
                    <div className="pixel-text text-white">{message.content}</div>
                    <div className="pixel-text-sm opacity-75 mt-2">{formatTimestamp(message.timestamp)}</div>
                  </div>
                ) : (
                  <div>
                    <div className="pixel-text-sm text-white mb-2">COINTEXT</div>
                    
                    {/* Workflow Plan */}
                    {message.workflow && (
                      <div className="nes-container is-primary with-title mb-4">
                        <p className="title">THINKING</p>
                        <div className="flex items-center mb-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                          <div className="pixel-text-sm text-white">
                            Process: {message.workflow.intent === 'DIRECT_ANSWER' ? 'DIRECT ANSWER' : 'TOOL ENHANCED'}
                          </div>
                        </div>
                        <div className="pixel-text-sm text-white mb-2">
                          <span className="text-yellow-400">CONFIDENCE:</span> {(message.workflow.confidence * 100).toFixed(1)}%
                        </div>
                        <div className="nes-container is-dark pixel-text-sm text-white">
                          <span className="text-yellow-400">REASONING:</span> {message.workflow.reasoning}
                        </div>
                        {message.workflow.workflow && message.workflow.workflow.steps && (
                          <div className="mt-3">
                            <div className="pixel-text-sm text-yellow-400 mb-2">PLANNED STEPS:</div>
                            <div className="space-y-1">
                              {message.workflow.workflow.steps.map((step, idx) => (
                                <div key={idx} className="pixel-text-sm text-white flex items-center">
                                  <span className="nes-badge is-primary mr-2">
                                    {idx + 1}
                                  </span>
                                  {step.name || getStepName(step.type)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Workflow Steps */}
                    {message.steps && message.steps.length > 0 && (
                      <div className="mb-4">
                        {/* Progress Indicator */}
                        {(() => {
                          const progress = getWorkflowProgress(message.steps);
                          return (
                            <div className="nes-container is-success with-title mb-4">
                              <p className="title">PROGRESS</p>
                              <div className="flex items-center justify-between mb-2">
                                <div className="pixel-text-sm text-white">
                                  EXECUTION: {progress.completed}/{progress.total} STEPS
                                </div>
                                <div className="pixel-text-sm text-green-400">
                                  {progress.percentage.toFixed(0)}% DONE
                                </div>
                              </div>
                              <progress className="nes-progress is-success" value={progress.percentage} max="100"></progress>
                            </div>
                          );
                        })()}

                        {/* Timeline View */}
                        {renderWorkflowTimeline(message.steps)}
                        
                        {/* Detailed Steps */}
                        <div className="pixel-text-sm text-yellow-400 mb-3">DETAILED EXECUTION STEPS:</div>
                        <div className="space-y-3">
                          {message.steps.map((step, index) => (
                            <div key={index} className="nes-container is-dark">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  {getStepIcon(step.type, step.status)}
                                  <span className={`pixel-text-sm ${
                                    step.status === 'completed' ? 'text-green-400' : 
                                    step.status === 'error' ? 'text-red-400' :
                                    step.status === 'running' ? 'text-blue-400' : 'text-white'
                                  }`}>
                                    {getStepName(step.type, step.name)}
                                  </span>
                                  {step.status === 'running' && (
                                    <span className="ml-2 pixel-text-sm text-blue-400 animate-pulse">EXECUTING...</span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  {step.latencyMs && (
                                    <span className="pixel-text-sm text-gray-400">{step.latencyMs}ms</span>
                                  )}
                                  {step.status === 'completed' && (
                                    <span className="nes-badge is-success">OK</span>
                                  )}
                                  {step.status === 'error' && (
                                    <span className="nes-badge is-error">ERR</span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Error Display */}
                              {step.error && (
                                <div className="nes-container is-error mt-2">
                                  <div className="pixel-text-sm text-white">EXECUTION FAILED:</div>
                                  <div className="pixel-text-sm mt-1 text-red-300">{step.error}</div>
                                </div>
                              )}
                              
                              {/* Step Details */}
                              {(step.parameters || step.tools || step.result) && renderStepDetails(step, message.id)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Answer Content */}
                    <div className="text-white">
                      {message.error ? (
                        <div className="nes-container is-error with-title">
                          <p className="title">ERROR</p>
                          <div className="flex items-center mb-2">
                            <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                            <span className="pixel-text-sm text-white">PROCESSING FAILED</span>
                          </div>
                          <div className="pixel-text text-white">{message.content}</div>
                          {message.errorDetails && (
                            <details className="mt-2">
                              <summary className="pixel-text-sm text-red-300 cursor-pointer">VIEW DETAILED ERROR INFO</summary>
                              <pre className="mt-1 nes-container is-dark pixel-text-sm text-white overflow-x-auto">
                                {message.errorDetails}
                              </pre>
                            </details>
                          )}
                        </div>
                      ) : (
                        <div>
                          {message.content ? (
                            <div className="nes-container is-dark">
                              <div className="pixel-text text-white">
                                {renderMarkdownContent(message.content)}
                                {message.isStreaming && (
                                  <span className="inline-block w-2 h-5 bg-blue-400 ml-1 animate-pulse" />
                                )}
                              </div>
                            </div>
                          ) : message.isStreaming ? (
                            <div className="nes-container is-primary">
                              <div className="flex items-center text-white">
                                <div className="w-1 h-4 bg-white mr-2 animate-pulse"></div>
                                <span className="pixel-text-sm">GENERATING ANSWER...</span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* Citations */}
                    {message.citations && message.citations.length > 0 && (
                      <div className="nes-container is-warning with-title mt-3">
                        <p className="title">REFERENCES</p>
                        {message.citations.map((citation, index) => (
                          <div key={index} className="pixel-text-sm text-white">
                            • {citation.filename || citation.source}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="pixel-text-sm text-gray-400">{formatTimestamp(message.timestamp)}</div>
                      {message.latencyMs && (
                        <div className="pixel-text-sm text-green-400">RESPONSE: {message.latencyMs}ms</div>
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

      {/* Input */}
      <div className="nes-container is-dark with-title px-6 py-4">
        <p className="title">INPUT</p>
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="ASK COINTEXT..."
              disabled={isLoading || !apiKey}
              className="nes-input is-dark flex-1 pixel-text"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim() || !apiKey}
              className="nes-btn is-primary pixel-text-sm"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "SEND"
              )}
            </button>
          </form>
          
          {!apiKey && (
            <div className="nes-text is-warning pixel-text-sm mt-2">
              PLEASE ENTER API KEY TO START CHATTING
            </div>
          )}
          
          <div className="pixel-text-sm text-gray-400 mt-2">
            POWERING AIBRK, FUDCAN, VIRTUALS, BASE, BSC, ALGORAND — AND BEYOND. TRY: &quot;WHAT&apos;S TRENDING ON VIRTUALS TODAY?&quot;
          </div>
        </div>
      </div>
    </div>
  );
}
