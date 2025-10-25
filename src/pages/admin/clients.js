import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/Layout';
import adminApi, { AdminApiError } from '../../lib/adminApi';
import toast from '../../lib/toast';
import confirm from '../../lib/confirm';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [showApiToolsModal, setShowApiToolsModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchClients();
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
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingClient) {
        await adminApi.clients.update(editingClient.id, formData);
        toast.success('Client updated successfully!');
      } else {
        await adminApi.clients.create(formData);
        toast.success('Client created successfully!');
      }
      
      setShowModal(false);
      setEditingClient(null);
      setFormData({ name: '', description: '' });
      fetchClients();
    } catch (error) {
      if (error instanceof AdminApiError) {
        console.error('Error saving client:', error.message);
        toast.error(`Failed to save client: ${error.message}`);
      } else {
        console.error('Error saving client:', error);
        toast.error('Failed to save client. Please try again.');
      }
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      description: client.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (clientId) => {
    const confirmed = await confirm.danger(
      'This action cannot be undone. All associated data will be permanently removed.',
      'Delete Client'
    );
    
    if (!confirmed) return;
    
    try {
      await adminApi.clients.delete(clientId);
      toast.success('Client deleted successfully!');
      fetchClients();
    } catch (error) {
      if (error instanceof AdminApiError) {
        console.error('Error deleting client:', error.message);
        toast.error(`Failed to delete client: ${error.message}`);
      } else {
        console.error('Error deleting client:', error);
        toast.error('Failed to delete client. Please try again.');
      }
    }
  };

  const copyApiKey = async (apiKey) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(apiKey);
        toast.success('API Key copied to clipboard!');
      } else {
        // Fallback for older browsers or non-HTTPS contexts
        const textArea = document.createElement('textarea');
        textArea.value = apiKey;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('API Key copied to clipboard!');
      }
    } catch (error) {
      console.error('Failed to copy API key:', error);
      toast.error('Failed to copy API key. Please copy manually.');
    }
  };

  const handleManageApiTools = (client) => {
    setSelectedClient(client);
    setShowApiToolsModal(true);
  };

  return (
    <AdminLayout title="Clients">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage client accounts and API keys
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Add Client
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {clients.map((client) => (
                <li key={client.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {client.name}
                        </h3>
                        {client.description && (
                          <p className="mt-1 text-sm text-gray-600">
                            {client.description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center space-x-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            client.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {client.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {client.knowledgeBases?.length || 0} knowledge bases
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">API Key:</span>
                            <code className="bg-gray-800 text-gray-100 px-2 py-1 rounded text-sm font-mono">
                              {client.apiKey.substring(0, 8)}...
                            </code>
                            <button
                              onClick={() => copyApiKey(client.apiKey)}
                              className="text-indigo-600 hover:text-indigo-900 text-sm"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleManageApiTools(client)}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          API Tools
                        </button>
                        <button
                          onClick={() => handleEdit(client)}
                          className="text-indigo-600 hover:text-indigo-900 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingClient ? 'Edit Client' : 'Add New Client'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Enter client name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      rows="3"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Enter client description (optional)"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingClient(null);
                        setFormData({ name: '', description: '' });
                      }}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md text-sm border border-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm"
                    >
                      {editingClient ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* API Tools Modal */}
        {showApiToolsModal && selectedClient && (
          <ApiToolsModal
            client={selectedClient}
            onClose={() => {
              setShowApiToolsModal(false);
              setSelectedClient(null);
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}

// API Tools Management Modal Component
function ApiToolsModal({ client, onClose }) {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClientApiTools = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/clients/${client.id}/api-tools`);
      const data = await response.json();
      setTools(data.tools || []);
    } catch (error) {
      console.error('Error fetching client API tools:', error);
      toast.error('Failed to load API tools');
    } finally {
      setLoading(false);
    }
  }, [client.id]);

  useEffect(() => {
    fetchClientApiTools();
  }, [fetchClientApiTools]);

  const handleToggleAssignment = async (tool) => {
    try {
      if (tool.isAssigned) {
        // Remove assignment
        const response = await fetch(`/api/admin/clients/${client.id}/api-tools?apiToolId=${tool.id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          toast.success('API tool removed from client');
          fetchClientApiTools();
        }
      } else {
        // Add assignment
        const response = await fetch(`/api/admin/clients/${client.id}/api-tools`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiToolId: tool.id })
        });
        if (response.ok) {
          toast.success('API tool assigned to client');
          fetchClientApiTools();
        }
      }
    } catch (error) {
      console.error('Error toggling API tool assignment:', error);
      toast.error('Failed to update API tool assignment');
    }
  };

  const handleToggleEnabled = async (tool) => {
    try {
      const response = await fetch(`/api/admin/clients/${client.id}/api-tools`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          apiToolId: tool.id, 
          isEnabled: !tool.isEnabled 
        })
      });
      if (response.ok) {
        toast.success(`API tool ${!tool.isEnabled ? 'enabled' : 'disabled'}`);
        fetchClientApiTools();
      }
    } catch (error) {
      console.error('Error toggling API tool status:', error);
      toast.error('Failed to update API tool status');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            API Tools for {client.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.map(tool => (
                <div key={tool.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{tool.displayName}</h4>
                      <p className="text-sm text-gray-500">{tool.name}</p>
                      <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full mt-1">
                        {tool.category}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleAssignment(tool)}
                        className={`px-3 py-1 text-xs rounded-full ${
                          tool.isAssigned 
                            ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {tool.isAssigned ? 'Remove' : 'Assign'}
                      </button>
                      {tool.isAssigned && (
                        <button
                          onClick={() => handleToggleEnabled(tool)}
                          className={`px-3 py-1 text-xs rounded-full ${
                            tool.isEnabled 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {tool.isEnabled ? 'Enabled' : 'Disabled'}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {tool.description}
                  </p>
                  {tool.isAssigned && tool.assignedAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      Assigned: {new Date(tool.assignedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
