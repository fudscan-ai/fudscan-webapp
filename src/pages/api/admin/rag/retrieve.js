import { PrismaClient } from '@/generated/prisma/index.js';
import chromaService from '@/lib/chroma';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { query, apiKey, knowledgeBaseId, options = {} } = req.body;

    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }

    // Validate client API key if provided
    let client = null;
    if (apiKey) {
      client = await prisma.client.findFirst({
        where: { 
          apiKey: apiKey,
          isActive: true 
        },
        include: {
          knowledgeBases: {
            where: { isActive: true }
          }
        }
      });

      if (!client) {
        return res.status(404).json({ message: 'Client not found or inactive' });
      }
    }

    // Determine which knowledge bases to search
    let knowledgeBasesToSearch = [];
    
    if (knowledgeBaseId) {
      // Search specific knowledge base
      const kb = await prisma.knowledgeBase.findFirst({
        where: { 
          id: knowledgeBaseId,
          isActive: true,
          clientId: client.id
        }
      });
      
      if (!kb) {
        return res.status(404).json({ message: 'Knowledge base not found' });
      }
      
      knowledgeBasesToSearch = [kb];
    } else if (client) {
      // Search all client's knowledge bases
      knowledgeBasesToSearch = client.knowledgeBases;
    } else {
      // Search general knowledge bases
      knowledgeBasesToSearch = await prisma.knowledgeBase.findMany({
        where: { 
          type: 'general',
          isActive: true 
        }
      });
    }

    if (knowledgeBasesToSearch.length === 0) {
      return res.status(404).json({ message: 'No knowledge bases available' });
    }

    // Search across all relevant knowledge bases
    const searchResults = [];
    const maxResults = options.maxResults || 5;

    for (const kb of knowledgeBasesToSearch) {
      try {
        const collectionName = chromaService.getCollectionName(kb.id, kb.type);
        const results = await chromaService.searchSimilar(
          collectionName, 
          query, 
          maxResults
        );

        // Add knowledge base context to results
        results.documents.forEach((doc, index) => {
          searchResults.push({
            content: doc,
            metadata: {
              ...results.metadatas[index],
              knowledgeBaseName: kb.name,
              knowledgeBaseType: kb.type,
              distance: results.distances[index]
            }
          });
        });
      } catch (error) {
        console.error(`Error searching knowledge base ${kb.id}:`, error);
        // Continue with other knowledge bases
      }
    }

    // Sort by relevance (distance)
    searchResults.sort((a, b) => a.metadata.distance - b.metadata.distance);
    
    // Take top results
    const topResults = searchResults.slice(0, maxResults);

    if (topResults.length === 0) {
      return res.status(200).json({
        query,
        context: [],
        sources: [],
        metadata: {
          searchedKnowledgeBases: knowledgeBasesToSearch.length,
          resultsFound: 0
        }
      });
    }

    // Prepare sources
    const sources = topResults.map(result => ({
      filename: result.metadata.original_name || result.metadata.filename,
      knowledgeBase: result.metadata.knowledgeBaseName,
      type: result.metadata.knowledgeBaseType,
      relevanceScore: 1 - result.metadata.distance // Convert distance to relevance score
    }));

    // Return only the retrieved context without LLM processing
    res.status(200).json({
      query,
      context: topResults.map(result => ({
        content: result.content,
        metadata: result.metadata
      })),
      sources,
      metadata: {
        searchedKnowledgeBases: knowledgeBasesToSearch.length,
        resultsFound: topResults.length,
        clientId: client.id || null
      }
    });

  } catch (error) {
    console.error('RAG retrieve error:', error);
    res.status(500).json({ 
      message: 'Context retrieval failed', 
      error: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}
