const fs = require('fs');
const path = require('path');

// Пути к файлам переводов
const localesDir = path.join(__dirname, '../src/locales');
const enFile = path.join(localesDir, 'en.ts');
const ruFile = path.join(localesDir, 'ru.ts');
const ukFile = path.join(localesDir, 'uk.ts');

// Функция для чтения и парсинга TypeScript файла с переводами
function parseTranslationFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Извлекаем объект из export default
  const match = content.match(/export\s+default\s+({[\s\S]*});?\s*$/m);
  if (!match) {
    throw new Error(`Cannot parse translation file: ${filePath}`);
  }
  
  // Парсим объект (упрощенный парсинг, работает для простых объектов)
  const objStr = match[1];
  
  // Используем eval для парсинга (в production лучше использовать более безопасный метод)
  // Но для скрипта синхронизации это приемлемо
  try {
    // Заменяем TypeScript синтаксис на JavaScript
    const jsStr = objStr
      .replace(/:\s*'([^']*)'/g, ': "$1"')  // одинарные кавычки в двойные
      .replace(/:\s*"([^"]*)"/g, ': "$1"')  // уже двойные
      .replace(/,\s*}/g, '}')  // trailing commas
      .replace(/,\s*]/g, ']'); // trailing commas в массивах
    
    return eval(`(${jsStr})`);
  } catch (e) {
    console.error(`Error parsing ${filePath}:`, e);
    return {};
  }
}

// Функция для рекурсивного сбора всех ключей
function getAllKeys(obj, prefix = '') {
  const keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Функция для получения значения по пути ключа
function getValueByPath(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

// Функция для установки значения по пути ключа
function setValueByPath(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

// Функция для сортировки объекта по ключам
function sortObjectKeys(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return obj;
  }
  
  const sorted = {};
  const keys = Object.keys(obj).sort();
  
  for (const key of keys) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      sorted[key] = sortObjectKeys(obj[key]);
    } else {
      sorted[key] = obj[key];
    }
  }
  
  return sorted;
}

// Функция для конвертации объекта обратно в TypeScript
function objectToTypeScript(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  let result = '{\n';
  
  const keys = Object.keys(obj).sort();
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = obj[key];
    const isLast = i === keys.length - 1;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result += `${spaces}  ${key}: ${objectToTypeScript(value, indent + 1)}${isLast ? '' : ','}\n`;
    } else if (Array.isArray(value)) {
      result += `${spaces}  ${key}: ${JSON.stringify(value)}${isLast ? '' : ','}\n`;
    } else {
      const strValue = typeof value === 'string' ? `'${value.replace(/'/g, "\\'")}'` : value;
      result += `${spaces}  ${key}: ${strValue}${isLast ? '' : ','}\n`;
    }
  }
  
  result += `${spaces}}`;
  return result;
}

