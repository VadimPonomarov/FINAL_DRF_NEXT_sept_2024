/**
 * Утилита для создания тестовых объявлений
 * Использует ту же логику, что и форма создания объявлений с автозаполнением и генерацией фото
 */

import { CarAdsService } from '@/services/autoria/carAds.service';
import { AdGeneratorService } from '@/services/autoria/ad-generator.service';
import { CarAdFormData } from '@/types/autoria';
import { mapFormDataToApiData } from '@/utils/carAdDataMapper';
import { generateFullMockData } from '@/utils/mockData';
import { AutoRiaUsersService, UserSelectionResult } from '@/services/autoria/users.service';

interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  is_superuser: boolean;
}

/**
 * Логинится как суперадмин через готовый хелпер и получает токен
 */
async function loginSuperAdmin(): Promise<string | null> {
  try {
    console.log('🔐 Logging in as superadmin pvs.versia@gmail.com using helper...');

    // Импортируем хелпер динамически, чтобы избежать проблем с серверным рендерингом
    const { backendApiHelpers } = await import('../app/api/(helpers)/backend');

    const authResult = await backendApiHelpers.auth({
      email: 'pvs.versia@gmail.com',
      password: '12345678'
    });

    if (authResult.status !== 200) {
      console.error(`❌ Superadmin login failed:`, authResult);
      return null;
    }

    const accessToken = authResult.data?.access;

    if (!accessToken) {
      console.error('❌ No access token received for superadmin');
      return null;
    }

    console.log('✅ Successfully logged in as superadmin using helper');
    return accessToken;

  } catch (error) {
    console.error('❌ Superadmin login error:', error);
    return null;
  }
}

/**
 * Получает список всех пользователей через суперадмин токен
 */
async function getAllUsers(superAdminToken: string): Promise<User[]> {
  try {
    console.log('📋 Fetching all users...');

    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${superAdminToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to fetch users: ${response.status} - ${errorText}`);
      return [];
    }

    const data = await response.json();
    const users = data.results || data || [];

    console.log(`✅ Found ${users.length} users in database`);
    return users;

  } catch (error) {
    console.error('❌ Error fetching users:', error);
    return [];
  }
}

/**
 * Активирует пользователя через суперадмин токен
 */
async function activateUser(userId: number, superAdminToken: string): Promise<boolean> {
  try {
    console.log(`🔓 Activating user ${userId}...`);

    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/admin/${userId}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${superAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        is_active: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to activate user ${userId}: ${response.status} - ${errorText}`);
      return false;
    }

    console.log(`✅ Successfully activated user ${userId}`);
    return true;

  } catch (error) {
    console.error(`❌ Error activating user ${userId}:`, error);
    return false;
  }
}

/**
 * Логинится под конкретным пользователем
 */
async function loginAsUser(email: string): Promise<string | null> {
  try {
    console.log(`🔐 Logging in as ${email}...`);

    const loginResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: '12345678' // Все пользователи имеют одинаковый пароль
      })
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error(`❌ Login failed for ${email}: ${loginResponse.status} - ${errorText}`);
      return null;
    }

    const loginData = await loginResponse.json();
    const accessToken = loginData.access || loginData.token;

    if (!accessToken) {
      console.error(`❌ No access token received for ${email}`);
      return null;
    }

    console.log(`✅ Successfully logged in as ${email}`);
    return accessToken;

  } catch (error) {
    console.error(`❌ Login error for ${email}:`, error);
    return null;
  }
}

/**
 * Создает объявление используя CarAdsService (как в форме создания)
 */
async function createAdWithService(adData: CarAdFormData): Promise<any> {
  try {
    console.log(`🔍 createAdWithService: Creating ad using CarAdsService...`);
    console.log(`🔍 createAdWithService: Form data:`, {
      title: adData.title,
      brand: adData.brand,
      model: adData.model,
      price: adData.price
    });

    // Преобразуем данные формы в формат API (как делает форма)
    const apiData = mapFormDataToApiData(adData);
    console.log(`🔍 createAdWithService: Mapped API data:`, {
      title: apiData.title,
      mark: apiData.mark,
      model: apiData.model,
      price: apiData.price,
      mileage_km: apiData.mileage_km
    });

    // Используем тот же сервис, что и форма создания
    const result = await CarAdsService.createCarAd(apiData as CarAdFormData);

    console.log(`✅ createAdWithService: Success response:`, result);
    return result;
  } catch (error) {
    console.error('❌ Error creating ad with service:', error);
    throw error;
  }
}

