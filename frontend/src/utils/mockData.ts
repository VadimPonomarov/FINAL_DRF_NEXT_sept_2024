/**
 * Утилиты для генерации мокковых данных для форм объявлений
 */

import { CarAdFormData, Contact } from '@/types/autoria';

// Функция для получения базового URL для серверных запросов
const getBaseUrl = () => {
  // В серверном контексте используем localhost:3000
  if (typeof window === 'undefined') {
    return 'http://localhost:3000';
  }
  // В клиентском контексте используем относительные URL
  return '';
};

// Типизированные данные по типам транспорта
const VEHICLE_TYPE_SPECS = {
  // Легковые автомобили
  car: {
    brands: ['BMW', 'Mercedes-Benz', 'Audi', 'Toyota', 'Honda', 'Volkswagen', 'Ford', 'Hyundai', 'Nissan', 'Mazda'],
    models: {
      'BMW': ['X5', 'X3', '3 Series', '5 Series', 'X1', 'X6', '7 Series', 'i3', 'i8'],
      'Mercedes-Benz': ['C-Class', 'E-Class', 'GLC', 'GLE', 'A-Class', 'S-Class', 'CLA', 'GLA'],
      'Audi': ['A4', 'A6', 'Q5', 'Q7', 'A3', 'Q3', 'A8', 'TT', 'e-tron'],
      'Toyota': ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Prius', 'Land Cruiser', 'Avalon', 'C-HR'],
      'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Fit', 'HR-V', 'Insight', 'Passport'],
      'Volkswagen': ['Golf', 'Passat', 'Tiguan', 'Jetta', 'Atlas', 'Arteon', 'ID.4', 'Touareg'],
      'Ford': ['Focus', 'Escape', 'Explorer', 'Mustang', 'Edge', 'Fusion', 'EcoSport', 'Bronco'],
      'Hyundai': ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Accent', 'Kona', 'Genesis', 'Ioniq'],
      'Nissan': ['Altima', 'Sentra', 'Rogue', 'Murano', 'Maxima', 'Pathfinder', 'Leaf', '370Z'],
      'Mazda': ['Mazda3', 'Mazda6', 'CX-5', 'CX-9', 'MX-5', 'CX-3', 'CX-30', 'CX-50']
    },
    bodyTypes: ['sedan', 'hatchback', 'suv', 'wagon', 'coupe', 'convertible', 'crossover'],
    fuelTypes: ['gasoline', 'diesel', 'hybrid', 'electric', 'gas'],
    transmissions: ['manual', 'automatic', 'cvt', 'robot'],
    engineVolumes: { min: 1.0, max: 6.0 },
    enginePowers: { min: 100, max: 500 },
    driveTypes: ['front', 'rear', 'all'],
    colors: ['black', 'white', 'silver', 'gray', 'blue', 'red', 'green', 'brown', 'yellow', 'orange'],
    conditions: ['new', 'used', 'damaged']
  },

  // Грузовые автомобили
  truck: {
    brands: ['MAN', 'Volvo', 'Scania', 'Mercedes-Benz', 'DAF', 'Iveco', 'Renault', 'Kamaz'],
    models: {
      'MAN': ['TGX', 'TGS', 'TGL', 'TGM', 'TGE'],
      'Volvo': ['FH', 'FM', 'FE', 'FL', 'VNL'],
      'Scania': ['R-Series', 'S-Series', 'P-Series', 'G-Series'],
      'Mercedes-Benz': ['Actros', 'Arocs', 'Atego', 'Antos', 'Econic'],
      'DAF': ['XF', 'CF', 'LF', 'XG', 'XD'],
      'Iveco': ['Stralis', 'Trakker', 'Eurocargo', 'Daily'],
      'Renault': ['T-Series', 'C-Series', 'K-Series', 'D-Series'],
      'Kamaz': ['5490', '65206', '4308', '53605', '6520']
    },
    bodyTypes: ['truck', 'semi-truck', 'dump_truck', 'flatbed', 'box_truck', 'tanker'],
    fuelTypes: ['diesel', 'gas', 'electric'],
    transmissions: ['manual', 'automatic', 'robot'],
    engineVolumes: { min: 6.0, max: 16.0 },
    enginePowers: { min: 200, max: 800 },
    driveTypes: ['rear', 'all'],
    colors: ['white', 'blue', 'red', 'yellow', 'green', 'orange', 'gray'],
    conditions: ['new', 'used', 'damaged']
  },

  // Мотоциклы
  motorcycle: {
    brands: ['Yamaha', 'Honda', 'Kawasaki', 'Suzuki', 'Ducati', 'BMW', 'Harley-Davidson', 'KTM'],
    models: {
      'Yamaha': ['YZF-R1', 'YZF-R6', 'MT-07', 'MT-09', 'XSR700', 'Tenere 700'],
      'Honda': ['CBR1000RR', 'CBR600RR', 'CB650R', 'CRF1100L', 'Africa Twin', 'Gold Wing', 'Rebel 500'],
      'Kawasaki': ['Ninja ZX-10R', 'Ninja 650', 'Z900', 'Versys 650', 'Vulcan S'],
      'Suzuki': ['GSX-R1000', 'GSX-R600', 'SV650', 'V-Strom 650', 'Hayabusa'],
      'Ducati': ['Panigale V4', 'Monster 821', 'Multistrada V4', 'Scrambler', 'Diavel'],
      'BMW': ['S1000RR', 'R1250GS', 'F850GS', 'R nineT', 'C400X'],
      'Harley-Davidson': ['Street Glide', 'Road King', 'Sportster', 'Fat Boy', 'Iron 883'],
      'KTM': ['1290 Super Duke', '390 Duke', '790 Adventure', 'RC 390', '1090 Adventure']
    },
    bodyTypes: ['sport', 'cruiser', 'touring', 'adventure', 'naked', 'scooter'],
    fuelTypes: ['gasoline', 'electric'],
    transmissions: ['manual', 'automatic'],
    engineVolumes: { min: 0.1, max: 2.0 },
    enginePowers: { min: 15, max: 200 },
    driveTypes: ['rear'],
    colors: ['black', 'white', 'red', 'blue', 'yellow', 'orange', 'green'],
    conditions: ['new', 'used', 'damaged']
  },

  // Автобусы
  bus: {
    brands: ['Mercedes-Benz', 'Volvo', 'MAN', 'Scania', 'Iveco', 'Setra', 'Neoplan', 'Bogdan'],
    models: {
      'Mercedes-Benz': ['Sprinter', 'Tourismo', 'Citaro', 'Conecto'],
      'Volvo': ['9700', '9900', '7900', 'B8R'],
      'MAN': ['Lion\'s Coach', 'Lion\'s City', 'Lion\'s Intercity'],
      'Scania': ['Touring', 'Citywide', 'Interlink'],
      'Iveco': ['Crossway', 'Evadys', 'Urbanway'],
      'Setra': ['S 516', 'S 515', 'S 431'],
      'Neoplan': ['Tourliner', 'Cityliner', 'Skyliner'],
      'Bogdan': ['A092', 'A301', 'A144']
    },
    bodyTypes: ['city_bus', 'intercity_bus', 'school_bus', 'minibus', 'coach'],
    fuelTypes: ['diesel', 'gas', 'electric', 'hybrid'],
    transmissions: ['automatic', 'manual'],
    engineVolumes: { min: 4.0, max: 12.0 },
    enginePowers: { min: 150, max: 500 },
    driveTypes: ['rear', 'all'],
    colors: ['white', 'blue', 'yellow', 'red', 'green'],
    conditions: ['new', 'used', 'damaged']
  },

  // Фургоны
  van: {
    brands: ['Mercedes-Benz', 'Ford', 'Volkswagen', 'Iveco', 'Renault', 'Peugeot', 'Fiat'],
    models: {
      'Mercedes-Benz': ['Sprinter', 'Vito', 'Metris', 'eSprinter'],
      'Ford': ['Transit', 'Transit Connect', 'E-Transit'],
      'Volkswagen': ['Crafter', 'Caddy', 'ID.Buzz'],
      'Iveco': ['Daily', 'eDaily'],
      'Renault': ['Master', 'Trafic', 'Kangoo'],
      'Peugeot': ['Boxer', 'Expert', 'Partner'],
      'Fiat': ['Ducato', 'Scudo', 'Doblo']
    },
    bodyTypes: ['van', 'minivan', 'cargo_van', 'passenger_van'],
    fuelTypes: ['diesel', 'gasoline', 'electric', 'hybrid'],
    transmissions: ['manual', 'automatic'],
    engineVolumes: { min: 1.5, max: 3.0 },
    enginePowers: { min: 90, max: 200 },
    driveTypes: ['front', 'rear', 'all'],
    colors: ['white', 'silver', 'gray', 'blue', 'red'],
    conditions: ['new', 'used', 'damaged']
  },

  // Прицепы / полуприцепы
  trailer: {
    brands: ['Schmitz Cargobull', 'Krone', 'Kögel', 'Wielton', 'Kässbohrer', 'Fliegl', 'Bodex', 'Langendorf', 'MAN'],
    models: {
      'Schmitz Cargobull': ['Curtainsider', 'Refrigerated', 'Tipper', 'Platform'],
      'Krone': ['Curtainsider', 'Refrigerated', 'Box', 'Flatbed'],
      'Kögel': ['Curtainsider', 'Refrigerated', 'Box'],
      'Wielton': ['Curtainsider', 'Tipper', 'Lowboy'],
      'Kässbohrer': ['Curtainsider', 'Lowbed', 'Tank'],
      'Fliegl': ['Curtainsider', 'Flatbed', 'Tanker'],
      'Bodex': ['Tipper', 'Curtainsider'],
      'Langendorf': ['Lowboy', 'Tipper']
    },
    bodyTypes: ['curtainsider', 'refrigerated', 'flatbed', 'tipper', 'lowboy', 'box'],
    fuelTypes: ['none'],
    transmissions: ['none'],
    engineVolumes: { min: 0.0, max: 0.0 },
    enginePowers: { min: 0, max: 0 },
    driveTypes: ['none'],
    colors: ['white', 'blue', 'gray', 'red'],
    conditions: ['new', 'used']
  }
};

