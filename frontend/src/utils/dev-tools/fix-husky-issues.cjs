#!/usr/bin/env node

/**
 * Fix specific translation issues that are blocking Husky pre-commit
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Husky Translation Issues\n');

// Issues from Husky output
const issues = {
  missingInEN: [
    'confirmDelete', 'searchRegion', 'searchCity', 'noRegionsFound', 'noCitiesFound',
    'noAccount', 'selectAccountType', 'selectRole', 'selectModerationLevel', 
    'adminOnlyFields', 'abstract', 'vintage', 'firstNamePlaceholder', 
    'lastNamePlaceholder', 'agePlaceholder'
  ],
  missingInRU: [
    'minLength', 'maxLength', 'invalid', 'min', 'max'
  ],
  missingInUK: [
    'minLength', 'maxLength', 'invalid', 'min', 'max', 'regionPlaceholder',
    'localityPlaceholder', 'confirmDelete', 'searchRegion', 'searchCity', 
    'noRegionsFound', 'noCitiesFound', 'noAccount', 'selectAccountType', 
    'selectRole', 'selectModerationLevel', 'adminOnlyFields', 'abstract', 
    'vintage', 'firstNamePlaceholder', 'lastNamePlaceholder', 'agePlaceholder'
  ]
};

// Translation templates
const translations = {
  en: {
    'confirmDelete': 'Confirm Delete',
    'searchRegion': 'Search Region',
    'searchCity': 'Search City',
    'noRegionsFound': 'No regions found',
    'noCitiesFound': 'No cities found',
    'noAccount': 'No Account',
    'selectAccountType': 'Select Account Type',
    'selectRole': 'Select Role',
    'selectModerationLevel': 'Select Moderation Level',
    'adminOnlyFields': 'Admin Only Fields',
    'abstract': 'Abstract',
    'vintage': 'Vintage',
    'firstNamePlaceholder': 'Enter first name',
    'lastNamePlaceholder': 'Enter last name',
    'agePlaceholder': 'Enter age',
    'minLength': 'Minimum length',
    'maxLength': 'Maximum length',
    'invalid': 'Invalid',
    'min': 'Minimum',
    'max': 'Maximum',
    'regionPlaceholder': 'Select region',
    'localityPlaceholder': 'Select locality'
  },
  ru: {
    'confirmDelete': 'Подтвердить удаление',
    'searchRegion': 'Поиск региона',
    'searchCity': 'Поиск города',
    'noRegionsFound': 'Регионы не найдены',
    'noCitiesFound': 'Города не найдены',
    'noAccount': 'Нет аккаунта',
    'selectAccountType': 'Выберите тип аккаунта',
    'selectRole': 'Выберите роль',
    'selectModerationLevel': 'Выберите уровень модерации',
    'adminOnlyFields': 'Поля только для администратора',
    'abstract': 'Абстрактный',
    'vintage': 'Винтажный',
    'firstNamePlaceholder': 'Введите имя',
    'lastNamePlaceholder': 'Введите фамилию',
    'agePlaceholder': 'Введите возраст',
    'minLength': 'Минимальная длина',
    'maxLength': 'Максимальная длина',
    'invalid': 'Неверный',
    'min': 'Минимум',
    'max': 'Максимум',
    'regionPlaceholder': 'Выберите регион',
    'localityPlaceholder': 'Выберите населенный пункт'
  },
  uk: {
    'confirmDelete': 'Підтвердити видалення',
    'searchRegion': 'Пошук регіону',
    'searchCity': 'Пошук міста',
    'noRegionsFound': 'Регіони не знайдені',
    'noCitiesFound': 'Міста не знайдені',
    'noAccount': 'Немає акаунта',
    'selectAccountType': 'Оберіть тип акаунта',
    'selectRole': 'Оберіть роль',
    'selectModerationLevel': 'Оберіть рівень модерації',
    'adminOnlyFields': 'Поля тільки для адміністратора',
    'abstract': 'Абстрактний',
    'vintage': 'Вінтажний',
    'firstNamePlaceholder': 'Введіть ім\'я',
    'lastNamePlaceholder': 'Введіть прізвище',
    'agePlaceholder': 'Введіть вік',
    'minLength': 'Мінімальна довжина',
    'maxLength': 'Максимальна довжина',
    'invalid': 'Невірний',
    'min': 'Мінімум',
    'max': 'Максимум',
    'regionPlaceholder': 'Оберіть регіон',
    'localityPlaceholder': 'Оберіть населений пункт'
  }
};

function addMissingKeys(language, missingKeys) {
  const filePath = path.join('src/locales', `${language}.ts`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Find the position to insert new keys (before the last closing brace)
    const lastBraceIndex = content.lastIndexOf('};');
    if (lastBraceIndex === -1) {
      console.log(`❌ Could not find closing brace in ${filePath}`);
      return false;
    }

    // Build the new keys to add
    const newKeys = missingKeys
      .filter(key => translations[language][key])
      .map(key => `  "${key}": "${translations[language][key]}"`)
      .join(',\n');

    if (newKeys) {
      // Insert new keys before the last closing brace
      const beforeBrace = content.substring(0, lastBraceIndex);
      const afterBrace = content.substring(lastBraceIndex);
      
      // Add comma if needed
      const needsComma = !beforeBrace.trim().endsWith(',') && !beforeBrace.trim().endsWith('{');
      const comma = needsComma ? ',' : '';
      
      const newContent = beforeBrace + comma + '\n\n  // Added by Translation Doctor\n' + newKeys + '\n' + afterBrace;
      
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`✅ Added ${missingKeys.length} keys to ${language}.ts`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.log(`❌ Error updating ${language}.ts: ${error.message}`);
    return false;
  }
}

// Fix each language
let totalFixed = 0;

console.log('🔧 Adding missing keys to translation files:\n');

// Fix English
if (issues.missingInEN.length > 0) {
  console.log(`📝 Fixing EN (${issues.missingInEN.length} keys):`);
  if (addMissingKeys('en', issues.missingInEN)) {
    totalFixed += issues.missingInEN.length;
  }
}

// Fix Russian
if (issues.missingInRU.length > 0) {
  console.log(`📝 Fixing RU (${issues.missingInRU.length} keys):`);
  if (addMissingKeys('ru', issues.missingInRU)) {
    totalFixed += issues.missingInRU.length;
  }
}

// Fix Ukrainian
if (issues.missingInUK.length > 0) {
  console.log(`📝 Fixing UK (${issues.missingInUK.length} keys):`);
  if (addMissingKeys('uk', issues.missingInUK)) {
    totalFixed += issues.missingInUK.length;
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Total keys fixed: ${totalFixed}`);
console.log(`   Files updated: ${totalFixed > 0 ? '3' : '0'}`);

if (totalFixed > 0) {
  console.log('\n🎉 Translation issues fixed!');
  console.log('💡 Next steps:');
  console.log('   1. Run: npm run check-translations');
  console.log('   2. Verify the fixes worked');
  console.log('   3. Try committing again');
} else {
  console.log('\n❌ No keys were fixed. Please check the issues manually.');
}

process.exit(totalFixed > 0 ? 0 : 1);
