import { Client, IdentifierKind } from "@xmtp/node-sdk";
import readline from "readline";
import {
  createSigner,
  getEncryptionKeyFromHex,
  validateEnvironment,
} from "./helpers/client.js";
import dotenv from "dotenv";
dotenv.config();

let {
  SENDER_WALLET_KEY,
  ENCRYPTION_KEY,
  TARGET_ADDRESS,
  XMTP_ENV,
} = validateEnvironment([
  "SENDER_WALLET_KEY",
  "ENCRYPTION_KEY",
  "TARGET_ADDRESS",
  "XMTP_ENV",
]);

async function main() {
  const signer = createSigner(SENDER_WALLET_KEY);
  const dbEncryptionKey = getEncryptionKeyFromHex(ENCRYPTION_KEY);
  const client = await Client.create(signer, {
    dbEncryptionKey,
    env: XMTP_ENV,
  });

//   client.send(TARGET_ADDRESS, "Hello, how are you?");
//   const conversation = await client.conversations.getConversationById(TARGET_ADDRESS);
//   console.log(`Connected. Type message to send to ${TARGET_ADDRESS}:\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  /**
   *     • InboxId: cbf36b9a785a86a0fe6ab26cb49ade0cc4280a50e9acc1e97f339c9fe3dc1c2b
    • Address: 0xb4250177ad7e8f96ab3f689916c9026c8731a9ae
   */
  TARGET_ADDRESS = "0x10f7E006215Fc5F0e15836b63817685AcD531d42"
  const accountIdentifier = {
    identifier: TARGET_ADDRESS, // Ethereum address as the identifier
    identifierKind: IdentifierKind.Ethereum, // Specifies the identity type
  };

  rl.on("line", async (line) => {
    if (line.trim()) {
        console.log(`send dm to ${TARGET_ADDRESS}`);
      const conversation = await client.conversations.newDmWithIdentifier(accountIdentifier);
      await conversation.send(line);
      console.log("✅ Sent:", line);
    }
  });
  client.conversations.streamAllMessages(async (error, message) => {
    if (error) {
      console.error("Message error:", error);
      return;
    }

    // console.log(message);
    if (message.senderInboxId === client.inboxId) return;

    const conversation = await client.conversations.getConversationById(message.conversationId);
    if (!conversation) return;

    const userMsg = message.content;
    console.log(`Received: \n${userMsg}`);

  });
  console.log("start your chat : \n");
}

main().catch(console.error);