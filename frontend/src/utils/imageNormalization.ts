/**
 * Shared normalization helpers for image generation.
 * Enforces strict cascade: vehicleType → brand/model → color → condition
 */

export type CanonicalVehicleType = 'car' | 'truck' | 'motorcycle' | 'bus' | 'van' | 'trailer' | 'boat';

const COLOR_MAP: Record<string, string> = {
  'черный': 'black', 'чорний': 'black', 'black': 'black',
  'белый': 'white', 'білий': 'white', 'white': 'white',
  'серебристый': 'silver', 'сріблястий': 'silver', 'серебристий': 'silver', 'silver': 'silver',
  'серый': 'gray', 'сірий': 'gray', 'gray': 'gray', 'grey': 'gray',
  'красный': 'red', 'червоний': 'red', 'red': 'red',
  'синий': 'blue', 'синій': 'blue', 'blue': 'blue',
  'зеленый': 'green', 'зелений': 'green', 'green': 'green',
  'желтый': 'yellow', 'жовтий': 'yellow', 'yellow': 'yellow',
  'оранжевый': 'orange', 'помаранчевий': 'orange', 'orange': 'orange',
  'коричневый': 'brown', 'коричневий': 'brown', 'brown': 'brown',
  'фиолетовый': 'purple', 'фіолетовий': 'purple', 'purple': 'purple',
  'золотой': 'gold', 'золотий': 'gold', 'gold': 'gold'
};

const CONDITION_MAP: Record<string, 'excellent'|'good'|'fair'|'poor'|'damaged'> = {
  'new': 'excellent', 'новый': 'excellent', 'новий': 'excellent',
  'like_new': 'excellent', 'excellent': 'excellent',
  'used': 'good', 'б/у': 'good', 'вживаний': 'good', 'good': 'good',
  'fair': 'fair', 'среднее': 'fair', 'задовільний': 'fair',
  'poor': 'poor', 'плохое': 'poor', 'поганий': 'poor',
  'damaged': 'damaged', 'поврежден': 'damaged', 'пошкоджений': 'damaged'
};

// Map localized body types to English canonical
const BODY_TYPE_MAP: Record<string, string> = {
  // cars
  'седан': 'sedan', 'sedan': 'sedan',
  'хэтчбек': 'hatchback', 'хетчбек': 'hatchback', 'хетчбэк': 'hatchback', 'хетчбек': 'hatchback', 'hatchback': 'hatchback',
  'универсал': 'wagon', 'комби': 'wagon', 'wagon': 'wagon', 'estate': 'wagon',
  'внедорожник': 'suv', 'джип': 'suv', 'кроссовер': 'suv', 'позашляховик': 'suv', 'suv': 'suv', 'crossover': 'suv',
  'купе': 'coupe', 'coupe': 'coupe',
  'кабриолет': 'convertible', 'родстер': 'convertible', 'convertible': 'convertible', 'roadster': 'convertible',
  'пикап': 'pickup', 'пікап': 'pickup', 'pickup': 'pickup',
  // vans / mpv
  'фургон': 'van', 'микроавтобус': 'van', 'минивэн': 'van', 'мінівен': 'van', 'van': 'van', 'mpv': 'van',
  // trucks
  'тягач': 'semi-truck', 'седельный тягач': 'semi-truck', 'полуприцеп': 'curtainsider', 'прицеп': 'curtainsider',
  'бортовой': 'flatbed', 'рефрижератор': 'refrigerated',
  // bus
  'автобус': 'coach', 'мікроавтобус': 'van', 'coach': 'coach',
  // motorcycle
  'мотоцикл': 'sport', 'scooter': 'scooter',
};

const ALLOWED_TYPES: CanonicalVehicleType[] = ['car','truck','motorcycle','bus','van','trailer','boat'];

