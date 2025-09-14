#!/usr/bin/env node

/**
 * Find specific missing translation keys
 */

const fs = require('fs');
const path = require('path');

// Keys we're looking for
const targetKeys = [
  'profile.address.location',
  'profile.address.showMap', 
  'profile.address.openInGoogleMaps',
  'profile.address.hideMap'
];

console.log('🔍 Searching for specific translation keys...\n');

// Load translation files
const languages = ['en', 'ru', 'uk'];
const localesDir = 'src/locales';

function extractKeysFromFile(content) {
  try {
    // Extract the export default object
    const match = content.match(/export\s+default\s+({[\s\S]*});?\s*$/);
    if (!match) {
      throw new Error('Could not find export default object');
    }

    // Use eval to parse the object (safe in this controlled context)
    const translationObject = eval(`(${match[1]})`);
    return extractKeysFromObject(translationObject);
  } catch (error) {
    throw new Error(`Failed to parse translation file: ${error.message}`);
  }
}

function extractKeysFromObject(obj, prefix = '') {
  const keys = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...extractKeysFromObject(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

function getValue(obj, keyPath) {
  const keys = keyPath.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  
  return current;
}

// Check each language
for (const lang of languages) {
  const filePath = path.join(localesDir, `${lang}.ts`);
  
  console.log(`📁 Checking ${lang}.ts:`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ File not found: ${filePath}`);
    continue;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const translationObject = eval(`(${content.match(/export\s+default\s+({[\s\S]*});?\s*$/)[1]})`);
    
    for (const key of targetKeys) {
      const value = getValue(translationObject, key);
      if (value !== undefined) {
        console.log(`   ✅ ${key}: "${value}"`);
      } else {
        console.log(`   ❌ ${key}: MISSING`);
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Error parsing ${lang}: ${error.message}`);
  }
  
  console.log();
}

// Also check what keys are actually in the files
console.log('🔍 Checking actual structure in en.ts:');
try {
  const content = fs.readFileSync(path.join(localesDir, 'en.ts'), 'utf-8');
  const translationObject = eval(`(${content.match(/export\s+default\s+({[\s\S]*});?\s*$/)[1]})`);
  
  if (translationObject.profile && translationObject.profile.address) {
    console.log('   📋 Keys in profile.address:');
    Object.keys(translationObject.profile.address).forEach(key => {
      console.log(`      • ${key}: "${translationObject.profile.address[key]}"`);
    });
  } else {
    console.log('   ❌ profile.address section not found');
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}
