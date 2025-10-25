import { withAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function handler(req, res) {
  const { id } = req.query;

  try {
    switch (req.method) {
      case 'GET':
        return await getClient(req, res, id);
      case 'PUT':
        return await updateClient(req, res, id);
      case 'DELETE':
        return await deleteClient(req, res, id);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Client API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function getClient(req, res, id) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      knowledgeBases: {
        include: {
          documents: {
            select: {
              id: true,
              filename: true,
              originalName: true,
              size: true,
              processed: true,
              createdAt: true
            }
          }
        }
      }
    }
  });

  if (!client) {
    return res.status(404).json({ message: 'Client not found' });
  }

  res.status(200).json({ client });
}

async function updateClient(req, res, id) {
  const { name, description, isActive } = req.body;

  const client = await prisma.client.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive })
    },
    include: {
      knowledgeBases: true
    }
  });

  res.status(200).json({
    message: 'Client updated successfully',
    client
  });
}

async function deleteClient(req, res, id) {
  await prisma.client.delete({
    where: { id }
  });

  res.status(200).json({
    message: 'Client deleted successfully'
  });
}

export default withAuth(handler);
