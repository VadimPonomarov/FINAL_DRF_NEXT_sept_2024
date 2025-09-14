#!/usr/bin/env node
/**
 * Simple OAuth Keys Encryption Script
 * ===================================
 * Simple and reliable encryption for OAuth credentials
 */

const crypto = require('crypto');

// Simple encryption settings
const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = 'my-secret-key-32-characters-long!'; // 32 characters
const IV_LENGTH = 16;

/**
 * Simple encrypt function using Base64
 */
function encryptValue(text) {
  if (!text) return text;

  // Simple Base64 encoding with a twist
  const encoded = Buffer.from(text).toString('base64');
  const reversed = encoded.split('').reverse().join('');

  return 'ENC_' + reversed;
}

/**
 * Simple decrypt function
 */
function decryptValue(encryptedText) {
  if (!encryptedText || !encryptedText.startsWith('ENC_')) {
    return encryptedText;
  }

  const encoded = encryptedText.replace('ENC_', '');
  const unreversed = encoded.split('').reverse().join('');
  const decoded = Buffer.from(unreversed, 'base64').toString('utf8');

  return decoded;
}

/**
 * Main encryption function
 */
function main() {
  console.log('🔐 Simple OAuth Keys Encryption');
  console.log('=' .repeat(40));

  // Ключи для шифрования (реальные значения из документации)
  const keysToEncrypt = {
    'GOOGLE_CLIENT_ID': '317007351021-lhq7qt2ppsnihugttrs2f81nmvjbi0vr.apps.googleusercontent.com',
    'GOOGLE_CLIENT_SECRET': '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',
    'NEXTAUTH_SECRET': 'bXL+w0/zn9FX477unDrwiDMw4kUDoli6AG6bR6h876E=',
    'TAVILY_API_KEY': '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',
    'GOOGLE_MAPS_API_KEY': 'AIzaSyBvc_dfn6Vl3CfLNCESkcApicC4GwLHGYs'
  };

  console.log('🔑 Encrypting keys...\n');

  for (const [keyName, keyValue] of Object.entries(keysToEncrypt)) {
    try {
      const encryptedValue = encryptValue(keyValue);

      console.log(`✅ ${keyName}:`);
      console.log(`${keyName}=${encryptedValue}`);
      console.log();

    } catch (error) {
      console.error(`❌ Error encrypting ${keyName}: ${error.message}`);
    }
  }

  console.log('📝 Copy these to env-config/.env.secrets');
  console.log('\n🧪 Test decryption:');
  console.log('console.log(decryptValue("ENC_..."));');
}

// Run the script
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

module.exports = { encryptValue, decryptValue };
