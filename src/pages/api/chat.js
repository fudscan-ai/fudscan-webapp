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

    console.log('Raw OpenAI response:', responseText);

    // Parse JSON response - try to extract JSON even if wrapped in markdown
    let parsedResponse;
    try {
      // First try direct parse
      parsedResponse = JSON.parse(responseText);
    } catch (e) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          parsedResponse = JSON.parse(jsonMatch[1]);
        } catch (e2) {
          console.error('Failed to parse extracted JSON:', e2);
        }
      }

      // If still no success, try to find raw JSON in the text
      if (!parsedResponse) {
        const rawJsonMatch = responseText.match(/\{[\s\S]*"intent"[\s\S]*"reply"[\s\S]*\}/);
        if (rawJsonMatch) {
          try {
            parsedResponse = JSON.parse(rawJsonMatch[0]);
          } catch (e3) {
            console.error('Failed to parse raw JSON:', e3);
          }
        }
      }

      // Last resort - return as plain text
      if (!parsedResponse) {
        parsedResponse = {
          intent: 'unmatched',
          reply: responseText
        };
      }
    }

    console.log('Parsed response:', parsedResponse);

    // Extract the reply text - with better safety checks
    let replyText = parsedResponse.reply || parsedResponse.message || '';

    // If reply is still empty, something went wrong - log it and provide fallback
    if (!replyText || replyText.trim().length === 0) {
      console.error('No reply field found in parsed response:', parsedResponse);
      console.error('Original responseText:', responseText);
      replyText = 'Sorry, I received an invalid response. Please try again.';
    }

    const finalResponse = {
      message: replyText,
      intent: parsedResponse.intent || 'unmatched',
      coin: parsedResponse.coin || null
    };

    console.log('Sending to frontend:', finalResponse);

    return res.status(200).json(finalResponse);

  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      message: 'Failed to generate response',
      error: error.message
    });
  }
}