/**
 * Обновляет аккаунт пользователя до PREMIUM с токеном авторизации
 */
async function upgradeUserAccountToPremium(userId: number, token: string): Promise<void> {
  try {
    // Сначала получаем аккаунт пользователя
    const accountResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/accounts/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!accountResponse.ok) {
      throw new Error(`Failed to get user account: ${accountResponse.status}`);
    }

    const accountData = await accountResponse.json();
    const userAccount = accountData.results?.[0] || accountData;

    if (!userAccount || !userAccount.id) {
      throw new Error('User account not found');
    }

    // Обновляем аккаунт до PREMIUM через правильный admin endpoint
    const upgradeResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/accounts/admin/${userAccount.id}/type/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_type: 'PREMIUM',
        reason: 'Test ads generation - automatic upgrade',
        notify_user: false
      })
    });

    if (!upgradeResponse.ok) {
      const errorText = await upgradeResponse.text();
      throw new Error(`Failed to upgrade account: ${upgradeResponse.status} - ${errorText}`);
    }

    console.log(`✅ Account ${userAccount.id} upgraded to PREMIUM for user ${userId}`);
  } catch (error) {
    console.error(`❌ Error upgrading account for user ${userId}:`, error);
    throw error;
  }
}

interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  is_superuser: boolean;
}





// Тестовые аккаунты для создания объявлений
const TEST_ACCOUNTS = [
  { email: 'pvs.versia@gmail.com', password: '12345678', name: 'Main Account' },
  { email: 'test1@example.com', password: 'password123', name: 'Test Account 1' },
  { email: 'test2@example.com', password: 'password123', name: 'Test Account 2' },
  { email: 'dealer@example.com', password: 'password123', name: 'Dealer Account' },
  { email: 'salon@example.com', password: 'password123', name: 'Auto Salon Account' }
];

/**
 * Логинится в систему и получает токен для аккаунта
 */
async function loginAndGetToken(email: string, password: string): Promise<string | null> {
  try {
    console.log(`🔐 Logging in as ${email}...`);

    const loginResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error(`❌ Login failed for ${email}: ${loginResponse.status} - ${errorText}`);
      return null;
    }

    const loginData = await loginResponse.json();
    const accessToken = loginData.access || loginData.token;

    if (!accessToken) {
      console.error(`❌ No access token received for ${email}`);
      return null;
    }

    console.log(`✅ Successfully logged in as ${email}`);
    return accessToken;

  } catch (error) {
    console.error(`❌ Login error for ${email}:`, error);
    return null;
  }
}



// Кэш для справочных данных
let referencesCache: {
  marks?: any[];
  regions?: any[];
  cities?: any[];
  colors?: any[];
} = {};

/**
 * Получает справочные данные из backend API
 */
async function getReferenceData() {
  if (Object.keys(referencesCache).length > 0) {
    return referencesCache;
  }

  console.log('📚 Загружаем справочные данные...');
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  try {
    // Получаем марки автомобилей
    const marksResponse = await fetch(`${backendUrl}/api/ads/reference/marks/`);
    let marks = [];
    if (marksResponse.ok) {
      const marksData = await marksResponse.json();
      marks = Array.isArray(marksData) ? marksData : (marksData.results || []);
    }

    // Получаем регионы
    const regionsResponse = await fetch(`${backendUrl}/api/ads/reference/regions/`);
    let regions = [];
    if (regionsResponse.ok) {
      const regionsData = await regionsResponse.json();
      regions = Array.isArray(regionsData) ? regionsData : (regionsData.results || []);
    }

    // Получаем города
    const citiesResponse = await fetch(`${backendUrl}/api/ads/reference/cities/`);
    let cities = [];
    if (citiesResponse.ok) {
      const citiesData = await citiesResponse.json();
      cities = Array.isArray(citiesData) ? citiesData : (citiesData.results || []);
    }

    // Получаем цвета
    const colorsResponse = await fetch(`${backendUrl}/api/ads/reference/colors/`);
    let colors = [];
    if (colorsResponse.ok) {
      const colorsData = await colorsResponse.json();
      colors = Array.isArray(colorsData) ? colorsData : (colorsData.results || []);
    }

    referencesCache = { marks, regions, cities, colors };
    console.log('✅ Справочные данные загружены:', {
      marks: marks.length,
      regions: regions.length,
      cities: cities.length,
      colors: colors.length
    });

    return referencesCache;
  } catch (error) {
    console.error('❌ Ошибка загрузки справочных данных:', error);
    return { marks: [], regions: [], cities: [], colors: [] };
  }
}

