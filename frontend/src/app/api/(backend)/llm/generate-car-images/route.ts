import { NextRequest, NextResponse } from 'next/server';
import { CarAdFormData } from '@/modules/autoria/shared/types/autoria';
import { buildCanonicalCarData } from '@/modules/autoria/shared/utils/imageNormalization';

export const runtime = 'nodejs';


// Интерфейс для параметров строгого промпта
interface StrictPromptParams {
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

// Функция создания строгого английского промпта
function createStrictEnglishPrompt(params: StrictPromptParams): string {
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
  const angleRequirements = getAngleRequirements(angle, vehicleType);

  // СОСТОЯНИЕ (если указано)
  const conditionRequirements = condition ? getConditionRequirements(condition) : [];

  // ОПИСАНИЕ (если указано)
  const descriptionRequirements = description && description.trim()
    ? [
        `Additional features: ${description.trim().substring(0, 50).replace(/[^\w\s\-.,]/g, '')}`,
        `Features MUST be appropriate for ${brand} ${model} ${vehicleType}`,
        `NO features that contradict ${brand} ${model} specifications`
      ]
    : [];

  // ФИНАЛЬНЫЕ УТВЕРЖДЕНИЯ (без отрицаний)
  const finalAffirmations = [
    `Render exactly: ${brand} ${model} (${year})`,
    `Vehicle type: ${vehicleType} only`,
    `Main body color: ${color}`,
    `Use authentic ${brand} branding; if uncertain, omit visible logos`
  ];

  // СОБИРАЕМ ФИНАЛЬНЫЙ ПРОМПТ
  const finalPrompt = [
    mainTask,
    ...brandModelRequirements,
    ...vehicleTypeRequirements,
    ...colorRequirements,
    ...attributeRequirements,
    ...angleRequirements,
    ...conditionRequirements,
    ...descriptionRequirements,
    ...technicalRequirements,
    ...finalAffirmations
  ].join(', ');

  return finalPrompt;
}

// Функция для требований к ракурсу
function getAngleRequirements(angle: string, vehicleType: string): string[] {
  const baseAngle = `${angle} view of the vehicle`;

  switch (angle) {
    case 'front':
      return [
        `Front view showing grille, headlights, and front ${vehicleType === 'motorcycle' ? 'fairing' : 'bumper'}`,
        `Brand logo clearly visible on front`,
        `Centered composition`
      ];
    case 'side':
      return [
        `Side profile view showing complete silhouette`,
        `All design lines and proportions visible`,
        `Brand badges on side panels visible`
      ];
    case 'rear':
      return [
        `Rear view showing taillights and back design`,
        `Brand name or logo on rear visible`,
        `Complete rear styling`
      ];
    case 'interior':
      return [
        vehicleType === 'motorcycle'
          ? `Rider cockpit view with handlebars and instruments`
          : `Interior dashboard and seats view`,
        `Brand steering wheel or handlebar logos`,
        `Modern interior design`
      ];
    default:
      return [baseAngle];
  }
}

// Функция для требований к состоянию
function getConditionRequirements(condition: string): string[] {
  switch (condition) {
    case 'excellent':
      return ['Pristine showroom condition', 'Like new appearance', 'Perfect paint and finish'];
    case 'good':
      return ['Well maintained condition', 'Clean and polished', 'Minor wear acceptable'];
    case 'fair':
      return ['Average used condition', 'Some visible wear', 'Realistic used vehicle'];
    case 'poor':
      return ['Needs restoration', 'Visible wear and aging', 'Weathered appearance'];
    case 'damaged':
      return ['Damaged condition', 'Visible damage and wear', 'Repair needed'];
    default:
      return ['Good overall condition'];
  }
}

interface CarImageGenerationRequest {
  formData: Partial<CarAdFormData>;
  angles?: string[];
  style?: 'realistic' | 'professional' | 'artistic';
  quality?: 'standard' | 'high';
  useDescription?: boolean; // Использовать описание в промпте
  sessionId?: string; // Опционально: фиксировать серию для перегенераций
  use_mock_algorithm?: boolean; // 🎯 Использовать mock алгоритм (тот же, что в тестовых объявлениях)
}

interface GeneratedCarImage {
  url: string;
  angle: string;
  title: string;
  isMain: boolean;
  prompt: string;
}

interface CarImageGenerationResponse {
  images: GeneratedCarImage[];
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CarImageGenerationRequest = await request.json();
    const { formData, angles = ['front', 'side', 'rear', 'interior'], style = 'realistic', quality = 'standard', useDescription = true, sessionId, use_mock_algorithm = false } = body;
    const url = (request as any)?.nextUrl;
    const debug = url?.searchParams?.get?.('debug') === '1';
    const promptOnly = url?.searchParams?.get?.('promptOnly') === '1';

