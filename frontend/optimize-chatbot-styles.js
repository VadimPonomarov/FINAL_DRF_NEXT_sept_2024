#!/usr/bin/env node

/**
 * Скрипт для оптимизации стилей ChatBot
 * Заменяет импорты отдельных CSS модулей на единый файл
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHATBOT_DIR = './src/components/ChatBot';
const UNIFIED_STYLES = './src/components/ChatBot/styles/chatbot-unified.module.css';

// Маппинг старых классов на новые
const CLASS_MAPPING = {
  // ChatBotIcon
  'styles.chatBotIcon': 'unifiedStyles.chatBotIcon',
  'styles.icon': 'unifiedStyles.chatBotIcon',
  
  // ChatDialog
  'styles.chatDialog': 'unifiedStyles.chatDialog',
  'styles.header': 'unifiedStyles.chatDialogHeader',
  'styles.title': 'unifiedStyles.chatDialogTitle',
  'styles.closeButton': 'unifiedStyles.chatDialogClose',
  
  // ChatMessages
  'styles.chatMessages': 'unifiedStyles.chatMessages',
  'styles.messages': 'unifiedStyles.chatMessages',
  
  // ChatMessage
  'styles.chatMessage': 'unifiedStyles.chatMessage',
  'styles.message': 'unifiedStyles.chatMessage',
  'styles.messageUser': 'unifiedStyles.chatMessageUser',
  'styles.messageAssistant': 'unifiedStyles.chatMessageAssistant',
  'styles.bubble': 'unifiedStyles.chatMessageBubble',
  'styles.bubbleUser': 'unifiedStyles.chatMessageBubbleUser',
  'styles.bubbleAssistant': 'unifiedStyles.chatMessageBubbleAssistant',
  'styles.time': 'unifiedStyles.chatMessageTime',
  
  // ChatInput
  'styles.chatInput': 'unifiedStyles.chatInput',
  'styles.input': 'unifiedStyles.chatInputField',
  'styles.inputField': 'unifiedStyles.chatInputField',
  
  // SubmitButton
  'styles.submitButton': 'unifiedStyles.submitButton',
  'styles.button': 'unifiedStyles.submitButton',
  'styles.icon': 'unifiedStyles.submitButtonIcon',
  
  // ScrollButtons
  'styles.scrollButtons': 'unifiedStyles.scrollButtons',
  'styles.scrollButton': 'unifiedStyles.scrollButton',
  
  // Skeletons
  'styles.thinkingSkeleton': 'unifiedStyles.thinkingSkeleton',
  'styles.imageSkeleton': 'unifiedStyles.imageSkeleton',
  'styles.dots': 'unifiedStyles.thinkingDots',
  'styles.dot': 'unifiedStyles.thinkingDot',
  
  // Selectors
  'styles.dateSelector': 'unifiedStyles.dateSelector',
  'styles.chunkSelector': 'unifiedStyles.chunkSelector',
  'styles.chunkOption': 'unifiedStyles.chunkOption',
  'styles.selected': 'unifiedStyles.chunkOptionSelected',
  
  // Utilities
  'styles.hidden': 'unifiedStyles.hidden',
  'styles.visible': 'unifiedStyles.visible',
  'styles.fadeIn': 'unifiedStyles.fadeIn',
  'styles.fadeOut': 'unifiedStyles.fadeOut'
};

function findTSXFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

function optimizeFile(filePath) {
  console.log(`🔧 Optimizing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Заменяем импорты CSS модулей
  const styleImportRegex = /import\s+styles\s+from\s+['"][^'"]*\.module\.css['"];?/g;
  if (styleImportRegex.test(content)) {
    content = content.replace(styleImportRegex, `import unifiedStyles from '@/components/ChatBot/styles/chatbot-unified.module.css';`);
    modified = true;
    console.log(`  ✅ Replaced CSS import`);
  }
  
  // Заменяем использование классов
  for (const [oldClass, newClass] of Object.entries(CLASS_MAPPING)) {
    const regex = new RegExp(`\\b${oldClass.replace('.', '\\.')}\\b`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, newClass);
      modified = true;
      console.log(`  ✅ Replaced: ${oldClass} → ${newClass}`);
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  💾 File updated`);
  } else {
    console.log(`  ⏭️  No changes needed`);
  }
}

function main() {
  console.log('🚀 Starting ChatBot styles optimization...');
  console.log(`📁 Scanning directory: ${CHATBOT_DIR}`);
  
  if (!fs.existsSync(CHATBOT_DIR)) {
    console.error(`❌ ChatBot directory not found: ${CHATBOT_DIR}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(UNIFIED_STYLES)) {
    console.error(`❌ Unified styles file not found: ${UNIFIED_STYLES}`);
    console.log('💡 Please create the unified styles file first');
    process.exit(1);
  }
  
  const tsxFiles = findTSXFiles(CHATBOT_DIR);
  console.log(`📄 Found ${tsxFiles.length} TypeScript files`);
  
  let processedCount = 0;
  for (const file of tsxFiles) {
    try {
      optimizeFile(file);
      processedCount++;
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }
  
  console.log(`\n🎉 Optimization complete!`);
  console.log(`📊 Processed: ${processedCount}/${tsxFiles.length} files`);
  console.log(`💡 Now you can delete individual .module.css files in ChatBot components`);
  console.log(`🚀 Run the build again - it should be much faster!`);
}

// Запускаем если файл вызван напрямую
main();
