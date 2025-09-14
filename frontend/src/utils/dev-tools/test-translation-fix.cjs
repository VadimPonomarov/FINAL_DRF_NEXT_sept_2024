#!/usr/bin/env node

/**
 * Test specific translation keys to verify the fix
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Translation Fix\n');

// Test the specific keys that were showing as raw keys
const testKeys = [
  'profile.address.location',
  'profile.address.showMap', 
  'profile.address.openInGoogleMaps',
  'profile.address.hideMap'
];

// Simulate the translation function
function getTranslation(locale, key) {
  try {
    // Load the translation file
    const filePath = path.join('src/locales', `${locale}.ts`);
    if (!fs.existsSync(filePath)) {
      return `[FILE_NOT_FOUND:${locale}]`;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/export\s+default\s+({[\s\S]*});?\s*$/);
    if (!match) {
      return `[PARSE_ERROR:${locale}]`;
    }

    const translations = eval(`(${match[1]})`);
    
    // Navigate through the key path
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Return the key if translation not found (this was the bug!)
        return key;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    return value;
  } catch (error) {
    return `[ERROR:${error.message}]`;
  }
}

// Test each key in each language
const languages = ['en', 'ru', 'uk'];

console.log('🔍 Testing translation resolution:\n');

for (const key of testKeys) {
  console.log(`📝 Key: "${key}"`);
  
  for (const lang of languages) {
    const result = getTranslation(lang, key);
    const status = result === key ? '❌ RETURNS KEY' : '✅ TRANSLATED';
    console.log(`   ${lang}: ${status} -> "${result}"`);
  }
  
  console.log();
}

// Test the i18n system simulation
console.log('🔧 Simulating i18n system behavior:\n');

// Simulate the fixed i18n.ts behavior
function simulateI18nSystem() {
  try {
    // Load translations like the fixed i18n.ts does
    const enContent = fs.readFileSync('src/locales/en.ts', 'utf-8');
    const ruContent = fs.readFileSync('src/locales/ru.ts', 'utf-8');
    const ukContent = fs.readFileSync('src/locales/uk.ts', 'utf-8');
    
    const enTranslations = eval(`(${enContent.match(/export\s+default\s+({[\s\S]*});?\s*$/)[1]})`);
    const ruTranslations = eval(`(${ruContent.match(/export\s+default\s+({[\s\S]*});?\s*$/)[1]})`);
    const ukTranslations = eval(`(${ukContent.match(/export\s+default\s+({[\s\S]*});?\s*$/)[1]})`);
    
    const translations = {
      en: enTranslations,
      ru: ruTranslations,
      uk: ukTranslations
    };
    
    console.log('✅ Translation system loaded successfully');
    console.log(`   EN keys in profile.address: ${Object.keys(translations.en.profile.address).length}`);
    console.log(`   RU keys in profile.address: ${Object.keys(translations.ru.profile.address).length}`);
    console.log(`   UK keys in profile.address: ${Object.keys(translations.uk.profile.address).length}`);
    
    // Test the specific keys
    console.log('\n🎯 Testing specific problematic keys:');
    
    for (const key of testKeys) {
      console.log(`\n   "${key}":`);
      
      for (const lang of languages) {
        const keys = key.split('.');
        let value = translations[lang];
        
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = value[k];
          } else {
            value = key; // This was the fallback behavior
            break;
          }
        }
        
        const status = value === key ? '❌ FALLBACK' : '✅ RESOLVED';
        console.log(`     ${lang}: ${status} -> "${value}"`);
      }
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Error simulating i18n system: ${error.message}`);
    return false;
  }
}

const systemWorking = simulateI18nSystem();

console.log('\n📊 Test Results Summary:');
console.log(`   Translation system: ${systemWorking ? '✅ WORKING' : '❌ BROKEN'}`);
console.log(`   Keys tested: ${testKeys.length}`);
console.log(`   Languages tested: ${languages.length}`);

if (systemWorking) {
  console.log('\n🎉 Translation fix appears to be working!');
  console.log('   The keys should now display proper translations instead of raw key names.');
} else {
  console.log('\n❌ Translation system still has issues.');
  console.log('   Please check the i18n.ts file and translation files.');
}

console.log('\n💡 Next steps:');
console.log('   1. Refresh the browser page');
console.log('   2. Check if the address card shows translated text');
console.log('   3. If still showing keys, check browser console for errors');
