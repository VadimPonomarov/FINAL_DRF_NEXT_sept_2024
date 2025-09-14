#!/usr/bin/env node

/**
 * Translation Corrector - Intelligent file correction system
 * Automatically updates translation files with generated translations
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { TranslationResponse } from './llm-translator.js';

export interface CorrectionOperation {
  type: 'add' | 'update' | 'remove';
  key: string;
  value?: string;
  language: string;
  filePath: string;
  line?: number;
  reason: string;
}

export interface CorrectionResult {
  operations: CorrectionOperation[];
  filesModified: string[];
  backupsCreated: string[];
  errors: string[];
  stats: {
    added: number;
    updated: number;
    removed: number;
    filesProcessed: number;
  };
}

export class TranslationCorrector {
  private readonly localesDir: string;
  private readonly backupDir: string;
  private readonly supportedLanguages: string[];

  constructor(localesDir: string = 'src/locales') {
    this.localesDir = localesDir;
    this.backupDir = path.join(localesDir, '.backups');
    this.supportedLanguages = ['en', 'ru', 'uk'];
  }

  /**
   * Apply translations to files
   */
  async applyTranslations(translations: TranslationResponse[], options: {
    createBackups?: boolean;
    dryRun?: boolean;
    overwriteExisting?: boolean;
  } = {}): Promise<CorrectionResult> {
    const { createBackups = true, dryRun = false, overwriteExisting = false } = options;

    console.log(chalk.blue(`🔧 Starting translation correction${dryRun ? ' (DRY RUN)' : ''}...`));

    const result: CorrectionResult = {
      operations: [],
      filesModified: [],
      backupsCreated: [],
      errors: [],
      stats: {
        added: 0,
        updated: 0,
        removed: 0,
        filesProcessed: 0
      }
    };

    try {
      // Create backup directory if needed
      if (createBackups && !dryRun) {
        await this.ensureBackupDirectory();
      }

      // Group translations by language
      const translationsByLanguage = this.groupTranslationsByLanguage(translations);

      // Process each language file
      for (const [language, langTranslations] of Object.entries(translationsByLanguage)) {
        try {
          await this.processLanguageFile(language, langTranslations, result, {
            createBackups,
            dryRun,
            overwriteExisting
          });
        } catch (error) {
          const errorMsg = `Failed to process ${language}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.log(chalk.red(`❌ ${errorMsg}`));
        }
      }

      console.log(chalk.blue(`\n📊 Correction completed:`));
      console.log(chalk.green(`   Added: ${result.stats.added}`));
      console.log(chalk.yellow(`   Updated: ${result.stats.updated}`));
      console.log(chalk.red(`   Removed: ${result.stats.removed}`));
      console.log(chalk.gray(`   Files processed: ${result.stats.filesProcessed}`));
      console.log(chalk.gray(`   Errors: ${result.errors.length}`));

      if (dryRun) {
        console.log(chalk.cyan(`\n🔍 This was a dry run - no files were actually modified.`));
      }

    } catch (error) {
      const errorMsg = `Fatal error during correction: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      console.error(chalk.red(`💥 ${errorMsg}`));
    }

    return result;
  }

  /**
   * Process a single language file
   */
  private async processLanguageFile(
    language: string,
    translations: TranslationResponse[],
    result: CorrectionResult,
    options: { createBackups: boolean; dryRun: boolean; overwriteExisting: boolean }
  ): Promise<void> {
    const filePath = path.join(this.localesDir, `${language}.ts`);
    
    if (!fs.existsSync(filePath)) {
      result.errors.push(`Translation file not found: ${filePath}`);
      return;
    }

    console.log(chalk.blue(`📝 Processing ${language}.ts (${translations.length} translations)...`));

    // Create backup if requested
    if (options.createBackups && !options.dryRun) {
      await this.createBackup(filePath, result);
    }

    // Load current file content
    const originalContent = await fs.promises.readFile(filePath, 'utf-8');
    const currentTranslations = this.parseTranslationFile(originalContent);

    // Apply translations
    const updatedTranslations = { ...currentTranslations };
    
    for (const translation of translations) {
      const operation = await this.applyTranslation(
        updatedTranslations,
        translation,
        options.overwriteExisting
      );

      if (operation) {
        operation.language = language;
        operation.filePath = filePath;
        result.operations.push(operation);

        // Update stats
        result.stats[operation.type === 'add' ? 'added' : 
                    operation.type === 'update' ? 'updated' : 'removed']++;
      }
    }

    // Generate new file content
    const newContent = this.generateFileContent(updatedTranslations, originalContent);

    // Write file if not dry run and content changed
    if (!options.dryRun && newContent !== originalContent) {
      await fs.promises.writeFile(filePath, newContent, 'utf-8');
      result.filesModified.push(filePath);
      console.log(chalk.green(`✅ Updated ${language}.ts`));
    } else if (options.dryRun && newContent !== originalContent) {
      console.log(chalk.cyan(`🔍 Would update ${language}.ts`));
    } else {
      console.log(chalk.gray(`⏭️  No changes needed for ${language}.ts`));
    }

    result.stats.filesProcessed++;
  }

  /**
   * Apply a single translation to the translations object
   */
  private async applyTranslation(
    translations: Record<string, any>,
    translation: TranslationResponse,
    overwriteExisting: boolean
  ): Promise<CorrectionOperation | null> {
    const { key, translation: value } = translation;
    const keyParts = key.split('.');

    // Navigate to the correct nested location
    let current = translations;
    const path: string[] = [];

    // Navigate to parent object
    for (let i = 0; i < keyParts.length - 1; i++) {
      const part = keyParts[i];
      path.push(part);

      if (!(part in current)) {
        current[part] = {};
      } else if (typeof current[part] !== 'object' || current[part] === null) {
        // Convert non-object to object
        current[part] = {};
      }

      current = current[part];
    }

    const finalKey = keyParts[keyParts.length - 1];
    const exists = finalKey in current;

    // Determine operation type
    if (!exists) {
      current[finalKey] = value;
      return {
        type: 'add',
        key,
        value,
        language: '',
        filePath: '',
        reason: `Added missing translation for "${key}"`
      };
    } else if (overwriteExisting && current[finalKey] !== value) {
      const oldValue = current[finalKey];
      current[finalKey] = value;
      return {
        type: 'update',
        key,
        value,
        language: '',
        filePath: '',
        reason: `Updated translation for "${key}" from "${oldValue}" to "${value}"`
      };
    }

    return null; // No operation needed
  }

  /**
   * Generate new file content with proper formatting
   */
  private generateFileContent(translations: Record<string, any>, originalContent: string): string {
    // Extract the file structure (imports, comments, etc.)
    const lines = originalContent.split('\n');
    const exportDefaultIndex = lines.findIndex(line => line.includes('export default'));
    
    if (exportDefaultIndex === -1) {
      throw new Error('Could not find export default statement');
    }

    // Keep everything before export default
    const header = lines.slice(0, exportDefaultIndex).join('\n');
    
    // Generate the new translations object
    const translationsString = this.stringifyTranslations(translations, 0);
    
    // Combine header with new translations
    const newContent = `${header}export default ${translationsString};\n`;
    
    return newContent;
  }

  /**
   * Stringify translations object with proper formatting
   */
  private stringifyTranslations(obj: any, indent: number): string {
    const spaces = '  '.repeat(indent);
    const innerSpaces = '  '.repeat(indent + 1);
    
    if (typeof obj !== 'object' || obj === null) {
      return JSON.stringify(obj);
    }

    const entries = Object.entries(obj);
    if (entries.length === 0) {
      return '{}';
    }

    const lines = entries.map(([key, value]) => {
      const keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
      
      if (typeof value === 'object' && value !== null) {
        return `${innerSpaces}${keyStr}: ${this.stringifyTranslations(value, indent + 1)}`;
      } else {
        return `${innerSpaces}${keyStr}: ${JSON.stringify(value)}`;
      }
    });

    return `{\n${lines.join(',\n')}\n${spaces}}`;
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
   * Group translations by language
   */
  private groupTranslationsByLanguage(translations: TranslationResponse[]): Record<string, TranslationResponse[]> {
    const grouped: Record<string, TranslationResponse[]> = {};
    
    translations.forEach(translation => {
      if (!grouped[translation.language]) {
        grouped[translation.language] = [];
      }
      grouped[translation.language].push(translation);
    });

    return grouped;
  }

  /**
   * Create backup of a file
   */
  private async createBackup(filePath: string, result: CorrectionResult): Promise<void> {
    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${fileName}.backup.${timestamp}`;
    const backupPath = path.join(this.backupDir, backupFileName);

    await fs.promises.copyFile(filePath, backupPath);
    result.backupsCreated.push(backupPath);
    
    console.log(chalk.gray(`💾 Created backup: ${backupFileName}`));
  }

  /**
   * Ensure backup directory exists
   */
  private async ensureBackupDirectory(): Promise<void> {
    if (!fs.existsSync(this.backupDir)) {
      await fs.promises.mkdir(this.backupDir, { recursive: true });
      console.log(chalk.gray(`📁 Created backup directory: ${this.backupDir}`));
    }
  }

  /**
   * Clean old backups (keep only last N backups per file)
   */
  async cleanOldBackups(keepCount: number = 10): Promise<void> {
    if (!fs.existsSync(this.backupDir)) {
      return;
    }

    const files = await fs.promises.readdir(this.backupDir);
    const backupGroups: Record<string, string[]> = {};

    // Group backups by original file
    files.forEach(file => {
      const match = file.match(/^(.+?)\.backup\./);
      if (match) {
        const originalFile = match[1];
        if (!backupGroups[originalFile]) {
          backupGroups[originalFile] = [];
        }
        backupGroups[originalFile].push(file);
      }
    });

    // Clean old backups for each file
    for (const [originalFile, backups] of Object.entries(backupGroups)) {
      if (backups.length > keepCount) {
        // Sort by timestamp (newest first)
        backups.sort().reverse();
        
        // Remove old backups
        const toRemove = backups.slice(keepCount);
        for (const backup of toRemove) {
          const backupPath = path.join(this.backupDir, backup);
          await fs.promises.unlink(backupPath);
          console.log(chalk.gray(`🗑️  Removed old backup: ${backup}`));
        }
      }
    }
  }
}

export default TranslationCorrector;
