/**
 * Генератор моковых данных для тестовых объявлений
 * Создает реалистичные данные автомобилей для тестирования
 */

import type { CarAdFormData } from '@/types/autoria';

// Данные для генерации
const BRANDS = [
  'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Toyota', 'Honda', 
  'Ford', 'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Subaru', 'Lexus', 
  'Infiniti', 'Acura', 'Volvo', 'Saab', 'Opel', 'Peugeot', 'Renault'
];

const MODELS = [
  'X5', 'C-Class', 'A4', 'Golf', 'Camry', 'Civic', 'Focus', 'Altima',
  'Elantra', 'Optima', 'CX-5', 'Outback', 'RX', 'Q50', 'TLX', 'XC90',
  '9-3', 'Astra', '308', 'Megane', 'Tiguan', 'RAV4', 'CR-V', 'Escape',
  'Sentra', 'Sonata', 'Sorento', 'CX-3', 'Forester', 'GX', 'Q60', 'ILX'
];

const COLORS = [
  'Черный', 'Белый', 'Серый', 'Синий', 'Красный', 'Серебристый',
  'Золотой', 'Зеленый', 'Коричневый', 'Бежевый', 'Фиолетовый', 'Оранжевый'
];

const BODY_TYPES = [
  'sedan', 'hatchback', 'suv', 'wagon', 'coupe', 'convertible',
  'pickup', 'van', 'minivan', 'crossover'
];

const VEHICLE_TYPES = [
  'car', 'car', 'car', 'car', 'car', 'car', 'car', 'car', // Больше легковых
  'truck', 'motorcycle', 'bus', 'van', 'trailer'
];

const FUEL_TYPES = [
  'gasoline', 'diesel', 'hybrid', 'electric', 'lpg', 'cng'
];

const TRANSMISSIONS = [
  'automatic', 'manual', 'cvt', 'semi-automatic'
];

const DRIVE_TYPES = [
  'front', 'rear', 'all', '4wd'
];

const CONDITIONS = [
  'new', 'used', 'damaged'
];

const SELLER_TYPES = [
  'private', 'dealer', 'company'
];

const EXCHANGE_STATUSES = [
  'no_exchange', 'possible', 'only_exchange'
];

const REGIONS = [
  { id: 203, name: 'Киевская область' },
  { id: 204, name: 'Харьковская область' },
  { id: 205, name: 'Одесская область' },
  { id: 206, name: 'Днепропетровская область' },
  { id: 207, name: 'Львовская область' }
];

const CITIES = [
  { id: 1142, name: 'Киев', region_id: 203 },
  { id: 1143, name: 'Харьков', region_id: 204 },
  { id: 1144, name: 'Одесса', region_id: 205 },
  { id: 1145, name: 'Днепр', region_id: 206 },
  { id: 1146, name: 'Львов', region_id: 207 }
];

/**
 * Генерирует случайное число в диапазоне
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Выбирает случайный элемент из массива
 */
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Генерирует случайные данные автомобиля
 */
function generateRandomCarData(): Partial<CarAdFormData> {
  const brand = randomChoice(BRANDS);
  const model = randomChoice(MODELS);
  const color = randomChoice(COLORS);
  const bodyType = randomChoice(BODY_TYPES);
  const vehicleType = randomChoice(VEHICLE_TYPES);
  const fuelType = randomChoice(FUEL_TYPES);
  const transmission = randomChoice(TRANSMISSIONS);
  const driveType = randomChoice(DRIVE_TYPES);
  const condition = randomChoice(CONDITIONS);
  const sellerType = randomChoice(SELLER_TYPES);
  const exchangeStatus = randomChoice(EXCHANGE_STATUSES);
  
  const year = randomInt(2015, 2024);
  const mileage = randomInt(0, 200000);
  const engineVolume = randomInt(10, 50) / 10; // 1.0 - 5.0 литра
  const enginePower = randomInt(80, 400);
  const price = randomInt(10000, 100000);
  
  const region = randomChoice(REGIONS);
  const city = randomChoice(CITIES.filter(c => c.region_id === region.id));
  
  // Курсы валют (примерные)
  const USD_RATE = 41.65;
  const EUR_RATE = 45.20;
  
  const price_usd = Math.round(price / USD_RATE);
  const price_eur = Math.round(price / EUR_RATE);
  
  return {
    title: `${brand} ${model} ${year} - Отличное состояние`,
    description: `Продается ${brand} ${model} ${year} года в отличном состоянии. ${color} цвет, ${bodyType} кузов. Пробег ${mileage} км. Двигатель ${engineVolume}л, ${enginePower}л.с. ${transmission} коробка передач, ${driveType} привод. Цена договорная.`,
    
    // Основная информация
    brand: brand,
    brand_name: brand,
    mark: brand,
    mark_name: brand,
    model: model,
    model_name: model,
    year: year,
    price: price,
    currency: 'UAH',
    price_usd: price_usd,
    price_eur: price_eur,
    
    // Технические характеристики
    vehicle_type: vehicleType,
    vehicle_type_name: vehicleType,
    mileage: mileage,
    mileage_km: mileage,
    engine_volume: engineVolume,
    engine_power: enginePower,
    fuel_type: fuelType,
    transmission: transmission,
    drive_type: driveType,
    body_type: bodyType,
    color: color,
    condition: condition,
    
    // Местоположение
    region: region.id.toString(),
    city: city.id.toString(),
    region_name: region.name,
    city_name: city.name,
    
    // Дополнительная информация
    seller_type: sellerType,
    exchange_status: exchangeStatus,
    use_profile_contacts: true,
    
    // Случайные дополнительные поля
    number_of_doors: randomInt(2, 5),
    number_of_seats: randomInt(2, 8),
    steering_wheel: randomChoice(['left', 'right']),
    vin_code: `VIN${randomInt(100000000, 999999999)}`,
    license_plate: `${randomInt(10, 99)}${String.fromCharCode(65 + randomInt(0, 25))}${randomInt(1000, 9999)}`,
    
    // Статус
    status: 'active',
    
    // Дополнительная информация
    additional_info: `Дополнительная информация: автомобиль в отличном состоянии, все документы в порядке, возможен торг.`,
    contact_name: `Владелец ${brand}`,
    phone: `+380${randomInt(10000000, 99999999)}`
  };
}

