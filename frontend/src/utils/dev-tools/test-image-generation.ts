/*
 * Test script: validates image generation relevance from structured ad data
 * Usage: npm run test:image-generation
 */

import CarImageGeneratorService, { CarImageParams, GeneratedCarImage } from '@/services/carImageGenerator.service';
import { generateFullMockData } from '@/utils/mockData';

// Lightweight normalizer mirroring mockData.ts
function normalizeVehicleType(name?: string): string {
  const n = (name || '').toLowerCase().trim();
  const map: Record<string, string> = {
    // cars
    'легковой': 'car', 'легковий': 'car', 'легковые автомобили': 'car', 'легкові автомобілі': 'car', 'автомобиль': 'car', 'авто': 'car', 'car': 'car', 'passenger car': 'car',
    // trucks
    'грузовой': 'truck', 'грузовик': 'truck', 'вантажівка': 'truck', 'грузовые автомобили': 'truck', 'вантажні автомобілі': 'truck', 'truck': 'truck', 'commercial vehicle': 'truck',
    // motorcycle
    'мотоцикл': 'motorcycle', 'мотоцикли': 'motorcycle', 'motorcycle': 'motorcycle', 'мопед': 'motorcycle', 'скутер': 'motorcycle',
    // bus
    'автобус': 'bus', 'автобуси': 'bus', 'bus': 'bus', 'маршрутка': 'bus',
    // van
    'фургон': 'van', 'фургони': 'van', 'van': 'van', 'минивэн': 'van', 'мінівен': 'van', 'minivan': 'van',
    // trailer
    'прицеп': 'trailer', 'полуприцеп': 'trailer', 'trailer': 'trailer'
  };
  return map[n] || 'car';
}

function mapCondition(c?: string): 'excellent' | 'good' | 'fair' | 'poor' {
  const n = (c || '').toLowerCase();
  if (n === 'new' || n === 'excellent') return 'excellent';
  if (n === 'damaged' || n === 'poor') return 'poor';
  if (n === 'fair') return 'fair';
  return 'good';
}

function buildParamsFromAd(ad: any): CarImageParams {
  return {
    brand: ad.brand_name || (typeof ad.brand === 'string' && isNaN(Number(ad.brand)) ? ad.brand : 'Unknown'),
    model: ad.model || ad.model_name || 'Model',
    year: Number(ad.year) || new Date().getFullYear(),
    color: ad.color_name || (typeof ad.color === 'string' && isNaN(Number(ad.color)) ? ad.color : 'silver'),
    bodyType: ad.body_type || 'sedan',
    vehicleType: normalizeVehicleType(ad.vehicle_type_name || ad.vehicle_type),
    vehicleTypeName: ad.vehicle_type_name || ad.vehicle_type,
    condition: mapCondition(ad.condition),
    description: ad.description || ''
  };
}

function assertIncludes(text: string, parts: string[], label: string) {
  for (const p of parts) {
    if (!text.toLowerCase().includes(String(p).toLowerCase())) {
      throw new Error(`${label} does not include ${p}; got: ${text}`);
    }
  }
}

async function runOneCase(name: string, adData: any, expectedType?: string): Promise<{ name: string; ok: boolean; details?: string }> {
  try {
    const params = buildParamsFromAd(adData);
    if (expectedType) {
      const vt = params.vehicleType || 'car';
      if (vt !== expectedType) {
        throw new Error(`vehicleType mismatch: expected ${expectedType}, got ${vt} (src: ${adData.vehicle_type_name || adData.vehicle_type})`);
      }
    }

    const images = CarImageGeneratorService.generateCarImageSet(params);
    if (!images || images.length === 0) throw new Error('No images generated');

    // Validate each image title contains brand, model, year
    images.forEach((img: GeneratedCarImage) => {
      assertIncludes(img.title, [params.brand, params.model, String(params.year)], `title[${img.angle}]`);
      if (!img.url || typeof img.url !== 'string') throw new Error(`Empty URL for angle ${img.angle}`);
    });

    return { name, ok: true };
  } catch (e: any) {
    return { name, ok: false, details: e?.message || String(e) };
  }
}

async function run() {
  const cases: Array<{ name: string; ad: any; expectedType?: string }> = [
    { name: 'car/BMW sedan', ad: { brand_name: 'BMW', model: '3 Series', year: 2020, color: 'black', body_type: 'sedan', vehicle_type_name: 'легковой', condition: 'used' }, expectedType: 'car' },
    { name: 'truck/Volvo FH', ad: { brand_name: 'Volvo', model: 'FH', year: 2018, color: 'white', body_type: 'truck', vehicle_type_name: 'грузовой', condition: 'used' }, expectedType: 'truck' },
    { name: 'motorcycle/Yamaha R1', ad: { brand_name: 'Yamaha', model: 'YZF-R1', year: 2019, color: 'blue', body_type: 'sport', vehicle_type_name: 'мотоцикл', condition: 'used' }, expectedType: 'motorcycle' },
    { name: 'bus/Setra S 516', ad: { brand_name: 'Setra', model: 'S 516', year: 2017, color: 'yellow', body_type: 'coach', vehicle_type_name: 'автобус', condition: 'used' }, expectedType: 'bus' },
    { name: 'van/Sprinter', ad: { brand_name: 'Mercedes-Benz', model: 'Sprinter', year: 2022, color: 'silver', body_type: 'van', vehicle_type_name: 'фургон', condition: 'used' }, expectedType: 'van' },
    { name: 'trailer/Schmitz Curtainsider', ad: { brand_name: 'Schmitz Cargobull', model: 'Curtainsider', year: 2016, color: 'white', body_type: 'curtainsider', vehicle_type_name: 'прицеп', condition: 'used' }, expectedType: 'trailer' },
  ];

  // Add 3 random fallback-generated cases to mimic full pipeline mapping
  for (let i = 0; i < 3; i++) {
    try {
      const ad = await generateFullMockData(); // will fallback safely if API unavailable
      cases.push({ name: `random-${i + 1}`, ad });
    } catch {
      // ignore
    }
  }

  let passed = 0;
  const results = [] as Array<{ name: string; ok: boolean; details?: string }>;

  for (const c of cases) {
    const r = await runOneCase(c.name, c.ad, c.expectedType);
    results.push(r);
    if (r.ok) passed++;
  }

  const failed = results.length - passed;
  console.log('\n===== Image Generation Relevance Tests =====');
  results.forEach(r => console.log(`${r.ok ? '✅' : '❌'} ${r.name}${r.ok ? '' : ' — ' + r.details}`));
  console.log(`Summary: ${passed}/${results.length} passed, ${failed} failed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

run().catch(err => {
  console.error('Fatal error in test runner:', err);
  process.exit(1);
});

