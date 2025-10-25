/**
 * Автоматический генератор тестовых объявлений с использованием Playwright
 * Эмулирует поведение пользователей для создания объявлений через форму
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { generateFullMockData } from '../src/utils/mockData';

// Типы для конфигурации генератора
export interface AdGeneratorConfig {
  count: number;
  imageTypes: string[];
  includeImages: boolean;
  users: UserAccount[];
  headless: boolean;
  slowMo: number;
  timeout: number;
}

export interface UserAccount {
  email: string;
  password: string;
  accountType: 'basic' | 'premium' | 'dealer';
  maxAds: number;
  currentAds?: number;
}

// Интерфейс для пользователя из API
export interface ApiUser {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  account?: {
    account_type: 'BASIC' | 'PREMIUM' | 'DEALER';
    ads_count: number;
  };
}

/**
 * Получает список активных пользователей из API
 */
export async function getActiveUsers(): Promise<UserAccount[]> {
  try {
    console.log('👥 Fetching active users from API...');

    // Логинимся как суперадмин для получения списка пользователей
    const loginResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'pvs.versia@gmail.com',
        password: '12345678'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Admin login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const adminToken = loginData.access;

    // Получаем список всех пользователей
    const usersResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (!usersResponse.ok) {
      throw new Error(`Failed to fetch users: ${usersResponse.status}`);
    }

    const usersData = await usersResponse.json();
    const apiUsers: ApiUser[] = usersData.results || usersData || [];

    // Преобразуем в формат UserAccount
    const userAccounts: UserAccount[] = apiUsers
      .filter(user => user.is_active && user.email && user.email.includes('@'))
      .map(user => {
        const accountType = user.account?.account_type?.toLowerCase() as 'basic' | 'premium' | 'dealer' || 'basic';

        // Определяем максимальное количество объявлений по типу аккаунта
        let maxAds = 1; // basic по умолчанию
        if (accountType === 'premium') maxAds = 50;
        if (accountType === 'dealer') maxAds = 200;

        return {
          email: user.email,
          password: '12345678', // Стандартный пароль для всех
          accountType,
          maxAds,
          currentAds: user.account?.ads_count || 0
        };
      });

    console.log(`✅ Found ${userAccounts.length} active users:`);
    userAccounts.forEach(user => {
      console.log(`  - ${user.email} (${user.accountType}, ${user.currentAds}/${user.maxAds} ads)`);
    });

    return userAccounts;

  } catch (error) {
    console.error('❌ Error fetching users:', error);

    // Возвращаем fallback пользователей в случае ошибки
    console.log('🔄 Using fallback test users...');
    return [
      {
        email: 'pvs.versia@gmail.com',
        password: '12345678',
        accountType: 'premium',
        maxAds: 50,
        currentAds: 0
      }
    ];
  }
}

export class PlaywrightAdGenerator {
  private browser: Browser | null = null;
  private config: AdGeneratorConfig;
  private progressCallback?: (message: string, progress: number) => void;

  constructor(config: AdGeneratorConfig) {
    this.config = {
      headless: false,
      slowMo: 1000,
      timeout: 30000,
      ...config
    };
  }

  /**
   * Устанавливает callback для отслеживания прогресса
   */
  setProgressCallback(callback: (message: string, progress: number) => void) {
    this.progressCallback = callback;
  }

  /**
   * Инициализирует браузер
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Playwright browser...');
    
    this.browser = await chromium.launch({
      headless: this.config.headless,
      slowMo: this.config.slowMo,
      args: [
        '--start-maximized',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    console.log('✅ Browser initialized successfully');
  }

  /**
   * Логинится под указанным пользователем
   */
  async loginAsUser(context: BrowserContext, user: UserAccount): Promise<Page> {
    const page = await context.newPage();
    
    console.log(`🔐 Logging in as ${user.email}...`);
    
    // Переходим на страницу логина
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Заполняем форму логина
    await page.fill('input[name="email"], input[type="email"]', user.email);
    await page.fill('input[name="password"], input[type="password"]', user.password);
    
    // Нажимаем кнопку входа
    await page.click('button[type="submit"], button:has-text("Войти"), button:has-text("Login")');
    
    // Ждем успешного логина
    await page.waitForURL('**/autoria**', { timeout: this.config.timeout });
    
    console.log(`✅ Successfully logged in as ${user.email}`);
    return page;
  }