/**
 * Получает ID марки по названию из справочника
 */
async function getMarkIdByName(markName: string): Promise<number> {
  const references = await getReferenceData();

  if (!Array.isArray(references.marks) || references.marks.length === 0) {
    console.error('❌ Справочник марок недоступен или пуст');
    throw new Error(`Car marks reference data is not available`);
  }

  const mark = references.marks.find(m =>
    m.name === markName ||
    m.name_ru === markName ||
    m.name_uk === markName
  );

  if (mark) {
    console.log(`✅ Найдена марка: ${markName} -> ID: ${mark.id}`);
    return mark.id;
  }

  // Если не найдена, берем первую доступную марку
  const firstMark = references.marks[0];
  console.log(`⚠️ Марка ${markName} не найдена, используем ${firstMark.name} -> ID: ${firstMark.id}`);
  return firstMark.id;
}

/**
 * Получает ID региона по названию из справочника
 */
async function getRegionIdByName(regionName: string): Promise<number> {
  const references = await getReferenceData();
  const region = references.regions?.find(r => r.name === regionName);

  if (region) {
    console.log(`✅ Найден регион: ${regionName} -> ID: ${region.id}`);
    return region.id;
  }

  // Если не найден, берем первый доступный регион
  const firstRegion = references.regions?.[0];
  if (firstRegion) {
    console.log(`⚠️ Регион ${regionName} не найден, используем ${firstRegion.name} -> ID: ${firstRegion.id}`);
    return firstRegion.id;
  }

  throw new Error(`No regions available in reference data`);
}

/**
 * Получает ID города по названию из справочника (с учетом региона)
 */
async function getCityIdByName(cityName: string, regionId?: number): Promise<number> {
  const references = await getReferenceData();
  let city = references.cities?.find(c => c.name === cityName);

  // Если указан регион, ищем город в этом регионе
  if (regionId && city) {
    const cityInRegion = references.cities?.find(c =>
      c.name === cityName && c.region === regionId
    );
    if (cityInRegion) {
      city = cityInRegion;
    }
  }

  if (city) {
    console.log(`✅ Найден город: ${cityName} -> ID: ${city.id}`);
    return city.id;
  }

  // Если не найден, берем первый доступный город
  const firstCity = references.cities?.[0];
  if (firstCity) {
    console.log(`⚠️ Город ${cityName} не найден, используем ${firstCity.name} -> ID: ${firstCity.id}`);
    return firstCity.id;
  }

  throw new Error(`No cities available in reference data`);
}