// Основная функция синхронизации
function syncTranslations() {
  console.log('🔄 Starting translation synchronization...\n');
  
  // Читаем все файлы переводов
  console.log('📖 Reading translation files...');
  const en = parseTranslationFile(enFile);
  const ru = parseTranslationFile(ruFile);
  const uk = parseTranslationFile(ukFile);
  
  // Собираем все ключи из всех файлов
  const allKeysEn = getAllKeys(en);
  const allKeysRu = getAllKeys(ru);
  const allKeysUk = getAllKeys(uk);
  
  // Объединяем все ключи (убираем дубликаты)
  const allKeys = [...new Set([...allKeysEn, ...allKeysRu, ...allKeysUk])];
  
  console.log(`📊 Found ${allKeys.length} unique keys`);
  console.log(`   - EN: ${allKeysEn.length} keys`);
  console.log(`   - RU: ${allKeysRu.length} keys`);
  console.log(`   - UK: ${allKeysUk.length} keys\n`);
  
  // Определяем базовый файл (самый длинный)
  const baseFile = allKeysEn.length >= allKeysRu.length && allKeysEn.length >= allKeysUk.length 
    ? { name: 'en', data: en } 
    : allKeysRu.length >= allKeysUk.length 
      ? { name: 'ru', data: ru }
      : { name: 'uk', data: uk };
  
  console.log(`📌 Using ${baseFile.name.toUpperCase()} as base (${getAllKeys(baseFile.data).length} keys)\n`);
  
  // Создаем синхронизированные объекты
  const syncedEn = {};
  const syncedRu = {};
  const syncedUk = {};
  
  // Добавляем недостающие ключи для форм логина/регистрации
  const authKeys = {
    'auth.login': { en: 'Login', ru: 'Вход', uk: 'Вхід' },
    'auth.register': { en: 'Register', ru: 'Регистрация', uk: 'Реєстрація' },
    'auth.email': { en: 'Email', ru: 'Email', uk: 'Email' },
    'auth.emailPlaceholder': { en: 'Enter your email', ru: 'Введите email', uk: 'Введіть email' },
    'auth.password': { en: 'Password', ru: 'Пароль', uk: 'Пароль' },
    'auth.passwordPlaceholder': { en: 'Enter your password', ru: 'Введите пароль', uk: 'Введіть пароль' },
    'auth.confirmPassword': { en: 'Confirm Password', ru: 'Подтвердите пароль', uk: 'Підтвердіть пароль' },
    'auth.confirmPasswordPlaceholder': { en: 'Confirm your password', ru: 'Подтвердите пароль', uk: 'Підтвердіть пароль' },
    'auth.username': { en: 'Username', ru: 'Имя пользователя', uk: "Ім'я користувача" },
    'auth.usernamePlaceholder': { en: 'Enter your username', ru: 'Введите имя пользователя', uk: "Введіть ім'я користувача" },
    'auth.reset': { en: 'Reset', ru: 'Сбросить', uk: 'Скинути' },
    'auth.submit': { en: 'Submit', ru: 'Отправить', uk: 'Відправити' },
    'auth.loginSuccess': { en: 'Authentication successful!', ru: 'Аутентификация успешна!', uk: 'Аутентифікація успішна!' },
    'auth.loginFailed': { en: 'Authentication failed', ru: 'Ошибка аутентификации', uk: 'Помилка аутентифікації' },
    'auth.passwordsDoNotMatch': { en: 'Passwords do not match', ru: 'Пароли не совпадают', uk: 'Паролі не співпадають' },
    'auth.validationError': { en: 'Validation Error', ru: 'Ошибка валидации', uk: 'Помилка валідації' },
    'auth.validationErrorDescription': { en: 'Please fill in all required fields correctly', ru: 'Пожалуйста, заполните все обязательные поля правильно', uk: 'Будь ласка, заповніть всі обов\'язкові поля правильно' },
    'auth.selectAuthType': { en: 'Select auth type', ru: 'Выберите тип аутентификации', uk: 'Виберіть тип аутентифікації' },
    'auth.sessionDuration': { en: 'Session Duration (minutes)', ru: 'Длительность сессии (минуты)', uk: 'Тривалість сесії (хвилини)' },
    'auth.minutes': { en: 'minutes', ru: 'минут', uk: 'хвилин' },
  };
  
  // Добавляем ключи аутентификации в общий список
  for (const key of Object.keys(authKeys)) {
    if (!allKeys.includes(key)) {
      allKeys.push(key);
    }
  }
  
  // Сортируем ключи
  allKeys.sort();
  
  console.log('🔄 Synchronizing translations...\n');
  
  // Синхронизируем все ключи
  for (const key of allKeys) {
    // Получаем значения из всех файлов
    let enValue = getValueByPath(en, key);
    let ruValue = getValueByPath(ru, key);
    let ukValue = getValueByPath(uk, key);
    
    // Если ключ из authKeys, используем его значения
    if (key in authKeys) {
      enValue = authKeys[key].en;
      ruValue = authKeys[key].ru;
      ukValue = authKeys[key].uk;
    }
    
    // Если значение отсутствует, берем из базового файла или оставляем пустым
    if (enValue === undefined) {
      enValue = getValueByPath(baseFile.data, key) || '';
    }
    if (ruValue === undefined) {
      ruValue = getValueByPath(baseFile.data, key) || '';
    }
    if (ukValue === undefined) {
      ukValue = getValueByPath(baseFile.data, key) || '';
    }
    
    // Устанавливаем значения
    setValueByPath(syncedEn, key, enValue);
    setValueByPath(syncedRu, key, ruValue);
    setValueByPath(syncedUk, key, ukValue);
  }
  
  // Сортируем объекты
  const sortedEn = sortObjectKeys(syncedEn);
  const sortedRu = sortObjectKeys(syncedRu);
  const sortedUk = sortObjectKeys(syncedUk);
  
  // Записываем обратно в файлы
  console.log('💾 Writing synchronized files...\n');
  
  const enContent = `const translations = ${objectToTypeScript(sortedEn)};\n\nexport default translations;`;
  const ruContent = `const translations = ${objectToTypeScript(sortedRu)};\n\nexport default translations;`;
  const ukContent = `const translations = ${objectToTypeScript(sortedUk)};\n\nexport default translations;`;
  
  fs.writeFileSync(enFile, enContent, 'utf-8');
  fs.writeFileSync(ruFile, ruContent, 'utf-8');
  fs.writeFileSync(ukFile, ukContent, 'utf-8');
  
  console.log('✅ Translation synchronization completed!\n');
  console.log(`📊 Final statistics:`);
  console.log(`   - Total keys: ${allKeys.length}`);
  console.log(`   - EN keys: ${getAllKeys(sortedEn).length}`);
  console.log(`   - RU keys: ${getAllKeys(sortedRu).length}`);
  console.log(`   - UK keys: ${getAllKeys(sortedUk).length}`);
}

// Запускаем синхронизацию
try {
  syncTranslations();
} catch (error) {
  console.error('❌ Error during synchronization:', error);
  process.exit(1);
}

