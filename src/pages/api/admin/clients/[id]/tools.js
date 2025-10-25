import prisma from '@/lib/prisma';

/**
 * Client API Tools Assignment Endpoint
 * Manage which API tools are available to a specific client
 */
export default async function handler(req, res) {
  try {
    const { id: clientId } = req.query;

    if (!clientId) {
      return res.status(400).json({ message: 'Client ID is required' });
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, clientId);
      case 'POST':
        return await handlePost(req, res, clientId);
      case 'DELETE':
        return await handleDelete(req, res, clientId);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Client tools endpoint error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function handleGet(req, res, clientId) {
  // Get client with assigned tools
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      apiTools: {
        where: { isActive: true },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ]
      }
    }
  });

  // Get all available tools not assigned to this client
  const availableTools = await prisma.apiTool.findMany({
    where: {
      isActive: true,
      clients: {
        none: {
          id: clientId
        }
      }
    },
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ]
  });

  // Group assigned tools by category
  const assignedByCategory = client.apiTools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {});

  // Group available tools by category
  const availableByCategory = availableTools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {});

  return res.status(200).json({
    client: {
      id: client.id,
      name: client.name,
      description: client.description
    },
    assigned: {
      tools: client.apiTools,
      byCategory: assignedByCategory,
      total: client.apiTools.length
    },
    available: {
      tools: availableTools,
      byCategory: availableByCategory,
      total: availableTools.length
    }
  });
}

async function handlePost(req, res, clientId) {
  const { toolIds } = req.body;

  if (!Array.isArray(toolIds) || toolIds.length === 0) {
    return res.status(400).json({ 
      message: 'toolIds must be a non-empty array' 
    });
  }

  // Verify all tools exist and are active
  const tools = await prisma.apiTool.findMany({
    where: {
      id: { in: toolIds },
      isActive: true
    }
  });

  if (tools.length !== toolIds.length) {
    const foundIds = tools.map(t => t.id);
    const missingIds = toolIds.filter(id => !foundIds.includes(id));
    return res.status(400).json({ 
      message: 'Some tools not found or inactive',
      missingIds
    });
  }

  // Add tools to client (using connect in a transaction)
  await prisma.$transaction(async (tx) => {
    for (const toolId of toolIds) {
      await tx.client.update({
        where: { id: clientId },
        data: {
          apiTools: {
            connect: { id: toolId }
          }
        }
      });
    }
  });

  // Return updated client with tools
  const updatedClient = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      apiTools: {
        where: { isActive: true },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ]
      }
    }
  });

  return res.status(200).json({
    message: `${toolIds.length} tools assigned to client`,
    client: updatedClient,
    assignedTools: updatedClient.apiTools.length
  });
}

async function handleDelete(req, res, clientId) {
  const { toolIds } = req.body;

  if (!Array.isArray(toolIds) || toolIds.length === 0) {
    return res.status(400).json({ 
      message: 'toolIds must be a non-empty array' 
    });
  }

  // Remove tools from client (using disconnect in a transaction)
  await prisma.$transaction(async (tx) => {
    for (const toolId of toolIds) {
      await tx.client.update({
        where: { id: clientId },
        data: {
          apiTools: {
            disconnect: { id: toolId }
          }
        }
      });
    }
  });

  // Return updated client with tools
  const updatedClient = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      apiTools: {
        where: { isActive: true },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ]
      }
    }
  });

  return res.status(200).json({
    message: `${toolIds.length} tools removed from client`,
    client: updatedClient,
    assignedTools: updatedClient.apiTools.length
  });
}
