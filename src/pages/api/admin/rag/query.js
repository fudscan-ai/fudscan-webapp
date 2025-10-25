import prisma from '@/lib/prisma';
import chromaService from '@/lib/chroma';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { query, clientId, knowledgeBaseId, options = {} } = req.body;

    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }

    // Validate client API key if provided
    let client = null;
    if (clientId) {
      client = await prisma.client.findFirst({
        where: { 
          id: clientId,
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
          ...(clientId && { clientId })
        }
      });
      
      if (!kb) {
        return res.status(404).json({ message: 'Knowledge base not found' });
      }
      
      knowledgeBasesToSearch = [kb];
    } else if (clientId) {
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
        answer: "I couldn't find relevant information in the knowledge base to answer your question.",
        sources: [],
        context: [],
        metadata: {
          searchedKnowledgeBases: knowledgeBasesToSearch.length,
          resultsFound: 0
        }
      });
    }

    // Generate answer using LLM
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: options.model || 'gpt-3.5-turbo',
      temperature: options.temperature || 0.1
    });

    const contextText = topResults
      .map(result => result.content)
      .join('\n\n---\n\n');

    const promptTemplate = PromptTemplate.fromTemplate(`
You are a helpful AI assistant. Use the following context to answer the user's question. 
If the context doesn't contain enough information to answer the question, say so clearly.

Context:
{context}

Question: {question}

Answer:`);

    const prompt = await promptTemplate.format({
      context: contextText,
      question: query
    });

    const response = await llm.invoke(prompt);
    const answer = response.content;

    // Prepare sources
    const sources = topResults.map(result => ({
      filename: result.metadata.original_name || result.metadata.filename,
      knowledgeBase: result.metadata.knowledgeBaseName,
      type: result.metadata.knowledgeBaseType,
      relevanceScore: 1 - result.metadata.distance // Convert distance to relevance score
    }));

    res.status(200).json({
      query,
      answer,
      sources,
      context: topResults.map(result => ({
        content: result.content,
        metadata: result.metadata
      })),
      metadata: {
        searchedKnowledgeBases: knowledgeBasesToSearch.length,
        resultsFound: topResults.length,
        model: options.model || 'gpt-3.5-turbo',
        clientId: clientId || null
      }
    });

  } catch (error) {
    console.error('RAG query error:', error);
    res.status(500).json({ 
      message: 'Query processing failed', 
      error: error.message 
    });
  }
}