    // Validate required data
    if (!formData.brand || !formData.model || !formData.year) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient data for image generation. Brand, model, and year are required.'
        },
        { status: 400 }
      );
    }

    // Canonical normalized data snapshot for debugging/verification
    const canonical = buildCanonicalCarData(formData);

    // Создаем/применяем session_id для всей серии изображений этого автомобиля (важно для перегенерации отдельных углов)
    const sessionData = `${canonical.brand}_${canonical.model}_${canonical.year}_${canonical.color}_${canonical.body_type}`;
    let carSessionId = (sessionId && String(sessionId).trim()) || Buffer.from(`${sessionData}_${Date.now()}`).toString('base64').substring(0, 8);

    // Сформируем точные промпты заранее, чтобы вернуть их в debug всегда
    const plannedPrompts = angles.map((a) => createCarImagePrompt(canonical, a, style, carSessionId));

    // Если требуется только промпт (быстрый debug без внешней генерации)
    if (promptOnly) {
      const placeholderImages: GeneratedCarImage[] = angles.map((angle, i) => ({
        url: generatePlaceholderImage(`${canonical.brand} ${canonical.model} ${angle}`),
        angle,
        title: getAngleTitle(angle, canonical),
        isMain: i === 0,
        prompt: plannedPrompts[i]
      }));

      return NextResponse.json({
        images: placeholderImages,
        success: true,
        ...(debug ? { debug: { canonical, angles, style, prompts: plannedPrompts } } : {})
      });
    }

    // Generate images using backend service
    let generatedImages: GeneratedCarImage[] = [];

    console.log(`🔗 Car session ID for consistency: CAR-${carSessionId}`);
    console.log(`🎯 Use mock algorithm: ${use_mock_algorithm}`);

    try {
      generatedImages = await generateCarImagesWithBackend(formData, angles, style, carSessionId, use_mock_algorithm, request);
    } catch (error) {
      console.error('Backend generation failed, using placeholder fallback (pollinations disabled):', error);

      // Fallback: deterministic placeholders to avoid external DNS failures
      generatedImages = angles.map((angle, i) => {
        const prompt = createCarImagePrompt(canonical, angle, style, carSessionId);
        const url = generatePlaceholderImage(`${canonical.brand} ${canonical.model} ${angle}`);
        return {
          url,
          angle,
          title: getAngleTitle(angle, canonical),
          isMain: i === 0,
          prompt
        };
      });
    }

    // Filter out empty/bad image URLs
    const validImages = (generatedImages || []).filter(img => {
      const u = String(img?.url || '').trim();
      if (!u) return false;
      if (u.includes('via.placeholder.com')) return false;
      // Pollinations.ai is unreliable (returns 500 randomly) — prefer g4f fallback picsum URLs
      if (u.includes('image.pollinations.ai') && u.includes('?')) {
        // Keep stable Pollinations URLs (no query string noise); drop ones with many params that tend to 500
        const paramCount = (u.match(/&/g) || []).length;
        if (paramCount > 3) return false;
      }
      if (!/^https?:\/\//i.test(u)) return false;
      return true;
    });

    if (validImages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate valid images (all URLs empty/invalid)',
          ...(debug ? { debug: { canonical, angles, style, prompts: plannedPrompts } } : {})
        },
        { status: 500 }
      );
    }

    const response: CarImageGenerationResponse & { debug?: any } = {
      images: validImages,
      success: true,
      ...(debug ? { debug: { canonical, angles, style, prompts: plannedPrompts } } : {})
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Car image generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate car images',
        details: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Generate car images using backend service
 */
async function generateCarImagesWithBackend(formData: Partial<CarAdFormData>, angles: string[], style: string, carSessionId?: string, use_mock_algorithm?: boolean, request?: NextRequest): Promise<GeneratedCarImage[]> {
  try {
    // Call backend service for car image generation
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Normalize human-readable fields
    const carData = buildCanonicalCarData(formData);

    console.log('[generateCarImagesWithBackend] 🚗 Sending car data to backend (normalized):', carData);
    console.log('[generateCarImagesWithBackend] 📐 Angles:', angles);
    console.log('[generateCarImagesWithBackend] 🎨 Style:', style);
    console.log('[generateCarImagesWithBackend] 🎯 Use mock algorithm:', use_mock_algorithm);

    // Получаем токены из Redis для аутентификации (если request передан)
    let authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (request) {
      try {
        const origin = request.nextUrl.origin;
        const tokenResponse = await fetch(`${origin}/api/auth/token`);

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          if (tokenData.access) {
            authHeaders['Authorization'] = `Bearer ${tokenData.access}`;
            console.log('[generateCarImagesWithBackend] ✅ Added auth token to request');
          } else {
            console.warn('[generateCarImagesWithBackend] ⚠️ No access token found, proceeding without auth');
          }
        } else {
          console.warn('[generateCarImagesWithBackend] ⚠️ Failed to get tokens, proceeding without auth');
        }
      } catch (tokenError) {
        console.error('[generateCarImagesWithBackend] ❌ Error getting tokens:', tokenError);
        // Продолжаем без токенов - endpoint может быть публичным
      }
    }

    const response = await fetch(`${backendUrl}/api/chat/generate-car-images/`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        car_data: carData,
        angles,
        style,
        use_mock_algorithm: use_mock_algorithm || false // 🎯 Передаем флаг использования mock алгоритма
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend image generation failed: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && Array.isArray(result.images)) {
      const images = (result.images as any[]).map((img: any, idx: number) => ({
        ...img,
        angle: img?.angle || angles[idx] || 'front'
      }));
      return images;
    } else {
      throw new Error(result.error || 'No images in response');
    }
  } catch (error) {
    console.error('Backend car image generation failed:', error);
    throw error;
  }
}

