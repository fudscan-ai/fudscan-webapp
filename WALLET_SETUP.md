# Quick Setup: Coinbase Wallet Integration

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

This will install the new wallet dependencies:
- `wagmi@^2.14.8` - React hooks for Ethereum
- `@tanstack/react-query@^5.62.14` - State management
- `@coinbase/wallet-sdk@^4.3.2` - Coinbase Wallet connector

### 2. Start Development Server

```bash
npm run dev
```

Visit: **http://localhost:3002**

### 3. Test Wallet Connection

1. **Install Coinbase Wallet** browser extension from https://www.coinbase.com/wallet
2. **Create or import** a wallet
3. **Switch to Base Sepolia** testnet (for testing)
4. **Get test ETH** from https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
5. **Click "Connect Wallet"** in FUDSCAN (top-right corner)
6. **Approve** the connection in your Coinbase Wallet
7. **See your address** displayed in the UI

## What Was Changed

### New Files Created

1. **`src/lib/wagmi.js`** - Wagmi configuration for Base chain
2. **`src/components/WalletConnectButton.js`** - Wallet UI component (system.css styled)
3. **`WALLET_INTEGRATION.md`** - Complete documentation
4. **`WALLET_SETUP.md`** - This quick guide

### Modified Files

1. **`package.json`** - Added wallet dependencies
2. **`src/pages/_app.js`** - Added WagmiProvider and QueryClientProvider
3. **`src/pages/chat.js`** - Added WalletConnectButton to header

### File Structure

```
src/
├── components/
│   └── WalletConnectButton.js  ← NEW: Wallet UI component
├── lib/
│   └── wagmi.js                ← NEW: Wagmi config
├── pages/
│   ├── _app.js                 ← MODIFIED: Added providers
│   └── chat.js                 ← MODIFIED: Added button
```

## Features

✅ **Coinbase Wallet integration**
✅ **Base mainnet + testnet support**
✅ **System.css styling** (Mac System 6 aesthetic)
✅ **Top-right positioning**
✅ **Non-blocking** - works without wallet connection
✅ **Production-ready**

## Usage Plan Differentiation (Future)

The setup allows you to differentiate features based on wallet connection:

```javascript
import { useAccount } from 'wagmi';

function FeatureComponent() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return <div>Connect wallet to access premium features</div>;
  }

  return <div>Premium content here</div>;
}
```

## Network Configuration

**Testnet (Development):**
- Network: Base Sepolia
- Chain ID: 84532
- RPC: https://sepolia.base.org
- Explorer: https://sepolia.basescan.org

**Mainnet (Production):**
- Network: Base
- Chain ID: 8453
- RPC: https://mainnet.base.org
- Explorer: https://basescan.org

## Troubleshooting

### Dependencies won't install (network issue)

If you have network connectivity issues:
```bash
# Try with different registry
npm install --registry=https://registry.npmjs.org/

# Or use legacy peer deps (already configured in .npmrc)
npm install --legacy-peer-deps
```

### Port already in use

If port 3002 is taken:
```bash
# Edit package.json, change port
"dev": "next dev -p 3003"  # or any other port
```

### Wallet button doesn't appear

1. Check that `npm install` completed successfully
2. Restart dev server: `Ctrl+C` then `npm run dev`
3. Clear browser cache and reload

### Can't connect wallet

1. Make sure Coinbase Wallet extension is installed
2. Switch to Base or Base Sepolia network in wallet
3. Try refreshing the page
4. Check browser console for errors

## Next Steps

1. **Install dependencies:** `npm install`
2. **Start server:** `npm run dev`
3. **Test connection** with Coinbase Wallet
4. **Implement usage tiers** based on `isConnected` state
5. **Add backend authentication** (see WALLET_INTEGRATION.md)

## Support

For detailed documentation, see **WALLET_INTEGRATION.md**

For wallet SDK docs: https://docs.cloud.coinbase.com/wallet-sdk
For wagmi docs: https://wagmi.sh
