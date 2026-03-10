/**
 * Сервис для генерации разнообразных объявлений
 */

import { ImageGenerationService } from './image-generation.service';

export interface GeneratedAd {
  title: string;
  description: string;
  model: string;
  mark: string;
  price: number;
  currency: string;
  region: string;
  city: string;
  seller_type: string;
  exchange_status: string;
  dynamic_fields: {
    year: number;
    mileage: number;
    fuel_type: string;
    transmission: string;
    body_type: string;
    engine_volume: number;
    engine_power: number;
    drive_type: string;
    color: string;
    condition: string;
  };
  images?: string[];
}

export class AdGeneratorService {
  /**
   * Генерирует уникальное объявление с разнообразными данными
   */
  static async generateUniqueAd(index: number, includeImages: boolean = false, imageTypes: string[] = ['front', 'side']): Promise<GeneratedAd> {
    console.log(`🎲 Generating diverse ad ${index + 1}...`);

    if (includeImages && imageTypes.length === 0) {
      console.warn('⚠️ includeImages is true but no imageTypes specified, using defaults');
      imageTypes = ['front', 'side'];
    }
    
    // Расширенные данные для большего разнообразия
    const carData = [
      { mark: 'BMW', models: ['X5', 'X3', '3 Series', '5 Series', 'X1'], region: 'Німеччина' },
      { mark: 'Mercedes-Benz', models: ['E-Class', 'C-Class', 'GLE', 'A-Class', 'S-Class'], region: 'Німеччина' },
      { mark: 'Toyota', models: ['Camry', 'Corolla', 'RAV4', 'Prius', 'Land Cruiser'], region: 'Японія' },
      { mark: 'Volkswagen', models: ['Golf', 'Passat', 'Tiguan', 'Polo', 'Jetta'], region: 'Німеччина' },
      { mark: 'Audi', models: ['A4', 'A6', 'Q5', 'A3', 'Q7'], region: 'Німеччина' },
      { mark: 'Ford', models: ['Focus', 'Mondeo', 'Kuga', 'Fiesta', 'Transit'], region: 'США' },
      { mark: 'Honda', models: ['Civic', 'Accord', 'CR-V', 'Pilot', 'Fit'], region: 'Японія' },
      { mark: 'Hyundai', models: ['Elantra', 'Tucson', 'Santa Fe', 'i30', 'Sonata'], region: 'Корея' },
      { mark: 'Kia', models: ['Sportage', 'Cerato', 'Sorento', 'Rio', 'Optima'], region: 'Корея' },
      { mark: 'Mazda', models: ['CX-5', 'Mazda3', 'CX-3', 'Mazda6', 'CX-9'], region: 'Японія' }
    ];

    const cities = [
      { city: 'Київ', region: 'Київська область' },
      { city: 'Харків', region: 'Харківська область' },
      { city: 'Одеса', region: 'Одеська область' },
      { city: 'Дніпро', region: 'Дніпропетровська область' },
      { city: 'Львів', region: 'Львівська область' },
      { city: 'Запоріжжя', region: 'Запорізька область' },
      { city: 'Кривий Ріг', region: 'Дніпропетровська область' },
      { city: 'Миколаїв', region: 'Миколаївська область' }
    ];

    const sellerTypes = ['private', 'dealer', 'auto_salon'];
    const fuelTypes = ['petrol', 'diesel', 'hybrid', 'electric'];
    const transmissions = ['manual', 'automatic'];
    const bodyTypes = ['sedan', 'hatchback', 'suv', 'coupe', 'wagon', 'van'];
    const driveTypes = ['fwd', 'rwd', 'awd'];
    const colors = ['black', 'white', 'silver', 'blue', 'red', 'gray', 'green', 'brown', 'yellow'];
    const conditions = ['excellent', 'good', 'satisfactory'];
    const exchangeStatuses = ['no_exchange', 'possible'];

    // Выбираем данные автомобиля
    const carInfo = carData[index % carData.length];
    const model = carInfo.models[Math.floor(Math.random() * carInfo.models.length)];
    const cityInfo = cities[index % cities.length];
    
    // Генерируем реалистичные характеристики
    const year = 2015 + (index % 10);
    const isNewCar = year >= 2022;
    const isLuxury = ['BMW', 'Mercedes-Benz', 'Audi'].includes(carInfo.mark);
    
    // Цена зависит от марки, года и состояния
    let basePrice = 15000;
    if (isLuxury) basePrice += 20000;
    if (isNewCar) basePrice += 15000;
    const price = basePrice + (index * 2000) % 40000;

    // Пробег зависит от года
    const carAge = 2024 - year;
    const baseMileage = carAge * 15000; // 15k км в год
    const mileage = Math.max(1000, baseMileage + (index * 3000) % 50000);

    const condition = isNewCar ? 'excellent' : conditions[index % conditions.length];
    const sellerType = isLuxury ? (index % 2 === 0 ? 'dealer' : 'auto_salon') : sellerTypes[index % sellerTypes.length];

    // Создаем уникальные описания
    const descriptions = [
      `Продається ${carInfo.mark} ${model} ${year} року випуску в ${condition === 'excellent' ? 'відмінному' : condition === 'good' ? 'хорошому' : 'задовільному'} стані. Автомобіль має повну історію обслуговування та знаходиться в місті ${cityInfo.city}.`,
      `${carInfo.mark} ${model} ${year} - надійний автомобіль з ${carInfo.region}. Пробіг ${Math.floor(mileage / 1000)}к км. Всі ТО пройдені вчасно. Торг можливий.`,
      `Терміново продається ${carInfo.mark} ${model} ${year} року. Стан ${condition === 'excellent' ? 'ідеальний' : condition === 'good' ? 'хороший' : 'робочий'}. Документи в порядку. Можлива перевірка на СТО.`,
      `${carInfo.mark} ${model} ${year} - ваш надійний партнер на дорозі. Економічний та комфортний. Обслуговувався тільки в офіційних сервісах.`
    ];

    const adData: GeneratedAd = {
      title: `${carInfo.mark} ${model} ${year} - ${condition === 'excellent' ? 'ідеальний стан' : condition === 'good' ? 'хороший стан' : 'робочий стан'}`,
      description: descriptions[index % descriptions.length],
      model,
      mark: carInfo.mark,
      price,
      currency: 'USD',
      region: cityInfo.region,
      city: cityInfo.city,
      seller_type: sellerType,
      exchange_status: exchangeStatuses[index % exchangeStatuses.length],
      dynamic_fields: {
        year,
        mileage,
        fuel_type: fuelTypes[index % fuelTypes.length],
        transmission: transmissions[index % transmissions.length],
        body_type: bodyTypes[index % bodyTypes.length],
        engine_volume: 1.0 + (index % 40) / 10,
        engine_power: 90 + (index * 15) % 350,
        drive_type: driveTypes[index % driveTypes.length],
        color: colors[index % colors.length],
        condition
      }
    };

    // Генерируем изображения если нужно
    console.log(`🔍 AdGeneratorService: includeImages = ${includeImages} for ${adData.title}`);
    if (includeImages) {
      try {
        console.log(`🎨 Generating images for ${adData.title} with types:`, imageTypes);
        const images = await this.generateCarImages(adData, imageTypes);
        adData.images = images;
        console.log(`✅ Generated ${images.length} images for ${adData.title}`);
      } catch (error) {
        console.warn(`⚠️ Failed to generate images for ${adData.title}:`, error);
        adData.images = [];
      }
    } else {
      console.log(`⏭️ Skipping image generation for ${adData.title} (includeImages = false)`);
      adData.images = [];
    }

    console.log(`✅ Generated unique ad ${index + 1}:`, adData.title);
    return adData;
  }

  /**
   * Генерирует изображения для автомобиля через backend
   */
  private static async generateCarImages(adData: GeneratedAd, imageTypes: string[] = ['front', 'side']): Promise<string[]> {
    try {
      console.log(`🎨 Generating images for ${adData.mark} ${adData.model} via backend with types:`, imageTypes);

      // Проверяем, что типы изображений не пустые
      if (imageTypes.length === 0) {
        throw new Error('No image types specified - cannot generate empty images');
      }

      // Используем специализированный метод для генерации изображений автомобилей
      const images = await ImageGenerationService.generateCarImagesForAd(adData, imageTypes);

      if (images.length > 0) {
        console.log(`✅ Generated ${images.length} images via backend`);
        return images;
      } else {
        throw new Error('No images generated by backend - empty content not allowed');
      }

    } catch (error) {
      console.error(`❌ Image generation failed for ${adData.title}:`, error);

      // 🔄 REGENERATION CYCLE: Instead of fallback, trigger regeneration
      console.log(`🔄 REGENERATION: Will retry image generation instead of using fallback`);
      throw new Error(`ImageGenerationFailed: ${(error instanceof Error ? error.message : String(error))}`); // Trigger regeneration cycle
    }
  }
}
