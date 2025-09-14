#!/usr/bin/env node

/**
 * Translation Scanner - Intelligent code scanner for finding translation keys
 * Scans all AutoRia files and extracts used translation keys
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';

export interface TranslationKey {
  key: string;
  file: string;
  line: number;
  context: string;
  usage: 'direct' | 'dynamic' | 'template';
}

export interface ScanResult {
  totalFiles: number;
  scannedFiles: number;
  foundKeys: TranslationKey[];
  errors: string[];
  stats: {
    directUsage: number;
    dynamicUsage: number;
    templateUsage: number;
  };
}

export class TranslationScanner {
  private readonly sourceDir: string;
  private readonly patterns: RegExp[];
  private readonly fileExtensions: string[];

  constructor(sourceDir: string = 'src') {
    this.sourceDir = sourceDir;
    this.fileExtensions = ['**/*.tsx', '**/*.ts', '**/*.jsx', '**/*.js'];
    
    // Patterns to match translation key usage
    this.patterns = [
      // t('key') or t("key")
      /t\(['"`]([^'"`]+)['"`]\)/g,
      // t(`key`) - template literals
      /t\(`([^`]+)`\)/g,
      // useTranslation hook with t('key')
      /const\s+{\s*t\s*}\s*=\s*useTranslation\(\)[^}]*t\(['"`]([^'"`]+)['"`]\)/g,
      // Dynamic keys: t(variable + 'key')
      /t\([^'"`]*['"`]([^'"`]+)['"`][^)]*\)/g,
      // Translation keys in JSX: {t('key')}
      /{\s*t\(['"`]([^'"`]+)['"`]\)\s*}/g,
    ];
  }

  /**
   * Scan all files for translation keys
   */
  async scan(): Promise<ScanResult> {
    console.log(chalk.blue('🔍 Starting translation key scan...'));
    
    const result: ScanResult = {
      totalFiles: 0,
      scannedFiles: 0,
      foundKeys: [],
      errors: [],
      stats: {
        directUsage: 0,
        dynamicUsage: 0,
        templateUsage: 0
      }
    };

    try {
      // Get all files to scan
      const files = await this.getFilesToScan();
      result.totalFiles = files.length;

      console.log(chalk.gray(`📁 Found ${files.length} files to scan`));

      // Scan each file
      for (const file of files) {
        try {
          const keys = await this.scanFile(file);
          result.foundKeys.push(...keys);
          result.scannedFiles++;
          
          // Update stats
          keys.forEach(key => {
            result.stats[key.usage === 'direct' ? 'directUsage' : 
                          key.usage === 'dynamic' ? 'dynamicUsage' : 'templateUsage']++;
          });

          if (keys.length > 0) {
            console.log(chalk.green(`✅ ${file}: ${keys.length} keys found`));
          }
        } catch (error) {
          const errorMsg = `Error scanning ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.log(chalk.red(`❌ ${errorMsg}`));
        }
      }

      console.log(chalk.blue(`\n📊 Scan completed:`));
      console.log(chalk.gray(`   Files scanned: ${result.scannedFiles}/${result.totalFiles}`));
      console.log(chalk.gray(`   Keys found: ${result.foundKeys.length}`));
      console.log(chalk.gray(`   Direct usage: ${result.stats.directUsage}`));
      console.log(chalk.gray(`   Dynamic usage: ${result.stats.dynamicUsage}`));
      console.log(chalk.gray(`   Template usage: ${result.stats.templateUsage}`));
      console.log(chalk.gray(`   Errors: ${result.errors.length}`));

    } catch (error) {
      const errorMsg = `Fatal error during scan: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      console.error(chalk.red(`💥 ${errorMsg}`));
    }

    return result;
  }

  /**
   * Get all files that should be scanned
   */
  private async getFilesToScan(): Promise<string[]> {
    const allFiles: string[] = [];
    
    for (const pattern of this.fileExtensions) {
      const files = await glob(pattern, {
        cwd: this.sourceDir,
        ignore: [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/*.d.ts',
          '**/test/**',
          '**/__tests__/**',
          '**/*.test.*',
          '**/*.spec.*'
        ]
      });
      
      allFiles.push(...files.map(file => path.join(this.sourceDir, file)));
    }

    return [...new Set(allFiles)]; // Remove duplicates
  }

  /**
   * Scan a single file for translation keys
   */
  private async scanFile(filePath: string): Promise<TranslationKey[]> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const keys: TranslationKey[] = [];

    // Check each pattern
    for (const pattern of this.patterns) {
      let match;
      pattern.lastIndex = 0; // Reset regex state
      
      while ((match = pattern.exec(content)) !== null) {
        const key = match[1];
        if (!key || key.trim() === '') continue;

        // Find line number
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;
        
        // Get context (the line where the key is used)
        const context = lines[lineNumber - 1]?.trim() || '';

        // Determine usage type
        const usage = this.determineUsageType(match[0], key);

        keys.push({
          key: key.trim(),
          file: filePath,
          line: lineNumber,
          context,
          usage
        });
      }
    }

    return keys;
  }

  /**
   * Determine the type of key usage
   */
  private determineUsageType(fullMatch: string, key: string): 'direct' | 'dynamic' | 'template' {
    if (fullMatch.includes('`')) {
      return 'template';
    }
    if (fullMatch.includes('+') || fullMatch.includes('${')) {
      return 'dynamic';
    }
    return 'direct';
  }

  /**
   * Get unique keys from scan result
   */
  static getUniqueKeys(result: ScanResult): string[] {
    const uniqueKeys = new Set(result.foundKeys.map(k => k.key));
    return Array.from(uniqueKeys).sort();
  }

  /**
   * Group keys by file
   */
  static groupKeysByFile(result: ScanResult): Record<string, TranslationKey[]> {
    const grouped: Record<string, TranslationKey[]> = {};
    
    result.foundKeys.forEach(key => {
      if (!grouped[key.file]) {
        grouped[key.file] = [];
      }
      grouped[key.file].push(key);
    });

    return grouped;
  }

  /**
   * Filter keys by pattern
   */
  static filterKeys(result: ScanResult, pattern: string): TranslationKey[] {
    const regex = new RegExp(pattern, 'i');
    return result.foundKeys.filter(key => regex.test(key.key));
  }
}

// Export for CLI usage
export default TranslationScanner;