// Мокковые данные для разных категорий (оставляем для обратной совместимости)
const MOCK_DATA = {
  // Характеристики автомобилей (legacy)
  specs: {
    brands: ['BMW', 'Mercedes-Benz', 'Audi', 'Toyota', 'Honda', 'Volkswagen', 'Ford', 'Hyundai'],
    models: {
      'BMW': ['X5', 'X3', '3 Series', '5 Series', 'X1', 'X6'],
      'Mercedes-Benz': ['C-Class', 'E-Class', 'GLC', 'GLE', 'A-Class', 'S-Class'],
      'Audi': ['A4', 'A6', 'Q5', 'Q7', 'A3', 'Q3'],
      'Toyota': ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Prius', 'Land Cruiser'],
      'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Fit', 'HR-V'],
      'Volkswagen': ['Golf', 'Passat', 'Tiguan', 'Jetta', 'Atlas', 'Arteon'],
      'Ford': ['Focus', 'Escape', 'Explorer', 'F-150', 'Mustang', 'Edge'],
      'Hyundai': ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Accent', 'Kona']
    },
    years: [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015],
    fuelTypes: ['gasoline', 'diesel', 'hybrid', 'electric', 'gas'],
    transmissions: ['manual', 'automatic', 'cvt', 'robot'],
    bodyTypes: ['sedan', 'hatchback', 'suv', 'wagon', 'coupe', 'convertible'],
    colors: ['black', 'white', 'silver', 'gray', 'blue', 'red', 'green', 'brown'],
    conditions: ['new', 'used', 'damaged']
  },

  // Ценообразование
  pricing: {
    currencies: ['USD', 'EUR', 'UAH'],
    priceRanges: {
      'USD': { min: 5000, max: 80000 },
      'EUR': { min: 4500, max: 75000 },
      'UAH': { min: 200000, max: 3000000 }
    }
  },

  // Местоположение (примерные данные)
  locations: {
    regions: ['Київська', 'Харківська', 'Одеська', 'Дніпропетровська', 'Львівська', 'Запорізька'],
    cities: {
      'Київська': ['Київ', 'Біла Церква', 'Бровари', 'Ірпінь', 'Буча'],
      'Харківська': ['Харків', 'Лозова', 'Ізюм', 'Куп\'янськ', 'Чугуїв'],
      'Одеська': ['Одеса', 'Чорноморськ', 'Южне', 'Білгород-Дністровський', 'Ізмаїл'],
      'Дніпропетровська': ['Дніпро', 'Кривий Ріг', 'Кам\'янське', 'Нікополь', 'Новомосковськ'],
      'Львівська': ['Львів', 'Дрогобич', 'Червоноград', 'Стрий', 'Самбір'],
      'Запорізька': ['Запоріжжя', 'Мелітополь', 'Бердянськ', 'Енергодар', 'Токмак']
    }
  },

  // Контакты
  contacts: {
    names: ['Олександр', 'Марія', 'Дмитро', 'Анна', 'Сергій', 'Олена', 'Андрій', 'Тетяна'],
    phoneFormats: ['+380', '+380', '+380'], // Украинские номера
    contactTypes: ['phone', 'email', 'telegram', 'viber']
  },

  // Описания
  descriptions: [
    'Автомобіль в відмінному стані, один власник, повна сервісна історія.',
    'Машина не била, не фарбована, всі ТО пройдені вчасно.',
    'Економічний та надійний автомобіль для щоденного використання.',
    'Повна комплектація, всі опції працюють бездоганно.',
    'Ідеальний стан, гаражне зберігання, некурящий власник.'
  ]
};

