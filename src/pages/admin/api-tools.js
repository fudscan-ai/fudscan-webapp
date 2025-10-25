import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/Layout';
import Pagination from '../../components/admin/Pagination';
import ConfirmDialog from '../../components/admin/ConfirmDialog';

export default function ApiToolsAdmin() {
  const [tools, setTools] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    toolId: null,
    toolName: ''
  });
  const router = useRouter();

  const fetchTools = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      
      const response = await fetch(`/api/admin/api-tools?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      setTools(data.tools || []);
      setCategories(data.categories || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching tools:', error);
      setTools([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  const handleCreateTool = async (toolData) => {
    try {
      const response = await fetch('/api/admin/api-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toolData)
      });

      if (response.ok) {
        setShowCreateForm(false);
        fetchTools();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to create tool:', error);
      alert('Failed to create tool');
    }
  };

  const handleUpdateTool = async (toolData) => {
    try {
      const response = await fetch(`/api/admin/api-tools?id=${editingTool.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toolData)
      });

      if (response.ok) {
        setEditingTool(null);
        fetchTools();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to update tool:', error);
      alert('Failed to update tool');
    }
  };

  const handleDeleteTool = (tool) => {
    setDeleteConfirm({
      isOpen: true,
      toolId: tool.id,
      toolName: tool.displayName
    });
  };

  const confirmDeleteTool = async () => {
    try {
      const response = await fetch(`/api/admin/api-tools?id=${deleteConfirm.toolId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchTools();
        setDeleteConfirm({ isOpen: false, toolId: null, toolName: '' });
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to delete tool:', error);
      alert('Failed to delete tool');
    }
  };

  const cancelDeleteTool = () => {
    setDeleteConfirm({ isOpen: false, toolId: null, toolName: '' });
  };

  const toggleToolStatus = async (tool) => {
    await handleUpdateTool({ ...tool, isActive: !tool.isActive });
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filtering
  };

  if (loading) {
    return (
      <AdminLayout title="API Tools">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="API Tools">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">API Tools</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage API tools that can be used by AI workflows
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Add API Tool
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.name} value={cat.name}>
                {cat.name} ({cat.count})
              </option>
            ))}
          </select>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700">Show:</label>
            <select
              value={pagination.limit}
              onChange={(e) => setPagination(prev => ({ 
                ...prev, 
                limit: parseInt(e.target.value), 
                page: 1 
              }))}
              className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-700">per page</span>
          </div>
        </div>

        {/* Tools List */}
        {tools.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">No API tools found</div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {tools.map(tool => (
                <li key={tool.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {tool.displayName}
                        </h3>
                        <p className="text-sm text-gray-500">{tool.name}</p>
                        <div className="mt-2 flex items-center space-x-4">
                          <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                            {tool.category}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tool.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {tool.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {tool.description}
                        </p>
                        <div className="mt-2 text-xs text-gray-500">
                          <span>Method: {tool.method}</span>
                          {tool.endpoint && <span className="ml-4">Endpoint: {tool.endpoint}</span>}
                          <span className="ml-4">External: {tool.isExternal ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {/* <button
                          onClick={() => toggleToolStatus(tool)}
                          className="text-indigo-600 hover:text-indigo-900 text-sm"
                        >
                          {tool.isActive ? 'Deactivate' : 'Activate'}
                        </button> */}
                        <button
                          onClick={() => setEditingTool(tool)}
                          className="text-indigo-600 hover:text-indigo-900 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTool(tool)}
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

        {/* Pagination */}
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
        />

        {/* Create/Edit Modal */}
        {(showCreateForm || editingTool) && (
          <ToolFormModal
            tool={editingTool}
            onSave={editingTool ? handleUpdateTool : handleCreateTool}
            onCancel={() => {
              setShowCreateForm(false);
              setEditingTool(null);
            }}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          onClose={cancelDeleteTool}
          onConfirm={confirmDeleteTool}
          title="Delete API Tool"
          message={`Are you sure you want to delete "${deleteConfirm.toolName}"? This action cannot be undone and will remove the tool from all assigned clients.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      </div>
    </AdminLayout>
  );
}

function ToolFormModal({ tool, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: tool?.name || '',
    displayName: tool?.displayName || '',
    description: tool?.description || '',
    category: tool?.category || '',
    endpoint: tool?.endpoint || '',
    method: tool?.method || 'GET',
    parameters: JSON.stringify(tool?.parameters || {}, null, 2),
    scopes: (tool?.scopes || []).join(', '),
    isActive: tool?.isActive ?? true,
    isExternal: tool?.isExternal ?? false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    try {
      const submitData = {
        ...formData,
        parameters: JSON.parse(formData.parameters || '{}'),
        scopes: formData.scopes.split(',').map(s => s.trim()).filter(Boolean)
      };
      onSave(submitData);
    } catch (error) {
      alert('Invalid JSON in parameters field');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {tool ? 'Edit Tool' : 'Create New Tool'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tool Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Method
              </label>
              <select
                value={formData.method}
                onChange={(e) => setFormData({...formData, method: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endpoint
              </label>
              <input
                type="text"
                value={formData.endpoint}
                onChange={(e) => setFormData({...formData, endpoint: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parameters (JSON)
            </label>
            <textarea
              value={formData.parameters}
              onChange={(e) => setFormData({...formData, parameters: e.target.value})}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder='{"param1": "string", "param2": "number"}'
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scopes (comma-separated)
            </label>
            <input
              type="text"
              value={formData.scopes}
              onChange={(e) => setFormData({...formData, scopes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="debank:read, nansen:read"
            />
          </div>

          <div className="flex items-center space-x-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                className="mr-2"
              />
              Active
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isExternal}
                onChange={(e) => setFormData({...formData, isExternal: e.target.checked})}
                className="mr-2"
              />
              External API
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {tool ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
