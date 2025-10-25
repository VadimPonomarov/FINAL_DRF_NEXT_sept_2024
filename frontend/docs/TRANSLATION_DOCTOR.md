# 🩺 Translation Doctor - AI-Powered Translation Management

Translation Doctor is an intelligent system for automated translation diagnosis, correction, and maintenance using Large Language Models (LLM) through g4f integration.

## 🎯 Features

### 🔍 **Intelligent Code Scanning**
- Scans all TypeScript/JavaScript files for translation key usage
- Detects direct usage: `t('key')`
- Identifies dynamic usage: `t(variable + 'key')`
- Finds template literals: `t(\`key\`)`
- Provides context and line numbers for each usage

### 🧠 **Smart Analysis**
- Compares used keys with existing translations
- Identifies missing translations across languages
- Finds unused translation keys
- Detects inconsistent translations between languages
- Validates key structure and formatting

### 🤖 **AI-Powered Translation Generation**
- Uses g4f to access multiple LLM providers (OpenAI, Claude, etc.)
- Generates contextually appropriate translations
- Considers automotive domain expertise
- Provides confidence scores and reasoning
- Offers alternative translation options

### 🔧 **Automatic Correction**
- Updates translation files automatically
- Creates backups before modifications
- Maintains proper TypeScript formatting
- Supports dry-run mode for safety
- Batch processing for efficiency

## 🚀 Quick Start

### Installation
All dependencies are already installed. The system is ready to use!

### Basic Usage

```bash
# Quick health check
npm run translation-health

# Scan code for translation keys
npm run translation-scan

# Analyze translation consistency
npm run translation-analyze

# Auto-fix issues with AI
npm run translation-fix

# Full interactive mode
npm run translation-doctor
```

## 📋 Commands Reference

### `npm run translation-health`
Interactive health check and treatment options.

**Features:**
- Comprehensive diagnosis
- Health score calculation
- Interactive treatment menu
- Export detailed reports

**Example:**
```bash
npm run translation-health
```

### `npm run translation-scan`
Scan code for translation key usage.

**Options:**
```bash
# Scan specific directory
npm run translation-scan -- --dir src/components

# Filter results by pattern
npm run translation-scan -- --filter "profile\."

# Save results to file
npm run translation-scan -- --output scan-results.json
```

### `npm run translation-analyze`
Analyze translation consistency.

**Options:**
```bash
# Analyze with specific severity level
npm run translation-analyze -- --severity error

# Use custom locales directory
npm run translation-analyze -- --locales src/i18n

# Export analysis report
npm run translation-analyze -- --output analysis-report.json
```

### `npm run translation-fix`
AI-powered automatic translation fixing.

**Options:**
```bash
# Dry run (show what would be changed)
npm run translation-fix -- --dry-run

# Skip creating backups
npm run translation-fix -- --no-backup

# Overwrite existing translations
npm run translation-fix -- --overwrite

# Use specific LLM model
npm run translation-fix -- --model gpt-4 --provider OpenAI
```

## 🔧 Configuration

### LLM Configuration
The system uses g4f to access various LLM providers. Default configuration:

```typescript
{
  model: 'gpt-3.5-turbo',
  provider: 'OpenAI',
  temperature: 0.3,
  maxTokens: 500,
  timeout: 30000
}
```

### Supported Languages
- **English (en)** - Base language
- **Russian (ru)** - Full support
- **Ukrainian (uk)** - Full support

### File Structure
```
src/
├── locales/
│   ├── en.ts          # English translations
│   ├── ru.ts          # Russian translations
│   ├── uk.ts          # Ukrainian translations
│   └── .backups/      # Automatic backups
└── utils/dev-tools/
    ├── translation-doctor.ts      # Main CLI interface
    ├── translation-scanner.ts     # Code scanner
    ├── translation-analyzer.ts    # Analysis engine
    ├── llm-translator.ts          # AI translation generator
    └── translation-corrector.ts   # File correction system
```

## 🎯 Use Cases

