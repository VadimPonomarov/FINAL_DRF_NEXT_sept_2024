#!/usr/bin/env node

/**
 * TypeScript Types Analyzer
 * Анализирует неиспользуемые TypeScript интерфейсы, типы и импорты
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

console.log('🔍 TypeScript Types Analyzer\n');

class TypeScriptAnalyzer {
  constructor(sourceDir = 'src') {
    this.sourceDir = sourceDir;
    this.definedTypes = new Map(); // type/interface name -> file where defined
    this.usedTypes = new Set(); // set of used type names
    this.imports = new Map(); // file -> imported types
    this.exports = new Map(); // file -> exported types
  }

  async analyze() {
    console.log('📁 Scanning TypeScript files...');
    
    const files = await glob('**/*.{ts,tsx}', {
      cwd: this.sourceDir,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.d.ts',
        '**/next-env.d.ts'
      ]
    });

    console.log(`📊 Found ${files.length} TypeScript files`);

    // Step 1: Find all type definitions
    for (const file of files) {
      await this.scanTypeDefinitions(file);
    }

    // Step 2: Find all type usages
    for (const file of files) {
      await this.scanTypeUsages(file);
    }

    // Step 3: Analyze results
    return this.generateReport();
  }

  async scanTypeDefinitions(file) {
    const filePath = path.join(this.sourceDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Patterns for type definitions
    const patterns = [
      /^export\s+interface\s+(\w+)/,
      /^interface\s+(\w+)/,
      /^export\s+type\s+(\w+)/,
      /^type\s+(\w+)/,
      /^export\s+enum\s+(\w+)/,
      /^enum\s+(\w+)/,
    ];

    lines.forEach((line, index) => {
      patterns.forEach(pattern => {
        const match = line.trim().match(pattern);
        if (match) {
          const typeName = match[1];
          if (!this.definedTypes.has(typeName)) {
            this.definedTypes.set(typeName, []);
          }
          this.definedTypes.get(typeName).push({
            file,
            line: index + 1,
            definition: line.trim()
          });
        }
      });
    });

    // Scan exports
    const exportMatches = content.match(/export\s*{\s*([^}]+)\s*}/g);
    if (exportMatches) {
      exportMatches.forEach(exportMatch => {
        const exports = exportMatch
          .replace(/export\s*{\s*/, '')
          .replace(/\s*}/, '')
          .split(',')
          .map(exp => exp.trim().split(' as ')[0]);
        
        if (!this.exports.has(file)) {
          this.exports.set(file, []);
        }
        this.exports.get(file).push(...exports);
      });
    }
  }

  async scanTypeUsages(file) {
    const filePath = path.join(this.sourceDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Scan imports
    const importMatches = content.match(/import\s*{\s*([^}]+)\s*}\s*from/g);
    if (importMatches) {
      importMatches.forEach(importMatch => {
        const imports = importMatch
          .replace(/import\s*{\s*/, '')
          .replace(/\s*}\s*from/, '')
          .split(',')
          .map(imp => imp.trim().split(' as ')[0]);
        
        if (!this.imports.has(file)) {
          this.imports.set(file, []);
        }
        this.imports.get(file).push(...imports);
        
        // Mark as used
        imports.forEach(imp => this.usedTypes.add(imp));
      });
    }

    // Scan type usage in code
    const lines = content.split('\n');
    lines.forEach(line => {
      // Find type annotations
      const typeAnnotations = line.match(/:\s*(\w+)/g);
      if (typeAnnotations) {
        typeAnnotations.forEach(annotation => {
          const typeName = annotation.replace(/:\s*/, '');
          this.usedTypes.add(typeName);
        });
      }

      // Find generic types
      const genericTypes = line.match(/<(\w+)>/g);
      if (genericTypes) {
        genericTypes.forEach(generic => {
          const typeName = generic.replace(/[<>]/g, '');
          this.usedTypes.add(typeName);
        });
      }

      // Find extends/implements
      const extendsMatches = line.match(/(?:extends|implements)\s+(\w+)/g);
      if (extendsMatches) {
        extendsMatches.forEach(match => {
          const typeName = match.replace(/(?:extends|implements)\s+/, '');
          this.usedTypes.add(typeName);
        });
      }
    });
  }

  generateReport() {
    const unusedTypes = [];
    const duplicateTypes = [];
    const unusedImports = [];

    // Find unused types
    for (const [typeName, definitions] of this.definedTypes) {
      if (!this.usedTypes.has(typeName)) {
        unusedTypes.push({
          name: typeName,
          definitions
        });
      }

      // Find duplicate definitions
      if (definitions.length > 1) {
        duplicateTypes.push({
          name: typeName,
          definitions
        });
      }
    }

    // Find unused imports
    for (const [file, imports] of this.imports) {
      const fileContent = fs.readFileSync(path.join(this.sourceDir, file), 'utf-8');
      const unusedInFile = imports.filter(imp => {
        // Check if import is actually used in the file
        const usagePattern = new RegExp(`\\b${imp}\\b`, 'g');
        const matches = fileContent.match(usagePattern);
        // If only one match, it's probably just the import statement
        return !matches || matches.length <= 1;
      });

      if (unusedInFile.length > 0) {
        unusedImports.push({
          file,
          unused: unusedInFile
        });
      }
    }

    return {
      summary: {
        totalTypes: this.definedTypes.size,
        usedTypes: this.usedTypes.size,
        unusedTypes: unusedTypes.length,
        duplicateTypes: duplicateTypes.length,
        filesWithUnusedImports: unusedImports.length
      },
      unusedTypes,
      duplicateTypes,
      unusedImports
    };
  }
}