// Тестовые данные для создания объявлений (соответствуют структуре бекенда)
const TEST_ADS_DATA: CarAdFormData[] = [
  {
    title: "BMW X5 2020 - премиум кроссовер в отличном состоянии",
    description: "Продается BMW X5 2020 года в идеальном состоянии. Один владелец, полная история обслуживания в официальном дилере. Автомобиль не участвовал в ДТП, все ТО пройдены вовремя. Комплектация: кожаный салон, панорамная крыша, система навигации, камеры кругового обзора.",
    model: "X5",
    price: 55000,
    currency: "USD",
    region: "Київська область",
    city: "Київ",
    seller_type: "private",
    exchange_status: "no_exchange",
    dynamic_fields: {
      year: 2020,
      mileage: 45000,
      fuel_type: "petrol",
      transmission: "automatic",
      body_type: "suv",
      engine_volume: 3.0,
      engine_power: 340,
      drive_type: "awd",
      color: "black",
      condition: "excellent"
    }
  },
  {
    title: "Mercedes-Benz E-Class 2019 - бизнес седан",
    description: "Продается Mercedes-Benz E-Class 2019 года. Автомобиль в отличном техническом состоянии, регулярное обслуживание. Комплектация Avantgarde: кожаный салон, климат-контроль, мультимедийная система MBUX, светодиодные фары.",
    model: "E-Class",
    price: 42000,
    currency: "USD",
    region: "Львівська область",
    city: "Львів",
    seller_type: "dealer",
    exchange_status: "possible_exchange",
    dynamic_fields: {
      year: 2019,
      mileage: 62000,
      fuel_type: "petrol",
      transmission: "automatic",
      body_type: "sedan",
      engine_volume: 2.0,
      engine_power: 245,
      drive_type: "rwd",
      color: "silver",
      condition: "good"
    }
  },
  {
    title: "Toyota Camry 2021 - надежный семейный седан",
    description: "Продается Toyota Camry 2021 года. Автомобиль практически новый, пробег всего 25000 км. Полная комплектация: кожаный салон, система безопасности Toyota Safety Sense 2.0, беспроводная зарядка для телефона.",
    model: "Camry",
    price: 32000,
    currency: "USD",
    region: "Харківська область",
    city: "Харків",
    seller_type: "auto_salon",
    exchange_status: "no_exchange",
    dynamic_fields: {
      year: 2021,
      mileage: 25000,
      fuel_type: "hybrid",
      transmission: "automatic",
      body_type: "sedan",
      engine_volume: 2.5,
      engine_power: 218,
      drive_type: "fwd",
      color: "white",
      condition: "excellent"
    }
  },
  {
    title: "Volkswagen Golf 2018 - компактный хэтчбек",
    description: "Продается Volkswagen Golf 2018 года. Экономичный и надежный автомобиль для города. Комплектация Comfortline: кондиционер, мультимедийная система, парктроник.",
    model: "Golf",
    price: 18500,
    currency: "USD",
    region: "Дніпропетровська область",
    city: "Дніпро",
    seller_type: "private",
    exchange_status: "possible_exchange",
    dynamic_fields: {
      year: 2018,
      mileage: 78000,
      fuel_type: "petrol",
      transmission: "manual",
      body_type: "hatchback",
      engine_volume: 1.4,
      engine_power: 125,
      drive_type: "fwd",
      color: "blue",
      condition: "good"
    }
  },
  {
    title: "Ford Transit 2020 - коммерческий фургон",
    description: "Продается Ford Transit 2020 года. Отличное состояние, использовался для доставки товаров. Грузоподъемность 1.5 тонны, объем кузова 12 м³. Экономичный дизельный двигатель.",
    model: "Transit",
    price: 28000,
    currency: "USD",
    region: "Одеська область",
    city: "Одеса",
    seller_type: "dealer",
    exchange_status: "no_exchange",
    dynamic_fields: {
      year: 2020,
      mileage: 95000,
      fuel_type: "diesel",
      transmission: "manual",
      body_type: "van",
      engine_volume: 2.0,
      engine_power: 130,
      drive_type: "rwd",
      color: "white",
      condition: "good"
    }
  },
  {
    title: "Honda CBR600RR 2019 - спортивный мотоцикл",
    description: "Продается Honda CBR600RR 2019 года. Спортивный мотоцикл в отличном состоянии. Пробег всего 12000 км. Все ТО пройдены, новая резина, свежее масло.",
    model: "CBR600RR",
    price: 8500,
    currency: "USD",
    region: "Київська область",
    city: "Київ",
    seller_type: "private",
    exchange_status: "possible_exchange",
    dynamic_fields: {
      year: 2019,
      mileage: 12000,
      fuel_type: "petrol",
      transmission: "manual",
      body_type: "sport",
      engine_volume: 0.6,
      engine_power: 118,
      drive_type: "rwd",
      color: "red",
      condition: "excellent"
    }
  },
  {
    title: "Audi A4 2017 - премиум седан с пробегом",
    description: "Продается Audi A4 2017 года. Автомобиль в хорошем состоянии, один владелец. Комплектация Premium: кожаный салон, система навигации MMI, ксеноновые фары, парктроник.",
    model: "A4",
    price: 24500,
    currency: "USD",
    region: "Львівська область",
    city: "Львів",
    seller_type: "auto_salon",
    exchange_status: "no_exchange",
    dynamic_fields: {
      year: 2017,
      mileage: 89000,
      fuel_type: "petrol",
      transmission: "automatic",
      body_type: "sedan",
      engine_volume: 2.0,
      engine_power: 190,
      drive_type: "awd",
      color: "gray",
      condition: "good"
    }
  }
];



/**
 * Логинится как пользователь и получает токен
 */
async function loginUser(): Promise<string | null> {
  try {
    console.log('🔐 Logging in user pvs.versia@gmail.com...');

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
      const errorText = await loginResponse.text();
      console.error(`❌ Login failed: ${loginResponse.status} - ${errorText}`);
      return null;
    }

    const loginData = await loginResponse.json();
    const accessToken = loginData.access || loginData.token;

    if (!accessToken) {
      console.error('❌ No access token received');
      return null;
    }

    console.log('✅ Successfully logged in, token received');
    return accessToken;

  } catch (error) {
    console.error('❌ Login error:', error);
    return null;
  }
}