### 1. **Daily Development Workflow**
```bash
# Before committing changes
npm run translation-health
```

### 2. **Adding New Features**
```bash
# After adding new UI components
npm run translation-analyze
npm run translation-fix --dry-run
npm run translation-fix
```

### 3. **Code Review Process**
```bash
# Generate comprehensive report
npm run translation-analyze --output review-report.json
```

### 4. **Maintenance Tasks**
```bash
# Find and remove unused translations
npm run translation-analyze --severity warning
```

### 5. **Bulk Translation Updates**
```bash
# Process large translation updates
npm run translation-fix --overwrite --model gpt-4
```

## 🧠 AI Translation Quality

### Context Awareness
The AI system considers:
- **Key structure**: `profile.address.location` → UI context
- **Code context**: Actual usage in components
- **Domain expertise**: Automotive terminology
- **Cultural adaptation**: Eastern European markets
- **UI/UX best practices**: Concise, user-friendly text

### Quality Assurance
- **Confidence scoring**: 0-100% confidence levels
- **Alternative suggestions**: Multiple translation options
- **Reasoning provided**: Explanation for translation choices
- **Validation rules**: Length, format, and content checks

### Supported Providers
Through g4f integration:
- OpenAI (GPT-3.5, GPT-4)
- Anthropic (Claude)
- Google (Bard)
- And many more...

## 🛡️ Safety Features

### Backup System
- Automatic backups before any changes
- Timestamped backup files
- Backup cleanup (keeps last 10 versions)
- Easy restoration process

### Dry Run Mode
- Preview all changes before applying
- No files modified in dry-run mode
- Detailed change reports
- Safe testing of configurations

### Validation
- TypeScript syntax validation
- Translation key structure checks
- File integrity verification
- Rollback capabilities

## 📊 Reporting

### Health Score Calculation
```
Health Score = 100 - (Errors × 10) - (Warnings × 5)
```

### Issue Severity Levels
- **Error**: Missing translations, broken keys
- **Warning**: Unused translations, inconsistencies
- **Info**: Style suggestions, optimizations

### Export Formats
- JSON reports for automation
- Human-readable summaries
- Detailed issue breakdowns
- Statistics and metrics

## 🔄 Integration

### Git Hooks Integration
The system integrates with existing Husky hooks:

```bash
# Pre-commit validation
npm run translation-analyze --severity error

# Automated fixing in CI/CD
npm run translation-fix --dry-run --output ci-report.json
```

### IDE Integration
Export results for IDE plugins and extensions:

```bash
npm run translation-analyze --output .vscode/translation-issues.json
```

## 🚨 Troubleshooting

### Common Issues

**LLM API Errors:**
```bash
# Try different provider
npm run translation-fix -- --provider Anthropic --model claude-3
```

**File Permission Errors:**
```bash
# Check file permissions
ls -la src/locales/
```

**Memory Issues with Large Projects:**
```bash
# Process in smaller batches
npm run translation-scan -- --dir src/components/specific-folder
```

### Debug Mode
Enable detailed logging:
```bash
DEBUG=translation-doctor npm run translation-health
```

## 🎉 Benefits

### For Developers
- ✅ **Automated workflow** - No manual translation management
- ✅ **Context-aware translations** - AI understands your code
- ✅ **Safety first** - Backups and dry-run modes
- ✅ **Time saving** - Bulk operations and batch processing

### For Project Quality
- ✅ **Consistency** - Uniform translation quality
- ✅ **Completeness** - No missing translations
- ✅ **Maintenance** - Automated cleanup of unused keys
- ✅ **Scalability** - Handles large codebases efficiently

### For Team Collaboration
- ✅ **Standardization** - Consistent translation workflow
- ✅ **Documentation** - Detailed reports and reasoning
- ✅ **Integration** - Works with existing tools and processes
- ✅ **Accessibility** - Easy-to-use CLI interface

---

**Translation Doctor** - Making multilingual development effortless with AI! 🌍🤖
