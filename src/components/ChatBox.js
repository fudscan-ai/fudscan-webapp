import { useState, useRef, useEffect } from 'react';

export default function ChatBox({ 
  apiKey, 
  onApiKeyChange, 
  className = "",
  placeholder = "输入你的问题...",
  height = "600px" 
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, apiKey, options: {} }),
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
      if (error.name !== 'AbortError') {
        console.error('Chat error:', error);
        updateLastMessage({
          content: `错误: ${error.message}`,
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
          steps: [...(prev.steps || []), { 
            ...data, 
            status: 'running', 
            startTime: Date.now(),
            id: data.stepId || `${data.type}_${Date.now()}`
          }]
        }));
        break;

      case 'step_complete':
        updateLastMessage(prev => ({
          steps: (prev.steps || []).map(step => 
            (step.stepId === data.stepId || step.id === data.stepId || step.type === data.type)
              ? { ...step, status: 'completed', result: data.result, endTime: Date.now() }
              : step
          )
        }));

        // If this is the answer generating step, extract the answer
        if (data.type === 'answer_generating' && data.result?.output) {
          updateLastMessage({ content: data.result.output });
        }
        break;

      case 'done':
        updateLastMessage({
          isStreaming: false,
          latencyMs: data.latencyMs,
          conversationId: data.conversationId
        });
        break;

      case 'error':
        updateLastMessage({
          content: `错误: ${data.message}`,
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

  const getStepName = (stepType) => {
    const names = {
      'thinking': '🤔 分析中',
      'rag_retrieving': '📚 搜索',
      'api_calling': '🔧 调用工具',
      'answer_generating': '✍️ 生成回答'
    };
    return names[stepType] || stepType;
  };

  return (
    <div className={`flex flex-col bg-white rounded-lg shadow-lg ${className}`} style={{ height }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
        <h3 className="font-medium text-gray-900">AI Assistant</h3>
        {onApiKeyChange && (
          <input
            type="password"
            placeholder="API Key"
            value={apiKey || ''}
            onChange={(e) => onApiKeyChange(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        )}
        {isLoading && (
          <button
            onClick={cancelRequest}
            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            取消
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8">
            <div className="mb-2">开始与AI助手对话</div>
            <div className="text-xs text-gray-400">
              支持Web3分析、价格查询、钱包分析等
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${
              message.type === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-900'
            }`}>
              {message.type === 'user' ? (
                <div className="text-sm">{message.content}</div>
              ) : (
                <div>
                  {/* Workflow indicator */}
                  {message.workflow && (
                    <div className="mb-2 p-2 bg-blue-50 rounded text-xs">
                      <span className="font-medium">
                        {message.workflow.intent === 'DIRECT_ANSWER' ? '直接回答' : '工具增强'}
                      </span>
                      <span className="ml-2 text-gray-600">
                        ({(message.workflow.confidence * 100).toFixed(0)}%)
                      </span>
                    </div>
                  )}

                  {/* Steps */}
                  {message.steps && message.steps.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {message.steps.map((step, index) => (
                        <div key={index} className="flex items-center text-xs">
                          {getStepIcon(step.type, step.status)}
                          <span className={step.status === 'completed' ? 'text-green-700' : 'text-gray-600'}>
                            {getStepName(step.type)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Content */}
                  <div className="text-sm">
                    {message.content || (message.isStreaming ? '处理中...' : '')}
                    {message.isStreaming && (
                      <span className="inline-block w-1 h-4 bg-blue-600 ml-1 animate-pulse" />
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="text-xs text-gray-500 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                    {message.latencyMs && ` • ${message.latencyMs}ms`}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-gray-50 rounded-b-lg">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading || !apiKey}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim() || !apiKey}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              '发送'
            )}
          </button>
        </form>
        
        {!apiKey && (
          <div className="mt-2 text-xs text-amber-600">
            请先设置API Key
          </div>
        )}
      </div>
    </div>
  );
}
