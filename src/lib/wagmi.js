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
      enableMobileWalletLink: false, // Disable mobile wallet link to reduce external requests
      // Disable analytics to prevent blocked requests to cca-lite.coinbase.com
      overrideIsMetaMask: false,
      headlessMode: false,
    }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});
