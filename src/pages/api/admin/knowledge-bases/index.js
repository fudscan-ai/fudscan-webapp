import { withAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function handler(req, res) {
  try {
    switch (req.method) {
      case 'GET':
        return await getKnowledgeBases(req, res);
      case 'POST':
        return await createKnowledgeBase(req, res);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Knowledge bases API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function getKnowledgeBases(req, res) {
  const { page = 1, limit = 10, clientId, type } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    ...(clientId && { clientId }),
    ...(type && { type })
  };

  const [knowledgeBases, total] = await Promise.all([
    prisma.knowledgeBase.findMany({
      where,
      skip,
      take: parseInt(limit),
      include: {
        client: {
          select: {
            id: true,
            name: true
          }
        },
        documents: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            size: true,
            processed: true,
            createdAt: true,
            updatedAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.knowledgeBase.count({ where })
  ]);

  res.status(200).json({
    knowledgeBases,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}

async function createKnowledgeBase(req, res) {
  const { name, description, type, clientId } = req.body;

  if (!name || !type) {
    return res.status(400).json({ message: 'Name and type are required' });
  }

  if (type === 'client' && !clientId) {
    return res.status(400).json({ message: 'Client ID is required for client-specific knowledge base' });
  }

  const knowledgeBase = await prisma.knowledgeBase.create({
    data: {
      name,
      description,
      type,
      ...(clientId && { clientId })
    },
    include: {
      client: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  res.status(201).json({
    message: 'Knowledge base created successfully',
    knowledgeBase
  });
}

export default withAuth(handler);
