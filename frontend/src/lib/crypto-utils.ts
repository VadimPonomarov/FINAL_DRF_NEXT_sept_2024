/**
 * Next.js OAuth Encryption/Decryption Utilities
 * =============================================
 * Provides secure encryption and decryption for OAuth credentials
 */

import crypto from 'crypto';

// Encryption constants
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const ENCRYPTION_PREFIX = 'nextjs_enc_';
const AAD = Buffer.from('nextjs-oauth', 'utf8');
const SALT = Buffer.from('nextjs-oauth-encryption-salt-v1', 'utf8');

/**
 * Generate encryption key from NEXTAUTH_SECRET
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is required for encryption');
  }
  
  return crypto.pbkdf2Sync(secret, SALT, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Check if a value is encrypted
 */
function isEncrypted(value: string): boolean {
  return value && typeof value === 'string' && value.startsWith(ENCRYPTION_PREFIX);
}

/**
 * Encrypt a value using AES-256-GCM
 */
export function encryptValue(plaintext: string): string {
  if (!plaintext) {
    return plaintext;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(AAD);
    
    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const tag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, encrypted, tag]);
    
    return ENCRYPTION_PREFIX + combined.toString('base64');
    
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt a value using AES-256-GCM
 */
export function decryptValue(encryptedValue: string): string {
  // If not encrypted, return as-is
  if (!isEncrypted(encryptedValue)) {
    return encryptedValue;
  }

  try {
    const key = getEncryptionKey();
    
    const base64Data = encryptedValue.replace(ENCRYPTION_PREFIX, '');
    const combined = Buffer.from(base64Data, 'base64');
    
    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(-TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH, -TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(AAD);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
    
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get decrypted OAuth configuration
 */
export function getDecryptedOAuthConfig() {
  return {
    NEXTAUTH_SECRET: decryptValue(process.env.NEXTAUTH_SECRET || ''),
    GOOGLE_CLIENT_ID: decryptValue(process.env.GOOGLE_CLIENT_ID || ''),
    GOOGLE_CLIENT_SECRET: decryptValue(process.env.GOOGLE_CLIENT_SECRET || ''),
  };
}

/**
 * Utility to safely log encrypted values (shows only prefix)
 */
export function safeLogValue(key: string, value: string): string {
  if (isEncrypted(value)) {
    return `${key}: [ENCRYPTED - ${value.substring(0, 20)}...]`;
  }
  return `${key}: [PLAIN - ${value ? '[SET]' : '[EMPTY]'}]`;
}
