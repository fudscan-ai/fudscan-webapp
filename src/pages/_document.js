import { Html, Head, Main, NextScript } from "next/document";


export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <title>FUDSCAN - The Ultimate FOMO/FUD Risk Scanner</title>
        <meta name="description" content="Turn every investor into a professional FUD-buster. Scan whitepapers, contracts, and teams for risk and red flags with AI-powered due diligence." />
        <meta property="og:title" content="FUDSCAN - The Ultimate FOMO/FUD Risk Scanner" />
        <meta property="og:description" content="AI-powered crypto risk analysis. Instant due diligence for whitepapers, smart contracts, and project teams." />
        <meta property="og:type" content="website" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
