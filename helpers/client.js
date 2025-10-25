import { getRandomValues } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { IdentifierKind } from "@xmtp/node-sdk";
import { fromString, toString } from "uint8arrays";
import { createWalletClient, http, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

/* 创建 XMTP 用户对象 */
export const createUser = (key) => {
  const account = privateKeyToAccount(key);
  return {
    key,
    account,
    wallet: createWalletClient({
      account,
      chain: sepolia,
      transport: http(),
    }),
  };
};

/* 创建 XMTP Signer */
export const createSigner = (key) => {
  const sanitizedKey = key.startsWith("0x") ? key : `0x${key}`;
  const user = createUser(sanitizedKey);
  return {
    type: "EOA",
    getIdentifier: () => ({
      identifierKind: IdentifierKind.Ethereum,
      identifier: user.account.address.toLowerCase(),
    }),
    signMessage: async (message) => {
      const signature = await user.wallet.signMessage({
        message,
        account: user.account,
      });
      return toBytes(signature);
    },
  };
};

/* 生成加密 key 的 hex */
export const generateEncryptionKeyHex = () => {
  const uint8Array = getRandomValues(new Uint8Array(32));
  return toString(uint8Array, "hex");
};

/* 从 hex 恢复加密 key */
export const getEncryptionKeyFromHex = (hex) => {
  return fromString(hex, "hex");
};

/* 获取 XMTP 本地数据库路径 */
export const getDbPath = (description = "xmtp") => {
  const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH ?? ".data/xmtp";
  if (!fs.existsSync(volumePath)) {
    fs.mkdirSync(volumePath, { recursive: true });
  }
  return `${volumePath}/${description}.db3`;
};

/* 输出 agent 状态 */
export const logAgentDetails = async (clients) => {
  const clientArray = Array.isArray(clients) ? clients : [clients];
  const clientsByAddress = clientArray.reduce((acc, client) => {
    const address = client.accountIdentifier?.identifier;
    acc[address] = acc[address] ?? [];
    acc[address].push(client);
    return acc;
  }, {});

  for (const [address, clientGroup] of Object.entries(clientsByAddress)) {
    const firstClient = clientGroup[0];
    const inboxId = firstClient.inboxId;
    const installationId = firstClient.installationId;
    const environments = clientGroup
      .map((c) => c.options?.env ?? "dev")
      .join(", ");

    console.log(`\x1b[38;2;252;76;52m
        ██╗  ██╗███╗   ███╗████████╗██████╗ 
        ╚██╗██╔╝████╗ ████║╚══██╔══╝██╔══██╗
         ╚███╔╝ ██╔████╔██║   ██║   ██████╔╝
         ██╔██╗ ██║╚██╔╝██║   ██║   ╚════██╗
        ██╔╝ ██╗██║ ╚═╝ ██║   ██║   █████╔╝
        ╚═╝  ╚═╝╚═╝     ╚═╝   ╚═╝   ╚════╝  
      \x1b[0m`);

    const conversations = await firstClient.conversations.list();
    const inboxState = await firstClient.preferences.inboxState();

    console.log(`
    ✓ XMTP Client:
      • InboxId: ${inboxId}
      • Address: ${address}
      • Conversations: ${conversations.length}
      • Installations: ${inboxState.installations.length}/5
      • InstallationId: ${installationId} 
      • Networks: ${environments}
      • URL: https://xmtp.chat/dm/${address}`);

    if (inboxState.installations.length >= 4) {
      console.log(
        `\n\x1b[33m⚠️  Warning: 5 is the max number of installations\nRun "yarn revoke <inbox-id> <installations-to-exclude>" to revoke old installations.\nExample: yarn revoke ${inboxId} ${installationId}\x1b[0m\n`
      );
    }
  }
};

/* 加载并验证 .env 变量 */
export function validateEnvironment(vars) {
  const missing = vars.filter((v) => !process.env[v]);

  if (missing.length) {
    try {
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const envVars = fs
          .readFileSync(envPath, "utf-8")
          .split("\n")
          .filter((line) => line.trim() && !line.startsWith("#"))
          .reduce((acc, line) => {
            const [key, ...val] = line.split("=");
            if (key && val.length) acc[key.trim()] = val.join("=").trim();
            return acc;
          }, {});
        missing.forEach((v) => {
          if (envVars[v]) process.env[v] = envVars[v];
        });
      }
    } catch (e) {
      console.error(e);
    }

    const stillMissing = vars.filter((v) => !process.env[v]);
    if (stillMissing.length) {
      console.error("Missing env vars:", stillMissing.join(", "));
      process.exit(1);
    }
  }

  return vars.reduce((acc, key) => {
    acc[key] = process.env[key];
    return acc;
  }, {});
}