// Main execution
async function main() {
  try {
    const analyzer = new TypeScriptAnalyzer();
    const report = await analyzer.analyze();

    console.log('\n📊 ANALYSIS RESULTS\n');
    console.log(`📈 Total types defined: ${report.summary.totalTypes}`);
    console.log(`✅ Types in use: ${report.summary.usedTypes}`);
    console.log(`❌ Unused types: ${report.summary.unusedTypes}`);
    console.log(`🔄 Duplicate types: ${report.summary.duplicateTypes}`);
    console.log(`📦 Files with unused imports: ${report.summary.filesWithUnusedImports}`);

    if (report.unusedTypes.length > 0) {
      console.log('\n🚨 UNUSED TYPES:');
      report.unusedTypes.forEach(({ name, definitions }) => {
        console.log(`\n❌ ${name}`);
        definitions.forEach(def => {
          console.log(`   📁 ${def.file}:${def.line}`);
          console.log(`   📝 ${def.definition}`);
        });
      });
    }

    if (report.duplicateTypes.length > 0) {
      console.log('\n🔄 DUPLICATE TYPES:');
      report.duplicateTypes.forEach(({ name, definitions }) => {
        console.log(`\n⚠️  ${name} (${definitions.length} definitions)`);
        definitions.forEach(def => {
          console.log(`   📁 ${def.file}:${def.line}`);
        });
      });
    }

    if (report.unusedImports.length > 0) {
      console.log('\n📦 UNUSED IMPORTS:');
      report.unusedImports.slice(0, 10).forEach(({ file, unused }) => {
        console.log(`\n📁 ${file}`);
        unused.forEach(imp => {
          console.log(`   ❌ ${imp}`);
        });
      });
      
      if (report.unusedImports.length > 10) {
        console.log(`\n... and ${report.unusedImports.length - 10} more files`);
      }
    }

    // Save detailed report
    const reportPath = 'typescript-analysis-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);

    if (report.summary.unusedTypes > 0 || report.summary.duplicateTypes > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      console.log('   • Remove unused type definitions');
      console.log('   • Consolidate duplicate types');
      console.log('   • Clean up unused imports');
      console.log('   • Consider moving shared types to common location');
    } else {
      console.log('\n🎉 Great! No unused types found.');
    }

  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  }
}

// Run if this is the main module
main();
