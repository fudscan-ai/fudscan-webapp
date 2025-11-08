import "@/styles/globals.css";
import "../styles/global.css";
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';
import { useEffect } from 'react';

const queryClient = new QueryClient();

export default function App({ Component, pageProps }) {
  // Suppress Coinbase Analytics console errors
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      // Filter out Coinbase Analytics SDK errors
      const message = args[0]?.toString() || '';
      if (
        message.includes('Analytics SDK') ||
        message.includes('cca-lite.coinbase.com')
      ) {
        return; // Suppress these specific errors
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <style jsx global>{`
          @import url('/system.css');

          /* System.css is now loaded with Chicago and Geneva fonts */
          html, body {
            font-family: Chicago_12, Chicago, Monaco, Geneva_9, Courier, monospace;
            background: linear-gradient(90deg, var(--primary) 21px, transparent 1%) center,
                        linear-gradient(var(--primary) 21px, transparent 1%) center,
                        var(--secondary);
            background-size: 22px 22px;
            background-attachment: fixed;
          }

          /* Text size variants using Chicago font */
          .mac-text {
            font-family: Chicago_12, Chicago, Monaco, monospace;
            font-size: 12px;
            line-height: 1.5;
          }

          .mac-text-sm {
            font-family: Geneva_9, Monaco, monospace;
            font-size: 9px;
            line-height: 1.4;
          }

          .mac-text-lg {
            font-family: Chicago, monospace;
            font-size: 18px;
            line-height: 1.6;
          }

          .mac-heading {
            font-family: Chicago, monospace;
            font-size: 1em;
          }
        `}</style>
        <main className="antialiased">
          <Component {...pageProps} />
        </main>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
