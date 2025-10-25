import prisma from '@/lib/prisma';

/**
 * Client API Tools Management Endpoint
 * Manage API tool permissions for specific clients
 */
export default async function handler(req, res) {
  try {
    const { id: clientId } = req.query;

    if (!clientId) {
      return res.status(400).json({ message: 'Client ID is required' });
    }

    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, clientId);
      case 'POST':
        return await handlePost(req, res, clientId);
      case 'PUT':
        return await handlePut(req, res, clientId);
      case 'DELETE':
        return await handleDelete(req, res, clientId);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Client API Tools endpoint error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}

// Get all API tools for a client (assigned and available)
async function handleGet(req, res, clientId) {
  // Verify client exists
  const client = await prisma.client.findUnique({
    where: { id: clientId }
  });

  if (!client) {
    return res.status(404).json({ message: 'Client not found' });
  }

  // Get all API tools with client assignment status
  const allTools = await prisma.apiTool.findMany({
    where: { isActive: true },
    include: {
      clientApiTools: {
        where: { clientId },
        select: {
          id: true,
          isEnabled: true,
          createdAt: true
        }
      }
    },
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ]
  });

  // Transform data to include assignment status
  const toolsWithStatus = allTools.map(tool => ({
    ...tool,
    isAssigned: tool.clientApiTools.length > 0,
    isEnabled: tool.clientApiTools.length > 0 ? tool.clientApiTools[0].isEnabled : false,
    assignmentId: tool.clientApiTools.length > 0 ? tool.clientApiTools[0].id : null,
    assignedAt: tool.clientApiTools.length > 0 ? tool.clientApiTools[0].createdAt : null,
    clientApiTools: undefined // Remove the nested data
  }));

  return res.status(200).json({
    client,
    tools: toolsWithStatus,
    total: toolsWithStatus.length,
    assigned: toolsWithStatus.filter(t => t.isAssigned).length
  });
}

// Assign API tool to client
async function handlePost(req, res, clientId) {
  const { apiToolId, isEnabled = true } = req.body;

  if (!apiToolId) {
    return res.status(400).json({ message: 'API tool ID is required' });
  }

  // Verify client and tool exist
  const [client, apiTool] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.apiTool.findUnique({ where: { id: apiToolId } })
  ]);

  if (!client) {
    return res.status(404).json({ message: 'Client not found' });
  }

  if (!apiTool) {
    return res.status(404).json({ message: 'API tool not found' });
  }

  // Check if assignment already exists
  const existingAssignment = await prisma.clientApiTool.findUnique({
    where: {
      clientId_apiToolId: {
        clientId,
        apiToolId
      }
    }
  });

  if (existingAssignment) {
    return res.status(409).json({ 
      message: 'API tool is already assigned to this client' 
    });
  }

  // Create assignment
  const assignment = await prisma.clientApiTool.create({
    data: {
      clientId,
      apiToolId,
      isEnabled
    },
    include: {
      client: true,
      apiTool: true
    }
  });

  return res.status(201).json({
    message: 'API tool assigned to client successfully',
    assignment
  });
}

// Update API tool assignment (enable/disable)
async function handlePut(req, res, clientId) {
  const { apiToolId, isEnabled } = req.body;

  if (!apiToolId || isEnabled === undefined) {
    return res.status(400).json({ 
      message: 'API tool ID and isEnabled status are required' 
    });
  }

  // Find and update assignment
  const assignment = await prisma.clientApiTool.findUnique({
    where: {
      clientId_apiToolId: {
        clientId,
        apiToolId
      }
    }
  });

  if (!assignment) {
    return res.status(404).json({ 
      message: 'API tool assignment not found' 
    });
  }

  const updatedAssignment = await prisma.clientApiTool.update({
    where: { id: assignment.id },
    data: { isEnabled },
    include: {
      client: true,
      apiTool: true
    }
  });

  return res.status(200).json({
    message: 'API tool assignment updated successfully',
    assignment: updatedAssignment
  });
}

// Remove API tool assignment from client
async function handleDelete(req, res, clientId) {
  const { apiToolId } = req.query;

  if (!apiToolId) {
    return res.status(400).json({ message: 'API tool ID is required' });
  }

  // Find assignment
  const assignment = await prisma.clientApiTool.findUnique({
    where: {
      clientId_apiToolId: {
        clientId,
        apiToolId
      }
    }
  });

  if (!assignment) {
    return res.status(404).json({ 
      message: 'API tool assignment not found' 
    });
  }

  // Delete assignment
  await prisma.clientApiTool.delete({
    where: { id: assignment.id }
  });

  return res.status(200).json({
    message: 'API tool assignment removed successfully'
  });
}
