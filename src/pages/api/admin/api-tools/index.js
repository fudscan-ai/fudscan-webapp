
import prisma from '@/lib/prisma';

/**
 * API Tools Management Endpoint
 * CRUD operations for managing API tools
 */
export default async function handler(req, res) {
  try {
    // Test database connection first
    await prisma.$connect();
    console.log('Database connection successful');
    
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      case 'PUT':
        return await handlePut(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Tools endpoint error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    
    // Check if it's a database connection error
    if (error.code === 'P1001' || error.message.includes('Can\'t reach database server')) {
      return res.status(503).json({ 
        message: 'Database connection failed', 
        error: 'Cannot connect to the database. Please check your DATABASE_URL configuration.',
        details: error.message
      });
    }
    
    // Check if it's a table not found error
    if (error.code === 'P2021' || error.message.includes('table') || error.message.includes('relation')) {
      return res.status(500).json({ 
        message: 'Database schema error', 
        error: 'The api_tools table may not exist. Please run database migrations.',
        details: error.message
      });
    }
    
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function handleGet(req, res) {
  const { category, isActive, clientId, page = '1', limit = '10' } = req.query;
  
  console.log('handleGet called with params:', { category, isActive, clientId, page, limit });
  
  // Parse pagination parameters
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10))); // Max 50 items per page
  const skip = (pageNum - 1) * limitNum;
  
  const where = {};
  if (category) where.category = category;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  
  console.log('Where clause:', where);
  
  const include = {
    clientApiTools: {
      include: {
        client: true
      },
      ...(clientId && { where: { clientId } })
    }
  };

  console.log('Include clause:', JSON.stringify(include, null, 2));

  try {
    // Test if the table exists by trying a simple query first
    console.log('Testing table existence...');
    const tableTest = await prisma.$queryRaw`SELECT COUNT(*) FROM api_tools LIMIT 1`;
    console.log('Table test result:', tableTest);

    // Get total count for pagination
    console.log('Getting total count...');
    const totalCount = await prisma.apiTool.count({ where });
    console.log('Total count:', totalCount);

    console.log('Fetching tools...');
    const tools = await prisma.apiTool.findMany({
      where,
      include,
      orderBy: [
        {createdAt: 'desc'},
        { category: 'asc' },
        { name: 'asc' }
      ],
      skip,
      take: limitNum
    });
    console.log('Tools fetched:', tools.length);

    console.log('Getting categories...');
    const categories = await prisma.apiTool.groupBy({
      by: ['category'],
      _count: { category: true },
      where: { isActive: true }
    });
    console.log('Categories:', categories);

    const totalPages = Math.ceil(totalCount / limitNum);

    const response = {
      tools,
      categories: categories.map(c => ({
        name: c.category,
        count: c._count.category
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    };

    console.log('Sending response with', tools.length, 'tools and', categories.length, 'categories');
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in handleGet:', error);
    throw error; // Re-throw to be caught by main handler
  }
}

async function handlePost(req, res) {
  const {
    name,
    displayName,
    description,
    category,
    endpoint,
    method = 'GET',
    parameters,
    scopes = [],
    isActive = true,
    isExternal = false
  } = req.body;

  if (!name || !displayName || !description || !category) {
    return res.status(400).json({ 
      message: 'Missing required fields: name, displayName, description, category' 
    });
  }

  // Check if tool name already exists
  const existingTool = await prisma.apiTool.findUnique({
    where: { name }
  });

  if (existingTool) {
    return res.status(409).json({ 
      message: 'Tool with this name already exists' 
    });
  }

  const tool = await prisma.apiTool.create({
    data: {
      name,
      displayName,
      description,
      category,
      endpoint,
      method,
      parameters: parameters || {},
      scopes,
      isActive,
      isExternal
    }
  });

  return res.status(201).json({
    message: 'API tool created successfully',
    tool
  });
}

async function handlePut(req, res) {
  const { id } = req.query;
  const {
    name,
    displayName,
    description,
    category,
    endpoint,
    method,
    parameters,
    scopes,
    isActive,
    isExternal
  } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'Tool ID is required' });
  }

  // Check if tool exists
  const existingTool = await prisma.apiTool.findUnique({
    where: { id }
  });

  if (!existingTool) {
    return res.status(404).json({ message: 'Tool not found' });
  }

  // If name is being changed, check for conflicts
  if (name && name !== existingTool.name) {
    const nameConflict = await prisma.apiTool.findUnique({
      where: { name }
    });

    if (nameConflict) {
      return res.status(409).json({ 
        message: 'Tool with this name already exists' 
      });
    }
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (displayName !== undefined) updateData.displayName = displayName;
  if (description !== undefined) updateData.description = description;
  if (category !== undefined) updateData.category = category;
  if (endpoint !== undefined) updateData.endpoint = endpoint;
  if (method !== undefined) updateData.method = method;
  if (parameters !== undefined) updateData.parameters = parameters;
  if (scopes !== undefined) updateData.scopes = scopes;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (isExternal !== undefined) updateData.isExternal = isExternal;

  const tool = await prisma.apiTool.update({
    where: { id },
    data: updateData
  });

  return res.status(200).json({
    message: 'API tool updated successfully',
    tool
  });
}

async function handleDelete(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'Tool ID is required' });
  }

  // Check if tool exists
  const existingTool = await prisma.apiTool.findUnique({
    where: { id },
    include: {
      clientApiTools: {
        include: {
          client: true
        }
      }
    }
  });

  if (!existingTool) {
    return res.status(404).json({ message: 'Tool not found' });
  }

  // Check if tool is in use by clients
  if (existingTool.clientApiTools.length > 0) {
    return res.status(409).json({ 
      message: 'Cannot delete tool that is assigned to clients',
      assignedClients: existingTool.clientApiTools.length
    });
  }

  await prisma.apiTool.delete({
    where: { id }
  });

  return res.status(200).json({
    message: 'API tool deleted successfully'
  });
}
