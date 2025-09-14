#!/usr/bin/env node

/**
 * Translation Doctor - Simple CommonJS version for immediate testing
 * Intelligent translation diagnosis and correction system
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

console.log('🩺 Translation Doctor - Simple Version\n');

/**
 * Simple translation scanner
 */
class SimpleTranslationScanner {
  constructor(sourceDir = 'src') {
    this.sourceDir = sourceDir;
    this.patterns = [
      /t\(['"`]([^'"`]+)['"`]\)/g,
      /t\(`([^`]+)`\)/g,
      /{\s*t\(['"`]([^'"`]+)['"`]\)\s*}/g,
    ];
  }

  async scan() {
    console.log('🔍 Scanning code for translation keys...');
    
    const files = await glob('**/*.{tsx,ts,jsx,js}', {
      cwd: this.sourceDir,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.d.ts']
    });

    console.log(`📁 Found ${files.length} files to scan`);

    const foundKeys = new Set();
    let scannedFiles = 0;

    for (const file of files) {
      try {
        const filePath = path.join(this.sourceDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        for (const pattern of this.patterns) {
          let match;
          pattern.lastIndex = 0;
          
          while ((match = pattern.exec(content)) !== null) {
            const key = match[1];
            if (key && key.trim()) {
              foundKeys.add(key.trim());
            }
          }
        }
        
        scannedFiles++;
      } catch (error) {
        console.log(`❌ Error scanning ${file}: ${error.message}`);
      }
    }

    console.log(`✅ Scan completed: ${foundKeys.size} unique keys found in ${scannedFiles} files\n`);
    return Array.from(foundKeys).sort();
  }
}

/**
 * Simple translation analyzer
 */
class SimpleTranslationAnalyzer {
  constructor(localesDir = 'src/locales') {
    this.localesDir = localesDir;
    this.languages = ['en', 'ru', 'uk'];
  }

  async analyze(usedKeys) {
    console.log('🔍 Analyzing translation consistency...');
    
    const translations = {};
    const allTranslationKeys = new Set();

    // Load translation files
    for (const lang of this.languages) {
      const filePath = path.join(this.localesDir, `${lang}.ts`);
      
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const keys = this.extractKeysFromFile(content);
          translations[lang] = new Set(keys);
          keys.forEach(key => allTranslationKeys.add(key));
          console.log(`✅ Loaded ${lang}: ${keys.length} keys`);
        } else {
          console.log(`⚠️  Translation file not found: ${filePath}`);
          translations[lang] = new Set();
        }
      } catch (error) {
        console.log(`❌ Failed to load ${lang}: ${error.message}`);
        translations[lang] = new Set();
      }
    }

    // Find issues
    const issues = {
      missing: [],
      unused: [],
      inconsistent: []
    };

    // Find missing keys (used in code but not in translations)
    const usedKeysSet = new Set(usedKeys);
    for (const key of usedKeysSet) {
      const missingLanguages = [];
      for (const lang of this.languages) {
        if (!translations[lang].has(key)) {
          missingLanguages.push(lang);
        }
      }
      if (missingLanguages.length > 0) {
        issues.missing.push({ key, languages: missingLanguages });
      }
    }

    // Find unused keys (in translations but not used in code)
    for (const key of allTranslationKeys) {
      if (!usedKeysSet.has(key)) {
        const presentLanguages = this.languages.filter(lang => translations[lang].has(key));
        issues.unused.push({ key, languages: presentLanguages });
      }
    }

    // Find inconsistent keys (exist in some languages but not others)
    for (const key of allTranslationKeys) {
      const presentLanguages = [];
      const missingLanguages = [];
      
      for (const lang of this.languages) {
        if (translations[lang].has(key)) {
          presentLanguages.push(lang);
        } else {
          missingLanguages.push(lang);
        }
      }
      
      if (missingLanguages.length > 0 && presentLanguages.length > 0) {
        issues.inconsistent.push({ key, present: presentLanguages, missing: missingLanguages });
      }
    }

    console.log(`📊 Analysis completed:`);
    console.log(`   Used keys in code: ${usedKeys.length}`);
    console.log(`   Total translation keys: ${allTranslationKeys.size}`);
    console.log(`   Missing keys: ${issues.missing.length}`);
    console.log(`   Unused keys: ${issues.unused.length}`);
    console.log(`   Inconsistent keys: ${issues.inconsistent.length}\n`);

    return issues;
  }

  extractKeysFromFile(content) {
    try {
      // Extract the export default object
      const match = content.match(/export\s+default\s+({[\s\S]*});?\s*$/);
      if (!match) {
        throw new Error('Could not find export default object');
      }

      // Use eval to parse the object (safe in this controlled context)
      const translationObject = eval(`(${match[1]})`);
      return this.extractKeysFromObject(translationObject);
    } catch (error) {
      throw new Error(`Failed to parse translation file: ${error.message}`);
    }
  }

  extractKeysFromObject(obj, prefix = '') {
    const keys = [];

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys.push(...this.extractKeysFromObject(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }

    return keys;
  }
}

/**
 * Display results
 */
function displayResults(issues) {
  console.log('📋 Translation Issues Report:\n');

  if (issues.missing.length > 0) {
    console.log('❌ Missing Keys (used in code but not in translations):');
    issues.missing.slice(0, 10).forEach(issue => {
      console.log(`   • "${issue.key}" missing in: ${issue.languages.join(', ')}`);
    });
    if (issues.missing.length > 10) {
      console.log(`   ... and ${issues.missing.length - 10} more missing keys`);
    }
    console.log();
  }

  if (issues.unused.length > 0) {
    console.log('⚠️  Unused Keys (in translations but not used in code):');
    issues.unused.slice(0, 10).forEach(issue => {
      console.log(`   • "${issue.key}" in: ${issue.languages.join(', ')}`);
    });
    if (issues.unused.length > 10) {
      console.log(`   ... and ${issues.unused.length - 10} more unused keys`);
    }
    console.log();
  }

  if (issues.inconsistent.length > 0) {
    console.log('🔄 Inconsistent Keys (exist in some languages but not others):');
    issues.inconsistent.slice(0, 10).forEach(issue => {
      console.log(`   • "${issue.key}" present in: ${issue.present.join(', ')}, missing in: ${issue.missing.join(', ')}`);
    });
    if (issues.inconsistent.length > 10) {
      console.log(`   ... and ${issues.inconsistent.length - 10} more inconsistent keys`);
    }
    console.log();
  }

  if (issues.missing.length === 0 && issues.unused.length === 0 && issues.inconsistent.length === 0) {
    console.log('🎉 Perfect! No translation issues found.');
  }

  // Health score
  const totalIssues = issues.missing.length + issues.unused.length + issues.inconsistent.length;
  const healthScore = Math.max(0, 100 - (issues.missing.length * 10) - (issues.unused.length * 2) - (issues.inconsistent.length * 5));
  
  console.log(`🏥 Translation Health Score: ${healthScore}/100`);
  
  if (healthScore >= 90) {
    console.log('💚 Excellent translation health!');
  } else if (healthScore >= 70) {
    console.log('💛 Good translation health, minor issues to address.');
  } else {
    console.log('❤️  Translation health needs attention.');
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Step 1: Scan code for translation keys
    const scanner = new SimpleTranslationScanner();
    const usedKeys = await scanner.scan();

    // Step 2: Analyze translation consistency
    const analyzer = new SimpleTranslationAnalyzer();
    const issues = await analyzer.analyze(usedKeys);

    // Step 3: Display results
    displayResults(issues);

    console.log('\n💡 Next Steps:');
    console.log('   1. Add missing translations to the respective language files');
    console.log('   2. Remove unused translation keys or verify they should be used');
    console.log('   3. Fix inconsistent keys by adding missing translations');
    console.log('   4. Run this tool again to verify improvements');
    
    console.log('\n🤖 For AI-powered automatic fixes, use the full Translation Doctor system!');

  } catch (error) {
    console.error(`💥 Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { SimpleTranslationScanner, SimpleTranslationAnalyzer };
