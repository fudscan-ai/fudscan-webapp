import generateResponse from "../src/utils/openai.js";
import { Client } from "@xmtp/node-sdk";
import {
  createSigner,
  getEncryptionKeyFromHex,
  validateEnvironment,
} from "../helpers/client.js";
import { saveMessage, saveOutgoingMessage, getConversationHistory } from "../src/utils/db.js";
// import { fetchTokenPrice, calculateTokenReturn, VALID_TOKENS } from "../src/utils/tokenUtils.js";
import dotenv from "dotenv";
dotenv.config();


const { COINTEXT_AGENT_PRIVATE_KEY, ENCRYPTION_KEY, OPENAI_API_KEY, XMTP_ENV, DATABASE_URL, GAME_API_KEY } =
  validateEnvironment([
    "COINTEXT_AGENT_PRIVATE_KEY",
    "ENCRYPTION_KEY",
    "OPENAI_API_KEY",
    "XMTP_ENV",
    "GAME_API_KEY",
    "DATABASE_URL"
  ]);


async function main() {
  
  const signer = createSigner(COINTEXT_AGENT_PRIVATE_KEY);
  const dbEncryptionKey = getEncryptionKeyFromHex(ENCRYPTION_KEY);
  const client = await Client.create(signer, {
    dbEncryptionKey,
    env: XMTP_ENV,
  });

  console.log("XMTP client created", {
    dbEncryptionKey,
    env: XMTP_ENV,
  });
  console.log(`Receiver ready. Waiting for messages... ${client.inboxId}`);
  console.log(client.conversations);

  await client.conversations.streamAllMessages(async (error, message) => {
    if (error) {
      console.error("Message error:", error);
      return;
    }

    console.log(message);
    if (message.senderInboxId === client.inboxId) return;

    const conversation = await client.conversations.getConversationById(message.conversationId);
    console.log(conversation);
    if (!conversation) return;
    
    // Store message in PostgreSQL database
    try {
      await saveMessage(message);
    } catch (dbError) {
      console.error("Error saving message to database:", dbError);
      // Continue processing even if database save fails
    }

    const userMsg = message.content;
    console.log(`Received: ${userMsg}`);

    try {
      // Get conversation history for context (last 5 messages)
      const messageHistory = await getConversationHistory(message.conversationId, 5);
      
      // Format message history for context
      const conversationContext = messageHistory
        .map(msg => `${msg.sender_inbox_id === client.inboxId ? 'Bot' : 'User'}: ${msg.content}`)
        .reverse()
        .join('\n');
      
      // Generate response with conversation context
      let reply = await generateResponse(userMsg, conversationContext);
      if (!reply) {
        reply = "🤖 Sorry, I couldn't think of a reply.";
      }
      // try {
      //   // Parse the JSON response
      //   const responseObj = JSON.parse(reply);
        
      //   // Handle different intents
      //   if (responseObj.intent === 'token_price' && responseObj.coin) {
      //     // Handle token price intent
      //     const symbol = responseObj.coin.toUpperCase();
          
      //     if (VALID_TOKENS.includes(symbol)) {
      //       try {
      //         // Use tokenUtils to fetch the latest price
      //         const price = await fetchTokenPrice(symbol);
              
      //         if (price !== null) {
      //           responseObj.reply = `Current price of ${symbol}: $${price.toFixed(6)}`;
      //         } else {
      //           responseObj.reply = `Sorry, I couldn't fetch the current price for ${symbol}.`;
      //         }
      //       } catch (error) {
      //         console.error(`Error fetching price for ${symbol}:`, error);
      //         responseObj.reply = `Sorry, there was an error fetching the price for ${symbol}.`;
      //       }
      //     } else {
      //       responseObj.reply = `Sorry, I don't have information about ${symbol}.`;
      //     }
          
      //     // Update the reply with the new response
      //     reply = JSON.stringify(responseObj);
      //   } else if (responseObj.intent === 'portfolio_return' && responseObj.coin) {
      //     // Handle portfolio return intent
      //     const symbol = responseObj.coin.toUpperCase();
          
      //     if (VALID_TOKENS.includes(symbol)) {
      //       try {
      //         // Use tokenUtils to calculate token return
      //         const returnData = await calculateTokenReturn(symbol);
              
      //         if (returnData) {
      //           responseObj.reply = `${symbol} return: ${returnData.formattedReturn} (from $${returnData.initialPrice} to $${returnData.currentPrice.toFixed(6)})`;
      //         } else {
      //           responseObj.reply = `Sorry, I couldn't find price data for ${symbol}.`;
      //         }
      //       } catch (error) {
      //         console.error(`Error calculating return for ${symbol}:`, error);
      //         responseObj.reply = `Sorry, there was an error calculating the return for ${symbol}.`;
      //       }
      //     } else {
      //       responseObj.reply = `Sorry, I don't track return information for ${symbol}.`;
      //     }
          
      //     // Update the reply with the new response
      //     reply = JSON.stringify(responseObj);
      //   }
      // } catch (parseError) {
      //   console.error("Error parsing response JSON:", parseError);
      //   // If JSON parsing fails, use the original reply
      // }

      // // Send the reply
      // await conversation.send(reply);
      // console.log(reply);
      
      // // Save the outgoing message to the database
      // try {
      //   await saveOutgoingMessage(
      //     reply,
      //     message.conversationId,
      //     client.inboxId,
      //     message.senderInboxId,
      //     message.id // Reference to the original message
      //   );
      // } catch (dbError) {
      //   console.error("Error saving outgoing message to database:", dbError);
      //   // Continue even if saving to database fails
      // }
    } catch (e) {
      console.error("GPT error:", e);
      await conversation.send("🤖 GPT error.");
    }
  });
}

main().catch(console.error);