#!/usr/bin/env node

/**
 * Google Translator - Reliable translation using Google Translate API
 * Uses dictionary first, then Google Translate for new terms
 */

import chalk from 'chalk';
import { Translate } from '@google-cloud/translate/build/src/v2';
import fs from 'fs';
import path from 'path';
import { getDictionaryTranslation, isInDictionary } from './translation-dictionary.js';
import type { AnalysisIssue } from './translation-analyzer.js';

// Load environment variables from env-config
function loadEnvConfig() {
  const envConfigDir = path.resolve(process.cwd(), '../env-config');
  const envFiles = [
    path.join(envConfigDir, '.env.base'),
    path.join(envConfigDir, '.env.secrets'),
    path.join(envConfigDir, '.env.local')
  ];

  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, 'utf-8');
      content.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#') && line.includes('=')) {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = value.trim();
          }
        }
      });
    }
  }
}

// Load environment variables at module initialization
loadEnvConfig();

interface TranslationRequest {
  key: string;
  targetLanguage: string;
  context?: string;
  domain?: string;
}

interface TranslationResponse {
  key: string;
  language: string;
  translation: string;
  confidence: number;
  reasoning: string;
  source: 'dictionary' | 'google' | 'fallback';
}

interface GoogleTranslatorConfig {
  googleTranslateApiKey?: string;
  googleTranslateProjectId?: string;
  maxDailyRequests: number;
  useDictionaryFirst: boolean;
  timeout: number;
}

export class GoogleTranslator {
  private readonly googleTranslate: Translate | null = null;
  private readonly config: GoogleTranslatorConfig;
  private requestCount: number = 0;
  private readonly languageMap = {
    'uk': 'uk', // Ukrainian
    'ru': 'ru', // Russian  
    'en': 'en'  // English
  };

  constructor(config?: Partial<GoogleTranslatorConfig>) {
    // Use existing Google Maps API key (same key works for Google Translate)
    const apiKey = process.env.GOOGLE_MAPS_API_KEY ||
                   process.env.GOOGLE_TRANSLATE_API_KEY ||
                   process.env.GOOGLE_API_KEY;

    this.config = {
      googleTranslateApiKey: apiKey,
      googleTranslateProjectId: process.env.GOOGLE_TRANSLATE_PROJECT_ID || 'autoria-platform-dev',
      maxDailyRequests: 100,
      useDictionaryFirst: true,
      timeout: 30000,
      ...config
    };

    // Initialize Google Translate if API key is provided
    if (this.config.googleTranslateApiKey) {
      try {
        this.googleTranslate = new Translate({
          key: this.config.googleTranslateApiKey,
          projectId: this.config.googleTranslateProjectId
        });
        console.log(chalk.green('[Google Translator] Google Translate API initialized'));
      } catch (error) {
        console.warn(chalk.yellow('[Google Translator] Failed to initialize Google Translate:', error));
      }
    } else {
      console.log(chalk.yellow('[Google Translator] Google API key not found - using dictionary only'));
      console.log(chalk.gray('[Google Translator] Checked: GOOGLE_TRANSLATE_API_KEY, GOOGLE_MAPS_API_KEY, GOOGLE_API_KEY'));
    }
  }

