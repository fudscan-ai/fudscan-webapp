import jwt from 'jsonwebtoken';
import { PrismaClient } from '@/generated/prisma/index.js';

const prisma = new PrismaClient();

export function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  } catch (error) {
    return null;
  }
}

export async function authenticateAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Verify user still exists
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: decoded.userId }
    });

    if (!adminUser) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = {
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      role: adminUser.role
    };

    if (next) {
      next();
    }
    return true;

  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export function withAuth(handler) {
  return async (req, res) => {
    const isAuthenticated = await authenticateAdmin(req, res);
    if (isAuthenticated === true) {
      return handler(req, res);
    }
    // If not authenticated, response is already sent by authenticateAdmin
  };
}
