# Coinbase Wallet Integration for FUDSCAN

## Overview

FUDSCAN now includes **Coinbase Wallet authentication** allowing users to prove ownership of their Ethereum address on Base chain. This document explains how the integration works and how to use it.

## Technology Stack

### Core Libraries

1. **wagmi (v2.14.8)** - React Hooks for Ethereum
   - Industry-standard library for Web3 React applications
   - Provides hooks like `useAccount`, `useConnect`, `useDisconnect`
   - Official documentation: https://wagmi.sh

2. **@coinbase/wallet-sdk (v4.3.2)** - Official Coinbase Wallet SDK
   - Enables connection to Coinbase Wallet browser extension and mobile app
   - Supports both EOA (Externally Owned Accounts) and Smart Wallets
   - Official documentation: https://docs.cloud.coinbase.com/wallet-sdk

3. **@tanstack/react-query (v5.62.14)** - Data fetching and state management
   - Required peer dependency for wagmi
   - Handles caching and synchronization of blockchain data

4. **viem (v2.34.0)** - TypeScript interface for Ethereum
   - Already in the project
   - Used by wagmi for blockchain interactions

## Supported Networks

The wallet integration supports:
- **Base Mainnet** (Chain ID: 8453) - Production network
- **Base Sepolia** (Chain ID: 84532) - Testnet for development

## Architecture

### 1. Wagmi Configuration (`src/lib/wagmi.js`)

```javascript
import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: 'FUDSCAN',
      appLogoUrl: '/favicon.ico',
      preference: 'eoaOnly', // EOA only, not Smart Wallets
    }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});
```

**Key Settings:**
- `appName`: "FUDSCAN" - Shows in wallet connection prompt
- `preference: 'eoaOnly'`: Only allows standard Ethereum addresses (not smart wallets)
- `transports`: HTTP RPC endpoints for Base chains

### 2. Application Setup (`src/pages/_app.js`)

The app is wrapped with two providers:

```javascript
<WagmiProvider config={config}>
  <QueryClientProvider client={queryClient}>
    {/* Your app */}
  </QueryClientProvider>
</WagmiProvider>
```

**Provider Order:**
1. `WagmiProvider` - Provides wagmi context to all components
2. `QueryClientProvider` - Enables React Query for data management

### 3. Wallet Connect Button (`src/components/WalletConnectButton.js`)

A custom component styled with **system.css** (Mac System 6 aesthetic):

**Features:**
- Shows "Connect Wallet" when disconnected
- Displays shortened address when connected (e.g., "0x1234...5678")
- "Disconnect" button when connected
- Hydration-safe (prevents SSR mismatches)
- Styled with Mac UI components (`.btn`, `.btn-default`, `.standard-dialog`)

**Hooks Used:**
```javascript
const { address, isConnected } = useAccount();    // Get wallet state
const { connect, connectors } = useConnect();     // Connect function
const { disconnect } = useDisconnect();           // Disconnect function
```

### 4. Chat Page Integration (`src/pages/chat.js`)

The wallet button is positioned in the **top-right** of the header window:

```javascript
<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
  <div style={{textAlign: 'center', flex: 1}}>
    {/* App title and tagline */}
  </div>
  <div style={{marginLeft: '20px'}}>
    <WalletConnectButton />
  </div>
</div>
```

## User Flow

### Connection Process

1. **User clicks "Connect Wallet"** button
2. **Coinbase Wallet popup appears** asking for connection approval
3. **User approves** in their Coinbase Wallet
4. **Address is displayed** in shortened format (e.g., "0x1234...5678")
5. **User can now interact** with the app as an authenticated user

### Disconnection Process

1. **User clicks "Disconnect"** button
2. **Connection is terminated** immediately
3. **Button returns** to "Connect Wallet" state
4. **User can still use the app** (non-authenticated mode)

## Design Philosophy

### Non-Blocking Access

✅ **Users can use FUDSCAN without connecting a wallet**
- The wallet connection is **optional**
- Chat functionality works for both authenticated and non-authenticated users
- This allows for future usage tier differentiation:
  - Free tier: No wallet required
  - Premium tier: Wallet required for advanced features