  /**
   * Generate translations for missing keys
   */
  async generateTranslations(issues: AnalysisIssue[]): Promise<TranslationResponse[]> {
    console.log(chalk.blue('🌐 Starting Google Translator...'));
    
    const results: TranslationResponse[] = [];
    const missingIssues = issues.filter(issue => issue.type === 'missing' || issue.type === 'inconsistent');

    console.log(chalk.gray(`📝 Found ${missingIssues.length} keys needing translation`));
    console.log(chalk.blue(`🔧 Translation methods:`));
    console.log(chalk.gray(`   📚 Dictionary: Available`));
    console.log(chalk.gray(`   🌐 Google Translate: ${this.googleTranslate ? 'Available' : 'Not configured'}`));
    console.log(chalk.gray(`   📊 Daily requests limit: ${this.config.maxDailyRequests}`));

    // Load existing translations to avoid duplicating work
    const existingTranslations = await this.loadExistingTranslations();

    let skippedCount = 0;
    let dictionaryCount = 0;
    let googleCount = 0;
    let fallbackCount = 0;

    for (const issue of missingIssues) {
      for (const language of issue.languages) {
        // Check if translation already exists
        if (this.translationExists(existingTranslations, issue.key, language)) {
          console.log(chalk.gray(`⏭️  Skipping "${issue.key}" (${language}) - already exists`));
          skippedCount++;
          continue;
        }

        try {
          const request: TranslationRequest = {
            key: issue.key,
            targetLanguage: language,
            context: issue.context,
            domain: 'automotive'
          };

          const response = await this.translateKey(request);
          results.push(response);

          // Count by source
          switch (response.source) {
            case 'dictionary': dictionaryCount++; break;
            case 'google': googleCount++; break;
            case 'fallback': fallbackCount++; break;
          }

          const sourceIcon = response.source === 'dictionary' ? '📚' : 
                           response.source === 'google' ? '🌐' : '🔧';
          
          console.log(chalk.green(`✅ ${sourceIcon} "${response.translation}" (${response.confidence}%)`));
          
        } catch (error) {
          console.log(chalk.red(`❌ Failed to translate "${issue.key}" to ${language}: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      }
    }

    console.log(chalk.blue(`\n🎉 Translation completed:`));
    console.log(chalk.green(`   📚 Dictionary: ${dictionaryCount} translations`));
    console.log(chalk.green(`   🌐 Google: ${googleCount} translations`));
    console.log(chalk.green(`   🔧 Fallback: ${fallbackCount} translations`));
    console.log(chalk.gray(`   ⏭️  Skipped: ${skippedCount} existing translations`));
    console.log(chalk.gray(`   📊 Google requests used: ${this.requestCount}/${this.config.maxDailyRequests}`));

    return results;
  }

  /**
   * Translate a single key
   */
  async translateKey(request: TranslationRequest): Promise<TranslationResponse> {
    // 1. Try dictionary first
    if (this.config.useDictionaryFirst) {
      const dictionaryTranslation = getDictionaryTranslation(request.key, request.targetLanguage as 'en' | 'ru' | 'uk');
      if (dictionaryTranslation) {
        return {
          key: request.key,
          language: request.targetLanguage,
          translation: dictionaryTranslation,
          confidence: 95,
          reasoning: 'Found in comprehensive translation dictionary',
          source: 'dictionary'
        };
      }
    }

    // 2. Try Google Translate if available and within limits
    if (this.googleTranslate && this.requestCount < this.config.maxDailyRequests) {
      try {
        const sourceText = this.extractTranslatableText(request.key);
        if (sourceText && sourceText.length > 1) {
          this.requestCount++;
          
          const [translation] = await this.googleTranslate.translate(sourceText, {
            from: 'en',
            to: this.languageMap[request.targetLanguage as keyof typeof this.languageMap] || request.targetLanguage
          });

          return {
            key: request.key,
            language: request.targetLanguage,
            translation: translation,
            confidence: 90,
            reasoning: 'Translated using Google Translate API',
            source: 'google'
          };
        }
      } catch (error) {
        console.warn(chalk.yellow(`Google Translate failed for "${request.key}": ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    }

    // 3. Fallback to basic transformation
    const fallbackTranslation = this.generateFallbackTranslation(request.key, request.targetLanguage);
    
    return {
      key: request.key,
      language: request.targetLanguage,
      translation: fallbackTranslation,
      confidence: 30,
      reasoning: 'Generated using fallback logic (Google Translate unavailable or limit reached)',
      source: 'fallback'
    };
  }

  /**
   * Extract translatable text from key
   */
  private extractTranslatableText(key: string): string {
    // Get the last part of the key (most likely to be translatable)
    const parts = key.split('.');
    let text = parts[parts.length - 1];

    // Convert camelCase to words
    text = text.replace(/([A-Z])/g, ' $1').trim();
    
    // Convert snake_case to words
    text = text.replace(/_/g, ' ');
    
    // Convert kebab-case to words
    text = text.replace(/-/g, ' ');
    
    // Capitalize first letter
    text = text.charAt(0).toUpperCase() + text.slice(1);
    
    return text;
  }

  /**
   * Generate fallback translation
   */
  private generateFallbackTranslation(key: string, targetLanguage: string): string {
    const text = this.extractTranslatableText(key);
    
    // If it's just the key, return as is
    if (text === key) {
      return key;
    }
    
    return text;
  }

  /**
   * Load existing translations from files
   */
  private async loadExistingTranslations(): Promise<Record<string, Record<string, any>>> {
    const translations: Record<string, Record<string, any>> = {};
    const localesDir = path.join(process.cwd(), 'src', 'locales');

    for (const lang of ['en', 'ru', 'uk']) {
      const filePath = path.join(localesDir, `${lang}.ts`);
      try {
        if (fs.existsSync(filePath)) {
          const content = await fs.promises.readFile(filePath, 'utf-8');
          translations[lang] = this.parseTranslationFile(content);
        } else {
          translations[lang] = {};
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not load ${lang}.ts`));
        translations[lang] = {};
      }
    }

    return translations;
  }

  /**
   * Check if a translation already exists
   */
  private translationExists(translations: Record<string, Record<string, any>>, key: string, language: string): boolean {
    const langTranslations = translations[language];
    if (!langTranslations) return false;

    const keyParts = key.split('.');
    let current = langTranslations;

    for (const part of keyParts) {
      if (typeof current !== 'object' || current === null || !(part in current)) {
        return false;
      }
      current = current[part];
    }

    return typeof current === 'string' && current.length > 0;
  }

  /**
   * Parse translation file content to extract translations object
   */
  private parseTranslationFile(content: string): Record<string, any> {
    try {
      // Simple regex to extract the exported object
      const match = content.match(/export\s+default\s+({[\s\S]*});?\s*$/m);
      if (match) {
        // Use eval in a safe context (only for dev tools)
        return eval(`(${match[1]})`);
      }
    } catch (error) {
      console.warn('Could not parse translation file:', error);
    }
    return {};
  }

  /**
   * Get current request count and limits
   */
  getUsageStats() {
    return {
      requestsUsed: this.requestCount,
      requestsLimit: this.config.maxDailyRequests,
      requestsRemaining: this.config.maxDailyRequests - this.requestCount,
      googleTranslateAvailable: this.googleTranslate !== null
    };
  }
}

// Export for use in other modules
export default GoogleTranslator;
