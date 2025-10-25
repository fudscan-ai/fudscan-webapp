import { ChromaClient } from 'chromadb';
import { OpenAIEmbeddings } from '@langchain/openai';
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";

class ChromaService {
  constructor() {
    this.client = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000'
    });
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });
  }

  async getOrCreateCollection(name) {
    try {
      // Try to get existing collection
      const collection = await this.client.getCollection({ name });
      return collection;
    } catch (error) {
      // If collection doesn't exist, create it
      const collection = await this.client.createCollection({ 
        name,
        metadata: { 
          description: `Knowledge base collection: ${name}`,
          created_at: new Date().toISOString()
        },
        embeddingFunction: new OpenAIEmbeddingFunction({
          model: 'text-embedding-3-small'
        })
      });
      return collection;
    }
  }

  async addDocuments(collectionName, documents) {
    const collection = await this.getOrCreateCollection(collectionName);
    
    const texts = documents.map(doc => doc.content);
    const metadatas = documents.map(doc => ({
      document_id: doc.id,
      filename: doc.filename,
      original_name: doc.originalName,
      mime_type: doc.mimeType,
      knowledge_base_id: doc.knowledgeBaseId,
      created_at: doc.createdAt?.toISOString() || new Date().toISOString()
    }));
    const ids = documents.map(doc => doc.id);

    // Generate embeddings
    const embeddings = await this.embeddings.embedDocuments(texts);

    await collection.add({
      ids,
      embeddings,
      metadatas,
      documents: texts
    });

    return { success: true, count: documents.length };
  }

  async searchSimilar(collectionName, query, nResults = 5, filter = null) {
    try {
      const collection = await this.getOrCreateCollection(collectionName);
      
      // Generate query embedding
      const queryEmbedding = await this.embeddings.embedQuery(query);

      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults,
        ...(filter && { where: filter })
      });

      return {
        documents: results.documents[0] || [],
        metadatas: results.metadatas[0] || [],
        distances: results.distances[0] || [],
        ids: results.ids[0] || []
      };
    } catch (error) {
      console.error('Chroma search error:', error);
      throw error;
    }
  }

  async deleteDocument(collectionName, documentId) {
    try {
      const collection = await this.getOrCreateCollection(collectionName);
      await collection.delete({ ids: [documentId] });
      return { success: true };
    } catch (error) {
      console.error('Chroma delete error:', error);
      throw error;
    }
  }

  async deleteCollection(collectionName) {
    try {
      await this.client.deleteCollection({ name: collectionName });
      return { success: true };
    } catch (error) {
      console.error('Chroma delete collection error:', error);
      throw error;
    }
  }

  getCollectionName(knowledgeBaseId, type = 'client') {
    return `kb_${type}_${knowledgeBaseId}`;
  }
}

const chromaService = new ChromaService();
export default chromaService;
