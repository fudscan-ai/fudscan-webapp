import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';

// Configure wagmi with Base chain and Coinbase Wallet
export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: 'FUDSCAN',
      appLogoUrl: '/favicon.ico',
      preference: 'eoaOnly', // Use EOA (Externally Owned Account) only
    }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});
