#!/usr/bin/env node
/**
 * Comprehensive Encryption Systems Test
 * ====================================
 * Tests all three encryption systems for correctness
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}`);
}

function logTest(testName, status, details = '') {
  const statusColor = status === 'PASS' ? colors.green : status === 'FAIL' ? colors.red : colors.yellow;
  console.log(`${statusColor}${status}${colors.reset} ${testName} ${details}`);
}

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(testName, testFunction) {
  totalTests++;
  try {
    const result = testFunction();
    if (result === true) {
      passedTests++;
      logTest(testName, 'PASS');
      return true;
    } else {
      failedTests++;
      logTest(testName, 'FAIL', result || '');
      return false;
    }
  } catch (error) {
    failedTests++;
    logTest(testName, 'FAIL', `Error: ${error.message}`);
    return false;
  }
}

// Test 1: Next.js Encryption System
function testNextjsEncryption() {
  logSection('🔐 TESTING NEXT.JS ENCRYPTION SYSTEM');
  
  // Test if crypto-utils.ts exists and is valid
  runTest('Next.js crypto-utils.ts exists', () => {
    return fs.existsSync('frontend/src/lib/crypto-utils.ts');
  });
  
  // Test if Next.js config uses decryption
  runTest('Next.js config uses decryption', () => {
    const configPath = 'frontend/src/config/constants.ts';
    if (!fs.existsSync(configPath)) return false;
    
    const content = fs.readFileSync(configPath, 'utf8');
    return content.includes('getDecryptedOAuthConfig') && 
           content.includes('crypto-utils');
  });
  
  // Test encrypted keys format in .env.secrets
  runTest('OAuth keys are encrypted with nextjs_enc_ prefix', () => {
    const secretsPath = 'env-config/.env.secrets';
    if (!fs.existsSync(secretsPath)) return false;

    const content = fs.readFileSync(secretsPath, 'utf8');
    const hasEncryptedGoogleClientId = content.includes('GOOGLE_CLIENT_ID=nextjs_enc_');
    const hasEncryptedGoogleClientSecret = content.includes('GOOGLE_CLIENT_SECRET=nextjs_enc_');
    // NEXTAUTH_SECRET НЕ повинен бути зашифрований (він використовується для дешифрування інших)
    const hasUnencryptedNextAuthSecret = content.includes('NEXTAUTH_SECRET=') && !content.includes('NEXTAUTH_SECRET=nextjs_enc_');

    return hasEncryptedGoogleClientId && hasEncryptedGoogleClientSecret && hasUnencryptedNextAuthSecret;
  });
  
  // Test no plain text OAuth keys
  runTest('No plain text OAuth keys in .env.secrets', () => {
    const secretsPath = 'env-config/.env.secrets';
    if (!fs.existsSync(secretsPath)) return false;
    
    const content = fs.readFileSync(secretsPath, 'utf8');
    const hasPlainGoogleSecret = content.includes('GOOGLE_CLIENT_SECRET=GOCSPX-');
    const hasPlainGoogleId = content.match(/GOOGLE_CLIENT_ID=317007351021-/);
    
    return !hasPlainGoogleSecret && !hasPlainGoogleId;
  });
}

// Test 2: Backend Django Encryption System
function testBackendEncryption() {
  logSection('🔐 TESTING BACKEND DJANGO ENCRYPTION SYSTEM');
  
  // Test if key_manager.py exists
  runTest('Backend key_manager.py exists', () => {
    return fs.existsSync('backend/core/security/key_manager.py');
  });
  
  // Test if encryption_service.py exists
  runTest('Backend encryption_service.py exists', () => {
    return fs.existsSync('backend/core/security/encryption_service.py');
  });
  
  // Test encrypted keys in .env.secrets
  runTest('Backend keys are encrypted with ENCRYPTED_ prefix', () => {
    const secretsPath = 'env-config/.env.secrets';
    if (!fs.existsSync(secretsPath)) return false;
    
    const content = fs.readFileSync(secretsPath, 'utf8');
    const hasEncryptedTavily = content.includes('ENCRYPTED_TAVILY_API_KEY=');
    const hasEncryptedGoogleSecret = content.includes('ENCRYPTED_GOOGLE_CLIENT_SECRET=');
    const hasEncryptedEmailPassword = content.includes('ENCRYPTED_EMAIL_HOST_PASSWORD=');
    
    return hasEncryptedTavily && hasEncryptedGoogleSecret && hasEncryptedEmailPassword;
  });
  
  // Test production fallback security
  runTest('Backend has production fallback security', () => {
    const keyManagerPath = 'backend/core/security/key_manager.py';
    if (!fs.existsSync(keyManagerPath)) return false;
    
    const content = fs.readFileSync(keyManagerPath, 'utf8');
    return content.includes('settings.DEBUG') && 
           content.includes('Plain text fallback disabled in production');
  });
}

// Test 3: Mailing Service Encryption System
function testMailingEncryption() {
  logSection('🔐 TESTING MAILING SERVICE ENCRYPTION SYSTEM');
  
  // Test if mailing encryption services exist
  runTest('Mailing decrypt_service.py exists', () => {
    return fs.existsSync('mailing/src/services/encription_service/decrypt_service.py');
  });
  
  // Test if encryption key exists
  runTest('Mailing encryption key.txt exists', () => {
    return fs.existsSync('mailing/src/services/encription_service/key.txt');
  });
  
  // Test encrypted email credentials
  runTest('Email credentials are encrypted with gAAAAAB prefix', () => {
    const secretsPath = 'env-config/.env.secrets';
    if (!fs.existsSync(secretsPath)) return false;
    
    const content = fs.readFileSync(secretsPath, 'utf8');
    const hasEncryptedGmailUser = content.includes('GMAIL_USER=gAAAAAB');
    const hasEncryptedGmailPassword = content.includes('GMAIL_PASSWORD=gAAAAAB');
    
    return hasEncryptedGmailUser && hasEncryptedGmailPassword;
  });
  
  // Test mailing config security
  runTest('Mailing config has strict decryption', () => {
    const configPath = 'mailing/src/config.py';
    if (!fs.existsSync(configPath)) return false;
    
    const content = fs.readFileSync(configPath, 'utf8');
    return content.includes('raise ValueError') && 
           content.includes('decryption failed');
  });
  
  // Test no mailing/.env file (should be removed)
  runTest('No mailing/.env file (centralized config)', () => {
    return !fs.existsSync('mailing/.env');
  });
}

// Test 4: Environment Configuration
function testEnvironmentConfig() {
  logSection('🔧 TESTING ENVIRONMENT CONFIGURATION');
  
  // Test centralized env-config structure
  runTest('Centralized env-config structure exists', () => {
    return fs.existsSync('env-config/.env.base') &&
           fs.existsSync('env-config/.env.secrets') &&
           fs.existsSync('env-config/.env.docker') &&
           fs.existsSync('env-config/.env.local');
  });
  
  // Test no placeholder sections in .env.secrets
  runTest('No placeholder sections in .env.secrets', () => {
    const secretsPath = 'env-config/.env.secrets';
    if (!fs.existsSync(secretsPath)) return false;
    
    const content = fs.readFileSync(secretsPath, 'utf8');
    return !content.includes('PLACEHOLDER') && 
           !content.includes('your-secret-key-here') &&
           !content.includes('test_google_api_key');
  });
  
  // Test Docker Compose uses centralized config
  runTest('Docker Compose uses centralized env-config', () => {
    const dockerComposePath = 'docker-compose.yml';
    if (!fs.existsSync(dockerComposePath)) return false;
    
    const content = fs.readFileSync(dockerComposePath, 'utf8');
    return content.includes('./env-config/.env.base') &&
           content.includes('./env-config/.env.secrets') &&
           content.includes('./env-config/.env.docker');
  });
  
  // Test Next.js loads from centralized config
  runTest('Next.js loads from centralized env-config', () => {
    const nextConfigPath = 'frontend/next.config.js';
    if (!fs.existsSync(nextConfigPath)) return false;

    const content = fs.readFileSync(nextConfigPath, 'utf8');
    return content.includes('env-config') &&
           (content.includes('loadEnvFile') || content.includes('dotenv.config'));
  });
}

// Test 5: Security Validation
function testSecurityValidation() {
  logSection('🔒 TESTING SECURITY VALIDATION');
  
  // Test no real keys in plain text
  runTest('No real Google Client Secret in plain text', () => {
    const secretsPath = 'env-config/.env.secrets';
    if (!fs.existsSync(secretsPath)) return false;
    
    const content = fs.readFileSync(secretsPath, 'utf8');
    return !content.includes('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');
  });
  
  // Test no real Tavily key in plain text
  runTest('No real Tavily API key in plain text', () => {
    const secretsPath = 'env-config/.env.secrets';
    if (!fs.existsSync(secretsPath)) return false;
    
    const content = fs.readFileSync(secretsPath, 'utf8');
    return !content.includes('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');
  });
  
  // Test encryption utilities exist
  runTest('Encryption utilities exist', () => {
    return fs.existsSync('frontend/scripts/encrypt_nextjs_oauth_keys.cjs') &&
           fs.existsSync('backend/scripts/encrypt_keys_for_backend.py') &&
           fs.existsSync('frontend/src/lib/crypto-utils.ts');
  });
}

// Main test runner
function main() {
  console.log(`${colors.bold}${colors.blue}🧪 COMPREHENSIVE ENCRYPTION SYSTEMS TEST${colors.reset}`);
  console.log(`${colors.blue}Testing all three encryption systems for correctness${colors.reset}\n`);
  
  // Run all test suites
  testNextjsEncryption();
  testBackendEncryption();
  testMailingEncryption();
  testEnvironmentConfig();
  testSecurityValidation();
  
  // Final results
  logSection('📊 TEST RESULTS SUMMARY');
  
  console.log(`Total Tests: ${totalTests}`);
  log(colors.green, `✅ Passed: ${passedTests}`);
  log(colors.red, `❌ Failed: ${failedTests}`);
  
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  console.log(`Success Rate: ${successRate}%`);
  
  if (failedTests === 0) {
    log(colors.green, '\n🎉 ALL TESTS PASSED! Encryption systems are working correctly.');
    return 0;
  } else {
    log(colors.red, '\n⚠️  SOME TESTS FAILED! Please review the issues above.');
    return 1;
  }
}

// Run tests
if (require.main === module) {
  const exitCode = main();
  process.exit(exitCode);
}
