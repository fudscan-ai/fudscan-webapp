import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';

class VectorService {
  constructor() {
    // Use Pinecone as Chroma alternative for production
    this.usePinecone = process.env.PINECONE_API_KEY && process.env.PINECONE_ENVIRONMENT;
    
    if (this.usePinecone) {
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
        environment: process.env.PINECONE_ENVIRONMENT
      });
    } else {
      // Fallback to Chroma for development
      const { ChromaClient } = require('chromadb');
      this.chroma = new ChromaClient({
        path: process.env.CHROMA_URL || 'http://localhost:8000'
      });
    }
    
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });
  }

  async getOrCreateCollection(name) {
    if (this.usePinecone) {
      try {
        const index = this.pinecone.Index(name);
        return index;
      } catch (error) {
        // Create index if it doesn't exist
        await this.pinecone.createIndex({
          name,
          dimension: 1536, // OpenAI embedding dimension
          metric: 'cosine'
        });
        return this.pinecone.Index(name);
      }
    } else {
      return await this.chroma.getOrCreateCollection({
        name,
        embeddingFunction: this.chroma.embeddingFunction
      });
    }
  }

  async addDocuments(collectionName, documents) {
    const collection = await this.getOrCreateCollection(collectionName);
    
    if (this.usePinecone) {
      // Convert documents to Pinecone format
      const vectors = await Promise.all(
        documents.map(async (doc, index) => {
          const embedding = await this.embeddings.embedQuery(doc.content);
          return {
            id: doc.id,
            values: embedding,
            metadata: {
              content: doc.content,
              filename: doc.filename,
              originalName: doc.originalName,
              mimeType: doc.mimeType,
              knowledgeBaseId: doc.knowledgeBaseId,
              createdAt: doc.createdAt
            }
          };
        })
      );
      
      await collection.upsert(vectors);
    } else {
      // Chroma implementation
      const embeddings = await this.embeddings.embedDocuments(
        documents.map(doc => doc.content)
      );
      
      await collection.add({
        ids: documents.map(doc => doc.id),
        embeddings,
        documents: documents.map(doc => doc.content),
        metadatas: documents.map(doc => ({
          filename: doc.filename,
          originalName: doc.originalName,
          mimeType: doc.mimeType,
          knowledgeBaseId: doc.knowledgeBaseId,
          createdAt: doc.createdAt
        }))
      });
    }
    
    return { success: true, count: documents.length };
  }

  async searchSimilar(collectionName, query, nResults = 5, filter = null) {
    const collection = await this.getOrCreateCollection(collectionName);
    const queryEmbedding = await this.embeddings.embedQuery(query);

    if (this.usePinecone) {
      const searchResponse = await collection.query({
        vector: queryEmbedding,
        topK: nResults,
        includeMetadata: true,
        ...(filter && { filter })
      });

      return {
        documents: searchResponse.matches.map(match => match.metadata?.content || ''),
        metadatas: searchResponse.matches.map(match => match.metadata || {}),
        distances: searchResponse.matches.map(match => match.score || 0),
        ids: searchResponse.matches.map(match => match.id)
      };
    } else {
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
    }
  }

  async deleteDocument(collectionName, documentId) {
    const collection = await this.getOrCreateCollection(collectionName);
    
    if (this.usePinecone) {
      await collection.deleteOne(documentId);
    } else {
      await collection.delete({ ids: [documentId] });
    }
    
    return { success: true };
  }

  getCollectionName(knowledgeBaseId, type) {
    return `kb_${knowledgeBaseId}_${type}`;
  }
}

export default new VectorService();
