#!/usr/bin/env node

/**
 * Full translation synchronization script
 * - Merges all keys from en.ts, ru.ts, uk.ts
 * - Removes duplicates
 * - Sorts by key (alphabetically)
 * - Uses the longest file as base
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

// Function to extract object from TypeScript file
function extractObject(content) {
  // Remove export default
  let objContent = content.replace(/^export\s+default\s+/, '');
  
  // Remove trailing semicolon
  objContent = objContent.replace(/;\s*$/, '');
  
  // Try to parse as JavaScript object
  // Replace single quotes with double quotes (simple approach)
  // This is a simplified parser - for production use a proper TS parser
  try {
    // Use eval in a safe way (for script purposes)
    // Note: In production, use a proper TypeScript parser
    const func = new Function('return ' + objContent);
    return func();
  } catch (e) {
    console.error('Error parsing file:', e.message);
    return {};
  }
}

// Function to get all keys from nested object
function getAllKeys(obj, prefix = '') {
  const keys = new Set();
  
  function traverse(current, currentPrefix) {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) {
      return;
    }
    
    for (const key in current) {
      const fullKey = currentPrefix ? `${currentPrefix}.${key}` : key;
      
      if (typeof current[key] === 'object' && current[key] !== null && !Array.isArray(current[key])) {
        keys.add(fullKey);
        traverse(current[key], fullKey);
      } else {
        keys.add(fullKey);
      }
    }
  }
  
  traverse(obj, prefix);
  return keys;
}

// Function to get value by path
function getValueByPath(obj, path) {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  
  return current;
}

// Function to set value by path
function setValueByPath(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }
    current = current[part];
  }
  
  current[parts[parts.length - 1]] = value;
}

// Function to sort object recursively
function sortObject(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return obj;
  }
  
  const sorted = {};
  const keys = Object.keys(obj).sort();
  
  for (const key of keys) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      sorted[key] = sortObject(obj[key]);
    } else {
      sorted[key] = obj[key];
    }
  }
  
  return sorted;
}

// Function to convert object to TypeScript string
function objectToTS(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  const lines = ['{'];
  
  const keys = Object.keys(obj).sort();
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = obj[key];
    const isLast = i === keys.length - 1;
    const comma = isLast ? '' : ',';
    
    // Handle key formatting
    const keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const valueStr = objectToTS(value, indent + 1);
      lines.push(`${spaces}  ${keyStr}: ${valueStr}${comma}`);
    } else if (typeof value === 'string') {
      // Escape single quotes
      const escaped = value.replace(/'/g, "\\'").replace(/\n/g, '\\n');
      lines.push(`${spaces}  ${keyStr}: '${escaped}'${comma}`);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      lines.push(`${spaces}  ${keyStr}: ${value}${comma}`);
    } else if (value === null) {
      lines.push(`${spaces}  ${keyStr}: null${comma}`);
    } else if (Array.isArray(value)) {
      lines.push(`${spaces}  ${keyStr}: ${JSON.stringify(value)}${comma}`);
    } else {
      lines.push(`${spaces}  ${keyStr}: ${JSON.stringify(value)}${comma}`);
    }
  }
  
  lines.push(`${spaces}}`);
  return lines.join('\n');
}

// Main synchronization function
function syncTranslations() {
  console.log('🔄 Starting full translation synchronization...\n');
  
  // Read all files
  console.log('📖 Reading translation files...');
  const enContent = fs.readFileSync(enFile, 'utf-8');
  const ruContent = fs.readFileSync(ruFile, 'utf-8');
  const ukContent = fs.readFileSync(ukFile, 'utf-8');
  
  // Parse objects
  const en = extractObject(enContent);
  const ru = extractObject(ruContent);
  const uk = extractObject(ukContent);
  
  // Get all keys
  const enKeys = getAllKeys(en);
  const ruKeys = getAllKeys(ru);
  const ukKeys = getAllKeys(uk);
  const allKeys = new Set([...enKeys, ...ruKeys, ...ukKeys]);
  
  console.log(`📊 Found ${allKeys.size} unique keys`);
  console.log(`   - EN: ${enKeys.size} keys`);
  console.log(`   - RU: ${ruKeys.size} keys`);
  console.log(`   - UK: ${ukKeys.size} keys\n`);
  
  // Determine base (longest)
  const base = enKeys.size >= ruKeys.size && enKeys.size >= ukKeys.size ? en :
               ruKeys.size >= ukKeys.size ? ru : uk;
  const baseName = base === en ? 'EN' : (base === ru ? 'RU' : 'UK');
  console.log(`📌 Using ${baseName} as base\n`);
  
  // Create synchronized objects
  const syncedEn = {};
  const syncedRu = {};
  const syncedUk = {};
  
  // Sort keys alphabetically
  const sortedKeys = Array.from(allKeys).sort();
  
  console.log('🔄 Synchronizing translations...\n');
  
  // Sync all keys
  for (const key of sortedKeys) {
    const enVal = getValueByPath(en, key);
    const ruVal = getValueByPath(ru, key);
    const ukVal = getValueByPath(uk, key);
    
    // Use base value if missing
    const baseVal = getValueByPath(base, key);
    
    setValueByPath(syncedEn, key, enVal !== undefined ? enVal : (baseVal !== undefined ? baseVal : ''));
    setValueByPath(syncedRu, key, ruVal !== undefined ? ruVal : (baseVal !== undefined ? baseVal : ''));
    setValueByPath(syncedUk, key, ukVal !== undefined ? ukVal : (baseVal !== undefined ? baseVal : ''));
  }
  
  // Sort objects
  const sortedEn = sortObject(syncedEn);
  const sortedRu = sortObject(syncedRu);
  const sortedUk = sortObject(syncedUk);
  
  // Write files
  console.log('💾 Writing synchronized files...\n');
  
  const enTS = `export default ${objectToTS(sortedEn)};`;
  const ruTS = `export default ${objectToTS(sortedRu)};`;
  const ukTS = `export default ${objectToTS(sortedUk)};`;
  
  fs.writeFileSync(enFile, enTS, 'utf-8');
  fs.writeFileSync(ruFile, ruTS, 'utf-8');
  fs.writeFileSync(ukFile, ukTS, 'utf-8');
  
  console.log('✅ Translation synchronization completed!\n');
  console.log(`📊 Final statistics:`);
  console.log(`   - Total keys: ${allKeys.size}`);
  console.log(`   - EN keys: ${getAllKeys(sortedEn).size}`);
  console.log(`   - RU keys: ${getAllKeys(sortedRu).size}`);
  console.log(`   - UK keys: ${getAllKeys(sortedUk).size}`);
}

// Run synchronization
try {
  syncTranslations();
} catch (error) {
  console.error('❌ Error during synchronization:', error);
  process.exit(1);
}

