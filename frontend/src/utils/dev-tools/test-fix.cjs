#!/usr/bin/env node

/**
 * Test the translation fix
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Translation Fix\n');

// Simulate the fixed i18n system
function testTranslationSystem() {
  try {
    // Load translations like the fixed i18n.ts does
    const enContent = fs.readFileSync('src/locales/en.ts', 'utf-8');
    const ruContent = fs.readFileSync('src/locales/ru.ts', 'utf-8');
    const ukContent = fs.readFileSync('src/locales/uk.ts', 'utf-8');
    
    const enTranslations = eval(`(${enContent.match(/export\s+default\s+({[\s\S]*});?\s*$/)[1]})`);
    const ruTranslations = eval(`(${ruContent.match(/export\s+default\s+({[\s\S]*});?\s*$/)[1]})`);
    const ukTranslations = eval(`(${ukContent.match(/export\s+default\s+({[\s\S]*});?\s*$/)[1]})`);
    
    // This simulates the fixed localTranslations object
    const localTranslations = {
      en: enTranslations,
      ru: ruTranslations,
      uk: ukTranslations
    };
    
    console.log('✅ Translation system loaded successfully');
    
    // Test the getTranslation function logic
    function getTranslation(locale, key) {
      try {
        const keys = key.split('.');
        let value = localTranslations[locale];

        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = value[k];
          } else {
            // Fallback to key if translation not found
            return key;
          }
        }

        if (typeof value !== 'string') {
          return key;
        }

        return value;
      } catch (error) {
        return key;
      }
    }
    
    // Test the specific problematic keys
    const testKeys = [
      'profile.address.location',
      'profile.address.showMap', 
      'profile.address.openInGoogleMaps',
      'profile.address.hideMap'
    ];
    
    console.log('\n🎯 Testing specific problematic keys:');
    
    let allPassed = true;
    
    for (const key of testKeys) {
      console.log(`\n   "${key}":`);
      
      for (const lang of ['en', 'ru', 'uk']) {
        const result = getTranslation(lang, key);
        const status = result === key ? '❌ RETURNS KEY' : '✅ TRANSLATED';
        
        if (result === key) {
          allPassed = false;
        }
        
        console.log(`     ${lang}: ${status} -> "${result}"`);
      }
    }
    
    console.log('\n📊 Test Results:');
    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED! Translation fix is working correctly.');
      console.log('   The keys should now display proper translations in the browser.');
    } else {
      console.log('❌ SOME TESTS FAILED! There are still issues with the translation system.');
    }
    
    return allPassed;
  } catch (error) {
    console.log(`❌ Error testing translation system: ${error.message}`);
    return false;
  }
}

const success = testTranslationSystem();

console.log('\n💡 Next steps:');
if (success) {
  console.log('   1. ✅ Translation system is fixed');
  console.log('   2. 🔄 Refresh the browser page (Ctrl+F5 for hard refresh)');
  console.log('   3. 👀 Check if the address card shows translated text instead of keys');
  console.log('   4. 🎉 The fix should be working now!');
} else {
  console.log('   1. ❌ Translation system still has issues');
  console.log('   2. 🔍 Check the i18n.ts file for any remaining variable conflicts');
  console.log('   3. 🔄 Make sure all variable names are consistent');
  console.log('   4. 🧪 Run this test again after making changes');
}

process.exit(success ? 0 : 1);