/**
 * Create car image prompt based on form data and angle
 */
function createCarImagePrompt(formData: Partial<CarAdFormData>, angle: string, style: string, carSessionId?: string): string {
  // Всегда используем канонически нормализованные данные
  const canon = buildCanonicalCarData(formData);
  const brand = canon.brand || 'Generic';
  const bodyType = canon.body_type || 'sedan';
  // ❌ FALLBACK DISABLED: Use ONLY real vehicle_type_name, no getVehicleTypeAdvanced
  const vehicleTypePrompt = (canon as any).vehicle_type_name || canon.vehicle_type || 'car';
  console.log(`[Image Generator] ✅ Using REAL vehicle_type_name: '${(canon as any).vehicle_type_name}' (no advanced normalization)`);

  console.log('[Image Generator] 🚗 Canonical vehicle type:', vehicleTypePrompt);
  console.log('[Image Generator] 🏭 Canonical brand:', brand);
  console.log('[Image Generator] 🚙 Canonical body type:', bodyType);

  const model = canon.model || 'Vehicle';
  const year = canon.year || 2020;
  const color = canon.color || 'silver';
  const condition = (canon as any).condition || 'good';
  const description = canon.description || '';

  // Создаем уникальный идентификатор для серии изображений
  if (!carSessionId) {
    const sessionData = `${brand}_${model}_${year}_${color}_${vehicleTypePrompt}_${bodyType}_${Date.now()}`;
    carSessionId = Buffer.from(sessionData).toString('base64').substring(0, 8);
  }

  // Создаем структурированный промпт с сильными ограничениями типа
  return createStructuredCarPrompt({
    vehicle_type: vehicleTypePrompt,
    brand,
    model,
    year,
    color,
    body_type: bodyType,
    condition,
    description
  }, angle, style, carSessionId);
}

/**
 * Улучшенная логика определения типа транспорта (синхронизировано с backend)
 */
