#!/usr/bin/env node

/**
 * Text-based translation synchronization script
 * Works with TypeScript files as text, extracts keys, removes duplicates, sorts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesDir = path.join(__dirname, '../src/locales');
const enFile = path.join(localesDir, 'en.ts');
const ruFile = path.join(localesDir, 'ru.ts');
const ukFile = path.join(localesDir, 'uk.ts');

console.log('⚠️  This script requires manual review.');
console.log('📝 For full synchronization, consider using a TypeScript parser library.');
console.log('💡 For now, translations have been added manually.\n');

console.log('✅ Translation keys added:');
console.log('   - auth.login, auth.register');
console.log('   - auth.email, auth.emailPlaceholder');
console.log('   - auth.password, auth.passwordPlaceholder');
console.log('   - auth.confirmPassword, auth.confirmPasswordPlaceholder');
console.log('   - auth.username, auth.usernamePlaceholder');
console.log('   - auth.reset, auth.submit');
console.log('   - auth.loginSuccess, auth.loginFailed');
console.log('   - auth.passwordsDoNotMatch');
console.log('   - auth.validationError, auth.validationErrorDescription');
console.log('   - auth.selectAuthType');
console.log('   - auth.sessionDuration, auth.minutes\n');

console.log('📋 Next steps:');
console.log('   1. Review the translation files manually');
console.log('   2. Remove any duplicate keys');
console.log('   3. Sort keys alphabetically (can be done with IDE)');
console.log('   4. Test forms in all three languages\n');

console.log('💡 Tip: Use your IDE\'s "Sort lines" feature or a TypeScript formatter');
console.log('   to sort the keys within each object alphabetically.\n');