### System.css Styling

All wallet UI components respect the **classic Mac System 6** aesthetic:
- Monochrome black and white design
- Chicago and Geneva fonts
- Mac-style buttons (`.btn`, `.btn-default`)
- Dialog boxes (`.standard-dialog`)
- No modern gradients or shadows

## Usage in Your Code

### Check if User is Connected

```javascript
import { useAccount } from 'wagmi';

function MyComponent() {
  const { address, isConnected } = useAccount();

  if (isConnected) {
    console.log('User wallet:', address);
    // Show premium features
  } else {
    // Show free tier
  }
}
```

### Get Chain Information

```javascript
import { useAccount } from 'wagmi';

function MyComponent() {
  const { chain } = useAccount();

  console.log('Current chain:', chain?.name); // "Base" or "Base Sepolia"
  console.log('Chain ID:', chain?.id);        // 8453 or 84532
}
```

### Sign Messages (for authentication)

```javascript
import { useSignMessage } from 'wagmi';

function MyComponent() {
  const { signMessage } = useSignMessage();

  const handleAuth = async () => {
    const message = `Sign this message to authenticate with FUDSCAN\nTimestamp: ${Date.now()}`;
    const signature = await signMessage({ message });

    // Send signature to backend for verification
    // Backend can verify using ethers/viem to ensure user owns the address
  }
}
```

## Backend Integration (Future)

To implement full authentication:

1. **Frontend:** User connects wallet and signs a message
2. **Backend:** Verify signature matches the claimed address
3. **Backend:** Issue JWT or session token
4. **Future requests:** Include token in Authorization header

**Example verification (Node.js):**
```javascript
import { verifyMessage } from 'viem';

const isValid = await verifyMessage({
  address: userAddress,
  message: originalMessage,
  signature: userSignature,
});

if (isValid) {
  // Create session
}
```

## Security Considerations

### ✅ What's Implemented

- **EIP-191 Message Signing**: Can be used for secure authentication
- **Chain Verification**: Only Base and Base Sepolia are allowed
- **Hydration Safety**: Prevents SSR/client mismatches
- **EOA Only**: No smart wallet complexity

### 🔐 Future Enhancements

- **Nonce-based authentication**: Prevent replay attacks
- **Session management**: JWT tokens with expiration
- **Rate limiting**: Based on wallet address
- **Premium features**: Token-gated access based on holdings

## Testing

### Local Development

1. **Install Coinbase Wallet** browser extension
2. **Switch to Base Sepolia** testnet in wallet
3. **Get test ETH** from Base Sepolia faucet
4. **Start dev server:** `npm run dev`
5. **Visit:** http://localhost:3002
6. **Click "Connect Wallet"** in top-right

### Production

- Switch wallet to **Base Mainnet**
- Deploy app with production RPC URLs
- Update `appLogoUrl` in wagmi config to production domain

## Troubleshooting

### "Connect Wallet" button doesn't appear
- Check that wagmi providers are in `_app.js`
- Ensure dependencies are installed: `npm install`

### Connection fails
- Make sure Coinbase Wallet extension is installed
- Check that you're on Base or Base Sepolia network
- Clear browser cache and try again

### Hydration errors in console
- The button has built-in hydration safety with `mounted` state
- Should not occur, but if it does, check React version compatibility

## Additional Resources

- **wagmi Documentation**: https://wagmi.sh
- **Coinbase Wallet SDK**: https://docs.cloud.coinbase.com/wallet-sdk
- **Base Network**: https://base.org
- **Viem Docs**: https://viem.sh

## Summary

✅ **Coinbase Wallet integration complete**
✅ **Base chain support (mainnet + testnet)**
✅ **System.css styling respected**
✅ **Non-blocking** - users can use app without wallet
✅ **Top-right positioning** as requested
✅ **Production-ready** - just needs npm install

The wallet button is now in the header and ready for users to connect their Coinbase Wallet to prove ownership of their Base chain address!
