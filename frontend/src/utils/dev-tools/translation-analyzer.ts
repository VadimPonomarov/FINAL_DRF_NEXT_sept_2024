#!/usr/bin/env node

/**
 * Translation Analyzer - Intelligent analysis of translation consistency
 * Compares found keys with existing translations and identifies issues
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { TranslationKey, ScanResult } from './translation-scanner.js';

export interface TranslationFile {
  language: string;
  filePath: string;
  translations: Record<string, any>;
  keys: Set<string>;
}

export interface AnalysisIssue {
  type: 'missing' | 'unused' | 'inconsistent' | 'malformed';
  severity: 'error' | 'warning' | 'info';
  key: string;
  languages: string[];
  description: string;
  suggestion?: string;
  context?: TranslationKey[];
}

export interface AnalysisResult {
  issues: AnalysisIssue[];
  stats: {
    totalKeys: number;
    usedKeys: number;
    unusedKeys: number;
    missingKeys: number;
    inconsistentKeys: number;
    malformedKeys: number;
  };
  translationFiles: TranslationFile[];
  scanResult: ScanResult;
}

export class TranslationAnalyzer {
  private readonly localesDir: string;
  private readonly supportedLanguages: string[];

  constructor(localesDir: string = 'src/locales') {
    this.localesDir = localesDir;
    this.supportedLanguages = ['en', 'ru', 'uk'];
  }

  /**
   * Analyze translation consistency
   */
  async analyze(scanResult: ScanResult): Promise<AnalysisResult> {
    console.log(chalk.blue('🔍 Starting translation analysis...'));

    const result: AnalysisResult = {
      issues: [],
      stats: {
        totalKeys: 0,
        usedKeys: 0,
        unusedKeys: 0,
        missingKeys: 0,
        inconsistentKeys: 0,
        malformedKeys: 0
      },
      translationFiles: [],
      scanResult
    };

    try {
      // Load translation files
      result.translationFiles = await this.loadTranslationFiles();
      
      // Get all unique keys from scan
      const usedKeys = new Set(scanResult.foundKeys.map(k => k.key));
      result.stats.usedKeys = usedKeys.size;

      // Get all keys from translation files
      const allTranslationKeys = this.getAllTranslationKeys(result.translationFiles);
      result.stats.totalKeys = allTranslationKeys.size;

      console.log(chalk.gray(`📊 Analysis stats:`));
      console.log(chalk.gray(`   Used keys in code: ${result.stats.usedKeys}`));
      console.log(chalk.gray(`   Total translation keys: ${result.stats.totalKeys}`));

      // Find issues
      await this.findMissingKeys(result, usedKeys);
      await this.findUnusedKeys(result, usedKeys, allTranslationKeys);
      await this.findInconsistentKeys(result);
      await this.findMalformedKeys(result);

      // Update stats
      result.stats.missingKeys = result.issues.filter(i => i.type === 'missing').length;
      result.stats.unusedKeys = result.issues.filter(i => i.type === 'unused').length;
      result.stats.inconsistentKeys = result.issues.filter(i => i.type === 'inconsistent').length;
      result.stats.malformedKeys = result.issues.filter(i => i.type === 'malformed').length;

      console.log(chalk.blue(`\n📋 Analysis completed:`));
      console.log(chalk.red(`   Missing keys: ${result.stats.missingKeys}`));
      console.log(chalk.yellow(`   Unused keys: ${result.stats.unusedKeys}`));
      console.log(chalk.hex('#FFA500')(`   Inconsistent keys: ${result.stats.inconsistentKeys}`));
      console.log(chalk.gray(`   Malformed keys: ${result.stats.malformedKeys}`));

    } catch (error) {
      console.error(chalk.red(`💥 Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      throw error;
    }

    return result;
  }

  /**
   * Load all translation files
   */
  private async loadTranslationFiles(): Promise<TranslationFile[]> {
    const files: TranslationFile[] = [];

    for (const lang of this.supportedLanguages) {
      const filePath = path.join(this.localesDir, `${lang}.ts`);
      
      try {
        if (!fs.existsSync(filePath)) {
          console.log(chalk.yellow(`⚠️  Translation file not found: ${filePath}`));
          continue;
        }

        const content = await fs.promises.readFile(filePath, 'utf-8');
        const translations = this.parseTranslationFile(content);
        const keys = this.extractKeysFromObject(translations);

        files.push({
          language: lang,
          filePath,
          translations,
          keys: new Set(keys)
        });

        console.log(chalk.green(`✅ Loaded ${lang}: ${keys.length} keys`));
      } catch (error) {
        console.log(chalk.red(`❌ Failed to load ${lang}: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    }

    return files;
  }

  /**
   * Parse TypeScript translation file
   */
  private parseTranslationFile(content: string): Record<string, any> {
    try {
      // Extract the export default object
      const match = content.match(/export\s+default\s+({[\s\S]*});?\s*$/);
      if (!match) {
        throw new Error('Could not find export default object');
      }

      // Use eval to parse the object (safe in this controlled context)
      const translationObject = eval(`(${match[1]})`);
      return translationObject;
    } catch (error) {
      throw new Error(`Failed to parse translation file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract all keys from nested translation object
   */
  private extractKeysFromObject(obj: any, prefix: string = ''): string[] {
    const keys: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursively extract keys from nested objects
        keys.push(...this.extractKeysFromObject(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }

    return keys;
  }

  /**
   * Get all unique keys from all translation files
   */
  private getAllTranslationKeys(files: TranslationFile[]): Set<string> {
    const allKeys = new Set<string>();
    files.forEach(file => {
      file.keys.forEach(key => allKeys.add(key));
    });
    return allKeys;
  }

  /**
   * Find keys used in code but missing in translations
   */
  private async findMissingKeys(result: AnalysisResult, usedKeys: Set<string>): Promise<void> {
    for (const key of usedKeys) {
      const missingLanguages: string[] = [];

      for (const file of result.translationFiles) {
        if (!file.keys.has(key)) {
          missingLanguages.push(file.language);
        }
      }

      if (missingLanguages.length > 0) {
        const context = result.scanResult.foundKeys.filter(k => k.key === key);
        
        result.issues.push({
          type: 'missing',
          severity: 'error',
          key,
          languages: missingLanguages,
          description: `Key "${key}" is used in code but missing in ${missingLanguages.join(', ')} translation(s)`,
          context,
          suggestion: `Add translation for "${key}" in ${missingLanguages.join(', ')}`
        });
      }
    }
  }

  /**
   * Find keys in translations but not used in code
   */
  private async findUnusedKeys(result: AnalysisResult, usedKeys: Set<string>, allKeys: Set<string>): Promise<void> {
    for (const key of allKeys) {
      if (!usedKeys.has(key)) {
        const presentLanguages = result.translationFiles
          .filter(file => file.keys.has(key))
          .map(file => file.language);

        result.issues.push({
          type: 'unused',
          severity: 'warning',
          key,
          languages: presentLanguages,
          description: `Key "${key}" exists in translations but is not used in code`,
          suggestion: `Consider removing unused key "${key}" or verify if it should be used`
        });
      }
    }
  }

  /**
   * Find keys that exist in some languages but not others
   */
  private async findInconsistentKeys(result: AnalysisResult): Promise<void> {
    const allKeys = this.getAllTranslationKeys(result.translationFiles);

    for (const key of allKeys) {
      const presentLanguages: string[] = [];
      const missingLanguages: string[] = [];

      for (const file of result.translationFiles) {
        if (file.keys.has(key)) {
          presentLanguages.push(file.language);
        } else {
          missingLanguages.push(file.language);
        }
      }

      if (missingLanguages.length > 0 && presentLanguages.length > 0) {
        result.issues.push({
          type: 'inconsistent',
          severity: 'error',
          key,
          languages: missingLanguages,
          description: `Key "${key}" exists in ${presentLanguages.join(', ')} but missing in ${missingLanguages.join(', ')}`,
          suggestion: `Add missing translations for "${key}" in ${missingLanguages.join(', ')}`
        });
      }
    }
  }

  /**
   * Find malformed or problematic keys
   */
  private async findMalformedKeys(result: AnalysisResult): Promise<void> {
    const allKeys = this.getAllTranslationKeys(result.translationFiles);

    for (const key of allKeys) {
      // Check for common issues
      if (key.includes('..')) {
        result.issues.push({
          type: 'malformed',
          severity: 'warning',
          key,
          languages: [],
          description: `Key "${key}" contains double dots (..) which may indicate a structural issue`,
          suggestion: `Review key structure for "${key}"`
        });
      }

      if (key.startsWith('.') || key.endsWith('.')) {
        result.issues.push({
          type: 'malformed',
          severity: 'warning',
          key,
          languages: [],
          description: `Key "${key}" starts or ends with a dot, which may cause issues`,
          suggestion: `Fix key structure for "${key}"`
        });
      }

      if (key.includes(' ')) {
        result.issues.push({
          type: 'malformed',
          severity: 'info',
          key,
          languages: [],
          description: `Key "${key}" contains spaces, consider using camelCase or dots`,
          suggestion: `Consider renaming "${key}" to use dots or camelCase`
        });
      }
    }
  }
}

export default TranslationAnalyzer;
