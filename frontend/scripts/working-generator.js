/**
 * РАБОЧИЙ генератор объявлений - упрощенная версия
 */

const { chromium } = require('playwright');

// Конфигурация
const CONFIG = {
  baseURL: 'http://localhost:3000',
  backendURL: 'http://localhost:8000',
  credentials: {
    email: 'pvs.versia@gmail.com',
    password: '12345678'
  },
  adsCount: 3,
  headless: false,
  slowMo: 1000
};

async function createTestAds() {
  console.log('🚀 Starting WORKING ads generator...');
  
  let browser;
  let results = { success: 0, failed: 0, details: [] };

  try {
    // 1. Запускаем браузер
    console.log('🌐 Launching browser...');
    browser = await chromium.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
      args: ['--start-maximized']
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    // 2. Логинимся
    console.log('🔐 Logging in...');
    await page.goto(`${CONFIG.baseURL}/login`);
    await page.waitForLoadState('networkidle');

    // Заполняем форму логина
    await page.fill('input[type="email"], input[name="email"]', CONFIG.credentials.email);
    await page.fill('input[type="password"], input[name="password"]', CONFIG.credentials.password);
    
    // Нажимаем кнопку входа
    await page.click('button[type="submit"], button:has-text("Войти"), button:has-text("Login"), button:has-text("Sign in")');
    
    // Ждем успешного логина
    await page.waitForTimeout(3000);
    console.log('✅ Login completed');

    // 3. Создаем объявления
    for (let i = 0; i < CONFIG.adsCount; i++) {
      console.log(`\n📝 Creating ad ${i + 1}/${CONFIG.adsCount}...`);
      
      try {
        // Переходим на страницу создания объявления
        await page.goto(`${CONFIG.baseURL}/autoria/create-ad`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        console.log('📋 Page loaded, looking for form...');

        // Ждем загрузки формы
        await page.waitForSelector('form, .form-container, [data-testid="ad-form"]', { timeout: 10000 });

        // Ищем кнопки автозаполнения
        console.log('🎯 Looking for auto-fill buttons...');
        
        const buttonSelectors = [
          'button:has-text("🎭")',
          'button:has-text("Interactive")',
          'button:has-text("⚡")',
          'button:has-text("Quick")',
          'button:has-text("генерац")',
          'button:has-text("Mock")',
          'button[title*="генерац"]'
        ];

        let buttonFound = false;
        for (const selector of buttonSelectors) {
          try {
            const button = page.locator(selector).first();
            if (await button.isVisible({ timeout: 1000 })) {
              console.log(`🎲 Found button: ${selector}`);
              await button.click();
              buttonFound = true;
              await page.waitForTimeout(5000); // Ждем заполнения формы
              break;
            }
          } catch (e) {
            // Продолжаем поиск
          }
        }

        if (!buttonFound) {
          console.log('⚠️ No auto-fill buttons found, filling manually...');
          
          // Заполняем форму вручную
          const testData = {
            title: `Тестовое объявление ${i + 1} - ${new Date().toLocaleString()}`,
            description: `Автоматически созданное объявление для тестирования системы. Номер: ${i + 1}`,
            price: Math.floor(Math.random() * 50000) + 10000,
            year: 2018 + Math.floor(Math.random() * 6),
            mileage: Math.floor(Math.random() * 100000) + 10000
          };

          // Заполняем основные поля
          await fillFieldSafely(page, 'input[name="title"]', testData.title);
          await fillFieldSafely(page, 'textarea[name="description"]', testData.description);
          await fillFieldSafely(page, 'input[name="price"]', testData.price.toString());
          await fillFieldSafely(page, 'input[name="year"]', testData.year.toString());
          await fillFieldSafely(page, 'input[name="mileage"]', testData.mileage.toString());
        }

        // Проверяем, что форма заполнена
        const titleValue = await page.inputValue('input[name="title"]').catch(() => '');
        if (!titleValue) {
          throw new Error('Form was not filled properly');
        }

        console.log(`✅ Form filled: "${titleValue.substring(0, 30)}..."`);

        // Отправляем форму
        console.log('📤 Submitting form...');
        const submitSelectors = [
          'button[type="submit"]',
          'button:has-text("Создать")',
          'button:has-text("Опубликовать")',
          'button:has-text("Create")',
          'button:has-text("Submit")'
        ];

        let submitted = false;
        for (const selector of submitSelectors) {
          try {
            const button = page.locator(selector).first();
            if (await button.isVisible({ timeout: 1000 })) {
              await button.click();
              submitted = true;
              break;
            }
          } catch (e) {
            // Продолжаем поиск
          }
        }

        if (!submitted) {
          throw new Error('Submit button not found');
        }

        // Ждем результата
        await page.waitForTimeout(5000);

        // Проверяем успешность
        const currentUrl = page.url();
        const hasSuccessMessage = await page.locator('.toast-success, .notification-success, .alert-success').isVisible().catch(() => false);
        
        if (hasSuccessMessage || currentUrl.includes('/my-ads') || currentUrl.includes('/ads/')) {
          console.log('✅ Ad created successfully!');
          results.success++;
        } else {
          throw new Error('No success confirmation found');
        }

        results.details.push({
          index: i + 1,
          success: true,
          title: titleValue.substring(0, 50)
        });

      } catch (error) {
        console.log(`❌ Failed to create ad ${i + 1}: ${error.message}`);
        results.failed++;
        results.details.push({
          index: i + 1,
          success: false,
          error: error.message
        });
      }

      // Пауза между объявлениями
      await page.waitForTimeout(2000);
    }

  } catch (error) {
    console.error('❌ Generator failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Выводим результаты
  console.log('\n📊 RESULTS:');
  console.log(`✅ Successful: ${results.success}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📝 Total: ${results.success + results.failed}`);

  if (results.details.length > 0) {
    console.log('\n📋 Details:');
    results.details.forEach(detail => {
      const status = detail.success ? '✅' : '❌';
      console.log(`  ${status} Ad ${detail.index}: ${detail.title || detail.error}`);
    });
  }

  return results;
}

// Вспомогательная функция для безопасного заполнения полей
async function fillFieldSafely(page, selector, value) {
  try {
    const element = page.locator(selector).first();
    if (await element.isVisible({ timeout: 2000 })) {
      await element.clear();
      await element.fill(value);
      console.log(`  ✓ Filled ${selector}: ${value}`);
      await page.waitForTimeout(300);
    }
  } catch (error) {
    console.log(`  ⚠️ Could not fill ${selector}: ${error.message}`);
  }
}

// Запуск генератора
if (require.main === module) {
  // Парсим аргументы командной строки
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
🤖 WORKING Ads Generator

Usage: node scripts/working-generator.js [options]

Options:
  --count <number>    Number of ads to create (default: 3)
  --headless         Run in headless mode
  --help             Show this help

Examples:
  node scripts/working-generator.js
  node scripts/working-generator.js --count 5
  node scripts/working-generator.js --count 2 --headless
    `);
    process.exit(0);
  }

  // Обрабатываем аргументы
  const countIndex = args.indexOf('--count');
  if (countIndex !== -1 && args[countIndex + 1]) {
    CONFIG.adsCount = parseInt(args[countIndex + 1]) || 3;
  }

  if (args.includes('--headless')) {
    CONFIG.headless = true;
  }

  console.log(`🎯 Configuration:`);
  console.log(`  - Ads count: ${CONFIG.adsCount}`);
  console.log(`  - Headless: ${CONFIG.headless}`);
  console.log(`  - Base URL: ${CONFIG.baseURL}`);
  console.log('');

  createTestAds()
    .then((results) => {
      if (results.success > 0) {
        console.log('\n🎉 Generator completed with some success!');
        process.exit(0);
      } else {
        console.log('\n💥 Generator failed completely!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Generator crashed:', error);
      process.exit(1);
    });
}
