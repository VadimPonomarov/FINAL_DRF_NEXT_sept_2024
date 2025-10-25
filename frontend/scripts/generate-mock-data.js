/**
 * Playwright скрипт для генерации мокковых данных
 * Эмулирует действия пользователя для получения реальных данных из справочников
 */

const { chromium } = require('playwright');

class MockDataGenerator {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'http://localhost:3000';
  }

  async init() {
    console.log('🚀 Запуск браузера...');
    this.browser = await chromium.launch({ 
      headless: false, // Показываем браузер для отладки
      slowMo: 100 // Замедляем действия для наглядности
    });
    
    this.page = await this.browser.newPage();
    
    // Устанавливаем viewport
    await this.page.setViewportSize({ width: 1280, height: 720 });
    
    console.log('✅ Браузер запущен');
  }

  async navigateToCreateForm() {
    console.log('📝 Переход к форме создания объявления...');
    await this.page.goto(`${this.baseUrl}/autoria/ads/create`);
    
    // Ждем загрузки формы
    await this.page.waitForSelector('[data-testid="car-ad-form"]', { timeout: 10000 });
    console.log('✅ Форма загружена');
  }

  async generateSpecsData() {
    console.log('🚗 Генерация данных характеристик...');
    
    // Переходим на таб характеристик
    await this.page.click('[data-value="specs"]');
    await this.page.waitForTimeout(1000);

    const specsData = {};

    try {
      // Выбираем случайную марку
      console.log('  📋 Выбор марки...');
      const brandSelector = '[name="brand"]';
      await this.page.waitForSelector(brandSelector, { timeout: 5000 });
      
      // Кликаем на селектор марки
      await this.page.click(brandSelector);
      await this.page.waitForTimeout(500);
      
      // Получаем список доступных марок
      const brandOptions = await this.page.$$eval(
        '[role="option"]', 
        options => options.map(opt => ({ value: opt.getAttribute('data-value'), text: opt.textContent }))
      );
      
      if (brandOptions.length > 0) {
        const randomBrand = brandOptions[Math.floor(Math.random() * Math.min(brandOptions.length, 10))];
        console.log(`  ✅ Выбрана марка: ${randomBrand.text}`);
        
        // Выбираем марку
        await this.page.click(`[data-value="${randomBrand.value}"]`);
        specsData.brand = randomBrand.value;
        
        await this.page.waitForTimeout(1000);
        
        // Выбираем модель
        console.log('  📋 Выбор модели...');
        const modelSelector = '[name="model"]';
        await this.page.waitForSelector(modelSelector, { timeout: 5000 });
        await this.page.click(modelSelector);
        await this.page.waitForTimeout(1000);
        
        const modelOptions = await this.page.$$eval(
          '[role="option"]', 
          options => options.map(opt => ({ value: opt.getAttribute('data-value'), text: opt.textContent }))
        );
        
        if (modelOptions.length > 0) {
          const randomModel = modelOptions[Math.floor(Math.random() * Math.min(modelOptions.length, 5))];
          console.log(`  ✅ Выбрана модель: ${randomModel.text}`);
          await this.page.click(`[data-value="${randomModel.value}"]`);
          specsData.model = randomModel.value;
        }
      }

      // Заполняем год
      console.log('  📅 Заполнение года...');
      const currentYear = new Date().getFullYear();
      const randomYear = currentYear - Math.floor(Math.random() * 10); // Последние 10 лет
      await this.page.fill('[name="year"]', randomYear.toString());
      specsData.year = randomYear;

      // Заполняем пробег
      console.log('  🛣️ Заполнение пробега...');
      const randomMileage = Math.floor(Math.random() * 200000) + 10000;
      await this.page.fill('[name="mileage"]', randomMileage.toString());
      specsData.mileage = randomMileage;

      // Заполняем объем двигателя
      console.log('  🔧 Заполнение объема двигателя...');
      const randomEngineVolume = (Math.random() * 3 + 1).toFixed(1); // 1.0 - 4.0
      await this.page.fill('[name="engine_volume"]', randomEngineVolume);
      specsData.engine_volume = parseFloat(randomEngineVolume);

      // Заполняем мощность
      console.log('  ⚡ Заполнение мощности...');
      const randomPower = Math.floor(Math.random() * 300) + 100;
      await this.page.fill('[name="engine_power"]', randomPower.toString());
      specsData.engine_power = randomPower;

      // Выбираем тип топлива
      console.log('  ⛽ Выбор типа топлива...');
      await this.selectRandomOption('[name="fuel_type"]', specsData, 'fuel_type');

      // Выбираем коробку передач
      console.log('  ⚙️ Выбор коробки передач...');
      await this.selectRandomOption('[name="transmission"]', specsData, 'transmission');

      // Выбираем тип кузова
      console.log('  🚙 Выбор типа кузова...');
      await this.selectRandomOption('[name="body_type"]', specsData, 'body_type');

      // Выбираем цвет
      console.log('  🎨 Выбор цвета...');
      await this.selectRandomOption('[name="color"]', specsData, 'color');

      // Выбираем состояние
      console.log('  📊 Выбор состояния...');
      await this.selectRandomOption('[name="condition"]', specsData, 'condition');

      // Заполняем заголовок
      console.log('  📝 Заполнение заголовка...');
      const title = `${randomBrand?.text || 'Автомобиль'} ${randomModel?.text || ''} ${randomYear}`.trim();
      await this.page.fill('[name="title"]', title);
      specsData.title = title;

      // Заполняем описание
      console.log('  📄 Заполнение описания...');
      const descriptions = [
        'Автомобіль в відмінному стані, один власник, повна сервісна історія.',
        'Машина не била, не фарбована, всі ТО пройдені вчасно.',
        'Економічний та надійний автомобіль для щоденного використання.',
        'Повна комплектація, всі опції працюють бездоганно.',
        'Ідеальний стан, гаражне зберігання, некурящий власник.'
      ];
      const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];
      await this.page.fill('[name="description"]', randomDescription);
      specsData.description = randomDescription;

    } catch (error) {
      console.error('❌ Ошибка при генерации характеристик:', error.message);
    }

    console.log('✅ Характеристики сгенерированы:', specsData);
    return specsData;
  }

  async selectRandomOption(selector, dataObject, fieldName) {
    try {
      await this.page.click(selector);
      await this.page.waitForTimeout(500);
      
      const options = await this.page.$$eval(
        '[role="option"]', 
        options => options.map(opt => ({ value: opt.getAttribute('data-value'), text: opt.textContent }))
      );
      
      if (options.length > 0) {
        const randomOption = options[Math.floor(Math.random() * options.length)];
        await this.page.click(`[data-value="${randomOption.value}"]`);
        dataObject[fieldName] = randomOption.value;
        console.log(`    ✅ ${fieldName}: ${randomOption.text}`);
      }
    } catch (error) {
      console.log(`    ⚠️ Не удалось выбрать ${fieldName}: ${error.message}`);
    }
  }

  async generatePricingData() {
    console.log('💰 Генерация данных ценообразования...');
    
    // Переходим на таб ценообразования
    await this.page.click('[data-value="pricing"]');
    await this.page.waitForTimeout(1000);

    const pricingData = {};

    try {
      // Заполняем цену
      console.log('  💵 Заполнение цены...');
      const randomPrice = Math.floor(Math.random() * 50000) + 5000; // 5000-55000
      await this.page.fill('[name="price"]', randomPrice.toString());
      pricingData.price = randomPrice;

      // Выбираем валюту
      console.log('  💱 Выбор валюты...');
      await this.selectRandomOption('[name="currency"]', pricingData, 'currency');

    } catch (error) {
      console.error('❌ Ошибка при генерации ценообразования:', error.message);
    }

    console.log('✅ Ценообразование сгенерировано:', pricingData);
    return pricingData;
  }

  async generateLocationData() {
    console.log('📍 Генерация данных местоположения...');
    
    // Переходим на таб местоположения
    await this.page.click('[data-value="location"]');
    await this.page.waitForTimeout(1000);

    const locationData = {};

    try {
      // Выбираем регион
      console.log('  🗺️ Выбор региона...');
      const regionSelector = '[name="region"]';
      await this.page.waitForSelector(regionSelector, { timeout: 5000 });
      await this.page.click(regionSelector);
      await this.page.waitForTimeout(1000);
      
      const regionOptions = await this.page.$$eval(
        '[role="option"]', 
        options => options.map(opt => ({ value: opt.getAttribute('data-value'), text: opt.textContent }))
      );
      
      if (regionOptions.length > 0) {
        const randomRegion = regionOptions[Math.floor(Math.random() * Math.min(regionOptions.length, 5))];
        console.log(`  ✅ Выбран регион: ${randomRegion.text}`);
        await this.page.click(`[data-value="${randomRegion.value}"]`);
        locationData.region = randomRegion.value;
        
        await this.page.waitForTimeout(1000);
        
        // Выбираем город
        console.log('  🏙️ Выбор города...');
        const citySelector = '[name="city"]';
        await this.page.waitForSelector(citySelector, { timeout: 5000 });
        await this.page.click(citySelector);
        await this.page.waitForTimeout(1000);
        
        const cityOptions = await this.page.$$eval(
          '[role="option"]', 
          options => options.map(opt => ({ value: opt.getAttribute('data-value'), text: opt.textContent }))
        );
        
        if (cityOptions.length > 0) {
          const randomCity = cityOptions[Math.floor(Math.random() * Math.min(cityOptions.length, 3))];
          console.log(`  ✅ Выбран город: ${randomCity.text}`);
          await this.page.click(`[data-value="${randomCity.value}"]`);
          locationData.city = randomCity.value;
        }
      }

    } catch (error) {
      console.error('❌ Ошибка при генерации местоположения:', error.message);
    }

    console.log('✅ Местоположение сгенерировано:', locationData);
    return locationData;
  }

  async generateContactData() {
    console.log('📞 Генерация контактных данных...');
    
    // Переходим на таб контактов
    await this.page.click('[data-value="contact"]');
    await this.page.waitForTimeout(1000);

    const contactData = {};

    try {
      // Заполняем телефон
      console.log('  📱 Заполнение телефона...');
      const randomPhone = `+380${Math.floor(Math.random() * 900000000) + 100000000}`;
      
      // Ищем поле для телефона
      const phoneInput = await this.page.$('[name="contacts[0].value"]') || await this.page.$('[placeholder*="телефон"]');
      if (phoneInput) {
        await phoneInput.fill(randomPhone);
        contactData.contacts = [{ type: 'phone', value: randomPhone, is_visible: true }];
        console.log(`  ✅ Телефон: ${randomPhone}`);
      }

    } catch (error) {
      console.error('❌ Ошибка при генерации контактов:', error.message);
    }

    console.log('✅ Контакты сгенерированы:', contactData);
    return contactData;
  }

  async generateFullMockData() {
    console.log('🎭 Генерация полного набора мокковых данных...');
    
    const mockData = {};
    
    // Генерируем данные по табам
    const specsData = await this.generateSpecsData();
    const pricingData = await this.generatePricingData();
    const locationData = await this.generateLocationData();
    const contactData = await this.generateContactData();
    
    // Объединяем все данные
    Object.assign(mockData, specsData, pricingData, locationData, contactData);
    
    console.log('🎉 Полный набор мокковых данных сгенерирован:', mockData);
    return mockData;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔚 Браузер закрыт');
    }
  }
}

// Экспорт для использования в других модулях
module.exports = { MockDataGenerator };

// Если скрипт запускается напрямую
if (require.main === module) {
  (async () => {
    const generator = new MockDataGenerator();
    
    try {
      await generator.init();
      await generator.navigateToCreateForm();
      const mockData = await generator.generateFullMockData();
      
      // Сохраняем данные в файл
      const fs = require('fs');
      const path = require('path');
      
      const outputPath = path.join(__dirname, '../src/utils/generated-mock-data.json');
      fs.writeFileSync(outputPath, JSON.stringify(mockData, null, 2));
      
      console.log(`💾 Мокковые данные сохранены в: ${outputPath}`);
      
    } catch (error) {
      console.error('💥 Ошибка:', error);
    } finally {
      await generator.close();
    }
  })();
}
