/**
 * Сервис для генерации моковых изображений автомобилей
 * Генерирует изображения на основе параметров: марка, модель, год, цвет, состояние
 */

export interface CarImageParams {
  brand: string;
  model: string;
  year: number;
  color?: string;
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
  bodyType?: string;
  vehicleType?: string;
  vehicleTypeName?: string;
  description?: string;
}

export type CarViewAngle = 'front' | 'rear' | 'side' | 'interior' | 'engine' | 'dashboard';

export interface GeneratedCarImage {
  url: string;
  angle: CarViewAngle;
  title: string;
  isMain: boolean;
}

// Цветовая палитра для автомобилей
const CAR_COLORS = {
  'black': '#1a1a1a',
  'white': '#f8f8f8',
  'silver': '#c0c0c0',
  'gray': '#808080',
  'red': '#dc2626',
  'blue': '#2563eb',
  'green': '#16a34a',
  'yellow': '#eab308',
  'orange': '#ea580c',
  'brown': '#a16207',
  'purple': '#9333ea',
  'gold': '#d97706'
};

// Типы кузовов и их характеристики
const BODY_TYPES = {
  'sedan': { height: 0.6, length: 1.0, style: 'classic' },
  'hatchback': { height: 0.65, length: 0.85, style: 'compact' },
  'suv': { height: 0.8, length: 1.1, style: 'tall' },
  'coupe': { height: 0.55, length: 0.95, style: 'sporty' },
  'wagon': { height: 0.65, length: 1.15, style: 'extended' },
  'convertible': { height: 0.5, length: 0.95, style: 'open' },
  'pickup': { height: 0.7, length: 1.2, style: 'utility' },
  'van': { height: 0.9, length: 1.3, style: 'commercial' }
};

// Характеристики брендов
const BRAND_CHARACTERISTICS = {
  'BMW': { style: 'luxury', grille: 'kidney', headlights: 'angular' },
  'Mercedes-Benz': { style: 'luxury', grille: 'star', headlights: 'sleek' },
  'Audi': { style: 'luxury', grille: 'hexagon', headlights: 'led' },
  'Toyota': { style: 'reliable', grille: 'simple', headlights: 'standard' },
  'Honda': { style: 'practical', grille: 'chrome', headlights: 'modern' },
  'Ford': { style: 'american', grille: 'bold', headlights: 'rectangular' },
  'Volkswagen': { style: 'german', grille: 'clean', headlights: 'round' },
  'Hyundai': { style: 'modern', grille: 'cascading', headlights: 'sharp' },
  'Kia': { style: 'dynamic', grille: 'tiger', headlights: 'distinctive' },
  'Nissan': { style: 'innovative', grille: 'v-motion', headlights: 'boomerang' }
};

class CarImageGeneratorService {
  private baseUrl: string = process.env.NEXT_PUBLIC_BACKEND_URL || '';
  // Используем несколько сервисов для генерации изображений
  private services = {
    // Основной сервис для автомобилей
    primary: 'https://api.dicebear.com/7.x',
    // Альтернативный сервис
    fallback: 'https://robohash.org',
    // Сервис для placeholder изображений
    placeholder: 'https://picsum.photos'
  };
  
