// Test real API endpoints to verify they work

const tests = [
  {
    name: 'DexScreener Search (Public API - No Auth)',
    url: 'https://api.dexscreener.com/latest/dex/search?q=ADA',
    method: 'GET',
    headers: { 'Accept': '*/*' }
  },
  {
    name: 'DexScreener Search - BTC',
    url: 'https://api.dexscreener.com/latest/dex/search?q=BTC',
    method: 'GET',
    headers: { 'Accept': '*/*' }
  }
];

async function testEndpoint(test) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing: ${test.name}`);
  console.log(`URL: ${test.url}`);
  console.log('-'.repeat(70));

  try {
    const response = await fetch(test.url, {
      method: test.method,
      headers: test.headers
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log(`\nResponse Preview (first 500 chars):`);
      console.log(JSON.stringify(data, null, 2).substring(0, 500));
      console.log(`\n✅ SUCCESS - API is working!`);

      // Show some key data if available
      if (data.pairs && data.pairs.length > 0) {
        console.log(`\nFound ${data.pairs.length} trading pairs`);
        const firstPair = data.pairs[0];
        if (firstPair) {
          console.log(`First pair: ${firstPair.baseToken?.symbol || 'Unknown'} on ${firstPair.dexId || 'Unknown DEX'}`);
          console.log(`Price USD: $${firstPair.priceUsd || 'N/A'}`);
          console.log(`Liquidity: $${firstPair.liquidity?.usd || 'N/A'}`);
        }
      }
    } else {
      const errorText = await response.text();
      console.log(`\n❌ HTTP Error: ${errorText.substring(0, 200)}`);
    }

  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
  }
}

async function testAll() {
  console.log('🔧 Testing Real API Endpoints');
  console.log('This will verify that our real APIs are accessible\n');

  for (const test of tests) {
    await testEndpoint(test);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('✅ Testing complete!');
}

testAll().catch(console.error);
