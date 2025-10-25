/**
 * 统一的管理员 API 请求封装工具
 * 处理认证、错误处理和 token 过期逻辑
 */

class AdminApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.data = data;
  }
}

class AdminApi {
  constructor() {
    this.baseUrl = '';
    this.tokenKey = 'admin_token';
    this.userKey = 'admin_user';
  }

  /**
   * 获取存储的 token
   */
  getToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }

  /**
   * 清理认证信息并跳转到登录页
   */
  clearAuthAndRedirect() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
      
      // 跳转到登录页
      window.location.href = '/admin/login';
    }
  }

  /**
   * 创建请求头
   */
  createHeaders(additionalHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...additionalHeaders
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * 处理响应
   */
  async handleResponse(response) {
    // 检查是否是 401 未授权
    if (response.status === 401) {
      console.warn('Token expired or invalid, redirecting to login...');
      this.clearAuthAndRedirect();
      throw new AdminApiError('Token expired', 401);
    }

    // 尝试解析 JSON 响应
    let data;
    try {
      data = await response.json();
    } catch (error) {
      // 如果不是 JSON 响应，使用文本
      data = { message: await response.text() };
    }

    // 检查响应是否成功
    if (!response.ok) {
      throw new AdminApiError(
        data.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        data
      );
    }

    return data;
  }

  /**
   * 通用请求方法
   */
  async request(url, options = {}) {
    const {
      method = 'GET',
      headers = {},
      body,
      ...otherOptions
    } = options;

    const requestHeaders = this.createHeaders(headers);

    try {
      const response = await fetch(`${this.baseUrl}${url}`, {
        method,
        headers: requestHeaders,
        body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
        ...otherOptions
      });

      return await this.handleResponse(response);
    } catch (error) {
      if (error instanceof AdminApiError) {
        throw error;
      }
      
      // 网络错误或其他错误
      console.error('API request failed:', error);
      throw new AdminApiError('Network error or server unavailable', 0, { originalError: error });
    }
  }

  /**
   * GET 请求
   */
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  /**
   * POST 请求
   */
  async post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: data
    });
  }

  /**
   * PUT 请求
   */
  async put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: data
    });
  }

  /**
   * DELETE 请求
   */
  async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }

  /**
   * 文件上传请求（FormData）
   */
  async upload(url, formData, options = {}) {
    const token = this.getToken();
    const headers = {
      // 不设置 Content-Type，让浏览器自动设置 multipart/form-data
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    };

    try {
      const response = await fetch(`${this.baseUrl}${url}`, {
        method: 'POST',
        headers,
        body: formData,
        ...options
      });

      return await this.handleResponse(response);
    } catch (error) {
      if (error instanceof AdminApiError) {
        throw error;
      }
      
      console.error('Upload request failed:', error);
      throw new AdminApiError('Upload failed', 0, { originalError: error });
    }
  }

  // ===== 具体的 API 方法 =====

  /**
   * 客户端相关 API
   */
  clients = {
    // 获取客户端列表
    list: (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return this.get(`/api/admin/clients${queryString ? `?${queryString}` : ''}`);
    },

    // 创建客户端
    create: (data) => this.post('/api/admin/clients', data),

    // 更新客户端
    update: (id, data) => this.put(`/api/admin/clients/${id}`, data),

    // 删除客户端
    delete: (id) => this.delete(`/api/admin/clients/${id}`)
  };

  /**
   * 知识库相关 API
   */
  knowledgeBases = {
    // 获取知识库列表
    list: (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return this.get(`/api/admin/knowledge-bases${queryString ? `?${queryString}` : ''}`);
    },

    // 创建知识库
    create: (data) => this.post('/api/admin/knowledge-bases', data),

    // 更新知识库
    update: (id, data) => this.put(`/api/admin/knowledge-bases/${id}`, data),

    // 删除知识库
    delete: (id) => this.delete(`/api/admin/knowledge-bases/${id}`)
  };

  /**
   * 文档相关 API
   */
  documents = {
    // 上传文档
    upload: (formData) => this.upload('/api/admin/documents/upload', formData),

    // 获取文档列表
    list: (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return this.get(`/api/admin/documents${queryString ? `?${queryString}` : ''}`);
    },

    // 删除文档
    delete: (id) => this.delete(`/api/admin/documents/${id}`)
  };

  /**
   * RAG 查询相关 API
   */
  rag = {
    // 执行 RAG 查询
    query: (data) => this.post('/api/admin/rag/query', data)
  };
}

// 创建单例实例
const adminApi = new AdminApi();

export default adminApi;
export { AdminApiError };
