/**
 * Тестовый скрипт для проверки Google OAuth конфигурации
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Функция для загрузки .env файла
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      env[key.trim()] = value.trim();
    }
  });

  return env;
}

// Загружаем переменные из env-config/
const envConfigDir = path.resolve(__dirname, 'env-config');
const baseEnv = loadEnvFile(path.join(envConfigDir, '.env.base'));
const secretsEnv = loadEnvFile(path.join(envConfigDir, '.env.secrets'));
const localEnv = loadEnvFile(path.join(envConfigDir, '.env.local'));

// Объединяем переменные
const allEnv = { ...baseEnv, ...secretsEnv, ...localEnv };

console.log('🔍 Google OAuth Configuration Test');
console.log('=====================================');

// Проверяем основные переменные
console.log('📋 Environment Variables:');
console.log(`  GOOGLE_CLIENT_ID: ${allEnv.GOOGLE_CLIENT_ID ? '[SET]' : '[MISSING]'}`);
console.log(`  GOOGLE_CLIENT_SECRET: ${allEnv.GOOGLE_CLIENT_SECRET ? '[SET]' : '[MISSING]'}`);
console.log(`  NEXTAUTH_URL: ${allEnv.NEXTAUTH_URL || '[NOT_SET]'}`);
console.log(`  NEXTAUTH_SECRET: ${allEnv.NEXTAUTH_SECRET ? '[SET]' : '[MISSING]'}`);

// Проверяем callback URL
const callbackUrl = `${allEnv.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/google`;
console.log(`  Callback URL: ${callbackUrl}`);

console.log('\n🔗 Google OAuth URLs:');
console.log(`  Authorization URL: https://accounts.google.com/o/oauth2/v2/auth`);
console.log(`  Token URL: https://oauth2.googleapis.com/token`);

// Формируем тестовый authorization URL
if (allEnv.GOOGLE_CLIENT_ID) {
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', allEnv.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  console.log('\n🚀 Test Authorization URL:');
  console.log(authUrl.toString());
}

console.log('\n✅ Next Steps:');
console.log('1. Убедитесь, что в Google Cloud Console настроен redirect URI:');
console.log(`   ${callbackUrl}`);
console.log('2. Откройте http://localhost:3000 в браузере');
console.log('3. Попробуйте войти через Google OAuth');
console.log('4. Проверьте логи в консоли браузера и терминале Next.js');

// Проверяем доступность frontend
console.log('\n🌐 Testing Frontend Availability...');
const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/providers',
  method: 'GET'
}, (res) => {
  console.log(`✅ Frontend responds with status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const providers = JSON.parse(data);
      console.log('📋 Available providers:', Object.keys(providers));
      if (providers.google) {
        console.log('✅ Google provider is configured');
      } else {
        console.log('❌ Google provider is NOT configured');
      }
    } catch (e) {
      console.log('⚠️  Could not parse providers response');
    }
  });
});

req.on('error', (e) => {
  console.log(`❌ Frontend is not available: ${e.message}`);
  console.log('   Make sure frontend is running on http://localhost:3000');
});

req.end();