  /**
   * Генерирует уникальный seed на основе параметров автомобиля
   */
  private generateSeed(params: CarImageParams, angle: CarViewAngle): string {
    const { brand, model, year, color = 'silver', condition = 'good' } = params;
    return `${brand}-${model}-${year}-${color}-${condition}-${angle}`.toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Получает цвет в hex формате
   */
  private getColorHex(colorName: string): string {
    const normalizedColor = colorName.toLowerCase();
    return CAR_COLORS[normalizedColor as keyof typeof CAR_COLORS] || CAR_COLORS.silver;
  }

  /**
   * Генерирует параметры для API на основе характеристик автомобиля
   */
  private generateApiParams(params: CarImageParams, angle: CarViewAngle): URLSearchParams {
    const { brand, model, year, color = 'silver', condition = 'good', bodyType = 'sedan' } = params;
    const seed = this.generateSeed(params, angle);
    const colorHex = this.getColorHex(color).replace('#', '');
    
    const apiParams = new URLSearchParams({
      seed: seed,
      size: '400',
      format: 'svg',
      backgroundColor: 'transparent'
    });

    // Настройки в зависимости от ракурса
    switch (angle) {
      case 'front':
        apiParams.append('style', 'front-view');
        apiParams.append('primaryColor', colorHex);
        break;
      case 'rear':
        apiParams.append('style', 'rear-view');
        apiParams.append('primaryColor', colorHex);
        break;
      case 'side':
        apiParams.append('style', 'side-view');
        apiParams.append('primaryColor', colorHex);
        break;
      case 'interior':
        apiParams.append('style', 'interior');
        apiParams.append('backgroundColor', '2a2a2a');
        break;
      case 'engine':
        apiParams.append('style', 'engine-bay');
        apiParams.append('backgroundColor', '1a1a1a');
        break;
      case 'dashboard':
        apiParams.append('style', 'dashboard');
        apiParams.append('backgroundColor', '2a2a2a');
        break;
    }

    // Добавляем характеристики бренда
    const brandChar = BRAND_CHARACTERISTICS[brand as keyof typeof BRAND_CHARACTERISTICS];
    if (brandChar) {
      apiParams.append('brandStyle', brandChar.style);
    }

    // Добавляем характеристики кузова
    const bodyChar = BODY_TYPES[bodyType as keyof typeof BODY_TYPES];
    if (bodyChar) {
      apiParams.append('bodyType', bodyChar.style);
    }

    // Эффекты состояния
    switch (condition) {
      case 'excellent':
        apiParams.append('shine', 'high');
        apiParams.append('wear', 'none');
        break;
      case 'good':
        apiParams.append('shine', 'medium');
        apiParams.append('wear', 'minimal');
        break;
      case 'fair':
        apiParams.append('shine', 'low');
        apiParams.append('wear', 'visible');
        break;
      case 'poor':
        apiParams.append('shine', 'none');
        apiParams.append('wear', 'heavy');
        break;
    }

    return apiParams;
  }

  /**
   * Генерирует URL изображения для конкретного ракурса
   */
  generateImageUrl(params: CarImageParams, angle: CarViewAngle): string {
    const { brand, model, year, color = 'silver' } = params;
    const seed = this.generateSeed(params, angle);

    // Для разных ракурсов используем разные подходы
    switch (angle) {
      case 'front':
      case 'rear':
      case 'side':
        // Для основных ракурсов используем более детализированную генерацию
        return this.generateCarExteriorImage(params, angle);

      case 'interior':
      case 'dashboard':
        // Для салона используем абстрактные изображения
        return this.generateCarInteriorImage(params, angle);

      case 'engine':
        // Для двигателя используем технические изображения
        return this.generateCarEngineImage(params);

      default:
        return this.generateFallbackImage(params, angle);
    }
  }

  /**
   * Генерирует изображение экстерьера автомобиля
   */
  private generateCarExteriorImage(params: CarImageParams, angle: CarViewAngle): string {
    const { brand, model, year, color = 'silver' } = params;
    const seed = this.generateSeed(params, angle);
    const colorHex = this.getColorHex(color).replace('#', '');

    // Используем RoboHash для более детализированных изображений
    const size = '400x300';
    const set = angle === 'front' ? 'set1' : angle === 'rear' ? 'set2' : 'set3';

    return `${this.services.fallback}/${seed}.png?size=${size}&set=${set}&bgset=bg1`;
  }

  /**
   * Генерирует изображение салона автомобиля
   */
  private generateCarInteriorImage(params: CarImageParams, angle: CarViewAngle): string {
    const seed = this.generateSeed(params, angle);

    // Используем DiceBear для абстрактных изображений салона
    const apiParams = new URLSearchParams({
      seed: seed,
      size: '400',
      backgroundColor: '2a2a2a',
      format: 'svg'
    });

    return `${this.services.primary}/bottts/svg?${apiParams.toString()}`;
  }

  /**
   * Генерирует изображение двигателя
   */
  private generateCarEngineImage(params: CarImageParams): string {
    const seed = this.generateSeed(params, 'engine');

    const apiParams = new URLSearchParams({
      seed: seed,
      size: '400',
      backgroundColor: '1a1a1a',
      format: 'svg'
    });

    return `${this.services.primary}/identicon/svg?${apiParams.toString()}`;
  }

  /**
   * Генерирует fallback изображение
   */
  private generateFallbackImage(params: CarImageParams, angle: CarViewAngle): string {
    const { brand, model, year } = params;
    const text = `${brand} ${model} ${year} - ${this.getAngleTitle(angle, params)}`;
    const encodedText = encodeURIComponent(text);

    return `${this.services.placeholder}/400x300/cccccc/666666?text=${encodedText}`;
  }

  /**
   * Генерирует полный набор изображений для автомобиля
   */
  generateCarImageSet(params: CarImageParams): GeneratedCarImage[] {
    const angles: CarViewAngle[] = ['front', 'side', 'rear', 'interior'];
    
    return angles.map((angle, index) => ({
      url: this.generateImageUrl(params, angle),
      angle,
      title: this.getAngleTitle(angle, params),
      isMain: index === 0 // Первое изображение (front) как главное
    }));
  }

  /**
   * Генерирует расширенный набор изображений (включая дополнительные ракурсы)
   */
  generateExtendedCarImageSet(params: CarImageParams): GeneratedCarImage[] {
    const angles: CarViewAngle[] = ['front', 'side', 'rear', 'interior', 'engine', 'dashboard'];
    
    return angles.map((angle, index) => ({
      url: this.generateImageUrl(params, angle),
      angle,
      title: this.getAngleTitle(angle, params),
      isMain: index === 0
    }));
  }

  /**
   * Получает заголовок для изображения
   */
  private getAngleTitle(angle: CarViewAngle, params: CarImageParams): string {
    const { brand, model, year } = params;
    const carName = `${brand} ${model} ${year}`;
    
    const titleMap = {
      'front': `${carName} - Вид спереди`,
      'rear': `${carName} - Вид сзади`,
      'side': `${carName} - Вид сбоку`,
      'interior': `${carName} - Салон`,
      'engine': `${carName} - Двигатель`,
      'dashboard': `${carName} - Панель приборов`
    };

    return titleMap[angle];
  }

  /**
   * Генерирует изображение для конкретного ракурса с кастомными параметрами
   */
  generateCustomImage(
    params: CarImageParams, 
    angle: CarViewAngle, 
    customOptions?: {
      size?: number;
      backgroundColor?: string;
      effects?: string[];
    }
  ): GeneratedCarImage {
    const baseParams = this.generateApiParams(params, angle);
    
    if (customOptions) {
      if (customOptions.size) {
        baseParams.set('size', customOptions.size.toString());
      }
      if (customOptions.backgroundColor) {
        baseParams.set('backgroundColor', customOptions.backgroundColor.replace('#', ''));
      }
      if (customOptions.effects) {
        customOptions.effects.forEach(effect => {
          baseParams.append('effect', effect);
        });
      }
    }

    const style = angle === 'interior' || angle === 'dashboard' ? 'bottts' : 
                  angle === 'engine' ? 'identicon' : 'shapes';
    
    return {
      url: `${this.baseUrl}/${style}/svg?${baseParams.toString()}`,
      angle,
      title: this.getAngleTitle(angle, params),
      isMain: false
    };
  }

  /**
   * Конвертирует сгенерированные изображения в формат для API
   */
  async convertImagesToApiFormat(images: GeneratedCarImage[]): Promise<any[]> {
    const convertedImages = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      if (!image) {
        console.warn(`Image at index ${i} is undefined, skipping`);
        continue;
      }

      try {
        // Получаем изображение как blob
        const response = await fetch(image.url);
        const blob = await response.blob();

        // Конвертируем в base64 для отправки на сервер
        const base64 = await this.blobToBase64(blob);

        convertedImages.push({
          image: base64,
          is_main: image.isMain,
          order: i,
          title: image.title,
          angle: image.angle,
          generated: true
        });
      } catch (error) {
        console.error(`Error converting image ${image.angle}:`, error);
        // Добавляем placeholder в случае ошибки
        convertedImages.push({
          image: image.url,
          is_main: image.isMain,
          order: i,
          title: image.title,
          angle: image.angle,
          generated: true,
          placeholder: true
        });
      }
    }

    return convertedImages;
  }

