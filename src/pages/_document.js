import { Html, Head, Main, NextScript } from "next/document";


export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="description" content="Turn every investor into a professional FUD-buster. Scan whitepapers, contracts, and teams for risk and red flags with AI-powered due diligence." />
        <meta property="og:title" content="FUDSCAN - The Ultimate FOMO/FUD Risk Scanner" />
        <meta property="og:description" content="AI-powered crypto risk analysis. Instant due diligence for whitepapers, smart contracts, and project teams." />
        <meta property="og:type" content="website" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Intercept fetch to prevent Coinbase Analytics errors
              (function() {
                const originalFetch = window.fetch;
                window.fetch = function(...args) {
                  const url = args[0]?.toString() || '';
                  if (url.includes('cca-lite.coinbase.com')) {
                    return Promise.resolve(new Response('{}', {
                      status: 200,
                      statusText: 'OK',
                      headers: { 'Content-Type': 'application/json' }
                    }));
                  }
                  return originalFetch.apply(this, args);
                };
              })();
            `,
          }}
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
