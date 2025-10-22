/**
 * Image Prompt Service - специализированный сервис для создания промптов
 * Выделен из generate-car-images/route.ts для соблюдения принципа единственной ответственности
 */

import { CarAdFormData } from '@/types/autoria';
import { buildCanonicalCarData } from '@/utils/imageNormalization';

export interface StrictPromptParams {
  vehicleType: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  bodyType: string;
  angle: string;
  condition?: string;
  description?: string;
}

export class ImagePromptService {
  /**
   * Создать строгий английский промпт для генерации изображения
   */
  static createStrictEnglishPrompt(params: StrictPromptParams): string {
    const {
      vehicleType,
      brand,
      model,
      year,
      color,
      bodyType,
      angle,
      condition,
      description
    } = params;

    // ОСНОВНОЕ ЗАДАНИЕ - ЧЕТКОЕ УКАЗАНИЕ ЧТО ГЕНЕРИРОВАТЬ
    const mainTask = `Generate a ${vehicleType} of brand ${brand} model ${model} from year ${year}`;

    // СТРОГИЕ ТРЕБОВАНИЯ К МАРКЕ И МОДЕЛИ
    const brandModelRequirements = [
      `ONLY ${brand} brand vehicle`,
      `EXACTLY ${brand} ${model} model`,
      `ALL badges, logos, emblems MUST be ${brand} brand`,
      `ALL nameplates MUST show ${brand} and ${model} names`,
      `NO other brand names or logos anywhere on vehicle`,
      `Authentic ${brand} ${model} design and styling`,
      `Correct ${brand} front grille design`,
      `${brand} branded steering wheel or handlebars`
    ];

    // СТРОГИЕ ТРЕБОВАНИЯ К ТИПУ ТРАНСПОРТА
    const vehicleTypeRequirements = [
      `MUST be ${vehicleType} type vehicle`,
      `Correct ${vehicleType} body proportions`,
      `Appropriate ${vehicleType} design elements`,
      vehicleType === 'motorcycle' ? 'Two wheels, handlebars, motorcycle seat' :
      vehicleType === 'truck' ? 'Large cargo area, truck cabin, commercial vehicle' :
      vehicleType === 'bus' ? 'Large passenger bus body, multiple rows of windows, bus doors, high roof' :
      'Four wheels, car doors, passenger vehicle'
    ];

    // СТРОГИЕ ТРЕБОВАНИЯ К ЦВЕТУ
    const colorRequirements = [
      `EXACTLY ${color} color paint`,
      `Consistent ${color} color throughout vehicle`,
      `NO other colors except ${color} for main body`,
      `${color} painted surfaces only`
    ];

    // СТРОГИЕ ТРЕБОВАНИЯ К АТРИБУТАМ
    const attributeRequirements = [
      `ALL visible text MUST be ${brand} or ${model} only`,
      `ALL logos MUST belong to ${brand} brand`,
      `ALL design elements MUST match ${brand} ${model} authentic style`,
      `NO generic or incorrect branding`,
      `NO wrong manufacturer badges`,
      `NO mixed brand elements`
    ];

    // ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ
    const technicalRequirements = [
      `High resolution professional photography`,
      `Photorealistic rendering`,
      `Automotive showroom quality`,
      `Clean and detailed finish`,
      `Proper lighting and shadows`,
      `Sharp focus and clarity`
    ];

    // РАКУРС
    const angleRequirements = this.getAngleRequirements(angle, vehicleType);

    // СОСТОЯНИЕ (если указано)
    const conditionRequirements = condition ? this.getConditionRequirements(condition) : [];

    // ОПИСАНИЕ (если указано)
    const descriptionRequirements = description && description.trim()
      ? [
          `Additional features: ${description.trim().substring(0, 50).replace(/[^\w\s\-.,]/g, '')}`,
          `Features MUST be appropriate for ${brand} ${model} ${vehicleType}`,
          `NO features that contradict ${brand} ${model} specifications`
        ]
      : [];

    // ОТРИЦАТЕЛЬНЫЕ ПРОМПТЫ
    const negativePrompts = [
      'generic vehicle',
      'wrong brand',
      'incorrect logo',
      'mixed branding',
      'low quality',
      'blurry',
      'distorted',
      'artificial',
      'cartoon',
      'anime',
      'sketch',
      'drawing'
    ];

    // СБОРКА ФИНАЛЬНОГО ПРОМПТА
    const allRequirements = [
      mainTask,
      ...brandModelRequirements,
      ...vehicleTypeRequirements,
      ...colorRequirements,
      ...attributeRequirements,
      ...technicalRequirements,
      ...angleRequirements,
      ...conditionRequirements,
      ...descriptionRequirements
    ];

    const finalPrompt = `${allRequirements.join(', ')}. NEGATIVE: ${negativePrompts.join(', ')}`;

    return finalPrompt;
  }

  /**
   * Создать промпт для генерации изображения автомобиля
   */
  static createCarImagePrompt(
    formData: CarAdFormData,
    angle: string,
    style: string,
    carSessionId?: string
  ): string {
    const canonical = buildCanonicalCarData(formData);
    
    const params: StrictPromptParams = {
      vehicleType: canonical.vehicle_type || 'car',
      brand: canonical.brand,
      model: canonical.model,
      year: canonical.year,
      color: canonical.color,
      bodyType: canonical.body_type,
      angle,
      condition: canonical.condition,
      description: canonical.description
    };

    return this.createStrictEnglishPrompt(params);
  }

  /**
   * Получить требования для ракурса
   */
  private static getAngleRequirements(angle: string, vehicleType: string): string[] {
    const angleMap: Record<string, string[]> = {
      'front': [
        'Front view of vehicle',
        'Vehicle facing camera',
        'Clear view of front grille',
        'Front headlights visible',
        'Front bumper and grille in focus'
      ],
      'side': [
        'Side profile view',
        'Vehicle from side angle',
        'Full side view of vehicle',
        'Side doors and windows visible',
        'Side mirrors and wheels visible'
      ],
      'rear': [
        'Rear view of vehicle',
        'Vehicle from behind',
        'Rear lights and bumper visible',
        'Back of vehicle in focus',
        'Rear license plate area visible'
      ],
      'interior': [
        'Interior cabin view',
        'Dashboard and steering wheel',
        'Seats and interior details',
        'Cockpit view from driver seat',
        'Interior controls and displays'
      ]
    };

    return angleMap[angle] || angleMap['front'];
  }

  /**
   * Получить требования для состояния
   */
  private static getConditionRequirements(condition: string): string[] {
    const conditionMap: Record<string, string[]> = {
      'new': [
        'Brand new condition',
        'Showroom quality',
        'Perfect finish',
        'No wear or damage',
        'Pristine appearance'
      ],
      'used': [
        'Used vehicle condition',
        'Some wear signs acceptable',
        'Realistic used appearance',
        'Authentic used vehicle look',
        'Natural aging signs'
      ],
      'damaged': [
        'Visible damage signs',
        'Scratches or dents',
        'Wear and tear visible',
        'Realistic damage',
        'Authentic damaged condition'
      ]
    };

    return conditionMap[condition] || [];
  }
}