/**
 * Обновляет аккаунт до PREMIUM с токеном авторизации
 */
async function upgradeAccountWithAuth(accountId: number, token: string): Promise<void> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/accounts/${accountId}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_type: 'PREMIUM'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upgrade account: ${response.status} - ${errorText}`);
    }

    console.log(`✅ Account ${accountId} upgraded to PREMIUM`);
  } catch (error) {
    console.error(`❌ Error upgrading account ${accountId}:`, error);
    throw error;
  }
}

/**
 * Создает тестовые объявления через API с логинацией пользователей
 */
export async function createTestAds(count?: number, includeImages: boolean = false, imageTypes: string[] = ['front', 'side'], notificationCallback?: (message: string, type?: 'success' | 'error' | 'info') => void): Promise<{ created: number; details: any[]; totalImages?: number }> {
  const maxCount = count || 10;
  console.log(`🚀 Начинаем создание ${maxCount} тестовых объявлений${includeImages ? ' с изображениями' : ''}...`);

  if (includeImages) {
    console.log('📸 Selected image types:', imageTypes);
    if (imageTypes.length === 0) {
      throw new Error('Image types must be specified when includeImages is true');
    }
  }

  // 1. Получаем список пользователей через суперадмин
  console.log('🔐 Step 1: Getting superadmin token and user list...');
  const superAdminToken = await loginSuperAdmin();
  if (!superAdminToken) {
    throw new Error('Failed to login as superadmin');
  }

  const allUsers = await getAllUsers(superAdminToken);
  if (allUsers.length === 0) {
    throw new Error('No users found in database');
  }

  // Фильтруем активных пользователей
  const activeUsers = allUsers.filter(user => user.email && user.email.includes('@'));
  console.log(`👥 Found ${activeUsers.length} active users for random selection`);

  if (activeUsers.length === 0) {
    throw new Error('No active users found for ad creation');
  }

  const results = [];
  let totalImages = 0;

  // 🎯 Для базовых аккаунтов ограничиваем количество до 1
  const actualMaxCount = maxCount; // Пока оставляем как есть, логику изменим внутри цикла

  // 🚀 АСИНХРОННАЯ ОБРАБОТКА: Создаем все объявления параллельно
  console.log(`🚀 Starting ASYNC generation of ${actualMaxCount} ads...`);

  // Функция для создания одного объявления с рандомным пользователем
  const createSingleAd = async (index: number) => {
    console.log(`🤖 Creating ad ${index + 1}/${maxCount} with random user login...`);

    // 2. Выбираем случайного пользователя для этого объявления
    const randomUser = activeUsers[Math.floor(Math.random() * activeUsers.length)];
    console.log(`👤 Selected random user: ${randomUser.email} (ID: ${randomUser.id})`);

    // 3. Логинимся под выбранным пользователем через frontend API (сохраняет токены в Redis)
    const loginResponse = await fetch(`${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: randomUser.email,
        password: '12345678' // Стандартный пароль для всех пользователей
      })
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      throw new Error(`Login failed for ${randomUser.email}: ${loginResponse.status} - ${errorText}`);
    }

    console.log(`✅ Successfully logged in as ${randomUser.email}, tokens saved to Redis`);

    console.log(`🤖 Generating unique ad ${index + 1}/${maxCount}...`);
    const adData = await AdGeneratorService.generateUniqueAd(index, includeImages, imageTypes);
    console.log(`🔄 Processing ad ${index + 1}/${maxCount}:`, adData.title);

    try {
      console.log(`📝 Создаем объявление ${index + 1}/${maxCount}: ${adData.title}`);
      console.log('📋 Ad data:', JSON.stringify(adData, null, 2));

      // API endpoint теперь сам преобразует строковые значения в ID
      console.log('🔄 Подготавливаем данные для API endpoint...');

      // Используем изображения, сгенерированные в AdGeneratorService
      const generatedImages: string[] = adData.images || [];
      if (generatedImages.length > 0) {
        totalImages += generatedImages.length;
        console.log(`✅ Используем ${generatedImages.length} изображений, сгенерированных LLM:`, generatedImages.map(url => url.substring(0, 80) + '...'));
      } else {
        console.log(`⚠️ Нет изображений для объявления "${adData.title}"`);
      }

      // Подготавливаем данные в формате, который ожидает исправленный API endpoint
      // API endpoint теперь сам преобразует строковые значения в ID
      const formData = {
        // Основная информация (обязательная)
        title: adData.title,
        description: adData.description,
        model: adData.model,
        price: adData.price,
        currency: adData.currency,
        region: adData.region, // Передаем строку, API сам преобразует в ID
        city: adData.city, // Передаем строку, API сам преобразует в ID
        seller_type: adData.seller_type,
        exchange_status: adData.exchange_status,

        // Передаем строковое название марки, API сам преобразует в ID
        brand: adData.mark, // Передаем строковое название

        // Обязательные характеристики автомобиля (для валидации формы)
        year: adData.year,
        mileage: adData.mileage, // Используем mileage вместо mileage_km для совместимости с формой
        mileage_km: adData.mileage, // Также передаем для backend
        engine_volume: adData.engine_volume,
        fuel_type: adData.fuel_type,
        transmission: adData.transmission, // Используем transmission вместо transmission_type для формы
        transmission_type: adData.transmission, // Также передаем для backend
        body_type: adData.body_type,

        // Дополнительные характеристики
        engine_power: adData.dynamic_fields.engine_power,
        drive_type: adData.dynamic_fields.drive_type,
        color: adData.dynamic_fields.color,
        condition: adData.dynamic_fields.condition,
        steering_wheel: 'left',

        // Контактная информация в формате, который ожидает backend
        contacts: [
          {
            type: 'name',
            value: adData.contact_name,
            is_visible: true,
            note: 'Контактное лицо'
          },
          {
            type: 'phone',
            value: adData.phone,
            is_visible: true,
            note: 'Основной телефон'
          }
        ],

        // Динамические поля для совместимости
        dynamic_fields: adData.dynamic_fields,

        // Добавляем изображения, если они есть
        images: generatedImages.length > 0 ? generatedImages : undefined
      };

      // Логируем данные для отладки
      console.log('🔍 Данные для API endpoint:');
      console.log(`  title: ${formData.title ? 'Есть' : 'Нет'} (${formData.title?.length || 0} символов)`);
      console.log(`  description: ${formData.description ? 'Есть' : 'Нет'} (${formData.description?.length || 0} символов)`);
      console.log(`  brand: ${typeof formData.brand} (${formData.brand})`);
      console.log(`  model: ${typeof formData.model} (${formData.model})`);
      console.log(`  year: ${typeof formData.year} (${formData.year})`);
      console.log(`  price: ${typeof formData.price} (${formData.price})`);
      console.log(`  region: ${typeof formData.region} (${formData.region})`);
      console.log(`  city: ${typeof formData.city} (${formData.city})`);
      console.log(`  contacts: ${formData.contacts ? formData.contacts.length : 0} контактов`);
      console.log(`  images: ${formData.images ? formData.images.length : 0} изображений`);

      // 🌐 Создаем объявление через стандартный API endpoint (токены уже в Redis)
      console.log(`🌐 Creating ad through API endpoint as ${randomUser.email}...`);
      console.log('📋 Final form data:', JSON.stringify(formData, null, 2));

      const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
      const response = await fetch(`${frontendUrl}/api/ads/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Ad creation response:', result);

      console.log(`✅ Объявление создано успешно для ${randomUser.email}${generatedImages.length > 0 ? ` с ${generatedImages.length} изображениями` : ''}:`, result);

      // Показываем уведомление о создании объявления
      if (notificationCallback) {
        const successMessage = `✅ Создано: ${adData.title} (${randomUser.email})${generatedImages.length > 0 ? ` (${generatedImages.length} фото)` : ''}`;
        notificationCallback(successMessage, 'success');
      }

      return {
        success: true,
        data: result, // Используем реальный результат вместо mockResult
        title: adData.title,
        user: randomUser.email,
        imagesCount: generatedImages.length
      };

    } catch (error) {
      console.error(`❌ Ошибка создания объявления "${adData.title}":`, error);

      // Преобразуем ошибку в строку для правильной сериализации
      const errorMessage = error instanceof Error ? error.message :
                          typeof error === 'string' ? error :
                          JSON.stringify(error, null, 2);

      // Показываем уведомление об ошибке
      if (notificationCallback) {
        const notificationMessage = `❌ Ошибка: ${adData.title} (${randomUser.email}) - ${errorMessage}`;
        notificationCallback(notificationMessage, 'error');
      }

      return { success: false, error: errorMessage, title: adData.title, user: randomUser.email, imagesCount: 0 };
    }
  };

  // 🚀 ПАРАЛЛЕЛЬНАЯ ОБРАБОТКА: Создаем все объявления одновременно
  const BATCH_SIZE = 3; // Обрабатываем по 3 объявления одновременно для стабильности
  const allResults = [];

  for (let i = 0; i < actualMaxCount; i += BATCH_SIZE) {
    const batch = Array.from({ length: Math.min(BATCH_SIZE, actualMaxCount - i) }, (_, idx) => i + idx);
    console.log(`🚀 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(actualMaxCount/BATCH_SIZE)} (ads ${i + 1}-${Math.min(i + BATCH_SIZE, actualMaxCount)})`);

    // Создаем промисы для текущего батча
    const batchPromises = batch.map(index => createSingleAd(index));

    // Ждем завершения всех объявлений в батче
    const batchResults = await Promise.allSettled(batchPromises);

    // Обрабатываем результаты
    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        allResults.push(result.value);
        if (result.value.success && result.value.imagesCount) {
          totalImages += result.value.imagesCount;
        }
      } else {
        console.error(`❌ Promise rejected for ad ${batch[idx] + 1}:`, result.reason);
        allResults.push({ success: false, error: result.reason, title: `Ad ${batch[idx] + 1}`, imagesCount: 0 });
      }
    });

    // Пауза между батчами
    if (i + BATCH_SIZE < actualMaxCount) {
      console.log(`⏳ Waiting before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Выводим итоговую статистику
  const successful = allResults.filter(r => r.success).length;
  const failed = allResults.filter(r => !r.success).length;

  console.log('\n📊 ИТОГИ АСИНХРОННОГО СОЗДАНИЯ ТЕСТОВЫХ ОБЪЯВЛЕНИЙ:');
  console.log(`✅ Успешно создано: ${successful}`);
  console.log(`❌ Ошибок: ${failed}`);
  console.log(`📝 Всего попыток: ${allResults.length}`);
  console.log(`👥 Использовано пользователей: ${activeUsers.length}`);
  console.log(`🖼️ Всего изображений: ${totalImages}`);
  console.log(`🚀 Использована асинхронная обработка с батчами по ${BATCH_SIZE}`);
  console.log(`🎲 Рандомный выбор пользователей для каждого объявления`);

  if (failed > 0) {
    console.log('\n❌ Объявления с ошибками:');
    allResults.filter(r => !r.success).forEach(r => {
      console.log(`- ${r.title} (${r.user}): ${r.error}`);
    });
  }

  if (successful > 0) {
    console.log('\n✅ Успешно созданные объявления:');
    allResults.filter(r => r.success).forEach(r => {
      console.log(`- ${r.title} (ID: ${r.data?.data?.id || r.data?.id}) by ${r.user} - ${r.imagesCount} изображений`);
    });
  }

  return {
    created: successful,
    totalImages: totalImages,
    details: allResults
  };
}