  /**
   * Создает одно объявление через форму
   */
  async createSingleAd(page: Page, adIndex: number): Promise<boolean> {
    try {
      console.log(`📝 Creating ad ${adIndex + 1}...`);
      
      // Переходим на страницу создания объявления
      await page.goto('/autoria/create-ad');
      await page.waitForLoadState('networkidle');

      // Ждем загрузки формы
      await page.waitForSelector('form', { timeout: this.config.timeout });

      // Генерируем мокковые данные
      const mockData = generateFullMockData();
      console.log(`🎭 Generated mock data for ad ${adIndex + 1}:`, mockData.title);

      // Используем кнопки автозаполнения из формы (они уже имеют случайный выбор)
      console.log('🎯 Looking for auto-fill buttons with random selection...');

      // Ищем кнопки автозаполнения в правильном порядке приоритета
      const buttonSelectors = [
        // Интерактивная генерация (лучший вариант - эмулирует пользователя)
        { selector: 'button:has-text("🎭 Interactive All")', name: 'Interactive All', timeout: 8000 },
        { selector: 'button:has-text("🎭")', name: 'Interactive', timeout: 8000 },
        { selector: 'button[title*="Інтерактивна генерація"]', name: 'Interactive (UA)', timeout: 8000 },

        // Быстрая генерация (второй вариант)
        { selector: 'button:has-text("⚡ Quick")', name: 'Quick', timeout: 3000 },
        { selector: 'button:has-text("🚀")', name: 'Fast', timeout: 3000 },
        { selector: 'button[title*="Швидка генерація"]', name: 'Quick (UA)', timeout: 3000 },

        // Генерация текущего таба
        { selector: 'button:has-text("🎯 Current Tab")', name: 'Current Tab', timeout: 4000 },

        // Любые другие кнопки генерации
        { selector: 'button:has-text("генерац")', name: 'Generation', timeout: 4000 },
        { selector: 'button:has-text("mock")', name: 'Mock', timeout: 4000 }
      ];

      let buttonUsed = false;
      let usedButtonName = '';

      for (const buttonInfo of buttonSelectors) {
        const button = page.locator(buttonInfo.selector).first();

        if (await button.isVisible({ timeout: 1000 })) {
          console.log(`🎲 Found and using ${buttonInfo.name} button (includes random selection)...`);

          try {
            await button.click();
            buttonUsed = true;
            usedButtonName = buttonInfo.name;

            // Ждем завершения генерации (время зависит от типа кнопки)
            console.log(`⏳ Waiting ${buttonInfo.timeout}ms for ${buttonInfo.name} generation to complete...`);
            await page.waitForTimeout(buttonInfo.timeout);

            break;
          } catch (error) {
            console.warn(`⚠️ Error clicking ${buttonInfo.name} button:`, error.message);
            continue;
          }
        }
      }

      if (!buttonUsed) {
        console.log('❌ No auto-fill buttons found - this may indicate form structure changes');
        throw new Error('Auto-fill buttons not found. Form may have changed structure.');
      }

      // Проверяем результат автозаполнения
      console.log(`✅ ${usedButtonName} button used - verifying random data generation...`);

      // Проверяем ключевые поля на заполненность
      const fieldsToCheck = [
        { selector: 'input[name="title"]', name: 'Title' },
        { selector: 'textarea[name="description"]', name: 'Description' },
        { selector: 'input[name="price"]', name: 'Price' },
        { selector: 'input[name="year"]', name: 'Year' },
        { selector: 'input[name="mileage"]', name: 'Mileage' }
      ];

      let filledFields = 0;
      for (const field of fieldsToCheck) {
        try {
          const element = page.locator(field.selector).first();
          if (await element.isVisible({ timeout: 1000 })) {
            const value = await element.inputValue();
            if (value && value.trim() !== '' && value !== 'undefined') {
              filledFields++;
              console.log(`  ✓ ${field.name}: "${value.substring(0, 30)}${value.length > 30 ? '...' : ''}"`);
            } else {
              console.log(`  ⚠️ ${field.name}: empty or undefined`);
            }
          }
        } catch (error) {
          console.log(`  ⚠️ ${field.name}: not accessible`);
        }
      }

      if (filledFields >= 3) {
        console.log(`✅ Auto-fill successful: ${filledFields}/${fieldsToCheck.length} key fields filled with random data`);
      } else {
        console.log(`⚠️ Auto-fill may be incomplete: only ${filledFields}/${fieldsToCheck.length} key fields filled`);
      }

      // Если нужны изображения, используем кнопки генерации изображений
      if (this.config.includeImages && this.config.imageTypes.length > 0) {
        await this.generateImagesUsingButtons(page);
      }

      // Отправляем форму
      await this.submitForm(page);
      
      console.log(`✅ Ad ${adIndex + 1} created successfully`);
      return true;

    } catch (error) {
      console.error(`❌ Error creating ad ${adIndex + 1}:`, error);
      return false;
    }
  }

