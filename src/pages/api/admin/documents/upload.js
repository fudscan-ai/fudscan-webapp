import multer from 'multer';
import crypto from 'crypto';
import { withAuth } from '@/lib/auth';
import documentProcessor from '@/lib/documentProcessor';
import chromaService from '@/lib/chroma';
import prisma from '@/lib/prisma';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown',
      'application/json'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
});

// Disable Next.js body parser for this route
export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Use multer middleware
    await new Promise((resolve, reject) => {
      upload.single('file')(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const { knowledgeBaseId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!knowledgeBaseId) {
      return res.status(400).json({ message: 'Knowledge base ID is required' });
    }

    // Verify knowledge base exists
    const knowledgeBase = await prisma.knowledgeBase.findUnique({
      where: { id: knowledgeBaseId },
      include: { client: true }
    });

    if (!knowledgeBase) {
      return res.status(404).json({ message: 'Knowledge base not found' });
    }

    // Calculate MD5 hash of file content
    const md5sum = crypto.createHash('md5').update(file.buffer).digest('hex');

    // Check if document with same MD5 already exists in this knowledge base
    const existingDocument = await prisma.document.findFirst({
      where: {
        md5sum,
        knowledgeBaseId
      }
    });

    if (existingDocument) {
      return res.status(409).json({ 
        message: 'A document with identical content already exists in this knowledge base',
        existingDocument: {
          id: existingDocument.id,
          originalName: existingDocument.originalName,
          createdAt: existingDocument.createdAt
        }
      });
    }

    // Process document
    const processed = await documentProcessor.processDocument(
      file.buffer,
      file.mimetype,
      file.originalname
    );

    // Save document to database
    const document = await prisma.document.create({
      data: {
        filename: `${Date.now()}_${file.originalname}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        content: processed.fullText,
        md5sum,
        knowledgeBaseId,
        processed: false
      }
    });

    // Add to Chroma vector database
    try {
      const collectionName = chromaService.getCollectionName(
        knowledgeBaseId, 
        knowledgeBase.type
      );

      // Create document chunks for vector storage
      const documentChunks = processed.chunks.map((chunk, index) => ({
        id: `${document.id}_chunk_${index}`,
        content: chunk,
        filename: document.filename,
        originalName: document.originalName,
        mimeType: document.mimeType,
        knowledgeBaseId: document.knowledgeBaseId,
        createdAt: document.createdAt
      }));

      await chromaService.addDocuments(collectionName, documentChunks);

      // Update document as processed
      await prisma.document.update({
        where: { id: document.id },
        data: { 
          processed: true,
          chromaId: collectionName
        }
      });

      res.status(201).json({
        message: 'Document uploaded and processed successfully',
        document: {
          id: document.id,
          filename: document.filename,
          originalName: document.originalName,
          size: document.size,
          processed: true,
          chunks: processed.chunks.length,
          knowledgeBase: {
            id: knowledgeBase.id,
            name: knowledgeBase.name,
            type: knowledgeBase.type
          }
        }
      });

    } catch (vectorError) {
      console.error('Vector processing error:', vectorError);
      
      // Mark document as failed processing
      await prisma.document.update({
        where: { id: document.id },
        data: { processed: false }
      });

      res.status(500).json({
        message: 'Document saved but vector processing failed',
        error: vectorError.message,
        document: {
          id: document.id,
          filename: document.filename,
          processed: false
        }
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      message: 'Upload failed', 
      error: error.message 
    });
  }
}

export default withAuth(handler);
