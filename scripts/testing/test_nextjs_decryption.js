#!/usr/bin/env node
/**
 * Test Next.js Decryption in Real Environment
 * ===========================================
 * Tests actual decryption of OAuth keys
 */

// Set up environment like Next.js would
process.env.NEXTAUTH_SECRET = 'bXL+w0/zn9FX477unDrwiDMw4kUDoli6AG6bR6h876E=';
process.env.GOOGLE_CLIENT_ID = 'nextjs_enc_qHNUzOl24kKCfnbgXqleQp2g6jW49jQapnquJw0qRyG1vcaeSaok0fNoegfHwjiqOWzy+sdi8G6sJwA/9KG9bw4GVpN+duq914vscweLQjPoSr/dQjTckqxwCoKggEsynnSyZgkDSiQ=';
process.env.GOOGLE_CLIENT_SECRET = 'nextjs_enc_pNi5XPb15inTeEGblxAQN+5XQPDv4/a2d300etzS7H5j6CBQve8lmmJ8ayGGbWX1+gwREu9mOEK3hx8jlK3O+M9msw==';

// Import crypto utilities (simulate Next.js environment)
const crypto = require('crypto');

// Replicate crypto-utils.ts logic
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is required for encryption');
  }
  
  const salt = Buffer.from('nextjs-oauth-encryption-salt-v1', 'utf8');
  return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha256');
}

function isEncrypted(value) {
  return value && typeof value === 'string' && value.startsWith('nextjs_enc_');
}

function decryptValue(encryptedValue) {
  if (!isEncrypted(encryptedValue)) {
    return encryptedValue;
  }

  try {
    const key = getEncryptionKey();
    
    const base64Data = encryptedValue.replace('nextjs_enc_', '');
    const combined = Buffer.from(base64Data, 'base64');
    
    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(-TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH, -TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from('nextjs-oauth', 'utf8'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
    
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

function getDecryptedOAuthConfig() {
  return {
    NEXTAUTH_SECRET: decryptValue(process.env.NEXTAUTH_SECRET || ''),
    GOOGLE_CLIENT_ID: decryptValue(process.env.GOOGLE_CLIENT_ID || ''),
    GOOGLE_CLIENT_SECRET: decryptValue(process.env.GOOGLE_CLIENT_SECRET || ''),
  };
}

// Test the decryption
console.log('🧪 Testing Next.js Decryption System');
console.log('=====================================');

try {
  const config = getDecryptedOAuthConfig();
  
  console.log('\n✅ Decryption Results:');
  console.log(`NEXTAUTH_SECRET: ${config.NEXTAUTH_SECRET ? '[DECRYPTED]' : '[FAILED]'}`);
  console.log(`GOOGLE_CLIENT_ID: ${config.GOOGLE_CLIENT_ID ? '[DECRYPTED]' : '[FAILED]'}`);
  console.log(`GOOGLE_CLIENT_SECRET: ${config.GOOGLE_CLIENT_SECRET ? '[DECRYPTED]' : '[FAILED]'}`);
  
  // Validate decrypted values
  const expectedClientId = 'your_google_client_id_here';
  const expectedClientSecret = 'your_google_client_secret_here';
  const expectedNextAuthSecret = 'your_nextauth_secret_here';
  
  console.log('\n🔍 Validation:');
  console.log(`GOOGLE_CLIENT_ID matches: ${config.GOOGLE_CLIENT_ID === expectedClientId ? '✅' : '❌'}`);
  console.log(`GOOGLE_CLIENT_SECRET matches: ${config.GOOGLE_CLIENT_SECRET === expectedClientSecret ? '✅' : '❌'}`);
  console.log(`NEXTAUTH_SECRET matches: ${config.NEXTAUTH_SECRET === expectedNextAuthSecret ? '✅' : '❌'}`);
  
  if (config.GOOGLE_CLIENT_ID === expectedClientId && 
      config.GOOGLE_CLIENT_SECRET === expectedClientSecret &&
      config.NEXTAUTH_SECRET === expectedNextAuthSecret) {
    console.log('\n🎉 ALL DECRYPTION TESTS PASSED!');
    process.exit(0);
  } else {
    console.log('\n❌ DECRYPTION VALIDATION FAILED!');
    process.exit(1);
  }
  
} catch (error) {
  console.error('\n❌ DECRYPTION ERROR:', error.message);
  process.exit(1);
}
