import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/Layout';
import adminApi, { AdminApiError } from '../../lib/adminApi';

export default function RAGTestPage() {
  const [clients, setClients] = useState([]);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedKB, setSelectedKB] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchClients();
    fetchKnowledgeBases();
    loadHistory();
  }, []);

  const fetchClients = async () => {
    try {
      const data = await adminApi.clients.list();
      setClients(data.clients || []);
    } catch (error) {
      if (error instanceof AdminApiError) {
        console.error('Error fetching clients:', error.message);
        // 401 错误已经在 adminApi 中处理了，会自动跳转到登录页
      } else {
        console.error('Error fetching clients:', error);
      }
    }
  };

  const fetchKnowledgeBases = async () => {
    try {
      const data = await adminApi.knowledgeBases.list();
      setKnowledgeBases(data.knowledgeBases || []);
    } catch (error) {
      if (error instanceof AdminApiError) {
        console.error('Error fetching knowledge bases:', error.message);
        // 401 错误已经在 adminApi 中处理了，会自动跳转到登录页
      } else {
        console.error('Error fetching knowledge bases:', error);
      }
    }
  };

  const loadHistory = () => {
    const saved = localStorage.getItem('rag_test_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading history:', error);
      }
    }
  };

  const saveToHistory = (queryData) => {
    const newHistory = [queryData, ...history.slice(0, 9)]; // Keep last 10
    setHistory(newHistory);
    localStorage.setItem('rag_test_history', JSON.stringify(newHistory));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResponse(null);

    try {
      const requestBody = {
        query,
        ...(selectedClient && { clientId: selectedClient }),
        ...(selectedKB && { knowledgeBaseId: selectedKB }),
        options: {
          maxResults: 5,
          model: 'gpt-3.5-turbo',
          temperature: 0.1
        }
      };

      const data = await adminApi.rag.query(requestBody);
      setResponse(data);
      
      // Save to history
      const historyItem = {
        id: Date.now(),
        query,
        answer: data.answer,
        sources: data.sources,
        context: data.context,
        timestamp: new Date().toISOString(),
        clientId: selectedClient,
        knowledgeBaseId: selectedKB
      };
      saveToHistory(historyItem);
    } catch (error) {
      if (error instanceof AdminApiError) {
        console.error('Error querying RAG:', error.message);
        setResponse({
          error: error.message || 'Query failed'
        });
      } else {
        console.error('Error querying RAG:', error);
        setResponse({
          error: 'Network error occurred'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('rag_test_history');
  };

  const loadFromHistory = (item) => {
    setQuery(item.query);
    setSelectedClient(item.clientId || '');
    setSelectedKB(item.knowledgeBaseId || '');
    setResponse({
      query: item.query,
      answer: item.answer,
      sources: item.sources,
      context: item.context
    });
  };

  return (
    <AdminLayout title="RAG Testing">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RAG Testing</h1>
          <p className="mt-1 text-sm text-gray-600">
            Test RAG queries and responses across different knowledge bases
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Query Form */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Test Query</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Client (Optional)
                    </label>
                    <select
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                    >
                      <option value="">All clients / General</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Knowledge Base (Optional)
                    </label>
                    <select
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
                      value={selectedKB}
                      onChange={(e) => setSelectedKB(e.target.value)}
                    >
                      <option value="">All knowledge bases</option>
                      {knowledgeBases
                        .filter(kb => !selectedClient || kb.clientId === selectedClient || kb.type === 'general')
                        .map((kb) => (
                          <option key={kb.id} value={kb.id}>
                            {kb.name} ({kb.type})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Query
                  </label>
                  <textarea
                    required
                    rows="4"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
                    placeholder="Ask Cointext..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Submit Query'}
                </button>
              </form>

              {/* Response */}
              {response && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Response</h3>
                  
                  {response.error ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                      {response.error}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Answer:</h4>
                        <p className="text-gray-700 whitespace-pre-wrap">{response.answer}</p>
                      </div>
                      
                      {response.sources && response.sources.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Sources:</h4>
                          <div className="space-y-2">
                            {response.sources.map((source, index) => (
                              <div key={index} className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-blue-900">{source.filename}</p>
                                    <p className="text-sm text-blue-700">
                                      Knowledge Base: {source.knowledgeBase} ({source.type})
                                    </p>
                                  </div>
                                  <span className="text-sm text-blue-600">
                                    {Math.round(source.relevanceScore * 100)}% relevant
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {response.context && response.context.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Retrieved Context:</h4>
                          <div className="space-y-3">
                            {response.context.map((contextItem, index) => (
                              <div key={index} className="bg-yellow-50 p-4 rounded border-l-4 border-yellow-400">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="text-sm text-yellow-800">
                                    <p className="font-medium">
                                      {contextItem.metadata.original_name || contextItem.metadata.filename || `Context ${index + 1}`}
                                    </p>
                                    <p className="text-xs">
                                      KB: {contextItem.metadata.knowledgeBaseName} ({contextItem.metadata.knowledgeBaseType})
                                    </p>
                                  </div>
                                  <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                                    {Math.round((1 - contextItem.metadata.distance) * 100)}% match
                                  </span>
                                </div>
                                <div className="text-sm text-gray-700 bg-white p-3 rounded border max-h-32 overflow-y-auto">
                                  <pre className="whitespace-pre-wrap font-mono text-xs">{contextItem.content}</pre>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {response.metadata && (
                        <div className="text-sm text-gray-500">
                          <p>Searched {response.metadata.searchedKnowledgeBases} knowledge bases</p>
                          <p>Found {response.metadata.resultsFound} relevant results</p>
                          <p>Model: {response.metadata.model}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* History Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Query History</h2>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    Clear
                  </button>
                )}
              </div>
              
              {history.length === 0 ? (
                <p className="text-gray-500 text-sm">No queries yet</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded p-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => loadFromHistory(item)}
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.query}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                      {item.sources && (
                        <p className="text-xs text-blue-600 mt-1">
                          {item.sources.length} sources
                        </p>
                      )}
                      {item.context && (
                        <p className="text-xs text-yellow-600 mt-1">
                          {item.context.length} context chunks
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
