async function testChatAPI() {
  console.log('🧪 Testing Chat API...\n');

  try {
    const response = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Tell me about Filecoin',
        stream: false
      })
    });

    console.log('Status:', response.status);
    console.log('Headers:', response.headers.get('content-type'));

    const data = await response.json();
    console.log('\n📊 Response:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testChatAPI();