/**
 * Очищает все тестовые объявления
 */
export async function cleanupTestAds(): Promise<{ deleted: number; errors: string[] }> {
  console.log('🗑️ Starting cleanup of all test ads...');

  try {
    // Используем новый рабочий endpoint для реального удаления
    const cleanupResponse = await fetch('/api/autoria/test-ads/cleanup-real', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!cleanupResponse.ok) {
      const errorText = await cleanupResponse.text();
      throw new Error(`Real cleanup failed: ${cleanupResponse.status} - ${errorText}`);
    }

    const result = await cleanupResponse.json();
    console.log(`🎯 REAL cleanup completed: ${result.deleted} ads deleted out of ${result.total_found} found`);

    return {
      deleted: result.deleted || 0,
      errors: result.errors || []
    };

  } catch (error) {
    console.error('❌ Error in cleanup function:', error);
    return { deleted: 0, errors: [error instanceof Error ? error.message : String(error)] };
  }
}



/**
 * Генерирует данные объявления в формате CarAdFormData (как в форме)
 * Использует ту же логику, что и кнопка "Quick" в форме
 */
async function generateCarAdFormData(index: number): Promise<CarAdFormData> {
  console.log(`[generateCarAdFormData] 🎲 Generating cascading mock data for ad ${index}...`);

  // Используем ту же функцию, что и кнопка "Quick" в форме
  const mockData = await generateFullMockData();
  console.log(`[generateCarAdFormData] ✅ Generated cascading data:`, {
    vehicle_type: mockData.vehicle_type,
    brand: mockData.brand,
    model: mockData.model,
    region: mockData.region,
    city: mockData.city,
    exchange_status: mockData.exchange_status // ОТЛАДКА
  });

  // Добавляем уникальные элементы для каждого объявления
  const uniqueTitle = `${mockData.title || 'Автомобиль'} #${index + 1}`;
  const uniqueDescription = `${mockData.description || 'Отличное состояние'} - объявление ${index + 1}`;

  const formData: CarAdFormData = {
    ...mockData,
    title: uniqueTitle,
    description: uniqueDescription,
    // Убеждаемся, что обязательные поля заполнены
    use_profile_contacts: true,
    status: 'active',
    tags: ['demo', 'generated', `batch-${Date.now()}`],

    // ПРИНУДИТЕЛЬНО устанавливаем правильное значение exchange_status
    exchange_status: mockData.exchange_status === 'no' ? 'no_exchange' : (mockData.exchange_status || 'no_exchange'),

    // Метаданные
    metadata: {
      generated: true,
      generated_at: new Date().toISOString(),
      generator_version: '3.0',
      source: 'quick_generator'
    }
  };

  console.log(`[generateCarAdFormData] ✅ Final form data for ad ${index}:`, {
    title: formData.title,
    brand: formData.brand,
    model: formData.model,
    price: formData.price,
    region: formData.region,
    city: formData.city,
    exchange_status: formData.exchange_status // ОТЛАДКА
  });

  return formData;
}