/**
 * Генерирует полные моковые данные с учетом кешированных моделей
 */
export async function generateFullMockData(cachedModels?: any[]): Promise<Partial<CarAdFormData>> {
  console.log('[MockDataGenerator] Generating full mock data...');
  
  let mockData = generateRandomCarData();
  
  // Если есть кешированные модели, используем их для более реалистичных данных
  if (cachedModels && cachedModels.length > 0) {
    console.log(`[MockDataGenerator] Using ${cachedModels.length} cached models for realistic data`);
    
    const randomModel = randomChoice(cachedModels);
    if (randomModel) {
      mockData = {
        ...mockData,
        brand: randomModel.brand_id || randomModel.id,
        brand_name: randomModel.brand_name || randomModel.name,
        mark: randomModel.brand_id || randomModel.id,
        mark_name: randomModel.brand_name || randomModel.name,
        model: randomModel.model_name || randomModel.name,
        model_name: randomModel.model_name || randomModel.name,
        vehicle_type: randomModel.vehicle_type_id || randomModel.vehicle_type,
        vehicle_type_name: randomModel.vehicle_type_name || randomModel.vehicle_type,
        _preferred_brand_for_images: randomModel.brand_name || randomModel.name
      };
      
      console.log('[MockDataGenerator] Applied cached model data:', {
        brand: mockData.brand_name,
        model: mockData.model,
        vehicle_type: mockData.vehicle_type_name
      });
    }
  }
  
  console.log('[MockDataGenerator] Generated mock data:', {
    title: mockData.title,
    brand: mockData.brand_name,
    model: mockData.model,
    year: mockData.year,
    price: mockData.price,
    currency: mockData.currency
  });
  
  return mockData;
}

/**
 * Генерирует простые моковые данные без сложной логики
 */
export function generateSimpleMockData(): Partial<CarAdFormData> {
  return generateRandomCarData();
}

/**
 * Генерирует данные для конкретного типа транспорта
 */
export function generateMockDataForVehicleType(vehicleType: string): Partial<CarAdFormData> {
  const baseData = generateRandomCarData();
  
  // Адаптируем данные под конкретный тип транспорта
  switch (vehicleType.toLowerCase()) {
    case 'truck':
      return {
        ...baseData,
        vehicle_type: 'truck',
        vehicle_type_name: 'truck',
        body_type: 'semi-truck',
        title: `Грузовик ${baseData.brand} ${baseData.model} ${baseData.year}`,
        description: `Продается грузовик ${baseData.brand} ${baseData.model} ${baseData.year} года. Отличное состояние, готов к работе.`
      };
      
    case 'motorcycle':
      return {
        ...baseData,
        vehicle_type: 'motorcycle',
        vehicle_type_name: 'motorcycle',
        body_type: 'sport',
        title: `Мотоцикл ${baseData.brand} ${baseData.model} ${baseData.year}`,
        description: `Продается мотоцикл ${baseData.brand} ${baseData.model} ${baseData.year} года. Отличное состояние.`
      };
      
    case 'bus':
      return {
        ...baseData,
        vehicle_type: 'bus',
        vehicle_type_name: 'bus',
        body_type: 'coach',
        title: `Автобус ${baseData.brand} ${baseData.model} ${baseData.year}`,
        description: `Продается автобус ${baseData.brand} ${baseData.model} ${baseData.year} года. Отличное состояние.`
      };
      
    default:
      return baseData;
  }
}