  /**
   * Конвертирует blob в base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Убираем префикс data:image/...;base64,
        const base64 = result.split(',')[1];
        if (base64) {
          resolve(base64);
        } else {
          reject(new Error('Failed to convert blob to base64: invalid data URL format'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Создает готовый набор изображений для объявления с использованием AI
   */
  async generateImagesForAd(params: CarImageParams): Promise<{
    images: GeneratedCarImage[];
    apiImages: any[];
    mainImage: GeneratedCarImage | null;
  }> {
    const aiImages = await this.generateAIImages(params);
    const apiImages = await this.convertImagesToApiFormat(aiImages);
    const mainImage = aiImages.find(img => img.isMain) || aiImages[0] || null;

    return {
      images: aiImages,
      apiImages,
      mainImage
    };
  }

  /**
   * Генерирует изображения автомобиля с использованием универсального AI сервиса
   */
  async generateAIImages(params: CarImageParams, requireAuthorization: boolean = true): Promise<GeneratedCarImage[]> {
    try {
      // Проверяем авторизацию для предотвращения несанкционированной генерации
      if (requireAuthorization) {
        const hasUserConsent = localStorage.getItem('image_generation_consent') === 'true';
        if (!hasUserConsent) {
          console.warn('🚫 [CarImageGeneratorService] Auto-generation blocked - no user consent');
          throw new Error('Image generation requires user consent');
        }
      }

      console.log('🎨 [CarImageGeneratorService] Starting AI image generation for car (normalized route):', params);

      // Формируем formData для нашего фронтового нормализующего эндпоинта
      const formData = {
        brand: params.brand,
        brand_name: params.brand,
        model: params.model,
        model_name: params.model,
        year: params.year,
        color: params.color,
        body_type: params.bodyType,
        vehicle_type: params.vehicleType,
        vehicle_type_name: params.vehicleTypeName || params.vehicleType,
        condition: params.condition,
        description: params.description
      } as any;

      const requestBody = {
        formData,
        angles: ['front', 'side', 'rear'],
        style: 'realistic',
        quality: 'standard',
        useDescription: true,
        use_mock_algorithm: true
      };

      console.log('🎨 [CarImageGeneratorService] POST /api/llm/generate-car-images with body:', requestBody);

      const response = await fetch('/api/llm/generate-car-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('🎨 [CarImageGeneratorService] Response status:', response.status);
      console.log('🎨 [CarImageGeneratorService] Response ok:', response.ok);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.images) {
        console.log(`✅ Successfully generated ${result.images.length} car images`);
        return result.images.map((img: any) => ({
          url: img.url,
          angle: img.angle as CarViewAngle,
          title: img.title,
          isMain: img.isMain
        }));
      } else {
        throw new Error(result.error || 'Failed to generate AI images');
      }
    } catch (error) {
      console.error('AI image generation error:', error);
      throw error;
    }
  }

