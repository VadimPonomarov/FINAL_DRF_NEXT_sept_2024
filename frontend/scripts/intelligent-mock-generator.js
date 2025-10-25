/**
 * Интеллектуальный генератор мокковых данных с помощью Playwright
 * Анализирует поля на каждой странице и делает соответствующие выборы
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class IntelligentMockGenerator {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.headless = options.headless || false;
    this.slowMo = options.slowMo || 200;
    this.generatedData = {};
  }

  async init() {
    console.log('🚀 Запуск интеллектуального генератора мокковых данных...');
    
    this.browser = await chromium.launch({ 
      headless: this.headless,
      slowMo: this.slowMo
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewportSize({ width: 1280, height: 720 });
    
    // Добавляем обработчики для отладки
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🔴 Browser Error:', msg.text());
      }
    });
    
    console.log('✅ Браузер запущен');
  }

  async navigateToForm() {
    console.log('📝 Переход к форме создания объявления...');
    await this.page.goto(`${this.baseUrl}/autoria/ads/create`);
    
    // Ждем загрузки формы
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
    
    console.log('✅ Форма загружена');
  }

  /**
   * Анализирует поля на текущей странице
   */
  async analyzePageFields() {
    console.log('🔍 Анализ полей на странице...');
    
    const fields = await this.page.evaluate(() => {
      const fieldElements = [];
      
      // Ищем различные типы полей
      const selectors = [
        'input[type="text"]',
        'input[type="number"]', 
        'input[type="email"]',
        'input[type="tel"]',
        'textarea',
        'select',
        '[role="combobox"]', // Для custom селекторов
        '[data-testid*="select"]',
        '[class*="select"]'
      ];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const field = {
            selector: selector,
            name: el.name || el.getAttribute('data-name') || el.id,
            type: el.type || el.tagName.toLowerCase(),
            placeholder: el.placeholder,
            required: el.required || el.getAttribute('aria-required') === 'true',
            value: el.value,
            options: [],
            element: el.outerHTML.substring(0, 200) // Первые 200 символов для отладки
          };
          
          // Для селекторов получаем опции
          if (el.tagName.toLowerCase() === 'select') {
            field.options = Array.from(el.options).map(opt => ({
              value: opt.value,
              text: opt.textContent
            }));
          }
          
          fieldElements.push(field);
        });
      });
      
      return fieldElements;
    });
    
    console.log(`📋 Найдено полей: ${fields.length}`);
    fields.forEach(field => {
      console.log(`  - ${field.name}: ${field.type} (${field.required ? 'обязательное' : 'опциональное'})`);
    });
    
    return fields;
  }

  /**
   * Заполняет текстовое поле
   */
  async fillTextField(field, value) {
    try {
      const selector = `[name="${field.name}"]`;
      await this.page.waitForSelector(selector, { timeout: 3000 });
      await this.page.fill(selector, value.toString());
      console.log(`  ✅ ${field.name}: "${value}"`);
      return true;
    } catch (error) {
      console.log(`  ❌ Не удалось заполнить ${field.name}: ${error.message}`);
      return false;
    }
  }

  /**
   * Выбирает значение в селекторе
   */
  async selectFieldValue(field) {
    try {
      const selector = `[name="${field.name}"]`;
      await this.page.waitForSelector(selector, { timeout: 3000 });
      
      // Кликаем на селектор
      await this.page.click(selector);
      await this.page.waitForTimeout(500);
      
      // Ждем появления опций
      await this.page.waitForSelector('[role="option"], option', { timeout: 3000 });
      
      // Получаем доступные опции
      const options = await this.page.evaluate(() => {
        const optionElements = document.querySelectorAll('[role="option"], option');
        return Array.from(optionElements).map(opt => ({
          value: opt.getAttribute('data-value') || opt.value,
          text: opt.textContent?.trim(),
          element: opt
        })).filter(opt => opt.value && opt.text);
      });
      
      if (options.length > 0) {
        // Выбираем случайную опцию (но не первую пустую)
        const validOptions = options.filter(opt => opt.value !== '' && opt.text !== '');
        if (validOptions.length > 0) {
          const randomOption = validOptions[Math.floor(Math.random() * Math.min(validOptions.length, 5))];
          
          // Кликаем на выбранную опцию
          const optionSelector = `[data-value="${randomOption.value}"], option[value="${randomOption.value}"]`;
          await this.page.click(optionSelector);
          
          console.log(`  ✅ ${field.name}: "${randomOption.text}" (${randomOption.value})`);
          return randomOption.value;
        }
      }
      
      console.log(`  ⚠️ ${field.name}: нет доступных опций`);
      return null;
      
    } catch (error) {
      console.log(`  ❌ Не удалось выбрать значение для ${field.name}: ${error.message}`);
      return null;
    }
  }

  /**
   * Генерирует значение для поля на основе его типа и имени
   */
  generateFieldValue(field) {
    const fieldName = field.name?.toLowerCase() || '';
    const placeholder = field.placeholder?.toLowerCase() || '';
    
    // Определяем тип поля по имени и placeholder
    if (fieldName.includes('title') || fieldName.includes('заголовок')) {
      return `Тестовое объявление ${Date.now()}`;
    }
    
    if (fieldName.includes('description') || fieldName.includes('описание')) {
      const descriptions = [
        'Автомобіль в відмінному стані, один власник, повна сервісна історія.',
        'Машина не била, не фарбована, всі ТО пройдені вчасно.',
        'Економічний та надійний автомобіль для щоденного використання.',
        'Повна комплектація, всі опції працюють бездоганно.'
      ];
      return descriptions[Math.floor(Math.random() * descriptions.length)];
    }
    
    if (fieldName.includes('year') || fieldName.includes('рік')) {
      return 2020 + Math.floor(Math.random() * 4); // 2020-2023
    }
    
    if (fieldName.includes('mileage') || fieldName.includes('пробіг')) {
      return Math.floor(Math.random() * 150000) + 10000; // 10k-160k
    }
    
    if (fieldName.includes('price') || fieldName.includes('ціна')) {
      return Math.floor(Math.random() * 40000) + 5000; // 5k-45k
    }
    
    if (fieldName.includes('engine_volume') || fieldName.includes('об\'єм')) {
      return (Math.random() * 2.5 + 1.0).toFixed(1); // 1.0-3.5
    }
    
    if (fieldName.includes('engine_power') || fieldName.includes('потужність')) {
      return Math.floor(Math.random() * 250) + 80; // 80-330
    }
    
    if (fieldName.includes('phone') || fieldName.includes('телефон')) {
      return `+380${Math.floor(Math.random() * 900000000) + 100000000}`;
    }
    
    if (fieldName.includes('email') || fieldName.includes('пошта')) {
      return `test${Math.floor(Math.random() * 1000)}@example.com`;
    }
    
    if (fieldName.includes('license_plate') || fieldName.includes('номер')) {
      return `AA${Math.floor(Math.random() * 9000) + 1000}BB`;
    }
    
    if (field.type === 'number') {
      return Math.floor(Math.random() * 100) + 1;
    }
    
    return `Тестове значення ${Math.floor(Math.random() * 1000)}`;
  }

  /**
   * Обрабатывает все поля на текущей странице
   */
  async processCurrentPage() {
    const fields = await this.analyzePageFields();
    const pageData = {};
    
    for (const field of fields) {
      if (!field.name) continue;
      
      console.log(`🔧 Обработка поля: ${field.name} (${field.type})`);
      
      if (field.type === 'select' || field.selector.includes('select') || field.selector.includes('combobox')) {
        // Это селектор - выбираем значение
        const selectedValue = await this.selectFieldValue(field);
        if (selectedValue) {
          pageData[field.name] = selectedValue;
        }
      } else {
        // Это текстовое поле - заполняем значением
        const value = this.generateFieldValue(field);
        const success = await this.fillTextField(field, value);
        if (success) {
          pageData[field.name] = value;
        }
      }
      
      // Небольшая пауза между полями
      await this.page.waitForTimeout(300);
    }
    
    return pageData;
  }

  /**
   * Переходит к следующему табу
   */
  async goToNextTab(currentTab) {
    const tabs = ['specs', 'pricing', 'location', 'contact', 'metadata'];
    const currentIndex = tabs.indexOf(currentTab);
    
    if (currentIndex < tabs.length - 1) {
      const nextTab = tabs[currentIndex + 1];
      console.log(`📑 Переход к табу: ${nextTab}`);
      
      try {
        await this.page.click(`[data-value="${nextTab}"]`);
        await this.page.waitForTimeout(1000);
        return nextTab;
      } catch (error) {
        console.log(`⚠️ Не удалось перейти к табу ${nextTab}: ${error.message}`);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Генерирует полный набор мокковых данных
   */
  async generateFullMockData() {
    console.log('🎭 Начинаем генерацию полного набора мокковых данных...');
    
    await this.navigateToForm();
    
    const tabs = ['specs', 'pricing', 'location', 'contact', 'metadata'];
    
    for (const tab of tabs) {
      console.log(`\n📋 === Обработка таба: ${tab.toUpperCase()} ===`);
      
      // Переходим к табу
      try {
        await this.page.click(`[data-value="${tab}"]`);
        await this.page.waitForTimeout(1500);
      } catch (error) {
        console.log(`⚠️ Не удалось перейти к табу ${tab}: ${error.message}`);
        continue;
      }
      
      // Обрабатываем поля на текущей странице
      const tabData = await this.processCurrentPage();
      
      // Сохраняем данные таба
      this.generatedData[tab] = tabData;
      
      console.log(`✅ Таб ${tab} обработан. Данных: ${Object.keys(tabData).length}`);
    }
    
    console.log('\n🎉 Генерация завершена!');
    return this.generatedData;
  }

  /**
   * Сохраняет сгенерированные данные в файл
   */
  async saveToFile(filename = 'generated-mock-data.json') {
    const outputPath = path.join(__dirname, '../src/utils/', filename);
    
    // Создаем директорию если не существует
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Сохраняем данные
    fs.writeFileSync(outputPath, JSON.stringify(this.generatedData, null, 2));
    console.log(`💾 Данные сохранены в: ${outputPath}`);
    
    return outputPath;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔚 Браузер закрыт');
    }
  }
}

module.exports = { IntelligentMockGenerator };

// Если скрипт запускается напрямую
if (require.main === module) {
  (async () => {
    const generator = new IntelligentMockGenerator({
      headless: false, // Показываем браузер
      slowMo: 300      // Замедляем для наглядности
    });
    
    try {
      await generator.init();
      const mockData = await generator.generateFullMockData();
      await generator.saveToFile();
      
      console.log('\n📊 Итоговые данные:');
      console.log(JSON.stringify(mockData, null, 2));
      
    } catch (error) {
      console.error('💥 Ошибка:', error);
    } finally {
      await generator.close();
    }
  })();
}
