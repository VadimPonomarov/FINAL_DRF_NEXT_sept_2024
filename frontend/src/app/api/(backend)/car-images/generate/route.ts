import { NextRequest, NextResponse } from 'next/server';
import { CarAdFormData } from '@/types/autoria';

interface CarImageGenerationRequest {
  brand: string;
  model: string;
  year: number;
  color?: string;
  body_type?: string;
  condition?: string;
  selectedTypes?: string[]; // Выбранные пользователем типы изображений
}

interface GeneratedCarImage {
  url: string;
  angle: string;
  title: string;
  isMain: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: CarImageGenerationRequest = await request.json();
    const { brand, model, year, color = 'silver', body_type = 'sedan', condition = 'good', selectedTypes = [] } = body;

    // Validate required data
    if (!brand || !model || !year) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Brand, model, and year are required for image generation.' 
        },
        { status: 400 }
      );
    }

    console.log(`🎨 Generating car images for ${brand} ${model} ${year}`);

    // Define all 10 angles we want to generate
    const angles = [
      { id: 'front', name: 'Спереди' },
      { id: 'rear', name: 'Сзади' },
      { id: 'side', name: 'Сбоку' },
      { id: 'top', name: 'Сверху' },
      { id: 'interior', name: 'Салон' },
      { id: 'dashboard', name: 'Панель приборов' },
      { id: 'engine', name: 'Двигатель' },
      { id: 'trunk', name: 'Багажник' },
      { id: 'wheels', name: 'Колеса' },
      { id: 'details', name: 'Детали' }
    ];

    const generatedImages: GeneratedCarImage[] = [];
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Generate images for each angle
    for (let i = 0; i < angles.length; i++) {
      const angle = angles[i];
      
      try {
        const prompt = createCarImagePrompt(brand, model, year, color, body_type, angle.id);
        
        console.log(`🔄 Generating ${angle.name} view: ${prompt.substring(0, 100)}...`);

        // Call the universal image generation endpoint
        const response = await fetch(`${backendUrl}/api/users/generate-image/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            style: 'realistic',
            custom_requirements: 'high quality automotive photography, professional lighting, clean background',
            width: 1024,
            height: 768
          }),
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.success && result.image_url) {
            generatedImages.push({
              url: result.image_url,
              angle: angle.id,
              title: `${brand} ${model} ${year} - ${angle.name}`,
              isMain: i === 0 // First image (front) is main
            });
            
            console.log(`✅ Generated ${angle.name} view successfully`);
          } else {
            console.warn(`⚠️ Failed to generate ${angle.name} view: ${result.error || 'Unknown error'}`);
            // Add placeholder for failed generation
            generatedImages.push({
              url: generatePlaceholderUrl(prompt),
              angle: angle.id,
              title: `${brand} ${model} ${year} - ${angle.name}`,
              isMain: i === 0
            });
          }
        } else {
          console.warn(`⚠️ Backend request failed for ${angle.name} view: ${response.status}`);
          // Add placeholder for failed request
          generatedImages.push({
            url: generatePlaceholderUrl(prompt),
            angle: angle.id,
            title: `${brand} ${model} ${year} - ${angle.name}`,
            isMain: i === 0
          });
        }
      } catch (error) {
        console.error(`❌ Error generating ${angle.name} view:`, error);
        // Add placeholder for error
        const prompt = createCarImagePrompt(brand, model, year, color, body_type, angle.id);
        generatedImages.push({
          url: generatePlaceholderUrl(prompt),
          angle: angle.id,
          title: `${brand} ${model} ${year} - ${angle.name}`,
          isMain: i === 0
        });
      }
    }

    console.log(`🎉 Generated ${generatedImages.length} car images`);

    return NextResponse.json({
      success: true,
      images: generatedImages,
      total: generatedImages.length
    });

  } catch (error) {
    console.error('Car image generation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate car images' 
      },
      { status: 500 }
    );
  }
}

/**
 * Create detailed prompt for vehicle image generation
 */
function createCarImagePrompt(brand: string, model: string, year: number, color: string, bodyType: string, angle: string): string {
  const vehicleInfo = `${brand} ${model} ${year}`;

  // Используем улучшенную логику определения типа транспорта
  const vehicleType = getVehicleType(brand, bodyType);

  const angleDescriptions = {
    front: 'front view, centered composition, showing front grille, headlights and bumper, professional automotive photography, studio lighting',
    rear: 'rear view, showing back design, taillights, rear bumper and license plate area, professional automotive photography, studio lighting',
    side: 'side profile view, complete vehicle silhouette, showing doors, windows and body lines, professional automotive photography, studio lighting',
    top: 'top aerial view, bird eye perspective, showing roof, overall proportions and vehicle outline, professional automotive photography',
    interior: 'interior cabin view, dashboard, steering wheel, seats and controls, modern vehicle interior, professional photography',
    dashboard: 'dashboard close-up, instrument cluster, steering wheel, center console, detailed interior photography',
    engine: 'engine bay view, motor compartment, mechanical components, engine block, technical automotive photography',
    trunk: 'trunk cargo area, storage compartment, rear cargo space, practical vehicle photography',
    wheels: 'wheel and tire detail, rim design, tire tread, brake components, automotive detail photography',
    details: 'close-up detail shot, vehicle craftsmanship, design elements, material textures, artistic automotive photography'
  };

  const vehicleDescription = getVehicleDescription(vehicleType, bodyType, brand, model);
  const englishColor = translateColorToEnglish(color);
  const basePrompt = `${vehicleInfo} ${vehicleDescription} in ${englishColor} color, ${angleDescriptions[angle as keyof typeof angleDescriptions] || 'professional automotive photography'}`;

  // 🚨 CRITICAL: ALWAYS DISABLE BRANDING TO PREVENT INCORRECT LOGO ASSIGNMENTS
  // AI frequently assigns wrong logos (Toyota on Foton, VW on Dodge, etc.)
  // Better to have NO logos than WRONG logos
  const forbiddenAutomotiveLogos = 'BMW, Mercedes-Benz, Audi, Toyota, Honda, Hyundai, Ford, Volkswagen, Nissan, Chevrolet, Kia, Mazda, Subaru, Volvo, Dodge, RAM, GMC, Cadillac, Lexus, Infiniti, Acura, Jeep, Chrysler, Porsche, Ferrari, Lamborghini';
  const forbiddenConstructionLogos = 'Caterpillar, CAT, Komatsu, JCB, Volvo Construction, Hitachi, Liebherr, Doosan, Case, New Holland, Bobcat, Kubota, Atlas, Terex, XCMG, SANY';

  const brandingInstruction = `CRITICAL: Do NOT show ANY brand logos, badges, emblems, or manufacturer text on this vehicle. Generate a completely generic ${vehicleType} without any branding. ABSOLUTELY FORBIDDEN LOGOS: ${forbiddenAutomotiveLogos}, ${forbiddenConstructionLogos}, or ANY other brand logos. No text, no badges, no emblems, no manufacturer markings, no brand names visible anywhere on the vehicle. Clean, generic design only.`;

  // Consistency and realism instructions
  const consistencyInstruction = `SAME EXACT vehicle in all images, IDENTICAL proportions and design, SAME body type/cabin type, SAME wheel design, SAME color shade`;
  const realismInstruction = `PHYSICALLY CORRECT ${vehicleType} configuration, realistic and functional design, correct number of wheels and steering mechanisms, NO absurd or impossible features, professional quality`;

  // Physical impossibilities to avoid
  const physicalImpossibilities = 'NO motorcycle with 4 wheels, NO car with excavator arm, NO trailer with steering wheel, NO multiple steering wheels, NO floating parts, NO impossible proportions';

  return `${basePrompt}, ${consistencyInstruction}, ${realismInstruction}, photorealistic, high quality, studio lighting, clean white background, commercial photography style, 4K resolution, professional automotive showroom quality, detailed, sharp focus. Vehicle type: ${vehicleType} only. ${brandingInstruction}. NEGATIVE: ${physicalImpossibilities}, cartoon, anime, drawing, low quality, blurry, multiple vehicles, people, text, watermarks`;

/**
 * Переводит цвет на английский для лучшей генерации
 */
function translateColorToEnglish(color: string): string {
  const colorTranslations: { [key: string]: string } = {
    'черный': 'black',
    'белый': 'white',
    'серый': 'gray',
    'серебристый': 'silver',
    'красный': 'red',
    'синий': 'blue',
    'зеленый': 'green',
    'желтый': 'yellow',
    'оранжевый': 'orange',
    'коричневый': 'brown',
    'фиолетовый': 'purple',
    'розовый': 'pink',
    'золотой': 'gold',
    'бежевый': 'beige',
    'бордовый': 'maroon',
    'темно-синий': 'dark blue',
    'светло-серый': 'light gray',
    'темно-серый': 'dark gray'
  };

  const colorLower = color.toLowerCase();
  return colorTranslations[colorLower] || color;
}
}

/**
 * Определяет тип транспортного средства по бренду и типу кузова
 */
function getVehicleType(brand: string, bodyType: string): 'car' | 'truck' | 'trailer' | 'motorcycle' | 'bus' | 'special' {
  const brandLower = brand.toLowerCase();
  const bodyTypeLower = bodyType.toLowerCase();

  // Прицепы и полуприцепы
  if (brandLower.includes('trailer') || bodyTypeLower.includes('trailer') ||
      brandLower.includes('adr') || bodyTypeLower.includes('прицеп') ||
      bodyTypeLower.includes('полуприцеп') || bodyTypeLower.includes('цистерна')) {
    return 'trailer';
  }

  // Грузовики
  if (bodyTypeLower.includes('truck') || bodyTypeLower.includes('грузов') ||
      bodyTypeLower.includes('фура') || bodyTypeLower.includes('тягач') ||
      bodyTypeLower.includes('вантажівка') || bodyTypeLower.includes('камаз')) {
    return 'truck';
  }

  // Мотоциклы
  if (bodyTypeLower.includes('мотоцикл') || bodyTypeLower.includes('motorcycle') ||
      bodyTypeLower.includes('скутер') || bodyTypeLower.includes('мопед') ||
      bodyTypeLower.includes('байк') || bodyTypeLower.includes('мото')) {
    return 'motorcycle';
  }

  // Автобусы
  if (bodyTypeLower.includes('автобус') || bodyTypeLower.includes('bus') ||
      bodyTypeLower.includes('маршрутка') || bodyTypeLower.includes('микроавтобус')) {
    return 'bus';
  }

  // Спецтехника
  if (bodyTypeLower.includes('спец') || bodyTypeLower.includes('экскаватор') ||
      bodyTypeLower.includes('кран') || bodyTypeLower.includes('бульдозер') ||
      bodyTypeLower.includes('трактор') || bodyTypeLower.includes('комбайн')) {
    return 'special';
  }

  return 'car';
}

/**
 * Возвращает негативные промпты для правильного типа транспорта
 */
function getNegativePrompts(vehicleType: string): string {
  const baseNegatives = 'no text overlay, no watermark, no low quality, no extra logos, no people, no cropped vehicle, no distortion';

  switch (vehicleType) {
    case 'bus':
      return `${baseNegatives}, NOT a passenger car, NOT a van, NOT a truck`;
    case 'truck':
      return `${baseNegatives}, NOT a passenger car, NOT a bus, NOT a van`;
    case 'motorcycle':
      return `${baseNegatives}, NOT a car, NOT a truck, NOT a bus, NOT four wheels, NO enclosed cabin`;
    case 'trailer':
      return `${baseNegatives}, NO tractor head, NO truck cabin, NOT a car`;
    case 'special':
      return `${baseNegatives}, ABSOLUTELY NOT a passenger car, NOT a sedan, NOT a hatchback, NOT a coupe, NOT a regular truck, NOT a van, NOT a bus, NO passenger vehicle design, NO car wheels, NO automotive styling`;
    default:
      return baseNegatives;
  }
}

/**
 * Возвращает описание транспортного средства для промпта (на английском для лучшей генерации)
 */
function getVehicleDescription(vehicleType: string, bodyType: string, brand?: string, model?: string): string {
  // Переводим тип кузова на английский если нужно
  const englishBodyType = translateBodyTypeToEnglish(bodyType);

  switch (vehicleType) {
    case 'trailer':
      return `${englishBodyType} commercial trailer, semi-trailer, cargo transport equipment, industrial vehicle`;
    case 'truck':
      return `${englishBodyType} commercial truck, heavy-duty vehicle, freight transport, cargo truck`;
    case 'motorcycle':
      return `${englishBodyType} motorcycle, motorbike, two-wheeled vehicle, bike`;
    case 'bus':
      return `${englishBodyType} bus, passenger transport vehicle, public transport, coach`;
    case 'special':
      // Определяем конкретный тип спецтехники по марке
      const brandLower = (brand || '').toLowerCase();
      const modelLower = (model || '').toLowerCase();

      const excavatorBrands = ['atlas', 'caterpillar', 'cat', 'komatsu', 'hitachi', 'kobelco', 'doosan', 'volvo construction', 'hyundai construction', 'liebherr', 'sany', 'xcmg', 'zoomlion'];
      const loaderBrands = ['jcb', 'case', 'new holland', 'bobcat', 'kubota', 'takeuchi', 'terex', 'volvo construction', 'caterpillar', 'cat', 'komatsu'];
      const craneBrands = ['liebherr', 'tadano', 'grove', 'manitowoc', 'terex', 'demag', 'xcmg', 'sany', 'zoomlion'];

      if (excavatorBrands.includes(brandLower)) {
        return 'HYDRAULIC EXCAVATOR: tracked undercarriage with metal tracks, rotating upper structure (cab), articulated boom arm with bucket attachment, construction equipment proportions, industrial yellow/orange color scheme';
      } else if (loaderBrands.includes(brandLower)) {
        if (modelLower.includes('backhoe')) {
          return 'BACKHOE LOADER: four-wheeled construction vehicle with front bucket loader and rear excavator arm, construction equipment design';
        } else {
          return 'WHEEL LOADER: large front bucket, articulated steering frame, four large construction wheels, heavy-duty construction equipment';
        }
      } else if (craneBrands.includes(brandLower)) {
        return 'MOBILE CRANE: telescopic boom, counterweights, outriggers, construction crane equipment';
      } else {
        return `${englishBodyType} heavy construction equipment, industrial machinery, construction vehicle with heavy-duty components`;
      }
    default:
      return `${englishBodyType} passenger car, automobile, vehicle, motor car`;
  }
}

/**
 * Переводит тип кузова на английский для лучшей генерации изображений
 */
function translateBodyTypeToEnglish(bodyType: string): string {
  const translations: { [key: string]: string } = {
    'седан': 'sedan',
    'хэтчбек': 'hatchback',
    'универсал': 'wagon',
    'внедорожник': 'SUV',
    'кроссовер': 'crossover',
    'купе': 'coupe',
    'кабриолет': 'convertible',
    'минивэн': 'minivan',
    'пикап': 'pickup truck',
    'фургон': 'van',
    'грузовик': 'truck',
    'тягач': 'tractor unit',
    'прицеп': 'trailer',
    'полуприцеп': 'semi-trailer',
    'цистерна': 'tank trailer',
    'рефрижератор': 'refrigerated trailer',
    'автобус': 'bus',
    'микроавтобус': 'minibus',
    'мотоцикл': 'motorcycle',
    'скутер': 'scooter',
    'квадроцикл': 'ATV',
    'трактор': 'tractor',
    'экскаватор': 'excavator',
    'бульдозер': 'bulldozer',
    'кран': 'crane'
  };

  const bodyTypeLower = bodyType.toLowerCase();
  return translations[bodyTypeLower] || bodyType;
}

/**
 * Generate placeholder image URL as fallback
 */
function generatePlaceholderUrl(prompt: string): string {
  // Create a hash from the prompt for consistent placeholder
  const hash = prompt.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const colors = ['FF6B6B', '4ECDC4', '45B7D1', 'FFA07A', '98D8C8', 'F7DC6F'];
  const color = colors[Math.abs(hash) % colors.length];
  
  return `https://via.placeholder.com/1024x768/${color}/FFFFFF?text=Car+Image`;
}