export function normalizeVehicleTypeStrict(rawType?: any, rawTypeName?: any, brand?: any, bodyType?: any): CanonicalVehicleType {
  const s = String(rawType ?? '').toLowerCase().trim();
  const name = String(rawTypeName ?? '').toLowerCase().trim();
  const body = String(bodyType ?? '').toLowerCase().trim();

  const byId: Record<string, CanonicalVehicleType> = {
    '1': 'car','2': 'truck','3': 'motorcycle','4': 'bus','5': 'van','6': 'trailer'
  };
  if (byId[s]) return byId[s];

  const map: Record<string, CanonicalVehicleType> = {
    'легковой':'car','легковий':'car','легковые автомобили':'car','легкові автомобілі':'car','автомобиль':'car','авто':'car','car':'car',
    'грузовой':'truck','грузовик':'truck','вантажівка':'truck','truck':'truck',
    'мотоцикл':'motorcycle','мотоцикли':'motorcycle','скутер':'motorcycle','motorcycle':'motorcycle',
    'автобус':'bus','автобуси':'bus','bus':'bus',
    'фургон':'van','мінівен':'van','минивэн':'van','van':'van','minivan':'van',
    'прицеп':'trailer','полуприцеп':'trailer','trailer':'trailer',
    // water/boats
    'водный транспорт':'boat','водний транспорт':'boat','лодка':'boat','катер':'boat','яхта':'boat','гидроцикл':'boat','гідроцикл':'boat','boat':'boat','yacht':'boat','ship':'boat'
  };
  if (map[s]) return map[s];
  if (map[name]) return map[name];

  // ❌ HEURISTICS DISABLED: No brand-based overrides, no fallback to 'car'
  console.warn(`[ImageNormalization] ❌ normalizeVehicleTypeStrict: Unknown vehicle type rawType='${rawType}', rawTypeName='${rawTypeName}', brand='${brand}', bodyType='${bodyType}' - NO FALLBACK`);

  // Return null instead of 'car' fallback to force using real API data
  return null as any;
}

export function normalizeBrandModelDisplay(brand?: any, brand_name?: any, model?: any, model_name?: any): { brand: string; model: string } {
  const brandDisplay = (typeof brand_name === 'string' && brand_name.trim())
    ? brand_name.trim()
    : ((typeof brand === 'string' && isNaN(Number(brand))) ? brand.trim() : '');
  const modelDisplay = (typeof model_name === 'string' && model_name.trim())
    ? model_name.trim()
    : ((typeof model === 'string' && !/^[0-9]+$/.test(model)) ? model.trim() : '');
  return {
    brand: brandDisplay || 'Generic',
    model: modelDisplay || (typeof model === 'string' ? model : 'Vehicle')
  };
}

export function normalizeColorName(color?: any, color_name?: any): string {
  const raw = String((typeof color === 'string' ? color : color_name) ?? '').toLowerCase().trim();
  return COLOR_MAP[raw] || raw || 'silver';
}

export function normalizeCondition(cond?: any): 'excellent'|'good'|'fair'|'poor'|'damaged' {
  const raw = String(cond ?? '').toLowerCase().trim();
  return CONDITION_MAP[raw] || 'good';
}

export function normalizeBodyTypeByVehicle(type: CanonicalVehicleType, bodyType?: any): string {
  const raw = String(bodyType ?? '').toLowerCase().trim();
  if (raw) return raw;
  switch (type) {
    case 'truck': return 'semi-truck';
    case 'motorcycle': return 'sport';
    case 'bus': return 'coach';
    case 'van': return 'van';
    case 'trailer': return 'curtainsider';
    case 'boat': return 'motorboat';
    default: return 'sedan';
  }
}

export function buildCanonicalCarData(formData: any) {
  const { brand, brand_name, model, model_name, body_type, vehicle_type, vehicle_type_name, color, color_name, condition, year, description } = formData || {};

  // ❌ NORMALIZATION DISABLED: Use ONLY real vehicle_type_name from API
  // NO OVERRIDES, NO HEURISTICS, NO FALLBACKS
  const vt = vehicle_type_name || 'car'; // Use real name or minimal fallback

  const { brand: brandDisplay, model: modelDisplay } = normalizeBrandModelDisplay(brand, brand_name, model, model_name);
  const colorDisplay = normalizeColorName(color, color_name);
  const bodyTypeDisplay = normalizeBodyTypeByVehicle(vt as any, body_type);
  const conditionDisplay = normalizeCondition(condition);

  console.log(`[ImageNormalization] ✅ buildCanonicalCarData: Using REAL vehicle_type_name='${vehicle_type_name}' (not normalized)`);

  return {
    brand: brandDisplay,
    model: modelDisplay,
    year,
    color: colorDisplay,
    body_type: bodyTypeDisplay,
    vehicle_type: vt,
    vehicle_type_name: vehicle_type_name || vt, // Preserve original name
    condition: conditionDisplay,
    description: description || ''
  };
}

