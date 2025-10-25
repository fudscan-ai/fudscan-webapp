import { withAuth } from '@/lib/auth';
import chromaService from '@/lib/chroma';
import prisma from '@/lib/prisma';

async function handler(req, res) {
  const { id } = req.query;

  try {
    switch (req.method) {
      case 'GET':
        return await getDocument(req, res, id);
      case 'DELETE':
        return await deleteDocument(req, res, id);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Document API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function getDocument(req, res, id) {
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      knowledgeBase: {
        include: {
          client: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });

  if (!document) {
    return res.status(404).json({ message: 'Document not found' });
  }

  res.status(200).json({ document });
}

async function deleteDocument(req, res, id) {
  try {
    // First, get the document to check if it exists and get its details
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        knowledgeBase: true
      }
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Remove from Chroma vector database if it was processed
    if (document.processed && document.chromaId) {
      try {
        const collectionName = chromaService.getCollectionName(
          document.knowledgeBaseId,
          document.knowledgeBase.type
        );

        // Get all document chunks from Chroma
        const collection = await chromaService.getOrCreateCollection(collectionName);
        
        // Find and delete all chunks belonging to this document
        const results = await collection.get({
          where: {
            "filename": document.filename
          }
        });

        if (results.ids && results.ids.length > 0) {
          await collection.delete({
            ids: results.ids
          });
          console.log(`Deleted ${results.ids.length} chunks from Chroma for document ${document.filename}`);
        }
      } catch (chromaError) {
        console.error('Error removing document from Chroma:', chromaError);
        // Continue with database deletion even if Chroma deletion fails
        // This prevents orphaned database records
      }
    }

    // Delete the document from the database
    await prisma.document.delete({
      where: { id }
    });

    res.status(200).json({
      message: 'Document deleted successfully',
      deletedDocument: {
        id: document.id,
        filename: document.filename,
        originalName: document.originalName
      }
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    throw error; // Re-throw to be caught by the outer try-catch
  }
}

export default withAuth(handler);
