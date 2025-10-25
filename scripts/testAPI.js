import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

class APITester {
  constructor() {
    this.token = null;
  }

  async login() {
    console.log('🔐 Testing login...');
    try {
      const response = await fetch(`${BASE_URL}/api/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123'
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        this.token = data.token;
        console.log('✅ Login successful');
        console.log(`   User: ${data.user.username} (${data.user.email})`);
        return true;
      } else {
        console.log('❌ Login failed:', data.message);
        return false;
      }
    } catch (error) {
      console.log('❌ Login error:', error.message);
      return false;
    }
  }

  async createClient() {
    console.log('\n👥 Testing client creation...');
    try {
      const response = await fetch(`${BASE_URL}/api/admin/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          name: 'Test Client',
          description: 'A test client for API testing'
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Client created successfully');
        console.log(`   Name: ${data.client.name}`);
        console.log(`   API Key: ${data.client.apiKey}`);
        return data.client;
      } else {
        console.log('❌ Client creation failed:', data.message);
        return null;
      }
    } catch (error) {
      console.log('❌ Client creation error:', error.message);
      return null;
    }
  }

  async createKnowledgeBase(clientId = null) {
    console.log('\n📚 Testing knowledge base creation...');
    try {
      const response = await fetch(`${BASE_URL}/api/admin/knowledge-bases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          name: clientId ? 'Client Test KB' : 'General Test KB',
          description: 'A test knowledge base',
          type: clientId ? 'client' : 'general',
          ...(clientId && { clientId })
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Knowledge base created successfully');
        console.log(`   Name: ${data.knowledgeBase.name}`);
        console.log(`   Type: ${data.knowledgeBase.type}`);
        return data.knowledgeBase;
      } else {
        console.log('❌ Knowledge base creation failed:', data.message);
        return null;
      }
    } catch (error) {
      console.log('❌ Knowledge base creation error:', error.message);
      return null;
    }
  }

  async testRAGQuery(clientId = null, knowledgeBaseId = null) {
    console.log('\n🤖 Testing RAG query...');
    try {
      const response = await fetch(`${BASE_URL}/api/admin/rag/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          query: 'What is artificial intelligence?',
          ...(clientId && { clientId }),
          ...(knowledgeBaseId && { knowledgeBaseId }),
          options: {
            maxResults: 3,
            model: 'gpt-3.5-turbo'
          }
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ RAG query successful');
        console.log(`   Query: ${data.query}`);
        console.log(`   Answer: ${data.answer.substring(0, 100)}...`);
        console.log(`   Sources: ${data.sources.length}`);
        return data;
      } else {
        console.log('❌ RAG query failed:', data.message);
        return null;
      }
    } catch (error) {
      console.log('❌ RAG query error:', error.message);
      return null;
    }
  }

  async runTests() {
    console.log('🚀 Starting API Tests...\n');

    // Test login
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      console.log('\n❌ Tests failed - cannot login');
      return;
    }

    // Test client creation
    const client = await this.createClient();

    // Test knowledge base creation
    const generalKB = await this.createKnowledgeBase();
    const clientKB = client ? await this.createKnowledgeBase(client.id) : null;

    // Test RAG query
    await this.testRAGQuery();
    if (client) {
      await this.testRAGQuery(client.id);
    }
    if (generalKB) {
      await this.testRAGQuery(null, generalKB.id);
    }

    console.log('\n🎉 API Tests completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Visit http://localhost:3000/admin/login to access the admin panel');
    console.log('   2. Login with username: admin, password: admin123');
    console.log('   3. Upload some documents to test the full RAG pipeline');
    console.log('   4. Make sure Chroma is running on http://localhost:8000');
  }
}

// Run tests
const tester = new APITester();
tester.runTests().catch(console.error);
