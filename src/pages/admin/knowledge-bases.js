import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/Layout';
import adminApi, { AdminApiError } from '../../lib/adminApi';
import toast from '../../lib/toast';

export default function KnowledgeBasesPage() {
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedKB, setSelectedKB] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'general',
    clientId: ''
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchKnowledgeBases();
    fetchClients();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await adminApi.knowledgeBases.create(formData);
      toast.success('Knowledge base created successfully!');
      setShowModal(false);
      setFormData({ name: '', description: '', type: 'general', clientId: '' });
      fetchKnowledgeBases();
    } catch (error) {
      if (error instanceof AdminApiError) {
        console.error('Error creating knowledge base:', error.message);
        toast.error(`Failed to create knowledge base: ${error.message}`);
      } else {
        console.error('Error creating knowledge base:', error);
        toast.error('Failed to create knowledge base. Please try again.');
      }
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !selectedKB) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('knowledgeBaseId', selectedKB.id);

    try {
      await adminApi.documents.upload(formData);
      setShowUploadModal(false);
      setUploadFile(null);
      setSelectedKB(null);
      fetchKnowledgeBases();
      toast.success('Document uploaded successfully!');
    } catch (error) {
      if (error instanceof AdminApiError) {
        if (error.status === 409) {
          // Duplicate file error
          const existingDoc = error.data?.existingDocument;
          if (existingDoc) {
            const uploadDate = new Date(existingDoc.createdAt).toLocaleDateString();
            toast.warning(`Duplicate file detected! A document with identical content "${existingDoc.originalName}" was uploaded on ${uploadDate}. Please choose a different file.`);
          } else {
            toast.warning('Duplicate file detected. Please choose a different file.');
          }
        } else {
          toast.error(`Upload failed: ${error.message}`);
        }
      } else {
        console.error('Error uploading file:', error);
        toast.error('Upload failed. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  const openUploadModal = (kb) => {
    setSelectedKB(kb);
    setShowUploadModal(true);
  };

  return (
    <AdminLayout title="Knowledge Bases">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Knowledge Bases</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage knowledge bases and upload documents
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Knowledge Base
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {knowledgeBases.map((kb) => (
              <div key={kb.id} className="bg-white overflow-hidden shadow-md rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 truncate pr-2">{kb.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                      kb.type === 'client' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {kb.type}
                    </span>
                  </div>
                  
                  {kb.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{kb.description}</p>
                  )}
                  
                  {kb.client && (
                    <div className="mb-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                        👤 {kb.client.name}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {kb.documents?.length || 0} documents
                    </div>
                    <button
                      onClick={() => openUploadModal(kb)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload
                    </button>
                  </div>
                  
                  {kb.documents && kb.documents.length > 0 && (
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Documents:</h4>
                      <div className="space-y-2">
                        {kb.documents.slice(0, 3).map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                            <div className="flex items-center min-w-0 flex-1">
                              <svg className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-xs text-gray-600 truncate">{doc.filename}</span>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 flex-shrink-0 ${
                              doc.processed 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {doc.processed ? '✓' : '⏳'}
                            </span>
                          </div>
                        ))}
                        {kb.documents.length > 3 && (
                          <div className="text-xs text-gray-500 text-center py-1">
                            +{kb.documents.length - 3} more documents
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Knowledge Base Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Create Knowledge Base
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      rows="3"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Type
                    </label>
                    <select
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                    >
                      <option value="general">General</option>
                      <option value="client">Client-specific</option>
                    </select>
                  </div>
                  {formData.type === 'client' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Client
                      </label>
                      <select
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={formData.clientId}
                        onChange={(e) => setFormData({...formData, clientId: e.target.value})}
                      >
                        <option value="">Select a client</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setFormData({ name: '', description: '', type: 'general', clientId: '' });
                      }}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm"
                    >
                      Create
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Upload Document Modal */}
        {showUploadModal && selectedKB && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Upload Document to {selectedKB.name}
                </h3>
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Select File
                    </label>
                    <input
                      type="file"
                      required
                      accept=".pdf,.docx,.doc,.txt,.md,.json"
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      onChange={(e) => setUploadFile(e.target.files[0])}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Supported formats: PDF, Word, Text, Markdown, JSON (Max 10MB)
                    </p>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUploadModal(false);
                        setUploadFile(null);
                        setSelectedKB(null);
                      }}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
                    >
                      {uploading ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
