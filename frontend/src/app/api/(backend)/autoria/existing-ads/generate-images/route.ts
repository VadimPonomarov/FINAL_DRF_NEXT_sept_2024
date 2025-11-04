import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationHeaders } from '@/shared/constants/headers';
import { buildCanonicalCarData } from '@/modules/autoria/shared/utils/imageNormalization';


interface GenerateImagesRequest {
  imageTypes: string[];
  mode?: 'add' | 'replace' | 'update';
  replaceExisting?: boolean;
  onlyMissing?: boolean;
  replaceEmpty?: boolean;
  maxAds?: number | null;
}

export async function POST(request: NextRequest) {
  try {
    let body: GenerateImagesRequest;

    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('❌ JSON parsing error:', jsonError);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          message: 'Система не готова до генерації зображень'
        },
        { status: 400 }
      );
    }

    const {
      imageTypes = ['front', 'side'],
      mode = 'add',
      replaceExisting = false,
      onlyMissing = true,
      replaceEmpty = false,
      maxAds = null
    } = body;

    console.log('🎨 [existing-ads/generate-images] Starting image generation for existing ads:', {
      imageTypes,
      mode,
      replaceExisting,
      onlyMissing,
      replaceEmpty,
      maxAds
    });

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Сначала получаем список существующих объявлений
    const adsResponse = await fetch(`${backendUrl}/api/ads/cars/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!adsResponse.ok) {
      throw new Error(`Failed to fetch existing ads: ${adsResponse.status}`);
    }

    const adsData = await adsResponse.json();
    const ads = adsData.results || [];

    console.log(`📋 Found ${ads.length} existing ads to process`);

    let processed = 0;
    let totalImages = 0;
    const errors: string[] = [];

    // Обрабатываем каждое объявление
    for (const ad of ads) {
      try {
        const brand = ad.brand?.name || ad.brand || 'Unknown';
        const model = ad.model?.name || ad.model || 'Unknown';
        const year = ad.year || new Date().getFullYear();
        const color = ad.color?.name || ad.color || 'silver';
        const bodyType = ad.body_type?.name || ad.body_type || 'sedan';

        console.log(`🚗 Processing ad ${ad.id}: ${brand} ${model} ${year}`);

        // Helpers to normalize values consistently
        const normalizeVehicleType = (raw?: any, rawName?: any): string => {
          const s = String(raw ?? '').toLowerCase().trim();
          const name = String(rawName ?? '').toLowerCase().trim();
          const byId: Record<string, string> = { '1': 'car', '2': 'truck', '3': 'motorcycle', '4': 'bus', '5': 'van', '6': 'trailer' };
          if (byId[s]) return byId[s];
          const map: Record<string, string> = {
            'легковой': 'car', 'легковий': 'car', 'легковые автомобили': 'car', 'легкові автомобілі': 'car', 'автомобиль': 'car', 'auto': 'car', 'car': 'car',
            'грузовой': 'truck', 'грузовик': 'truck', 'вантажівка': 'truck', 'грузовые автомобили': 'truck', 'вантажні автомобілі': 'truck', 'truck': 'truck',
            'мотоцикл': 'motorcycle', 'мотоцикли': 'motorcycle', 'скутер': 'motorcycle', 'motorcycle': 'motorcycle',
            'автобус': 'bus', 'автобуси': 'bus', 'bus': 'bus',
            'фургон': 'van', 'мінівен': 'van', 'минивэн': 'van', 'van': 'van', 'minivan': 'van',
            'прицеп': 'trailer', 'полуприцеп': 'trailer', 'trailer': 'trailer'
          };
          if (map[s]) return map[s];
          if (map[name]) return map[name];
          // ❌ FALLBACK DISABLED: No default fallback to 'car'
          console.warn(`[ExistingAds] ❌ normalizeVehicleType: Unknown vehicle type raw='${raw}', rawName='${rawName}', no fallback`);
          return null;
        };
        const vt = normalizeVehicleType((ad as any).vehicle_type, (ad as any).vehicle_type_name);

        // Генерируем изображения для этого объявления
        console.log(`🎨 Generating images for ${brand} ${model} ${year} (${color} ${bodyType})`);
        const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
        // Используем улучшенный endpoint для генерации изображений
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        // Route through our strict, normalized frontend generator to avoid RU/UA literals and brand/type mixups
        const formData = {
          brand,
          brand_name: brand,
          model,
          model_name: model,
          year,
          color: String(color).toLowerCase(),
          body_type: String(bodyType).toLowerCase(),
          vehicle_type: vt,
          vehicle_type_name: (ad as any).vehicle_type_name || vt,
          condition: (ad as any).condition || 'good',
          description: (ad as any).description || ''
        } as any;

        const imageResponse = await fetch(`${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/api/llm/generate-car-images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formData, angles: imageTypes, style: 'realistic', quality: 'standard', useDescription: true })
        });

        console.log(`📡 Image generation response status for ${brand} ${model}: ${imageResponse.status}`);

        if (imageResponse.ok) {
          const imageResult = await imageResponse.json();
          if (imageResult.success && imageResult.images) {
            // Сохраняем сгенерированные изображения в базу данных
            console.log(`💾 Starting to save ${imageResult.images.length} images for ${brand} ${model}`);
            let savedCount = 0;
            for (const image of imageResult.images) {
              try {
                console.log(`🔄 Attempting to save image: ${image.title} for ${brand} ${model}`);

                // Получаем авторизационные заголовки
                const authHeaders = await getAuthorizationHeaders();
                console.log(`🔑 Got auth headers for ${brand} ${model}`);

                const savePayload = {
                  image_url: image.url,
                  caption: image.title,
                  is_primary: image.isMain || false,
                  order: imageResult.images.indexOf(image)
                };

                console.log(`📤 Saving image payload for ${brand} ${model}:`, savePayload);

                const saveResponse = await fetch(`${backendUrl}/api/ads/${ad.id}/images`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders,
                  },
                  body: JSON.stringify(savePayload),
                });

                console.log(`💾 Save response status for ${brand} ${model}: ${saveResponse.status}`);

                if (saveResponse.ok) {
                  savedCount++;
                  totalImages++;
                  console.log(`✅ Successfully saved image for ${brand} ${model} (${savedCount}/${imageResult.images.length})`);
                } else {
                  const errorText = await saveResponse.text();
                  console.error(`❌ Failed to save image for ${brand} ${model}:`, errorText);
                  errors.push(`Failed to save image for ${brand} ${model}: ${errorText}`);
                }
              } catch (saveError) {
                console.error(`❌ Error saving image for ${brand} ${model}:`, saveError);
                errors.push(`Error saving image for ${brand} ${model}: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`);
              }
            }

            if (savedCount > 0) {
              processed++;
              console.log(`✅ Successfully processed ad ${ad.id}: ${brand} ${model} with ${savedCount} images`);
            }
          } else {
            console.warn(`⚠️ No images generated for ${brand} ${model}`);
            errors.push(`No images generated for ${brand} ${model}`);
          }
        } else {
          const errorText = await imageResponse.text();
          console.error(`❌ Image generation failed for ${brand} ${model}:`, errorText);
          errors.push(`Image generation failed for ${brand} ${model}: ${errorText}`);
        }

      } catch (error) {
        console.error(`❌ Error processing ad ${ad.id}:`, error);
        errors.push(`Ad ${ad.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const successMessage = `Обработано ${processed} объявлений, сгенерировано ${totalImages} изображений`;
    const errorMessage = errors.length > 0 ? `Ошибки: ${errors.length}` : '';
    const finalMessage = errorMessage ? `${successMessage}. ${errorMessage}` : successMessage;

    console.log(`🎉 Image generation completed: ${finalMessage}`);

    return NextResponse.json({
      success: true,
      message: finalMessage,
      processed,
      totalImages,
      errors: errors.slice(0, 5) // Ограничиваем количество ошибок в ответе
    });

  } catch (error) {
    console.error('❌ Error in generate-images endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate images for existing ads',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
