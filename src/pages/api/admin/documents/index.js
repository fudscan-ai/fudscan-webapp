import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

async function handler(req, res) {
  try {
    switch (req.method) {
      case 'GET':
        return await getDocuments(req, res);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Documents API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function getDocuments(req, res) {
  const { 
    page = 1, 
    limit = 50, 
    knowledgeBaseId, 
    clientId, 
    processed,
    search 
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  // Build where clause
  const where = {};
  
  if (knowledgeBaseId) {
    where.knowledgeBaseId = knowledgeBaseId;
  }
  
  if (clientId) {
    where.knowledgeBase = {
      clientId: clientId
    };
  }
  
  if (processed !== undefined) {
    where.processed = processed === 'true';
  }
  
  if (search) {
    where.OR = [
      { originalName: { contains: search, mode: 'insensitive' } },
      { filename: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Get documents with related data
  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
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
    }),
    prisma.document.count({ where })
  ]);

  // Transform the data to match the expected format
  const transformedDocuments = documents.map(doc => ({
    id: doc.id,
    filename: doc.filename,
    originalName: doc.originalName,
    size: doc.size,
    mimeType: doc.mimeType,
    processed: doc.processed,
    chromaId: doc.chromaId,
    md5Hash: doc.md5Hash,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    knowledgeBaseName: doc.knowledgeBase.name,
    knowledgeBaseType: doc.knowledgeBase.type,
    knowledgeBaseId: doc.knowledgeBase.id,
    clientName: doc.knowledgeBase.client?.name || null,
    clientId: doc.knowledgeBase.client?.id || null
  }));

  res.status(200).json({
    documents: transformedDocuments,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}

export default withAuth(handler);
