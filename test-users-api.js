/**
 * Test script to verify /api/autoria/users endpoint
 * Run with: node test-users-api.js
 */

const http = require('http');

console.log('🧪 Testing /api/autoria/users endpoint...\n');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/autoria/users',
  method: 'GET',
  headers: {
    'Accept': 'application/json',
  }
};

const req = http.request(options, (res) => {
  console.log(`📡 Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  console.log('');

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📦 Response Body:');
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
      
      if (json.success) {
        const count = json.data?.count || 0;
        console.log(`\n✅ SUCCESS: Loaded ${count} users`);
        
        if (json.data?.results) {
          console.log('\n👥 Users:');
          json.data.results.forEach((user, idx) => {
            console.log(`  ${idx + 1}. ${user.email} (ID: ${user.id}, Active: ${user.is_active})`);
          });
        }
      } else {
        console.log('\n❌ ERROR: Request was not successful');
        console.log('Error:', json.error);
      }
    } catch (e) {
      console.log('❌ Failed to parse JSON:');
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.log('\n💡 Make sure the Next.js dev server is running on port 3000');
  console.log('   Run: npm run dev');
});

req.end();