  /**
   * Заполняет форму вручную (если кнопка генерации недоступна)
   */
  private async fillFormManually(page: Page, mockData: any): Promise<void> {
    console.log('📝 Filling form manually with complete data...');

    try {
      // Ждем загрузки всех элементов формы
      await page.waitForSelector('form', { timeout: 10000 });

      // Заполняем основные поля с проверкой на undefined
      const title = mockData.title || 'Продается автомобиль в отличном состоянии';
      await this.fillFieldSafely(page, 'input[name="title"]', title);

      const description = mockData.description || 'Автомобиль в хорошем техническом состоянии, один владелец, полная история обслуживания.';
      await this.fillFieldSafely(page, 'textarea[name="description"]', description);

      const price = mockData.price || Math.floor(Math.random() * 50000) + 10000;
      await this.fillFieldSafely(page, 'input[name="price"]', price.toString());

      // Заполняем характеристики автомобиля
      const brand = mockData.brand || 'Toyota';
      await this.selectFieldSafely(page, 'select[name="brand"], input[name="brand"]', brand);

      const model = mockData.model || 'Camry';
      await this.fillFieldSafely(page, 'input[name="model"]', model);

      const year = mockData.year || 2020;
      await this.fillFieldSafely(page, 'input[name="year"]', year.toString());

      const mileage = mockData.mileage || Math.floor(Math.random() * 100000) + 10000;
      await this.fillFieldSafely(page, 'input[name="mileage"]', mileage.toString());

      // Заполняем селекты с дефолтными значениями
      await this.selectFieldSafely(page, 'select[name="fuel_type"]', mockData.fuel_type || 'petrol');
      await this.selectFieldSafely(page, 'select[name="transmission"]', mockData.transmission || 'automatic');
      await this.selectFieldSafely(page, 'select[name="body_type"]', mockData.body_type || 'sedan');
      await this.selectFieldSafely(page, 'select[name="condition"]', mockData.condition || 'good');

      // Заполняем контактную информацию
      const contactName = mockData.contact_name || 'Владимир';
      await this.fillFieldSafely(page, 'input[name="contact_name"]', contactName);

      const phone = mockData.phone || '+380501234567';
      await this.fillFieldSafely(page, 'input[name="phone"]', phone);

      // Заполняем местоположение
      const region = mockData.region || 'Київська область';
      await this.selectFieldSafely(page, 'select[name="region"]', region);

      const city = mockData.city || 'Київ';
      await this.selectFieldSafely(page, 'select[name="city"]', city);

      console.log('✅ Form filled manually with all required fields');

    } catch (error) {
      console.error('❌ Error filling form manually:', error);
      throw error;
    }
  }