/**
 * Нормализует тип транспорта к ключу из VEHICLE_TYPE_SPECS
 */
function normalizeVehicleType(vehicleTypeName: string): string {
  const normalized = vehicleTypeName.toLowerCase().trim();

  // Маппинг различных названий к стандартным ключам
  const typeMapping: { [key: string]: string } = {
    // Легковые автомобили
    'легковой': 'car',
    'легковий': 'car',
    'легковые автомобили': 'car',
    'легкові автомобілі': 'car',
    'автомобиль': 'car',
    'авто': 'car',
    'car': 'car',
    'passenger car': 'car',

    // Грузовые автомобили
    'грузовой': 'truck',
    'грузовик': 'truck',
    'вантажівка': 'truck',
    'грузовые автомобили': 'truck',
    'вантажні автомобілі': 'truck',
    'truck': 'truck',
    'commercial vehicle': 'truck',

    // Мотоциклы
    'мотоцикл': 'motorcycle',
    'мотоцикли': 'motorcycle',
    'motorcycle': 'motorcycle',
    'мопед': 'motorcycle',
    'скутер': 'motorcycle',

    // Автобусы
    'автобус': 'bus',
    'автобуси': 'bus',
    'bus': 'bus',
    'маршрутка': 'bus',

    // Фургоны
    'фургон': 'van',
    'фургони': 'van',
    'van': 'van',
    'минивэн': 'van',
    'мінівен': 'van',
    'minivan': 'van',

    // Прицепы
    'прицеп': 'trailer',
    'полуприцеп': 'trailer',
    'trailer': 'trailer'
  };

  // ❌ FALLBACK DISABLED: No default fallback to 'car'
  const result = typeMapping[normalized];
  if (!result) {
    console.warn(`[MockData] ❌ normalizeVehicleType: Unknown vehicle type '${normalized}', no fallback`);
    return null;
  }
  return result;
}

/**
 * КЛАССИЧЕСКИЙ КАСКАД: Тип → Марка → Модель
 * Выбираем тип транспорта, затем марку из этого типа, затем модель из этой марки
 */



/**
 * Определяет тип транспорта по бренду (эвристики)
 */
function resolveVehicleTypeByBrand(brandName: string): string | null {
  const b = (brandName || '').toLowerCase();
  const truckBrands = ['volvo', 'scania', 'man', 'daf', 'iveco', 'renault', 'kamaz', 'mercedes-benz trucks'];
  const motoBrands = ['yamaha', 'honda', 'kawasaki', 'suzuki', 'ducati', 'harley-davidson', 'ktm', 'bmw'];
  const busBrands = ['setra', 'neoplan', 'bogdan', 'solaris', 'ikarus', 'liaz'];
  const vanBrands = ['sprinter', 'vito', 'transit', 'crafter', 'caddy', 'daily', 'master', 'trafic', 'kangoo', 'boxer', 'partner', 'doblo'];
  const trailerBrands = ['schmitz', 'cargobull', 'krone', 'k\u00f6gel', 'wielton', 'k\u00e4ssbohrer', 'fliegl', 'bodex', 'langendorf', 'man'];

  if (truckBrands.some(x => b.includes(x))) return 'truck';
  if (motoBrands.some(x => b.includes(x))) return 'motorcycle';
  if (busBrands.some(x => b.includes(x))) return 'bus';
  if (trailerBrands.some(x => b.includes(x))) return 'trailer';
  // For vans, brands overlap with car brands; detect by model names later if needed
  return null;
}



