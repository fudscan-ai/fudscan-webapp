import generateResponse from '@/utils/openai';

/**
 * Simple chat endpoint for FUDSCAN
 * Uses OpenAI API key from environment variables
 * No database authentication required
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { message, conversationHistory } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        message: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.'
      });
    }

    // Build conversation context from history
    let conversationContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext = conversationHistory
        .map(msg => `${msg.type === 'user' ? 'User' : 'FUDSCAN'}: ${msg.content}`)
        .join('\n');
    }

    // Generate response using OpenAI
    const responseText = await generateResponse(message, conversationContext);

    // Parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (e) {
      // If not JSON, return as plain text
      parsedResponse = {
        intent: 'unmatched',
        reply: responseText
      };
    }

    return res.status(200).json({
      message: parsedResponse.reply || responseText,
      intent: parsedResponse.intent || 'unmatched',
      coin: parsedResponse.coin || null
    });

  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      message: 'Failed to generate response',
      error: error.message
    });
  }
}