  /**
   * Безопасно заполняет поле ввода
   */
  private async fillFieldSafely(page: Page, selector: string, value: string): Promise<void> {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        await element.clear();
        await element.fill(value);
        console.log(`✓ Filled ${selector}: ${value}`);
        await page.waitForTimeout(200); // Небольшая пауза для имитации пользователя
      }
    } catch (error) {
      console.warn(`⚠️ Could not fill ${selector}:`, error.message);
    }
  }

  /**
   * Безопасно выбирает значение в селекте
   */
  private async selectFieldSafely(page: Page, selector: string, value: string): Promise<void> {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        // Пробуем разные способы выбора значения
        try {
          await element.selectOption({ label: value });
        } catch {
          try {
            await element.selectOption({ value: value });
          } catch {
            // Если это input, а не select
            await element.fill(value);
          }
        }
        console.log(`✓ Selected ${selector}: ${value}`);
        await page.waitForTimeout(200);
      }
    } catch (error) {
      console.warn(`⚠️ Could not select ${selector}:`, error.message);
    }
  }

  /**
   * Генерирует изображения используя кнопки в форме
   */
  private async generateImagesUsingButtons(page: Page): Promise<void> {
    try {
      console.log('📸 Looking for image generation buttons...');

      // Ищем различные варианты кнопок генерации изображений
      const imageButtons = [
        'button:has-text("🖼️")',
        'button:has-text("Генерировать изображения")',
        'button:has-text("Generate Images")',
        'button[title*="изображен"]',
        'button[title*="image"]',
        '.image-generator button',
        '[data-testid="image-generator-button"]'
      ];

      let imageButtonFound = false;

      for (const selector of imageButtons) {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 1000 })) {
          console.log(`🎯 Found image generation button: ${selector}`);
          await button.click();
          imageButtonFound = true;
          break;
        }
      }

      if (!imageButtonFound) {
        console.log('⚠️ No image generation buttons found, skipping image generation');
        return;
      }

      // Ждем появления интерфейса генерации изображений
      await page.waitForTimeout(2000);

      // Ищем модальное окно или панель выбора типов изображений
      const modalSelectors = [
        '.modal',
        '.dialog',
        '[role="dialog"]',
        '.image-type-selector',
        '.image-generation-modal'
      ];

      let modalFound = false;
      for (const selector of modalSelectors) {
        if (await page.locator(selector).isVisible({ timeout: 1000 })) {
          console.log(`📋 Found image generation interface: ${selector}`);
          modalFound = true;
          break;
        }
      }

      if (modalFound) {
        // Выбираем типы изображений
        for (const imageType of this.config.imageTypes) {
          const typeSelectors = [
            `button:has-text("${imageType}")`,
            `input[value="${imageType}"]`,
            `label:has-text("${imageType}")`,
            `[data-image-type="${imageType}"]`
          ];

          for (const selector of typeSelectors) {
            const element = page.locator(selector).first();
            if (await element.isVisible({ timeout: 1000 })) {
              await element.click();
              console.log(`✓ Selected image type: ${imageType}`);
              break;
            }
          }
        }

        // Ищем кнопку подтверждения генерации
        const confirmSelectors = [
          'button:has-text("Генерировать")',
          'button:has-text("Generate")',
          'button:has-text("Создать")',
          'button[type="submit"]',
          '.generate-button',
          '.confirm-button'
        ];

        for (const selector of confirmSelectors) {
          const button = page.locator(selector).first();
          if (await button.isVisible({ timeout: 1000 })) {
            console.log(`🚀 Clicking generate button: ${selector}`);
            await button.click();
            break;
          }
        }

        // Ждем завершения генерации изображений
        console.log('⏳ Waiting for image generation to complete...');
        await page.waitForTimeout(8000);

        // Проверяем, появились ли изображения
        const imageElements = page.locator('img[src*="data:"], img[src*="blob:"], .generated-image, .ad-image');
        const imageCount = await imageElements.count();

        if (imageCount > 0) {
          console.log(`✅ Successfully generated ${imageCount} images`);
        } else {
          console.log('⚠️ No images detected after generation');
        }

      } else {
        console.log('⚠️ No image generation interface found, images may generate automatically');
        await page.waitForTimeout(5000);
      }

    } catch (error) {
      console.warn('⚠️ Error during image generation:', error.message);
    }
  }

  /**
   * Отправляет форму создания объявления
   */
  private async submitForm(page: Page): Promise<void> {
    console.log('📤 Submitting form with randomly generated data...');

    // Ищем кнопку отправки в разных вариантах
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Создать")',
      'button:has-text("Опубликовать")',
      'button:has-text("Create")',
      'button:has-text("Publish")',
      '.submit-button',
      '[data-testid="submit-button"]'
    ];

    let submitButton = null;
    for (const selector of submitSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 1000 })) {
        submitButton = button;
        console.log(`📤 Found submit button: ${selector}`);
        break;
      }
    }

    if (!submitButton) {
      throw new Error('Submit button not found');
    }

    // Прокручиваем к кнопке и кликаем
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();

    console.log('⏳ Waiting for form submission response...');

    // Ждем ответа от сервера (может быть перенаправление или уведомление)
    await page.waitForTimeout(5000);

    // Проверяем различные индикаторы успеха
    const successSelectors = [
      '.toast-success',
      '.notification-success',
      '.alert-success',
      '.success-message',
      '[data-testid="success-toast"]',
      'text="успешно"',
      'text="successfully"',
      'text="создано"',
      'text="created"'
    ];

    let successFound = false;
    for (const selector of successSelectors) {
      if (await page.locator(selector).isVisible({ timeout: 1000 })) {
        console.log(`✅ Success indicator found: ${selector}`);
        successFound = true;
        break;
      }
    }

    // Проверяем, не произошло ли перенаправление на страницу объявлений
    const currentUrl = page.url();
    if (currentUrl.includes('/my-ads') || currentUrl.includes('/ads/') || currentUrl.includes('/autoria')) {
      console.log(`✅ Redirected to: ${currentUrl} - likely successful`);
      successFound = true;
    }

    // Проверяем на ошибки
    const errorSelectors = [
      '.toast-error',
      '.notification-error',
      '.alert-error',
      '.error-message',
      'text="ошибка"',
      'text="error"'
    ];

    for (const selector of errorSelectors) {
      if (await page.locator(selector).isVisible({ timeout: 1000 })) {
        const errorText = await page.locator(selector).textContent();
        throw new Error(`Form submission failed: ${errorText}`);
      }
    }

    if (successFound) {
      console.log('✅ Form submitted successfully with random data');
    } else {
      console.log('⚠️ Form submitted but success confirmation unclear');
    }
  }

  /**
   * Основная функция генерации объявлений
   */
  async generateAds(): Promise<{ success: number; failed: number; details: any[] }> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    // Получаем актуальный список пользователей из API
    const activeUsers = await getActiveUsers();
    if (activeUsers.length === 0) {
      throw new Error('No active users found for ad generation');
    }

    console.log(`🎯 Starting generation of ${this.config.count} ads using ${activeUsers.length} active users`);

    const results = {
      success: 0,
      failed: 0,
      details: []
    };

    // Создаем объявления, случайно выбирая пользователей
    for (let adIndex = 0; adIndex < this.config.count; adIndex++) {
      // Фильтруем пользователей, которые могут создать еще объявления
      const availableUsers = activeUsers.filter(user => {
        const currentAds = user.currentAds || 0;
        return currentAds < user.maxAds;
      });

      if (availableUsers.length === 0) {
        console.log('⚠️ No more users available for ad creation (all limits reached)');
        break;
      }

      // Случайно выбираем пользователя
      const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
      console.log(`🎲 Selected random user: ${randomUser.email} (${randomUser.accountType}, ${randomUser.currentAds}/${randomUser.maxAds} ads)`);

      // Создаем новый контекст для пользователя
      const context = await this.browser.newContext();

      try {
        const progress = ((adIndex + 1) / this.config.count) * 100;

        if (this.progressCallback) {
          this.progressCallback(
            `Creating ad ${adIndex + 1}/${this.config.count} for ${randomUser.email}`,
            progress
          );
        }

        // Логинимся под выбранным пользователем
        const page = await this.loginAsUser(context, randomUser);

        // Создаем объявление
        const success = await this.createSingleAd(page, adIndex);

        if (success) {
          results.success++;
          // Обновляем счетчик объявлений пользователя
          randomUser.currentAds = (randomUser.currentAds || 0) + 1;
        } else {
          results.failed++;
        }

        results.details.push({
          adIndex: adIndex + 1,
          user: randomUser.email,
          accountType: randomUser.accountType,
          success,
          timestamp: new Date().toISOString()
        });

        // Пауза между объявлениями
        await page.waitForTimeout(2000);

      } catch (error) {
        console.error(`❌ Error creating ad ${adIndex + 1} for ${randomUser.email}:`, error);
        results.failed++;

        results.details.push({
          adIndex: adIndex + 1,
          user: randomUser.email,
          accountType: randomUser.accountType,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      } finally {
        await context.close();
      }
    }

    return results;
  }

  /**
   * Закрывает браузер
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('🔒 Browser closed');
    }
  }
}

/**
 * Основная функция для запуска генератора
 */
export async function runAdGenerator(config: Omit<AdGeneratorConfig, 'users'>): Promise<{ success: number; failed: number; details: any[] }> {
  // Создаем конфигурацию без пользователей (они будут получены динамически)
  const fullConfig: AdGeneratorConfig = {
    ...config,
    users: [] // Будет заполнено в generateAds()
  };

  const generator = new PlaywrightAdGenerator(fullConfig);

  try {
    await generator.initialize();
    const results = await generator.generateAds();

    console.log('\n📊 Generation Results:');
    console.log(`✅ Successful: ${results.success}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📝 Total: ${results.success + results.failed}`);

    // Группируем результаты по типам аккаунтов
    const byAccountType = results.details.reduce((acc, detail) => {
      const type = detail.accountType || 'unknown';
      if (!acc[type]) acc[type] = { success: 0, failed: 0 };
      if (detail.success) acc[type].success++;
      else acc[type].failed++;
      return acc;
    }, {} as Record<string, { success: number; failed: number }>);

    console.log('\n📈 Results by Account Type:');
    Object.entries(byAccountType).forEach(([type, stats]) => {
      console.log(`  ${type}: ✅ ${stats.success} | ❌ ${stats.failed}`);
    });

    return results;

  } finally {
    await generator.close();
  }
}
