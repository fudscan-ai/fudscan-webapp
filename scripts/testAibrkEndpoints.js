// Test AIBrk API endpoints
const JWT_TOKEN = "cmh1cyebi008qqsux3xn3x280";

const endpoints = [
  {
    name: "Token Info",
    url: "https://api.aibrk.xyz/v1/token/info?symbol=BTC",
    method: "GET"
  },
  {
    name: "Token Holders",
    url: "https://api.aibrk.xyz/v1/token/holders?symbol=BTC&limit=10",
    method: "GET"
  },
  {
    name: "Token Liquidity",
    url: "https://api.aibrk.xyz/v1/token/liquidity?symbol=BTC",
    method: "GET"
  },
  {
    name: "Contract Audit",
    url: "https://api.aibrk.xyz/v1/contract/audit?address=0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    method: "GET"
  }
];

async function testEndpoint(endpoint) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing: ${endpoint.name}`);
  console.log(`URL: ${endpoint.url}`);
  console.log('-'.repeat(70));

  try {
    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`);

    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log(`\nResponse Data:`);
      console.log(JSON.stringify(data, null, 2).substring(0, 1000)); // First 1000 chars

      if (response.ok) {
        console.log(`\n✅ SUCCESS`);
      } else {
        console.log(`\n⚠️  HTTP Error but got JSON response`);
      }
    } else {
      const text = await response.text();
      console.log(`\nResponse (text):`);
      console.log(text.substring(0, 500));

      if (response.ok) {
        console.log(`\n✅ SUCCESS (non-JSON)`);
      } else {
        console.log(`\n❌ ERROR`);
      }
    }

  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
  }
}

async function testAll() {
  console.log('🔧 Testing AIBrk API Endpoints');
  console.log(`🔑 Using JWT Token: ${JWT_TOKEN.substring(0, 10)}...`);

  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('✅ Testing complete!');
}

testAll().catch(console.error);