/**
 * ОБРАТНЫЙ КАСКАД: Генерация мокковых данных модель->марка->тип
 * Сначала выбираем случайную модель из всех доступных, затем поднимаемся по каскаду связей
 */
export const generateMockSpecs = async (): Promise<Partial<CarAdFormData>> => {
  try {
    console.log('[MockData] 🎲 Generating REVERSE-CASCADE mock specs (Model → Brand → Type)...');

    // НОВЫЙ АЛГОРИТМ: Модель → Марка → Тип (снизу вверх по каскаду)

    // 1. Получаем ВСЕ модели из API (без фильтрации)
    let allModels = [];
    let retryCount = 0;
    while (allModels.length === 0 && retryCount < 3) {
      const modelsResponse = await fetch(`${getBaseUrl()}/api/public/reference/models?page_size=1000`);
      const modelsData = await modelsResponse.json();
      allModels = modelsData.options || [];
      if (allModels.length === 0) {
        console.warn(`[MockData] ⚠️ No models found, retry ${retryCount + 1}/3`);
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (allModels.length === 0) {
      throw new Error('No models found after 3 retries');
    }

    // Выбираем случайную модель из ВСЕХ доступных
    const selectedModel = allModels[Math.floor(Math.random() * allModels.length)];
    console.log(`[MockData] 🎯 Step 1 - Selected random model: ${selectedModel.label} (ID: ${selectedModel.value})`);

    // 2. Получаем марку для этой модели
    if (!selectedModel.brand_id) {
      throw new Error(`Model ${selectedModel.label} has no brand_id`);
    }

    let selectedBrand = null;
    retryCount = 0;
    while (!selectedBrand && retryCount < 3) {
      const brandsResponse = await fetch(`${getBaseUrl()}/api/public/reference/brands?page_size=1000`);
      const brandsData = await brandsResponse.json();
      const allBrands = brandsData.options || [];

      selectedBrand = allBrands.find((brand: any) => brand.value == selectedModel.brand_id);

      if (!selectedBrand) {
        console.warn(`[MockData] ⚠️ Brand not found for model ${selectedModel.label} (brand_id: ${selectedModel.brand_id}), retry ${retryCount + 1}/3`);
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (!selectedBrand) {
      throw new Error(`Brand not found for model ${selectedModel.label} (brand_id: ${selectedModel.brand_id})`);
    }

    console.log(`[MockData] 🎯 Step 2 - Found brand for model: ${selectedBrand.label} (ID: ${selectedBrand.value})`);

    // 3. Получаем тип транспорта для этой марки
    if (!selectedBrand.vehicle_type_id) {
      throw new Error(`Brand ${selectedBrand.label} has no vehicle_type_id`);
    }

    let selectedVehicleType = null;
    retryCount = 0;
    while (!selectedVehicleType && retryCount < 3) {
      const vehicleTypesResponse = await fetch(`${getBaseUrl()}/api/public/reference/vehicle-types?page_size=100`);
      const vehicleTypesData = await vehicleTypesResponse.json();
      const allVehicleTypes = vehicleTypesData.options || [];

      selectedVehicleType = allVehicleTypes.find((vt: any) => vt.value == selectedBrand.vehicle_type_id);

      if (!selectedVehicleType) {
        console.warn(`[MockData] ⚠️ Vehicle type not found for brand ${selectedBrand.label} (vehicle_type_id: ${selectedBrand.vehicle_type_id}), retry ${retryCount + 1}/3`);
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (!selectedVehicleType) {
      throw new Error(`Vehicle type not found for brand ${selectedBrand.label} (vehicle_type_id: ${selectedBrand.vehicle_type_id})`);
    }

    console.log(`[MockData] 🎯 Step 3 - Found vehicle type for brand: ${selectedVehicleType.label} (ID: ${selectedVehicleType.value})`);

    // 4. ПРОВЕРЯЕМ КАСКАДНУЮ ЦЕЛОСТНОСТЬ (снизу вверх)
    console.log(`[MockData] ✅ REVERSE-CASCADE INTEGRITY CHECK:`);
    console.log(`[MockData] ✅ Model: ${selectedModel.label} (ID: ${selectedModel.value})`);
    console.log(`[MockData] ✅ ↑ Brand: ${selectedBrand.label} (ID: ${selectedBrand.value}) <- model belongs to this brand`);
    console.log(`[MockData] ✅ ↑ Vehicle Type: ${selectedVehicleType.label} (ID: ${selectedVehicleType.value}) <- brand belongs to this type`);

    // 5. Генерируем характеристики БЕЗ ПЕРЕОПРЕДЕЛЕНИЙ
    const year = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015][Math.floor(Math.random() * 10)];
    const mileage = Math.floor(Math.random() * 200000) + 10000;
    const condition = mileage < 5000 ? 'new' : mileage < 50000 ? 'excellent' : mileage < 100000 ? 'good' : 'fair';

    console.log(`[MockData] 🔧 Creating result with REVERSE-CASCADE data - NO OVERRIDES!`);

    const result = {
      // СТРОГО ИСПОЛЬЗУЕМ ДАННЫЕ ИЗ API БЕЗ ИЗМЕНЕНИЙ
      vehicle_type: selectedVehicleType.value,
      vehicle_type_name: selectedVehicleType.label,
      brand: selectedBrand.value,
      brand_name: selectedBrand.label,
      model: selectedModel.label,
      model_name: selectedModel.label,

      year,
      mileage,
      engine_volume: 1.0 + Math.random() * 5.0,
      engine_power: 100 + Math.floor(Math.random() * 400),
      fuel_type: ['petrol', 'diesel', 'hybrid', 'electric', 'gas'][Math.floor(Math.random() * 5)],
      transmission: ['manual', 'automatic', 'cvt', 'robot'][Math.floor(Math.random() * 4)],
      body_type: ['sedan', 'hatchback', 'suv', 'wagon', 'coupe', 'convertible'][Math.floor(Math.random() * 6)],
      drive_type: ['front', 'rear', 'all'][Math.floor(Math.random() * 3)],
      color: ['black', 'white', 'silver', 'gray', 'blue', 'red', 'green'][Math.floor(Math.random() * 7)],
      condition,

      // Ценообразование
      price: 5000 + Math.floor(Math.random() * 95000),
      currency: 'USD',

      // Заголовок и описание
      title: `${selectedBrand.label} ${selectedModel.label} ${year}`,
      description: `Продается ${selectedBrand.label} ${selectedModel.label} ${year} года в ${condition === 'new' ? 'новом' : condition === 'excellent' ? 'отличном' : condition === 'good' ? 'хорошем' : 'рабочем'} состоянии. Пробег ${mileage} км.`,

      // Местоположение (будет заполнено отдельно)
      region: '',
      city: '',
    };

    console.log(`[MockData] ✅ Generated REVERSE-CASCADE specs: ${result.vehicle_type_name} ← ${result.brand_name} ← ${result.model_name}`);
    console.log(`[MockData] 🔍 DETAILED RESULT:`, {
      vehicle_type: result.vehicle_type,
      vehicle_type_name: result.vehicle_type_name,
      brand: result.brand,
      brand_name: result.brand_name,
      model: result.model,
      model_name: result.model_name
    });
    return result;

  } catch (error) {
    console.error('[MockData] ❌ Error generating REVERSE-CASCADE specs:', error);
    console.log('[MockData] 🔄 FALLBACK DISABLED - Retrying with real data...');
    // Повторяем попытку через 1 секунду
    await new Promise(resolve => setTimeout(resolve, 1000));
    return generateMockSpecs();
  }
};

/**
 * FALLBACK DISABLED - функция удалена для принуждения использования реальных данных
 */
const generateFallbackSpecs = (): Partial<CarAdFormData> => {
  throw new Error('[MockData] ❌ FALLBACK DISABLED - Use only real API data');

  // Статичные данные для fallback
  const vehicleTypes = [
    { id: '1', name: 'Легковые автомобили' },
    { id: '2', name: 'Грузовые автомобили' },
    { id: '3', name: 'Мотоциклы' }
  ];

  const brandsData = {
    '1': [ // Легковые автомобили
      { id: '4400', name: 'BMW' },
      { id: '79', name: 'Mercedes-Benz' },
      { id: '28', name: 'Audi' },
      { id: '53', name: 'Toyota' },
      { id: '35', name: 'Honda' }
    ],
    '2': [ // Грузовые автомобили
      { id: '100', name: 'MAN' },
      { id: '101', name: 'Volvo' },
      { id: '102', name: 'Scania' }
    ],
    '3': [ // Мотоциклы
      { id: '90', name: 'Yamaha' },
      { id: '91', name: 'Honda' },
      { id: '92', name: 'Kawasaki' },
      { id: '93', name: 'Suzuki' },
      { id: '94', name: 'Ducati' }
    ]
  };

  const modelsData = {
    // Легковые автомобили
    '4400': ['X5', 'X3', '3 Series', '5 Series', 'X1'], // BMW
    '79': ['C-Class', 'E-Class', 'GLC', 'GLE', 'A-Class'], // Mercedes-Benz
    '28': ['A4', 'A6', 'Q5', 'Q7', 'A3'], // Audi
    '53': ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Prius'], // Toyota
    '35': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Fit'], // Honda

    // Грузовые автомобили
    '100': ['TGX', 'TGS', 'TGL', 'TGM'], // MAN
    '101': ['FH', 'FM', 'FE', 'FL'], // Volvo
    '102': ['R-Series', 'S-Series', 'G-Series', 'P-Series'], // Scania

    // Мотоциклы
    '90': ['YZF-R1', 'YZF-R6', 'MT-07', 'MT-09', 'Tenere'], // Yamaha
    '91': ['CBR1000RR', 'CBR600RR', 'CB650R', 'Africa Twin'], // Honda мотоциклы
    '92': ['Ninja ZX-10R', 'Ninja 650', 'Z900', 'Versys'], // Kawasaki
    '93': ['GSX-R1000', 'GSX-R600', 'SV650', 'V-Strom'], // Suzuki
    '94': ['Panigale V4', 'Monster', 'Multistrada', 'Scrambler'] // Ducati
  };

  // Выбираем случайный тип транспорта
  const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];

  // СТРОГОЕ каскадирование: выбираем марку только из доступных для данного типа
  const availableBrands = brandsData[vehicleType.id];
  if (!availableBrands || availableBrands.length === 0) {
    console.warn(`[MockData] ⚠️ No brands available for vehicle type ${vehicleType.id}, using car type`);
    const carBrands = brandsData['1'];
    const brand = carBrands[Math.floor(Math.random() * carBrands.length)];
    const availableModels = modelsData[brand.id] || ['Model'];
    const model = availableModels[Math.floor(Math.random() * availableModels.length)];

    return {
      ...generateStrictFallbackData('1', brand, model),
      vehicle_type: 1,
      vehicle_type_name: 'Легковые автомобили'
    };
  }

  const brand = availableBrands[Math.floor(Math.random() * availableBrands.length)];

  // СТРОГОЕ каскадирование: выбираем модель только из доступных для данной марки
  const availableModels = modelsData[brand.id];
  if (!availableModels || availableModels.length === 0) {
    console.warn(`[MockData] ⚠️ No models available for brand ${brand.id}, using generic model`);
    return generateStrictFallbackData(vehicleType.id, brand, 'Model');
  }

  const model = availableModels[Math.floor(Math.random() * availableModels.length)];

  return generateStrictFallbackData(vehicleType.id, brand, model);
};

/**
 * Генерирует строгие fallback данные для конкретного типа, марки и модели
 */
const generateStrictFallbackData = (vehicleTypeId: string, brand: any, model: string): Partial<CarAdFormData> => {
  // Определяем тип транспорта для типизированной генерации
  const vehicleTypeName = vehicleTypeId === '1' ? 'Легковые автомобили' :
                         vehicleTypeId === '2' ? 'Грузовые автомобили' :
                         vehicleTypeId === '3' ? 'Мотоциклы' : 'Легковые автомобили';

  const vehicleTypeKey = normalizeVehicleType(vehicleTypeName);
  const typeSpecs = VEHICLE_TYPE_SPECS[vehicleTypeKey] || VEHICLE_TYPE_SPECS.car;

  const year = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015][Math.floor(Math.random() * 10)];

  // Определяем пробег отдельно, чтобы корректировать состояние
  const mileage = Math.floor(Math.random() * 200000) + 10000;
  // Состояние: по умолчанию 'used', 'new' только если пробег < 5000
  const condition = mileage < 5000 ? 'new' : 'used';

  return {
    // Связанные поля с правильными ID и названиями
    vehicle_type: parseInt(vehicleTypeId) || vehicleTypeId, // Преобразуем в число
    vehicle_type_name: vehicleTypeName,
    brand: parseInt(brand.id) || brand.id, // Преобразуем в число
    brand_name: brand.name,
    model: model,

    // Типизированные характеристики
    year,
    mileage,
    engine_volume: Math.round((Math.random() * (typeSpecs.engineVolumes.max - typeSpecs.engineVolumes.min) + typeSpecs.engineVolumes.min) * 10) / 10,
    engine_power: Math.floor(Math.random() * (typeSpecs.enginePowers.max - typeSpecs.enginePowers.min)) + typeSpecs.enginePowers.min,
    fuel_type: typeSpecs.fuelTypes[Math.floor(Math.random() * typeSpecs.fuelTypes.length)],
    transmission: typeSpecs.transmissions[Math.floor(Math.random() * typeSpecs.transmissions.length)],
    body_type: typeSpecs.bodyTypes[Math.floor(Math.random() * typeSpecs.bodyTypes.length)],
    drive_type: typeSpecs.driveTypes[Math.floor(Math.random() * typeSpecs.driveTypes.length)],
    color: typeSpecs.colors[Math.floor(Math.random() * typeSpecs.colors.length)],
    condition,
    title: `${brand.name} ${model} ${year}`,
    description: MOCK_DATA.descriptions[Math.floor(Math.random() * MOCK_DATA.descriptions.length)]
  };
};

/**
 * Генерує мокковые данные для ценообразования
 */
export const generateMockPricing = (): Partial<CarAdFormData> => {
  const currency = MOCK_DATA.pricing.currencies[Math.floor(Math.random() * MOCK_DATA.pricing.currencies.length)];
  const priceRange = MOCK_DATA.pricing.priceRanges[currency];
  const price = Math.floor(Math.random() * (priceRange.max - priceRange.min)) + priceRange.min;

  return {
    price,
    currency
  };
};

/**
 * Генерує мокковые данные для местоположения с использованием реальных API
 */
export const generateMockLocation = async (): Promise<Partial<CarAdFormData>> => {
  try {
    console.log('[MockData] 🌍 Generating cascading location data...');

    // 1. Получаем случайный регион
    const regionsResponse = await fetch(`${getBaseUrl()}/api/public/reference/regions?page_size=50`);
    const regionsData = await regionsResponse.json();
    const regions = regionsData.options || [];

    if (regions.length === 0) {
      console.warn('[MockData] ⚠️ No regions found, retrying...');
      await new Promise(resolve => setTimeout(resolve, 500));
      return generateMockLocation();
    }

    const region = regions[Math.floor(Math.random() * regions.length)];
    console.log('[MockData] 🏛️ Selected region:', region);

    // 2. Получаем случайный город для выбранного региона
    const citiesResponse = await fetch(`${getBaseUrl()}/api/public/reference/cities?region_id=${region.value}&page_size=50`);
    const citiesData = await citiesResponse.json();
    const cities = citiesData.options || [];

    if (cities.length === 0) {
      console.warn('[MockData] ⚠️ No cities found for region, retrying...');
      await new Promise(resolve => setTimeout(resolve, 500));
      return generateMockLocation();
    }

    const city = cities[Math.floor(Math.random() * cities.length)];
    console.log('[MockData] 🏙️ Selected city:', city);

    const result = {
      region: region.value,
      city: city.value,
      region_name: region.label,
      city_name: city.label
    };

    console.log('[MockData] ✅ Generated cascading location:', result);
    return result;

  } catch (error) {
    console.error('[MockData] ❌ Error generating cascading location:', error);
    console.log('[MockData] 🔄 FALLBACK DISABLED - Retrying location with real data...');
    // Повторяем попытку через 1 секунду
    await new Promise(resolve => setTimeout(resolve, 1000));
    return generateMockLocation();
  }
};

/**
 * FALLBACK DISABLED - функция удалена для принуждения использования реальных данных
 */
const generateFallbackLocation = (): Partial<CarAdFormData> => {
  throw new Error('[MockData] ❌ FALLBACK DISABLED - Use only real API data');

  // Статичные данные для fallback с числовыми ID
  const regions = [
    { id: 203, name: 'Київська' },
    { id: 204, name: 'Харківська' },
    { id: 205, name: 'Одеська' },
    { id: 206, name: 'Дніпропетровська' }
  ];

  const cities = [
    { id: 1142, name: 'Київ' },
    { id: 1143, name: 'Харків' },
    { id: 1144, name: 'Одеса' },
    { id: 1145, name: 'Дніпро' }
  ];

  const region = regions[Math.floor(Math.random() * regions.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];

  return {
    region: region.id,
    city: city.id,
    region_name: region.name,
    city_name: city.name
  };
};

/**
 * Генерує мокковые контакты
 */
export const generateMockContacts = (): Contact[] => {
  const name = MOCK_DATA.contacts.names[Math.floor(Math.random() * MOCK_DATA.contacts.names.length)];
  const phoneNumber = `+380${Math.floor(Math.random() * 900000000) + 100000000}`;

  return [
    {
      type: 'phone',
      value: phoneNumber,
      is_visible: true,
      note: `Контакт: ${name}`
    }
  ];
};

/**
 * Генерує мокковые данные для метаданных с учетом типа транспорта
 */
export const generateMockMetadata = (vehicleType?: string, vehicleSpecs?: any): Partial<CarAdFormData> => {
  const vType = vehicleType || 'car';
  const specs = vehicleSpecs || VEHICLE_TYPE_SPECS[vType] || VEHICLE_TYPE_SPECS.car;

  // Генерируем характеристики в зависимости от типа транспорта
  let metadata: Partial<CarAdFormData> = {
    license_plate: `AA${Math.floor(Math.random() * 9000) + 1000}BB`,
    seller_type: 'private',
    exchange_status: ['no_exchange', 'possible', 'only_exchange'][Math.floor(Math.random() * 3)],
    is_urgent: Math.random() > 0.8,
    is_highlighted: Math.random() > 0.9,
    additional_info: 'Додаткова інформація згенерована автоматично для тестування.'
  };

  // Специфичные характеристики по типам транспорта
  switch (vType) {
    case 'car':
      metadata = {
        ...metadata,
        number_of_doors: Math.floor(Math.random() * 3) + 3, // 3-5 дверей
        number_of_seats: Math.floor(Math.random() * 4) + 4, // 4-7 мест
        fuel_type: specs.fuelTypes[Math.floor(Math.random() * specs.fuelTypes.length)],
        transmission: specs.transmissions[Math.floor(Math.random() * specs.transmissions.length)],
        body_type: specs.bodyTypes[Math.floor(Math.random() * specs.bodyTypes.length)],
        drive_type: specs.driveTypes[Math.floor(Math.random() * specs.driveTypes.length)],
        engine_volume: Math.round((Math.random() * (specs.engineVolumes.max - specs.engineVolumes.min) + specs.engineVolumes.min) * 10) / 10,
        engine_power: Math.floor(Math.random() * (specs.enginePowers.max - specs.enginePowers.min)) + specs.enginePowers.min
      };
      break;

    case 'truck':
      metadata = {
        ...metadata,
        number_of_doors: 2, // Обычно 2 двери у грузовиков
        number_of_seats: Math.floor(Math.random() * 2) + 2, // 2-3 места
        fuel_type: specs.fuelTypes[Math.floor(Math.random() * specs.fuelTypes.length)],
        transmission: specs.transmissions[Math.floor(Math.random() * specs.transmissions.length)],
        body_type: specs.bodyTypes[Math.floor(Math.random() * specs.bodyTypes.length)],
        drive_type: specs.driveTypes[Math.floor(Math.random() * specs.driveTypes.length)],
        engine_volume: Math.round((Math.random() * (specs.engineVolumes.max - specs.engineVolumes.min) + specs.engineVolumes.min) * 10) / 10,
        engine_power: Math.floor(Math.random() * (specs.enginePowers.max - specs.enginePowers.min)) + specs.enginePowers.min,
        load_capacity: Math.floor(Math.random() * 20) + 5 // 5-25 тонн
      };
      break;

    case 'motorcycle':
      metadata = {
        ...metadata,
        number_of_doors: 0, // У мотоциклов нет дверей
        number_of_seats: Math.floor(Math.random() * 2) + 1, // 1-2 места
        fuel_type: specs.fuelTypes[Math.floor(Math.random() * specs.fuelTypes.length)],
        transmission: specs.transmissions[Math.floor(Math.random() * specs.transmissions.length)],
        body_type: specs.bodyTypes[Math.floor(Math.random() * specs.bodyTypes.length)],
        drive_type: 'rear', // У мотоциклов всегда задний привод
        engine_volume: Math.round((Math.random() * (specs.engineVolumes.max - specs.engineVolumes.min) + specs.engineVolumes.min) * 100) / 100,
        engine_power: Math.floor(Math.random() * (specs.enginePowers.max - specs.enginePowers.min)) + specs.enginePowers.min
      };
      break;

    case 'bus':
      metadata = {
        ...metadata,
        number_of_doors: Math.floor(Math.random() * 3) + 2, // 2-4 двери
        number_of_seats: Math.floor(Math.random() * 40) + 20, // 20-60 мест
        fuel_type: specs.fuelTypes[Math.floor(Math.random() * specs.fuelTypes.length)],
        transmission: specs.transmissions[Math.floor(Math.random() * specs.transmissions.length)],
        body_type: specs.bodyTypes[Math.floor(Math.random() * specs.bodyTypes.length)],
        drive_type: specs.driveTypes[Math.floor(Math.random() * specs.driveTypes.length)],
        engine_volume: Math.round((Math.random() * (specs.engineVolumes.max - specs.engineVolumes.min) + specs.engineVolumes.min) * 10) / 10,
        engine_power: Math.floor(Math.random() * (specs.enginePowers.max - specs.enginePowers.min)) + specs.enginePowers.min
      };
      break;

    case 'van':
      metadata = {
        ...metadata,
        number_of_doors: Math.floor(Math.random() * 2) + 3, // 3-4 двери
        number_of_seats: Math.floor(Math.random() * 6) + 2, // 2-8 мест
        fuel_type: specs.fuelTypes[Math.floor(Math.random() * specs.fuelTypes.length)],
        transmission: specs.transmissions[Math.floor(Math.random() * specs.transmissions.length)],
        body_type: specs.bodyTypes[Math.floor(Math.random() * specs.bodyTypes.length)],
        drive_type: specs.driveTypes[Math.floor(Math.random() * specs.driveTypes.length)],
        engine_volume: Math.round((Math.random() * (specs.engineVolumes.max - specs.engineVolumes.min) + specs.engineVolumes.min) * 10) / 10,
        engine_power: Math.floor(Math.random() * (specs.enginePowers.max - specs.enginePowers.min)) + specs.enginePowers.min
      };
      break;

    default:
      // Fallback к легковому автомобилю
      const carSpecs = VEHICLE_TYPE_SPECS.car;
      metadata = {
        ...metadata,
        number_of_doors: Math.floor(Math.random() * 3) + 3,
        number_of_seats: Math.floor(Math.random() * 4) + 4,
        fuel_type: carSpecs.fuelTypes[Math.floor(Math.random() * carSpecs.fuelTypes.length)],
        transmission: carSpecs.transmissions[Math.floor(Math.random() * carSpecs.transmissions.length)],
        body_type: carSpecs.bodyTypes[Math.floor(Math.random() * carSpecs.bodyTypes.length)],
        drive_type: carSpecs.driveTypes[Math.floor(Math.random() * carSpecs.driveTypes.length)],
        engine_volume: Math.round((Math.random() * (carSpecs.engineVolumes.max - carSpecs.engineVolumes.min) + carSpecs.engineVolumes.min) * 10) / 10,
        engine_power: Math.floor(Math.random() * (carSpecs.enginePowers.max - carSpecs.enginePowers.min)) + carSpecs.enginePowers.min
      };
  }

  return metadata;
};

/**
 * Генерує полный набор мокковых данных с поддержкой каскадных селектов
 */
export const generateFullMockData = async (): Promise<Partial<CarAdFormData>> => {
  try {
    console.log('[MockData] 🎲 Generating full cascading mock data...');

    // Генерируем данные параллельно для ускорения
    const [specs, location] = await Promise.all([
      generateMockSpecs(),
      generateMockLocation()
    ]);

    const pricing = generateMockPricing();

    // Передаем тип транспорта в generateMockMetadata для типизированной генерации
    const vehicleTypeKey = normalizeVehicleType(specs.vehicle_type_name || '');
    const typeSpecs = VEHICLE_TYPE_SPECS[vehicleTypeKey] || VEHICLE_TYPE_SPECS.car;
    const metadata = generateMockMetadata(vehicleTypeKey, typeSpecs);

    const contacts = generateMockContacts();

    const result = {
      ...specs,
      ...pricing,
      ...location,
      ...metadata,
      contacts
    };

    console.log('[MockData] ✅ Generated full cascading mock data:', result);
    return result;

  } catch (error) {
    console.error('[MockData] ❌ Error generating full mock data:', error);
    console.log('[MockData] 🔄 FALLBACK DISABLED - Retrying full mock data...');
    // Повторяем попытку через 1 секунду
    await new Promise(resolve => setTimeout(resolve, 1000));
    return generateFullMockData();
  }
};

/**
 * FALLBACK DISABLED - функция удалена для принуждения использования реальных данных
 */
const generateFallbackFullMockData = (): Partial<CarAdFormData> => {
  throw new Error('[MockData] ❌ FALLBACK DISABLED - Use only real API data');

  const specs = generateFallbackSpecs();
  const vehicleTypeKey = normalizeVehicleType(specs.vehicle_type_name || '');
  const typeSpecs = VEHICLE_TYPE_SPECS[vehicleTypeKey] || VEHICLE_TYPE_SPECS.car;

  return {
    ...specs,
    ...generateMockPricing(),
    ...generateFallbackLocation(),
    ...generateMockMetadata(vehicleTypeKey, typeSpecs),
    contacts: generateMockContacts()
  };
};

/**
 * Получает список обязательных полей для каждого таба
 */
export const getRequiredFieldsByTab = (tabId: string): string[] => {
  switch (tabId) {
    case 'specs':
      return ['brand', 'model', 'year', 'title', 'description'];
    case 'pricing':
      return ['price', 'currency'];
    case 'location':
      return ['region', 'city'];
    case 'contact':
      return ['contacts'];
    case 'metadata':
      return []; // Нет обязательных полей в метаданных
    default:
      return [];
  }
};