function getVehicleTypeAdvanced(brand: string, bodyType: string, vehicleTypeName: string): string {
  const allowed_types = ['car','truck','trailer','motorcycle','bus','special','scooter','van','boat'];

  // 1. Проверяем явный ввод
  const rawInput = vehicleTypeName.toLowerCase().trim();
  if (allowed_types.includes(rawInput)) {
    return rawInput;
  }

  // 2. Проверяем локализованные названия
  const localizedMappings: Record<string, string> = {
    'легковой': 'car', 'легкова': 'car', 'седан': 'car', 'хетчбек': 'car', 'универсал': 'car',
    'грузовой': 'truck', 'грузова': 'truck', 'тягач': 'truck', 'вантажівка': 'truck',
    'автобус': 'bus', 'мікроавтобус': 'bus', 'маршрутка': 'bus',
    'мотоцикл': 'motorcycle', 'байк': 'motorcycle', 'мотобайк': 'motorcycle',
    'скутер': 'scooter', 'мопед': 'scooter',
    'прицеп': 'trailer', 'причіп': 'trailer',
    'фургон': 'van', 'мінівен': 'van',
    'спецтехника': 'special', 'екскаватор': 'special', 'бульдозер': 'special',
    // water
    'водный транспорт': 'boat', 'водній транспорт': 'boat', 'водний транспорт': 'boat',
    'лодка': 'boat', 'катер': 'boat', 'яхта': 'boat', 'яхт': 'boat', 'гидроцикл': 'boat', 'гідроцикл': 'boat', 'boat': 'boat', 'yacht': 'boat', 'ship': 'boat'
  };

  for (const [key, value] of Object.entries(localizedMappings)) {
    if (rawInput.includes(key) || bodyType.toLowerCase().includes(key)) {
      return value;
    }
  }

  // 3. Эвристики по бренду
  const brandLower = brand.toLowerCase();
  const truckBrands = ['volvo', 'scania', 'man', 'mercedes-benz', 'daf', 'iveco', 'renault trucks', 'mack', 'peterbilt', 'kenworth', 'freightliner'];
  const motorcycleBrands = ['yamaha', 'honda', 'kawasaki', 'suzuki', 'ducati', 'bmw motorrad', 'harley-davidson', 'ktm', 'aprilia'];
  const busBrands = ['setra', 'neoplan', 'solaris', 'bogdan', 'paz', 'liaz', 'ikarus'];

  if (truckBrands.some(tb => brandLower.includes(tb))) return 'truck';
  if (motorcycleBrands.some(mb => brandLower.includes(mb))) return 'motorcycle';
  if (busBrands.some(bb => brandLower.includes(bb))) return 'bus';

  // По умолчанию
  return 'car';
}

/**
 * Создает структурированный промпт с сильными ограничениями типа (синхронизировано с backend)
 */