  /**
   * Генерирует одно изображение автомобиля используя универсальный endpoint
   */
  private async generateSingleCarImage(prompt: string): Promise<string> {
    try {
      // Используем Next.js API proxy вместо прямого запроса к backend
      // Это избегает CORS ошибок и следует архитектуре проекта
      const response = await fetch('/api/proxy/api/users/generate-image/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          style: 'realistic',
          custom_requirements: 'high quality automotive photography, professional lighting',
          width: 1024,
          height: 768
        }),
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.image_url) {
        return result.image_url;
      } else {
        throw new Error(result.error || 'No image URL in response');
      }
    } catch (error) {
      console.error('Single image generation failed:', error);
      throw error;
    }
  }

  /**
   * Создает промпт для генерации изображения автомобиля
   */
  private createCarImagePrompt(params: CarImageParams, angle: CarViewAngle): string {
    const carInfo = `${params.brand} ${params.model} ${params.year}`;
    const color = params.color || 'silver';
    const bodyType = params.bodyType || 'sedan';

    const angleDescriptions = {
      front: 'front view, centered composition, showing the front grille and headlights',
      side: 'side profile view, showing the complete silhouette and design lines',
      rear: 'rear view, showing the back design, taillights and rear styling',
      interior: 'interior view, dashboard and seats, modern car interior design',
      engine: 'engine bay view, clean engine compartment, technical photography',
      dashboard: 'dashboard close-up, steering wheel and instrument panel'
    };

    return `${carInfo} ${bodyType} in ${color} color, ${angleDescriptions[angle]}, photorealistic, high quality, professional automotive photography, studio lighting, clean background, commercial photography style, 4K resolution`;
  }

  /**
   * Получает заголовок для конкретного ракурса
   */

  /**
   * Генерирует placeholder URL
   */
  private generatePlaceholderUrl(prompt: string): string {
    const hash = prompt.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    const seed = Math.abs(hash).toString(16).padStart(8, '0');
    return `https://picsum.photos/seed/${seed}/1024/768`;
  }

  /**
   * Останавливает несанкционированную автогенерацию
   */
  stopAutoGeneration(): void {
    localStorage.removeItem('image_generation_consent');
    console.warn('🛑 [CarImageGeneratorService] Auto-generation stopped and consent cleared');
  }

  /**
   * Проверяет доступность сервиса генерации
   */
  async checkServiceAvailability(): Promise<boolean> {
    try {
      // Проверяем доступность основных сервисов
      const testParams: CarImageParams = {
        brand: 'Toyota',
        model: 'Camry',
        year: 2020
      };

      const testUrl = this.generateImageUrl(testParams, 'front');
      const response = await fetch(testUrl, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error('Car image generator service unavailable:', error);
      return false;
    }
  }
}

export default new CarImageGeneratorService();
