#!/usr/bin/env node
/**
 * Interactive OAuth Keys Update Script
 * Помогает обновить Google OAuth ключи в env-config/.env.secrets
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Функция для шифрования
function encryptValue(text) {
  if (!text) return text;
  const encoded = Buffer.from(text).toString('base64');
  const reversed = encoded.split('').reverse().join('');
  return 'ENC_' + reversed;
}

// Создаем интерфейс для ввода
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔐 Google OAuth Keys Update');
console.log('=' .repeat(60));
console.log('');
console.log('Этот скрипт поможет обновить Google OAuth credentials.');
console.log('');
console.log('📝 Вам понадобятся:');
console.log('  1. GOOGLE_CLIENT_ID (например: 123...xyz.apps.googleusercontent.com)');
console.log('  2. GOOGLE_CLIENT_SECRET (например: GOCSPX-...)');
console.log('');
console.log('❓ Если у вас нет этих данных, прочитайте OAUTH_SETUP_GUIDE.md');
console.log('');

// Спрашиваем Client ID
rl.question('Введите GOOGLE_CLIENT_ID: ', (clientId) => {
  if (!clientId || clientId.trim() === '') {
    console.log('❌ Client ID не может быть пустым');
    rl.close();
    return;
  }

  // Спрашиваем Client Secret
  rl.question('Введите GOOGLE_CLIENT_SECRET: ', (clientSecret) => {
    if (!clientSecret || clientSecret.trim() === '') {
      console.log('❌ Client Secret не может быть пустым');
      rl.close();
      return;
    }

    // Шифруем
    const encryptedClientId = encryptValue(clientId.trim());
    const encryptedClientSecret = encryptValue(clientSecret.trim());

    console.log('');
    console.log('✅ Ключи зашифрованы:');
    console.log(`  Client ID: ${encryptedClientId.substring(0, 40)}...`);
    console.log(`  Client Secret: ${encryptedClientSecret.substring(0, 40)}...`);
    console.log('');

    // Читаем текущий .env.secrets
    const secretsPath = path.join(__dirname, 'env-config', '.env.secrets');
    let content = '';
    
    if (fs.existsSync(secretsPath)) {
      content = fs.readFileSync(secretsPath, 'utf8');
      
      // Обновляем ключи
      content = content.replace(
        /GOOGLE_CLIENT_ID=.*/,
        `GOOGLE_CLIENT_ID=${encryptedClientId}`
      );
      content = content.replace(
        /GOOGLE_CLIENT_SECRET=.*/,
        `GOOGLE_CLIENT_SECRET=${encryptedClientSecret}`
      );
      content = content.replace(
        /NEXT_PUBLIC_GOOGLE_CLIENT_ID=.*/,
        `NEXT_PUBLIC_GOOGLE_CLIENT_ID=${encryptedClientId}`
      );
    } else {
      console.log('❌ Файл env-config/.env.secrets не найден');
      rl.close();
      return;
    }

    // Сохраняем
    fs.writeFileSync(secretsPath, content, 'utf8');

    console.log('✅ Файл env-config/.env.secrets обновлен!');
    console.log('');
    console.log('📋 Следующие шаги:');
    console.log('  1. Перезапустите Next.js dev server');
    console.log('  2. Перейдите на http://localhost:3000');
    console.log('  3. Попробуйте войти через Google');
    console.log('');

    rl.close();
  });
});