/**
 * Новая упрощенная функция создания тестовых объявлений
 * Использует прямой API вызов как в форме создания
 */
export async function createTestAdsSimple(
  count: number = 3,
  includeImages: boolean = false,
  imageTypes: string[] = ['front', 'side'],
  options?: { baseUrl?: string }
): Promise<{ created: number; totalImages: number; details: any[] }> {
  console.log(`🚀 Creating ${count} test ads using ready API endpoint...`);

  const results = [];
  let totalImages = 0;

  for (let i = 0; i < count; i++) {
    try {
      console.log(`📝 Generating ad ${i + 1}/${count}...`);

      // Генерируем данные объявления используя ту же логику что и кнопка Quick
      const formData = await generateCarAdFormData(i);
      console.log(`🔍 Generated form data for ad ${i + 1}:`, {
        title: formData.title,
        brand: formData.brand,
        model: formData.model,
        price: formData.price,
        region: formData.region,
        city: formData.city
      });

      // Создаем объявление через API endpoint (как делает форма)
      console.log(`🌐 Creating ad ${i + 1} through API endpoint...`);
      console.log(`🔍 DEBUG: Sending formData.exchange_status = "${formData.exchange_status}"`);
      const response = await fetch(`${options?.baseUrl ?? ''}/api/autoria/cars/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const createdAd = await response.json();
      console.log(`✅ Created ad ${i + 1}: ${formData.title} (ID: ${createdAd.id || createdAd.data?.id})`);

      // Генерируем изображения если нужно
      if (includeImages && (createdAd.id || createdAd.data?.id)) {
        try {
          const adId = createdAd.id || createdAd.data?.id;
          console.log(`🎨 Generating images for ad ${adId}...`);

          // Используем исправленный API с правильными данными о типе транспорта
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
          const imageResponse = await fetch(`${backendUrl}/api/chat/generate-car-images/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              car_data: {
                brand: formData.brand,
                model: formData.model,
                year: formData.year,
                color: formData.color,
                body_type: formData.body_type,
                vehicle_type: formData.vehicle_type || 'car',
                vehicle_type_name: formData.vehicle_type_name || formData.vehicle_type,
                condition: formData.condition || 'good',
                description: formData.description || ''
              },
              angles: imageTypes,
              style: "realistic"
            })
          });

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            if (imageData.images && imageData.images.length > 0) {
              totalImages += imageData.images.length;
              console.log(`✅ Generated ${imageData.images.length} images for ad ${adId}`);
            }
          }
        } catch (imageError) {
          console.warn(`⚠️ Failed to generate images for ad:`, imageError);
        }
      }

      results.push({
        success: true,
        data: createdAd,
        title: formData.title,
        imagesCount: includeImages ? imageTypes.length : 0
      });

    } catch (error) {
      console.error(`❌ Failed to create ad ${i + 1}:`, error);
      results.push({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        title: `Ad ${i + 1}`,
        imagesCount: 0
      });
    }
  }

  const successful = results.filter(r => r.success).length;
  console.log(`📊 Created ${successful}/${count} test ads with ${totalImages} total images`);

  return {
    created: successful,
    totalImages,
    details: results
  };
}

export default { createTestAds, createTestAdsSimple, cleanupTestAds };
