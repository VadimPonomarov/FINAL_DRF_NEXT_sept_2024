/**
 * МИНИМАЛЬНЫЙ генератор - только самое необходимое
 */

const { chromium } = require('playwright');

async function createOneAd() {
  console.log('🚀 Starting MINIMAL generator...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 2000 // Очень медленно для отладки
  });
  
  const page = await browser.newPage();
  
  try {
    // 1. Открываем главную страницу
    console.log('📖 Opening homepage...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(3000);
    
    // 2. Ищем кнопку создания объявления
    console.log('🔍 Looking for create ad button...');
    
    // Пробуем разные варианты кнопок
    const createButtons = [
      'a[href="/autoria/create-ad"]',
      'a[href*="create-ad"]',
      'button:has-text("Create Ad")',
      'button:has-text("Создать")',
      'a:has-text("Create Ad")',
      'a:has-text("Создать")'
    ];
    
    let buttonClicked = false;
    for (const selector of createButtons) {
      try {
        const button = await page.$(selector);
        if (button) {
          console.log(`✅ Found button: ${selector}`);
          await button.click();
          buttonClicked = true;
          break;
        }
      } catch (e) {
        console.log(`❌ Button not found: ${selector}`);
      }
    }
    
    if (!buttonClicked) {
      console.log('🔗 Trying direct navigation...');
      await page.goto('http://localhost:3000/autoria/create-ad');
    }
    
    await page.waitForTimeout(5000);
    
    // 3. Проверяем, что мы на странице создания объявления
    console.log('📍 Current URL:', page.url());
    
    // 4. Ищем форму
    console.log('📋 Looking for form...');
    await page.waitForSelector('form, input[name="title"], .form-container', { timeout: 10000 });
    
    // 5. Ищем поле заголовка и заполняем его
    console.log('✏️ Filling title...');
    const titleSelectors = [
      'input[name="title"]',
      'input[placeholder*="заголов"]',
      'input[placeholder*="title"]',
      'input[type="text"]:first-of-type'
    ];
    
    let titleFilled = false;
    for (const selector of titleSelectors) {
      try {
        const field = await page.$(selector);
        if (field) {
          await field.fill('ТЕСТ - Автоматически созданное объявление');
          console.log(`✅ Title filled using: ${selector}`);
          titleFilled = true;
          break;
        }
      } catch (e) {
        console.log(`❌ Title field not found: ${selector}`);
      }
    }
    
    if (!titleFilled) {
      console.log('❌ Could not fill title field');
      return false;
    }
    
    await page.waitForTimeout(2000);
    
    // 6. Ищем кнопки автозаполнения
    console.log('🎯 Looking for auto-fill buttons...');
    
    const autoFillButtons = [
      'button:has-text("🎭")',
      'button:has-text("⚡")',
      'button:has-text("Interactive")',
      'button:has-text("Quick")',
      'button:has-text("генерац")',
      'button[title*="генерац"]'
    ];
    
    let autoFillUsed = false;
    for (const selector of autoFillButtons) {
      try {
        const button = await page.$(selector);
        if (button && await button.isVisible()) {
          console.log(`🎲 Clicking auto-fill button: ${selector}`);
          await button.click();
          autoFillUsed = true;
          await page.waitForTimeout(8000); // Ждем заполнения
          break;
        }
      } catch (e) {
        console.log(`❌ Auto-fill button not found: ${selector}`);
      }
    }
    
    if (!autoFillUsed) {
      console.log('⚠️ No auto-fill buttons found, continuing with manual fill...');
      
      // Заполняем описание
      const descSelectors = [
        'textarea[name="description"]',
        'textarea[placeholder*="описан"]',
        'textarea'
      ];
      
      for (const selector of descSelectors) {
        try {
          const field = await page.$(selector);
          if (field) {
            await field.fill('Тестовое описание автомобиля. Создано автоматически для проверки системы.');
            console.log(`✅ Description filled using: ${selector}`);
            break;
          }
        } catch (e) {
          // Продолжаем
        }
      }
      
      // Заполняем цену
      const priceSelectors = [
        'input[name="price"]',
        'input[placeholder*="цена"]',
        'input[placeholder*="price"]'
      ];
      
      for (const selector of priceSelectors) {
        try {
          const field = await page.$(selector);
          if (field) {
            await field.fill('25000');
            console.log(`✅ Price filled using: ${selector}`);
            break;
          }
        } catch (e) {
          // Продолжаем
        }
      }
    }
    
    await page.waitForTimeout(3000);
    
    // 7. Проверяем, что форма заполнена
    console.log('🔍 Checking if form is filled...');
    const titleValue = await page.inputValue('input[name="title"]').catch(() => '');
    console.log(`📝 Title value: "${titleValue}"`);
    
    if (!titleValue || titleValue.length < 5) {
      console.log('❌ Form is not properly filled');
      return false;
    }
    
    // 8. Ищем кнопку отправки
    console.log('📤 Looking for submit button...');
    
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Создать")',
      'button:has-text("Опубликовать")',
      'button:has-text("Create")',
      'button:has-text("Submit")',
      'input[type="submit"]'
    ];
    
    let submitted = false;
    for (const selector of submitSelectors) {
      try {
        const button = await page.$(selector);
        if (button && await button.isVisible()) {
          console.log(`📤 Clicking submit button: ${selector}`);
          await button.click();
          submitted = true;
          break;
        }
      } catch (e) {
        console.log(`❌ Submit button not found: ${selector}`);
      }
    }
    
    if (!submitted) {
      console.log('❌ Could not find submit button');
      return false;
    }
    
    // 9. Ждем результата
    console.log('⏳ Waiting for result...');
    await page.waitForTimeout(10000);
    
    // 10. Проверяем результат
    const currentUrl = page.url();
    console.log('📍 Final URL:', currentUrl);
    
    // Ищем признаки успеха
    const successSelectors = [
      '.toast-success',
      '.notification-success',
      '.alert-success',
      '[class*="success"]',
      'text="успешно"',
      'text="создано"'
    ];
    
    let success = false;
    for (const selector of successSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          console.log(`✅ Success indicator found: ${selector}`);
          success = true;
          break;
        }
      } catch (e) {
        // Продолжаем поиск
      }
    }
    
    // Также проверяем URL
    if (currentUrl.includes('/my-ads') || currentUrl.includes('/ads/') || currentUrl !== 'http://localhost:3000/autoria/create-ad') {
      console.log('✅ URL changed - likely successful');
      success = true;
    }
    
    if (success) {
      console.log('🎉 AD CREATED SUCCESSFULLY!');
      return true;
    } else {
      console.log('❌ No success confirmation found');
      return false;
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
    return false;
  } finally {
    console.log('🔒 Closing browser in 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// Запуск
if (require.main === module) {
  console.log('🧪 MINIMAL GENERATOR TEST');
  console.log('This will create ONE test ad step by step');
  console.log('Watch the browser to see what happens\n');
  
  createOneAd()
    .then((success) => {
      if (success) {
        console.log('\n🎉 SUCCESS! The generator works!');
        process.exit(0);
      } else {
        console.log('\n💥 FAILED! Check the logs above');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 CRASHED:', error);
      process.exit(1);
    });
}
