/**
 * Test Django backend /api/users/public/list/ endpoint directly
 * Run with: node test-backend-direct.js
 */

const http = require('http');

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
console.log(`🧪 Testing Django backend at ${BACKEND_URL}\n`);

const url = new URL(`${BACKEND_URL}/api/users/public/list/`);

console.log(`📡 GET ${url.href}`);
console.log('');

const options = {
  hostname: url.hostname,
  port: url.port || 8000,
  path: url.pathname,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
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
      
      const count = json.count || (json.results ? json.results.length : 0);
      console.log(`\n✅ Response received with ${count} users`);
      
      if (json.results) {
        console.log('\n👥 Users:');
        json.results.slice(0, 5).forEach((user, idx) => {
          console.log(`  ${idx + 1}. ${user.email} (ID: ${user.id})`);
        });
        if (json.results.length > 5) {
          console.log(`  ... and ${json.results.length - 5} more`);
        }
      }
    } catch (e) {
      console.log(data || '(empty response)');
      console.log('\n⚠️  Response is not JSON');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Connection failed:', error.message);
  console.log('\n💡 Possible issues:');
  console.log('   1. Django backend is not running');
  console.log('   2. Backend is running on a different port');
  console.log('   3. Check NEXT_PUBLIC_BACKEND_URL in .env.local');
  console.log('\n🔧 To start Django backend:');
  console.log('   cd backend');
  console.log('   python manage.py runserver');
});

req.end();
