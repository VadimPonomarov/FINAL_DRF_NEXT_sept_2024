const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');
const enFile = path.join(localesDir, 'en.ts');
const ruFile = path.join(localesDir, 'ru.ts');
const ukFile = path.join(localesDir, 'uk.ts');

// Missing translations for login/registration forms
const authTranslations = {
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
  'auth.validationErrorDescription': { en: 'Please fill in all required fields correctly', ru: 'Пожалуйста, заполните все обязательные поля правильно', uk: "Будь ласка, заповніть всі обов'язкові поля правильно" },
  'auth.selectAuthType': { en: 'Select auth type', ru: 'Выберите тип аутентификации', uk: 'Виберіть тип аутентифікації' },
  'auth.sessionDuration': { en: 'Session Duration (minutes)', ru: 'Длительность сессии (минуты)', uk: 'Тривалість сесії (хвилини)' },
  'auth.minutes': { en: 'minutes', ru: 'минут', uk: 'хвилин' },
};

console.log('⚠️  This is a simplified sync script.');
console.log('📝 For full synchronization, please use a proper TypeScript parser.');
console.log('💡 Adding missing auth translations manually...\n');

// Read files
const enContent = fs.readFileSync(enFile, 'utf-8');
const ruContent = fs.readFileSync(ruFile, 'utf-8');
const ukContent = fs.readFileSync(ukFile, 'utf-8');

// Function to add translations to file content
function addTranslations(content, lang) {
  // Check if auth section exists
  if (content.includes('auth: {')) {
    // Find auth section and add missing keys
    const authSectionRegex = /(auth:\s*\{[^}]*)/;
    const match = content.match(authSectionRegex);
    
    if (match) {
      let authSection = match[1];
      let newContent = content;
      
      // Add missing keys
      for (const [key, translations] of Object.entries(authTranslations)) {
        const keyName = key.split('.').pop();
        const value = translations[lang];
        
        // Check if key already exists
        if (!authSection.includes(`${keyName}:`)) {
          // Add key before closing brace
          authSection = authSection.replace(/(\s*)(\})/, `$1  ${keyName}: "${value}",$1$2`);
          newContent = newContent.replace(authSectionRegex, authSection);
        }
      }
      
      return newContent;
    }
  } else {
    // Add auth section if it doesn't exist
    // Find a good place to insert (before closing brace of main object)
    const lastBraceIndex = content.lastIndexOf('}');
    if (lastBraceIndex > 0) {
      const beforeBrace = content.substring(0, lastBraceIndex);
      const afterBrace = content.substring(lastBraceIndex);
      
      let authSection = '  auth: {\n';
      for (const [key, translations] of Object.entries(authTranslations)) {
        const keyName = key.split('.').pop();
        const value = translations[lang];
        authSection += `    ${keyName}: "${value}",\n`;
      }
      authSection += '  },\n';
      
      return beforeBrace + authSection + afterBrace;
    }
  }
  
  return content;
}

// Add translations
const newEnContent = addTranslations(enContent, 'en');
const newRuContent = addTranslations(ruContent, 'ru');
const newUkContent = addTranslations(ukContent, 'uk');

// Write files (only if changed)
if (newEnContent !== enContent) {
  fs.writeFileSync(enFile, newEnContent, 'utf-8');
  console.log('✅ Updated en.ts');
}

if (newRuContent !== ruContent) {
  fs.writeFileSync(ruFile, newRuContent, 'utf-8');
  console.log('✅ Updated ru.ts');
}

if (newUkContent !== ukContent) {
  fs.writeFileSync(ukFile, newUkContent, 'utf-8');
  console.log('✅ Updated uk.ts');
}

console.log('\n✅ Translation sync completed!');
console.log('📝 Note: For full synchronization (removing duplicates, sorting),');
console.log('   please use a proper TypeScript parser or manual editing.');

