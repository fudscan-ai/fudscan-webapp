import { PrismaClient } from '../generated/prisma/index.js';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Prisma client
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Save an incoming message to the database
async function saveMessage(message) {
  try {
    const {
      id,
      content,
      contentType,
      conversationId,
      deliveryStatus,
      senderInboxId,
      sentAt,
      sentAtNs,
      kind,
      parameters,
      fallback,
      compression
    } = message;
    
    // Using Prisma to create a message record
    const result = await prisma.message.upsert({
      where: { id },
      update: {}, // No update if exists
      create: {
        id,
        content,
        content_type_authority_id: contentType.authorityId,
        content_type_type_id: contentType.typeId,
        content_type_version_major: contentType.versionMajor,
        content_type_version_minor: contentType.versionMinor,
        conversation_id: conversationId,
        delivery_status: deliveryStatus,
        sender_inbox_id: senderInboxId,
        sent_at: new Date(sentAt),
        sent_at_ns: sentAtNs,
        kind,
        parameters: parameters ? JSON.stringify(parameters) : null,
        fallback: fallback || null,
        compression: compression || null
      }
    });
    
    return result;
  } catch (err) {
    console.error('Error saving message:', err);
    throw err;
  }
}

// Save an outgoing (bot) message to the database
async function saveOutgoingMessage(content, conversationId, senderInboxId, recipientInboxId, referenceMessageId = null) {
  try {
    const id = generateMessageId(); // Generate a unique ID for the outgoing message
    
    // Using Prisma to create an outgoing message record
    const result = await prisma.outgoingMessage.create({
      data: {
        id,
        content,
        conversation_id: conversationId,
        sender_inbox_id: senderInboxId,
        recipient_inbox_id: recipientInboxId,
        reference_message_id: referenceMessageId,
        sent_at: new Date() // Adding current timestamp
      }
    });
    
    return result;
  } catch (err) {
    console.error('Error saving outgoing message:', err);
    throw err;
  }
}

// Generate a unique ID for outgoing messages
function generateMessageId() {
  return `outgoing-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Get the last N messages for a specific conversation (both incoming and outgoing)
async function getConversationHistory(conversationId, limit = 5) {
  try {
    // Get incoming messages using Prisma
    const incomingMessages = await prisma.message.findMany({
      where: { conversation_id: conversationId },
      orderBy: { sent_at: 'desc' },
      take: limit,
      select: {
        id: true,
        content: true,
        conversation_id: true,
        sender_inbox_id: true,
        sent_at: true
      }
    });
    
    // Get outgoing messages using Prisma
    const outgoingMessages = await prisma.outgoingMessage.findMany({
      where: { conversation_id: conversationId },
      orderBy: { sent_at: 'desc' },
      take: limit,
      select: {
        id: true,
        content: true,
        conversation_id: true,
        sender_inbox_id: true,
        sent_at: true
      }
    });
    
    // Add message type to each result
    const incomingWithType = incomingMessages.map(msg => ({
      ...msg,
      message_type: 'incoming'
    }));
    
    const outgoingWithType = outgoingMessages.map(msg => ({
      ...msg,
      message_type: 'outgoing'
    }));
    
    // Combine and sort results by sent_at timestamp
    const combinedResults = [...incomingWithType, ...outgoingWithType]
      .sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
      .slice(0, limit);
    
    return combinedResults;
  } catch (err) {
    console.error('Error retrieving conversation history:', err);
    throw err;
  }
}

// Get the latest price for a specific token symbol
async function getLatestTokenPrice(symbol) {
  try {
    // Get the latest token price using Prisma
    const result = await prisma.tokenPrice.findFirst({
      where: { symbol },
      orderBy: { timestamp: 'desc' }
    });
    
    if (result) {
      return parseFloat(result.price);
    } else {
      return null; // Return null if no price found for the symbol
    }
  } catch (err) {
    console.error('Error retrieving token price:', err);
    throw err;
  }
}

export {
  saveMessage,
  saveOutgoingMessage,
  getConversationHistory,
  getLatestTokenPrice
};
