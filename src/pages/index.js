import { useState } from 'react';
import Head from 'next/head';
import ChatBox from '@/components/ChatBox';
import Header from '@/components/Header';

export default function HomePage() {
  const [apiKey, setApiKey] = useState('test_api_key_12345');

  return (
    <>
      <Head>
        <title>FUDSCAN - The Ultimate Trading Scanner</title>
      </Head>
      <div style={{ minHeight: '100vh' }}>
        <Header />
        <div style={{
          padding: '1rem',
          maxWidth: '900px',
          margin: '0 auto'
        }}>
          <ChatBox
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
            height="calc(100vh - 120px)"
          />
        </div>
      </div>
    </>
  );
}