function createStructuredCarPrompt(carData: any, angle: string, style: string, carSessionId?: string): string {
  const { vehicle_type: vt, brand, model, year, color, body_type, condition, description } = carData;

  // Основные части промпта
  const parts = [
    // Language directive and strict constraints come FIRST to set the LLM's priorities
    'LANGUAGE DIRECTIVE: Interpret the entire prompt in English. If any non-English (e.g., Russian/Ukrainian) automotive terms appear (like “легковой”, “тягач”, “полуприцеп”, “фургон”), internally map them to correct English automotive terms before generation. Do not add on-image text; do not render localized words; keep semantics only.',
    `STRICT CONSTRAINTS: Vehicle type MUST be EXACTLY: ${vt}. Under no circumstances generate any other vehicle type. This constraint overrides all others.`,
    `Exact vehicle: ${brand} ${model} ${year}. If this model is not produced as a ${vt}, render the closest ${vt} variant without changing the vehicle type. Do not convert to another type.`,
    `Primary color: ${color}`,
    `Body type: ${body_type}`
  ];

  // Enhanced branding control with vehicle type validation
  const brandLower = brand.toLowerCase();
  const vtLower = vt.toLowerCase();

  // Known automotive brands that should only appear on passenger vehicles
  const automotiveBrands = [
    // German brands
    'bmw', 'mercedes-benz', 'mercedes', 'audi', 'volkswagen', 'vw', 'porsche', 'opel', 'smart', 'maybach',
    // Japanese brands
    'toyota', 'honda', 'nissan', 'mazda', 'subaru', 'mitsubishi', 'lexus', 'infiniti', 'acura', 'suzuki', 'isuzu',
    // American brands
    'ford', 'chevrolet', 'gmc', 'cadillac', 'buick', 'lincoln', 'chrysler', 'dodge', 'jeep', 'ram', 'tesla',
    // Korean brands
    'hyundai', 'kia', 'genesis', 'daewoo', 'ssangyong',
    // European brands
    'volvo', 'peugeot', 'renault', 'citroen', 'fiat', 'abarth', 'alfa romeo', 'lancia', 'skoda', 'seat', 'vauxhall',
    'saab', 'jaguar', 'land rover', 'mini', 'ferrari', 'lamborghini', 'maserati', 'bentley', 'rolls-royce',
    'aston martin', 'mclaren', 'bugatti', 'koenigsegg', 'pagani', 'lotus', 'morgan', 'caterham', 'ariel',
    'noble', 'tvr', 'westfield', 'ginetta', 'radical', 'ultima', 'spyker', 'wiesmann', 'artega', 'melkus',
    // French brands
    'ds', 'alpine', 'bugatti',
    // Italian brands
    'iveco', 'pagani', 'de tomaso', 'lancia delta',
    // British brands
    'triumph', 'austin', 'rover', 'mg motor', 'leyland',
    // Swedish brands
    'koenigsegg', 'polestar',
    // Czech brands
    'tatra',
    // Romanian brands
    'dacia',
    // Russian brands
    'lada', 'gaz', 'uaz', 'kamaz', 'zil',
    // Chinese brands
    'byd', 'geely', 'chery', 'great wall', 'haval', 'mg', 'nio', 'xpeng', 'li auto', 'lynk co',
    'hongqi', 'dongfeng', 'faw', 'saic', 'changan', 'brilliance', 'lifan', 'roewe', 'wuling',
    // Indian brands
    'tata', 'mahindra', 'maruti suzuki', 'bajaj', 'force motors',
    // Malaysian brands
    'proton', 'perodua',
    // Australian brands
    'holden',
    // Iranian brands
    'iran khodro', 'saipa',
    // Turkish brands
    'togg', 'otosan'
  ];

  // Known special equipment brands
  const specialBrands = [
    // Construction equipment
    'atlas', 'caterpillar', 'cat', 'komatsu', 'liebherr', 'hitachi', 'kobelco', 'doosan', 'case', 'new holland',
    'jcb', 'bobcat', 'kubota', 'takeuchi', 'yanmar', 'wacker neuson', 'bomag', 'dynapac', 'hamm', 'wirtgen',
    'vogele', 'kleemann', 'benninghoven', 'terex', 'grove', 'manitowoc', 'tadano', 'demag', 'atlas copco',
    // Chinese construction brands
    'sany', 'xcmg', 'zoomlion', 'liugong', 'lonking', 'sdlg', 'shantui', 'changlin', 'foton lovol', 'yto',
    // Agricultural equipment
    'deutz-fahr', 'same', 'lamborghini trattori', 'hurlimann', 'fendt', 'valtra', 'massey ferguson',
    'john deere', 'claas', 'new holland agriculture', 'case ih', 'kubota agriculture', 'yanmar agriculture',
    // Mining and heavy equipment
    'volvo construction', 'hyundai construction', 'bell equipment', 'sandvik', 'epiroc', 'metso outotec',
    // Specialized brands
    'palfinger', 'hiab', 'fassi', 'pm', 'effer', 'atlas crane', 'tadano faun', 'grove crane', 'liebherr crane'
  ];

  // 🚨 CRITICAL: ALWAYS DISABLE BRANDING TO PREVENT INCORRECT LOGO ASSIGNMENTS
  // AI frequently assigns wrong logos (Toyota on Foton, VW on Dodge, etc.)
  // Better to have NO logos than WRONG logos
  const shouldShowBranding = false;

  const forbiddenAutomotiveLogos = 'BMW, Mercedes-Benz, Audi, Toyota, Honda, Hyundai, Ford, Volkswagen, Nissan, Chevrolet, Kia, Mazda, Subaru, Volvo, Dodge, RAM, GMC, Cadillac, Lexus, Infiniti, Acura, Jeep, Chrysler, Porsche, Ferrari, Lamborghini, Maserati, Bentley, Rolls-Royce';
  const forbiddenConstructionLogos = 'Caterpillar, CAT, Komatsu, JCB, Volvo Construction, Hitachi, Liebherr, Doosan, Case, New Holland, Bobcat, Kubota, Atlas, Terex, Manitowoc, Tadano, Grove, XCMG, SANY, Zoomlion';

  const strictBranding = `CRITICAL: Do NOT show ANY brand logos, badges, emblems, or manufacturer text on this vehicle. Generate a completely generic ${vt} without any branding. ABSOLUTELY FORBIDDEN LOGOS: ${forbiddenAutomotiveLogos}, ${forbiddenConstructionLogos}, or ANY other brand logos. No text, no badges, no emblems, no manufacturer markings, no brand names visible anywhere on the vehicle. Clean, generic design only. Reason: AI logo hallucination prevention - better no logos than wrong logos.`;

  console.log(`[Image Generator] 🚫 BRANDING DISABLED FOR ALL VEHICLES: AI logo hallucination prevention`);

  // Принуждение к правильному типу (только позитивные описания)
  let typeEnforcement = '';

  if (vt === 'bus') {
    typeEnforcement = 'Large passenger bus body, multiple rows of windows, bus doors, high roof, long wheelbase';
  } else if (vt === 'truck') {
    typeEnforcement = 'Heavy-duty truck cabin, large cargo area or trailer coupling, commercial vehicle proportions, high ground clearance, 6 or more wheels preferred';
  } else if (vt === 'motorcycle') {
    typeEnforcement = 'Two wheels, exposed frame, handlebars, motorcycle seat, motorcycle proportions';
  } else if (vt === 'scooter') {
    typeEnforcement = 'Kick/electric scooter proportions, narrow deck, handlebar stem, two small wheels';
  } else if (vt === 'van') {
    typeEnforcement = 'Boxy van/MPV proportions with sliding door (if applicable), light commercial vehicle style';
  } else if (vt === 'trailer') {
    typeEnforcement = 'Standalone trailer body, hitch coupling, no engine, no driver cabin';
  } else if (vt === 'special') {
    // Определяем конкретный тип спецтехники по марке
    const excavatorBrands = ['atlas', 'caterpillar', 'cat', 'komatsu', 'hitachi', 'kobelco', 'doosan', 'volvo construction', 'hyundai construction', 'liebherr', 'sany', 'xcmg', 'zoomlion'];
    const loaderBrands = ['jcb', 'case', 'new holland', 'bobcat', 'kubota', 'takeuchi', 'terex', 'volvo construction', 'caterpillar', 'cat', 'komatsu'];
    const craneBrands = ['liebherr', 'tadano', 'grove', 'manitowoc', 'terex', 'demag', 'xcmg', 'sany', 'zoomlion'];

    if (excavatorBrands.includes(brandLower)) {
      typeEnforcement = 'HYDRAULIC EXCAVATOR: tracked undercarriage with metal tracks, rotating upper structure (cab), articulated boom arm with bucket attachment, construction equipment proportions, industrial yellow/orange color scheme typical for construction machinery';
    } else if (loaderBrands.includes(brandLower)) {
      if (model.toLowerCase().includes('backhoe')) {
        typeEnforcement = 'BACKHOE LOADER: four-wheeled construction vehicle with front bucket loader and rear excavator arm, construction equipment design, industrial proportions';
      } else {
        typeEnforcement = 'WHEEL LOADER: large front bucket, articulated steering frame, four large construction wheels, heavy-duty construction equipment proportions';
      }
    } else if (craneBrands.includes(brandLower)) {
      typeEnforcement = 'MOBILE CRANE: telescopic boom, counterweights, outriggers, construction crane equipment';
    } else {
      typeEnforcement = 'HEAVY CONSTRUCTION EQUIPMENT: industrial construction machinery with heavy-duty components, construction equipment proportions, industrial design';
    }
  } else if (vt === 'boat') {
    typeEnforcement = 'Watercraft boat on water, visible hull and deck, no wheels, maritime environment, reflections on water';
  } else {
    typeEnforcement = 'Passenger car proportions';
  }

  // Описания углов
  const angleDescriptions: Record<string, string> = {
    'front': `front view of the same ${vt}, centered, showing grille, headlights, bumper`,
    'side': `side profile of the same ${vt}, complete silhouette, doors and windows visible`,
    'rear': `rear view of the same ${vt}, taillights and rear bumper visible`,
    'front_left': `front-left three-quarter view of the same ${vt}`,
    'front_right': `front-right three-quarter view of the same ${vt}`,
    'rear_left': `rear-left three-quarter view of the same ${vt}`,
    'rear_right': `rear-right three-quarter view of the same ${vt}`,
    'interior': `interior view of the same ${vt}, dashboard, seats, steering wheel`,
    'details': `close-up detail shot of the same ${vt}, focusing on design elements`
  };

  // Стили
  const styleDescriptions: Record<string, string> = {
    'realistic': 'photorealistic, ultra-realistic, high quality professional automotive photography, studio lighting, commercial grade quality, sharp focus, detailed textures',
    'professional': 'professional automotive photography, studio lighting, commercial quality, showroom presentation',
    'artistic': 'artistic automotive photography, dramatic lighting, creative composition'
  };

  // Элементы консистентности
  const consistencyElements = [
    `SAME EXACT unique vehicle across all images (vehicle ID: CAR-${carSessionId})`,
    'IDENTICAL proportions, trims, wheels, and all visual details in every shot',
    'SAME body type/cabin type in ALL images (if truck - same cabin design, if car - same body style)',
    'SAME wheel design and size in ALL images',
    'SAME color shade and finish in ALL images',
    'CONSISTENT vehicle type - if motorcycle then ONLY motorcycle, if car then ONLY car',
    'same lighting conditions and color temperature throughout series',
    'same photographic style and post-processing',
    'single subject, no people, clean neutral background',
    'maintain exact same vehicle specifications and appearance',
    'DO NOT generate different vehicles or variants - must be THE EXACT SAME vehicle from different angles'
  ];

  // Realism enforcement (physical correctness) - СТРОГИЕ ограничения
  const wheelCountMap: Record<string, string> = {
    'car': 'exactly 4 wheels',
    'truck': '6 or more wheels (multi-axle configuration)',
    'motorcycle': 'exactly 2 wheels, NO more, NO less',
    'bus': 'exactly 4 or 6 wheels',
    'van': 'exactly 4 wheels',
    'trailer': '2 or more wheels (no engine, no steering wheel)',
    'boat': 'no wheels (watercraft)',
    'special': 'varies by equipment type (4-8 wheels typical)'
  };
  
  const steeringCountMap: Record<string, string> = {
    'car': 'exactly 1 steering wheel',
    'truck': 'exactly 1 steering wheel',
    'motorcycle': 'exactly 1 handlebar, NO steering wheel, NO multiple handlebars',
    'bus': 'exactly 1 steering wheel',
    'van': 'exactly 1 steering wheel',
    'trailer': 'NO steering wheel (unpowered trailer)',
    'boat': '1 helm/wheel (marine steering)',
    'special': '1 steering wheel or joystick controls'
  };
  
  const correctWheels = wheelCountMap[vt] || 'appropriate wheel count for vehicle type';
  const correctSteering = steeringCountMap[vt] || 'appropriate steering mechanism';
  
  const realismElements = [
    `PHYSICALLY CORRECT ${vt.toUpperCase()} configuration`,
    `REALISTIC vehicle design based on real-world ${carData.brand} ${carData.model} ${carData.year}`,
    `EXACTLY ${correctWheels} - NO extra wheels, NO missing wheels`,
    `EXACTLY ${correctSteering} - NO multiple steering mechanisms`,
    'Real-world engineering principles and functional design',
    'Professional quality, photorealistic rendering',
    'NO absurd or impossible features',
    'NO floating parts, NO impossible proportions',
    'NO cartoon elements, NO fantasy designs',
    'Realistic materials, textures, and finishes'
  ];

  // Негативные промпты в зависимости от типа ТС + физические невозможности
  const physicalImpossibilities = [
    'NO motorcycle with 4 wheels',
    'NO car with excavator arm',
    'NO trailer with steering wheel',
    'NO multiple steering wheels',
    'NO multiple handlebars',
    'NO floating parts',
    'NO impossible angles or proportions',
    'NO absurd configurations',
    'NO 5 wheels on car',
    'NO 3 wheels on motorcycle',
    'NO 2 steering wheels',
    'NO impossible vehicle configurations'
  ];
  
  // Добавляем специфичные негативные промпты в зависимости от типа ТС
  if (vt === 'motorcycle') {
    physicalImpossibilities.push('4 wheels', 'car body', 'enclosed cabin', 'steering wheel', 'multiple handlebars');
  } else if (vt === 'car') {
    physicalImpossibilities.push('motorcycle handlebars', '5 wheels', '3 wheels', 'excavator arm', 'construction equipment');
  } else if (vt === 'truck') {
    physicalImpossibilities.push('passenger car body', 'sedan styling', 'motorcycle design');
  } else if (vt === 'trailer') {
    physicalImpossibilities.push('engine', 'driver cabin', 'steering wheel', 'powered vehicle');
  }

  let negativePrompt = 'cartoon, anime, drawing, sketch, low quality, blurry, distorted proportions, multiple vehicles, people, text, watermarks, ' + physicalImpossibilities.join(', ');

  if (vt === 'special') {
    negativePrompt = 'ABSOLUTELY NOT a passenger car, NOT a sedan, NOT a hatchback, NOT a coupe, NOT a regular truck, NOT a van, NOT a bus, NO passenger vehicle design, NO car wheels, NO automotive styling, ' + negativePrompt;
  } else if (vt === 'truck') {
    negativePrompt = 'NOT a passenger car, NOT a sedan, NOT a hatchback, NOT a van, NOT a bus, ' + negativePrompt;
  } else if (vt === 'bus') {
    negativePrompt = 'NOT a passenger car, NOT a van, NOT a truck, ' + negativePrompt;
  } else if (vt === 'motorcycle') {
    negativePrompt = 'NOT a car, NOT 4 wheels, NOT enclosed cabin, NO car body, ' + negativePrompt;
  }

  if (condition) parts.push(`Condition: ${condition}`);
  if (description) parts.push(`Scene: ${description}`);

  const basePrompt = parts.join(', ');
  const anglePrompt = angleDescriptions[angle] || `automotive photography of the same ${vt}`;
  const stylePrompt = styleDescriptions[style] || style || 'realistic';
  const consistencyPrompt = consistencyElements.concat([`Series ID: CAR-${carSessionId}`]).join(', ');
  const realismPrompt = realismElements.join(', ');

  // Финальный структурированный промпт с усиленным реализмом и консистентностью
  return [
    `${basePrompt}. ${strictBranding}. ${typeEnforcement}.`,
    `Angle: ${anglePrompt}. Style: ${stylePrompt}. ${consistencyPrompt}. ${realismPrompt}.`,
    `Ultra-realistic, photorealistic quality, high resolution, clean neutral background, professional automotive photography, sharp focus, detailed textures, consistent vehicle appearance across all angles.`,
    `NEGATIVE: ${negativePrompt}`
  ].join(' ');
}

/**
 * Get title for specific angle
 */
function getAngleTitle(angle: string, formData: Partial<CarAdFormData>): string {
  const carInfo = `${formData.brand} ${formData.model} ${formData.year}`;

  const angleTitles = {
    front: `${carInfo} - Вид спереди`,
    side: `${carInfo} - Боковой вид`,
    rear: `${carInfo} - Вид сзади`,
    interior: `${carInfo} - Салон`,
    engine: `${carInfo} - Двигатель`,
    dashboard: `${carInfo} - Панель приборов`
  };

  return angleTitles[angle as keyof typeof angleTitles] || `${carInfo} - ${angle}`;
}

/**
 * Generate placeholder image URL as fallback
 */
function hashToSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h % 1000000; // pollinations seed range
}

function generatePlaceholderImage(prompt: string, width = 800, height = 600): string {
  // Consistent seed-based picsum URL — always loads, never 500s
  let h = 0;
  for (let i = 0; i < prompt.length; i++) {
    h = (Math.imul(h, 31) + prompt.charCodeAt(i)) | 0;
  }
  const seed = Math.abs(h).toString(16).padStart(8, '0');
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}
