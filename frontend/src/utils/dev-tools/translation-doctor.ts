#!/usr/bin/env node

/**
 * Translation Doctor - CLI interface for intelligent translation management
 * Main entry point for the translation diagnosis and correction system
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import TranslationScanner from './translation-scanner.js';
import TranslationAnalyzer from './translation-analyzer.js';
import GoogleTranslator from './google-translator.js';
import TranslationCorrector from './translation-corrector.js';

const program = new Command();

program
  .name('translation-doctor')
  .description('🩺 Intelligent translation diagnosis and correction system')
  .version('1.0.0');

/**
 * Scan command - Find all translation keys in code
 */
program
  .command('scan')
  .description('🔍 Scan code for translation key usage')
  .option('-d, --dir <directory>', 'Source directory to scan', 'src')
  .option('-o, --output <file>', 'Output file for results (JSON)')
  .option('--filter <pattern>', 'Filter keys by pattern')
  .action(async (options) => {
    const spinner = ora('Scanning code for translation keys...').start();
    
    try {
      const scanner = new TranslationScanner(options.dir);
      const result = await scanner.scan();
      
      spinner.succeed(`Scan completed: ${result.foundKeys.length} keys found`);
      
      if (options.filter) {
        const filtered = TranslationScanner.filterKeys(result, options.filter);
        console.log(chalk.blue(`\n🔍 Filtered results (${filtered.length} keys):`));
        filtered.forEach(key => {
          console.log(chalk.gray(`  ${key.key} (${key.file}:${key.line})`));
        });
      }
      
      if (options.output) {
        await saveResults(options.output, result);
        console.log(chalk.green(`📄 Results saved to ${options.output}`));
      }
      
    } catch (error) {
      spinner.fail(`Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

/**
 * Analyze command - Analyze translation consistency
 */
program
  .command('analyze')
  .description('🔍 Analyze translation consistency')
  .option('-d, --dir <directory>', 'Source directory to scan', 'src')
  .option('-l, --locales <directory>', 'Locales directory', 'src/locales')
  .option('-o, --output <file>', 'Output file for results (JSON)')
  .option('--severity <level>', 'Minimum severity level (error|warning|info)', 'warning')
  .action(async (options) => {
    const spinner = ora('Analyzing translation consistency...').start();
    
    try {
      // Scan code first
      spinner.text = 'Scanning code for translation keys...';
      const scanner = new TranslationScanner(options.dir);
      const scanResult = await scanner.scan();
      
      // Analyze translations
      spinner.text = 'Analyzing translation consistency...';
      const analyzer = new TranslationAnalyzer(options.locales);
      const analysisResult = await analyzer.analyze(scanResult);
      
      spinner.succeed(`Analysis completed: ${analysisResult.issues.length} issues found`);
      
      // Display results
      displayAnalysisResults(analysisResult, options.severity);
      
      if (options.output) {
        await saveResults(options.output, analysisResult);
        console.log(chalk.green(`📄 Results saved to ${options.output}`));
      }
      
    } catch (error) {
      spinner.fail(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

/**
 * Fix command - Automatically fix translation issues using LLM
 */
program
  .command('fix')
  .description('🤖 Automatically fix translation issues using AI')
  .option('-d, --dir <directory>', 'Source directory to scan', 'src')
  .option('-l, --locales <directory>', 'Locales directory', 'src/locales')
  .option('--dry-run', 'Show what would be changed without making changes')
  .option('--no-backup', 'Skip creating backups')
  .option('--overwrite', 'Overwrite existing translations')
  .action(async (options) => {
    console.log(chalk.blue('🩺 Translation Doctor - Google Translate Fix Mode\n'));
    
    try {
      // Step 1: Scan and analyze
      const spinner = ora('Scanning and analyzing translations...').start();
      
      const scanner = new TranslationScanner(options.dir);
      const scanResult = await scanner.scan();
      
      const analyzer = new TranslationAnalyzer(options.locales);
      const analysisResult = await analyzer.analyze(scanResult);
      
      spinner.succeed(`Found ${analysisResult.issues.length} issues to fix`);
      
      if (analysisResult.issues.length === 0) {
        console.log(chalk.green('🎉 No issues found! Your translations are perfect.'));
        return;
      }
      
      // Step 2: Confirm with user
      const fixableIssues = analysisResult.issues.filter(issue => 
        issue.type === 'missing' || issue.type === 'inconsistent'
      );
      
      if (fixableIssues.length === 0) {
        console.log(chalk.yellow('⚠️  No fixable issues found. Only manual fixes are needed.'));
        displayAnalysisResults(analysisResult, 'info');
        return;
      }
      
      console.log(chalk.blue(`\n🔧 Found ${fixableIssues.length} fixable issues:`));
      fixableIssues.slice(0, 5).forEach(issue => {
        console.log(chalk.gray(`  • ${issue.key} (${issue.languages.join(', ')})`));
      });
      
      if (fixableIssues.length > 5) {
        console.log(chalk.gray(`  ... and ${fixableIssues.length - 5} more`));
      }
      
      if (!options.dryRun) {
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: 'Proceed with AI-powered translation generation?',
          default: true
        }]);
        
        if (!confirm) {
          console.log(chalk.yellow('Operation cancelled.'));
          return;
        }
      }
      
      // Step 3: Generate translations using Google Translate
      const translator = new GoogleTranslator();
      
      const translations = await translator.generateTranslations(fixableIssues);
      
      if (translations.length === 0) {
        console.log(chalk.red('❌ No translations were generated.'));
        return;
      }
      
      // Step 4: Apply corrections
      const corrector = new TranslationCorrector(options.locales);
      const correctionResult = await corrector.applyTranslations(translations, {
        dryRun: options.dryRun,
        createBackups: !options.noBackup,
        overwriteExisting: options.overwrite
      });
      
      // Step 5: Display results
      displayCorrectionResults(correctionResult);
      
    } catch (error) {
      console.error(chalk.red(`💥 Fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

/**
 * Doctor command - Interactive diagnosis and treatment
 */
program
  .command('doctor')
  .description('🩺 Interactive translation health check and treatment')
  .option('-d, --dir <directory>', 'Source directory to scan', 'src')
  .option('-l, --locales <directory>', 'Locales directory', 'src/locales')
  .action(async (options) => {
    console.log(chalk.blue('🩺 Translation Doctor - Interactive Mode\n'));
    console.log(chalk.gray('Performing comprehensive translation health check...\n'));
    
    try {
      // Full diagnosis
      const spinner = ora('Running full diagnosis...').start();
      
      const scanner = new TranslationScanner(options.dir);
      const scanResult = await scanner.scan();
      
      const analyzer = new TranslationAnalyzer(options.locales);
      const analysisResult = await analyzer.analyze(scanResult);
      
      spinner.succeed('Diagnosis completed');
      
      // Display health report
      displayHealthReport(analysisResult);
      
      // Interactive treatment options
      await interactiveTreatment(analysisResult, options);
      
    } catch (error) {
      console.error(chalk.red(`💥 Diagnosis failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

/**
 * Display analysis results
 */
function displayAnalysisResults(result: any, minSeverity: string): void {
  const severityOrder = { error: 3, warning: 2, info: 1 };
  const minLevel = severityOrder[minSeverity as keyof typeof severityOrder] || 2;
  
  const filteredIssues = result.issues.filter((issue: any) => 
    severityOrder[issue.severity as keyof typeof severityOrder] >= minLevel
  );
  
  if (filteredIssues.length === 0) {
    console.log(chalk.green('\n✅ No issues found at the specified severity level!'));
    return;
  }
  
  console.log(chalk.blue(`\n📋 Found ${filteredIssues.length} issues:\n`));
  
  filteredIssues.forEach((issue: any, index: number) => {
    const icon = issue.severity === 'error' ? '❌' : 
                 issue.severity === 'warning' ? '⚠️' : 'ℹ️';
    const color = issue.severity === 'error' ? chalk.red : 
                  issue.severity === 'warning' ? chalk.yellow : chalk.blue;
    
    console.log(color(`${icon} ${issue.description}`));
    if (issue.suggestion) {
      console.log(chalk.gray(`   💡 ${issue.suggestion}`));
    }
    console.log();
  });
}

/**
 * Display correction results
 */
function displayCorrectionResults(result: any): void {
  console.log(chalk.blue('\n📊 Correction Results:\n'));
  
  console.log(chalk.green(`✅ Added: ${result.stats.added} translations`));
  console.log(chalk.yellow(`🔄 Updated: ${result.stats.updated} translations`));
  console.log(chalk.red(`🗑️  Removed: ${result.stats.removed} translations`));
  console.log(chalk.gray(`📁 Files processed: ${result.stats.filesProcessed}`));
  
  if (result.backupsCreated.length > 0) {
    console.log(chalk.gray(`💾 Backups created: ${result.backupsCreated.length}`));
  }
  
  if (result.errors.length > 0) {
    console.log(chalk.red(`❌ Errors: ${result.errors.length}`));
    result.errors.forEach((error: string) => {
      console.log(chalk.red(`   • ${error}`));
    });
  }
}

/**
 * Display health report
 */
function displayHealthReport(result: any): void {
  console.log(chalk.blue('📊 Translation Health Report\n'));
  
  const totalIssues = result.issues.length;
  const errorCount = result.issues.filter((i: any) => i.severity === 'error').length;
  const warningCount = result.issues.filter((i: any) => i.severity === 'warning').length;
  
  // Health score calculation
  const healthScore = Math.max(0, 100 - (errorCount * 10) - (warningCount * 5));
  const healthColor = healthScore >= 90 ? chalk.green : 
                     healthScore >= 70 ? chalk.yellow : chalk.red;
  
  console.log(healthColor(`🏥 Health Score: ${healthScore}/100`));
  console.log();
  
  console.log(chalk.gray(`📈 Statistics:`));
  console.log(chalk.gray(`   Used keys: ${result.stats.usedKeys}`));
  console.log(chalk.gray(`   Total keys: ${result.stats.totalKeys}`));
  console.log(chalk.gray(`   Coverage: ${Math.round((result.stats.usedKeys / result.stats.totalKeys) * 100)}%`));
  console.log();
  
  if (totalIssues > 0) {
    console.log(chalk.red(`❌ Errors: ${errorCount}`));
    console.log(chalk.yellow(`⚠️  Warnings: ${warningCount}`));
    console.log(chalk.blue(`ℹ️  Info: ${totalIssues - errorCount - warningCount}`));
  } else {
    console.log(chalk.green('🎉 Perfect health! No issues found.'));
  }
  
  console.log();
}

/**
 * Interactive treatment options
 */
async function interactiveTreatment(result: any, options: any): Promise<void> {
  if (result.issues.length === 0) {
    return;
  }
  
  const choices = [
    { name: '🤖 Auto-fix with AI', value: 'autofix' },
    { name: '📋 Show detailed issues', value: 'details' },
    { name: '💾 Export report', value: 'export' },
    { name: '🚪 Exit', value: 'exit' }
  ];
  
  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'What would you like to do?',
    choices
  }]);
  
  switch (action) {
    case 'autofix':
      // Run auto-fix
      console.log(chalk.blue('\n🤖 Starting AI-powered auto-fix...\n'));
      // Implementation would call the fix logic here
      break;
      
    case 'details':
      displayAnalysisResults(result, 'info');
      await interactiveTreatment(result, options);
      break;
      
    case 'export':
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `translation-report-${timestamp}.json`;
      await saveResults(filename, result);
      console.log(chalk.green(`📄 Report exported to ${filename}`));
      await interactiveTreatment(result, options);
      break;
      
    case 'exit':
      console.log(chalk.blue('👋 Thank you for using Translation Doctor!'));
      break;
  }
}

/**
 * Save results to file
 */
async function saveResults(filename: string, data: any): Promise<void> {
  const fs = await import('fs');
  await fs.promises.writeFile(filename, JSON.stringify(data, null, 2), 'utf-8');
}

// Parse command line arguments
program.parse();

export default program;
