/**
 * Простая проверка доступности страниц
 */

const { chromium } = require('playwright');

async function checkPages() {
  console.log('🔍 Checking page accessibility...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const pagesToCheck = [
    'http://localhost:3000',
    'http://localhost:3000/login',
    'http://localhost:3000/autoria',
    'http://localhost:3000/autoria/create-ad',
    'http://localhost:3000/autoria/search'
  ];
  
  for (const url of pagesToCheck) {
    try {
      console.log(`\n📖 Checking: ${url}`);
      
      const response = await page.goto(url, { waitUntil: 'networkidle' });
      
      console.log(`   Status: ${response.status()}`);
      console.log(`   Title: ${await page.title()}`);
      
      if (response.status() === 404) {
        console.log('   ❌ Page not found (404)');
      } else if (response.status() >= 400) {
        console.log(`   ❌ Error: ${response.status()}`);
      } else {
        console.log('   ✅ Page accessible');
        
        // Проверяем наличие формы на странице создания объявления
        if (url.includes('create-ad')) {
          const hasForm = await page.$('form') !== null;
          const hasTitle = await page.$('input[name="title"]') !== null;
          const hasButtons = await page.$$('button').then(buttons => buttons.length);
          
          console.log(`   Form present: ${hasForm ? '✅' : '❌'}`);
          console.log(`   Title field: ${hasTitle ? '✅' : '❌'}`);
          console.log(`   Buttons found: ${hasButtons}`);
          
          if (hasButtons > 0) {
            console.log('   🔍 Button texts:');
            const buttons = await page.$$('button');
            for (let i = 0; i < Math.min(buttons.length, 5); i++) {
              const text = await buttons[i].textContent();
              console.log(`     - "${text}"`);
            }
          }
        }
      }
      
      await page.waitForTimeout(2000);
      
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }
  }
  
  await browser.close();
  console.log('\n✅ Page check completed');
}

if (require.main === module) {
  checkPages().catch(console.error);
}
