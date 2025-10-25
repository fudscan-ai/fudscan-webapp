import { withAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function handler(req, res) {
  try {
    switch (req.method) {
      case 'GET':
        return await getClients(req, res);
      case 'POST':
        return await createClient(req, res);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Clients API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function getClients(req, res) {
  const { page = 1, limit = 10, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ]
  } : {};

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take: parseInt(limit),
      include: {
        knowledgeBases: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.client.count({ where })
  ]);

  res.status(200).json({
    clients,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}

async function createClient(req, res) {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Client name is required' });
  }

  const client = await prisma.client.create({
    data: {
      name,
      description
    },
    include: {
      knowledgeBases: true
    }
  });

  res.status(201).json({
    message: 'Client created successfully',
    client
  });
}

export default withAuth(handler);
