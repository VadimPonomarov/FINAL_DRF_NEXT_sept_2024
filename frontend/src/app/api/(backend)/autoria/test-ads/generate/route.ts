import { NextRequest, NextResponse } from 'next/server';
import { generateFullMockData } from '@/modules/autoria/shared/utils/mockData';
import { ServerAuthManager } from '@/shared/utils/auth/serverAuth';
import { mapFormDataToApiData } from '@/modules/autoria/shared/utils/carAdDataMapper';
import type { CarAdFormData } from '@/modules/autoria/shared/types/autoria';
import type { AutoRiaUser } from '@/services/autoria/users.service';

// Types
type HeadersRecord = Record<string, string>;
type AuthenticatedRequestInit = RequestInit & { headers?: HeadersRecord };
type AuthFetchFn = (url: string, options?: AuthenticatedRequestInit) => Promise<Response>;

interface GenerationResult {
  success: boolean;
  title: string;
  imagesCount?: number;
  id?: number;
  user?: string;
  error?: string;
  index?: number;
  debug?: Record<string, unknown>;
}

// Configuration
// Use the same normalization approach as the generic backend proxy:
// 1) Prefer server-side BACKEND_URL, fallback to NEXT_PUBLIC_BACKEND_URL
// 2) Trim trailing slashes
// 3) Strip a trailing /api if someone accidentally included it in env
const RAW_BACKEND_BASE = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const BACKEND_URL = RAW_BACKEND_BASE.replace(/\/+$/, '').replace(/\/(api)\/?$/i, '');
const CREATE_AD_TIMEOUT_MS = 30000;
const IMAGE_GEN_TIMEOUT_MS = 60000;
const IMAGE_SAVE_TIMEOUT_MS = 15000;
const MAX_ADS_LIMIT = 3;

// Seeding control - prevent simultaneous generations
const GENERATION_LOCK_KEY = 'test_ads_generation_in_progress';
const GENERATION_LOCK_TIMEOUT = 300000; // 5 minutes

// Utility functions
const mergeHeaders = (...headerSets: Array<HeadersInit | undefined>): HeadersRecord => {
  const result: HeadersRecord = {};
  headerSets.forEach(headerInit => {
    if (!headerInit) return;
    const headers = new Headers(headerInit);
    headers.forEach((value, key) => {
      result[key] = value;
    });
  });
  return result;
};

const createTimeoutController = (timeoutMs: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
};

// Authentication helpers
const createAuthFetch = (requestOrToken: NextRequest | string): AuthFetchFn => {
  const accessToken = typeof requestOrToken === 'string' ? requestOrToken : null;
  const request = typeof requestOrToken === 'string' ? null : requestOrToken;

  // 1) Явный accessToken (используется, когда серверной функции передают токен напрямую)
  if (accessToken) {
    return (url, options = {}) => {
      const headers = mergeHeaders(
        { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        options.headers
      );
      return fetch(url, { ...options, headers });
    };
  }

  // 2) Если route вызван с клиента через fetchWithAuth, в запросе уже есть Authorization
  return async (url, options = {}) => {
    if (!request) {
      throw new Error('Request is required for ServerAuthManager.authenticatedFetch');
    }

    const incomingAuth =
      request.headers.get('authorization') || request.headers.get('Authorization') || '';

    if (incomingAuth) {
      const headers = mergeHeaders(
        { 'Content-Type': 'application/json', Authorization: incomingAuth },
        options.headers
      );
      return fetch(url, { ...options, headers });
    }

    // 3) Fallback: используем ServerAuthManager, который достанет backend-токены из Redis
    return ServerAuthManager.authenticatedFetch(request, url, options);
  };
};

// Core ad creation function
const createSingleAd = async (
  authFetch: AuthFetchFn,
  formData: CarAdFormData,
  includeImages: boolean,
  imageTypes: string[],
  index: number
): Promise<GenerationResult> => {
  const { controller, timeoutId } = createTimeoutController(CREATE_AD_TIMEOUT_MS);
  
  try {
    const apiPayload = mapFormDataToApiData(formData);
    console.log(`🚗 [TestAds] Creating ad ${index + 1}: ${formData.title}`);

    const response = await authFetch(`${BACKEND_URL}/api/ads/cars/create`, {
      method: 'POST',
      body: JSON.stringify(apiPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [TestAds] Failed to create ad ${index + 1}:`, response.status, errorText);
      return {
        success: false,
        title: formData.title || `Test Ad ${index + 1}`,
        imagesCount: 0,
        error: `HTTP ${response.status}: ${errorText}`,
        index: index + 1
      };
    }

    const createdAd = await response.json();
    let savedCount = 0;

    // Generate images if requested, с ретраями при отсутствии изображений
    if (includeImages && imageTypes.length > 0) {
      const maxImageAttempts = 2;

      for (let attempt = 1; attempt <= maxImageAttempts; attempt++) {
        savedCount = await generateAndSaveImages(authFetch, createdAd, imageTypes);

        if (savedCount > 0) {
          if (attempt > 1) {
            console.log(
              `✅ [TestAds] Images generated successfully for ad ${createdAd.id} on retry #${attempt}`
            );
          }
          break;
        }

        console.warn(
          `⚠️ [TestAds] No images saved for ad ${createdAd.id} on attempt ${attempt}/${maxImageAttempts}`
        );
      }
    }

    console.log(`✅ [TestAds] Ad ${index + 1} created successfully with ${savedCount} images`);

    return {
      success: true,
      title: formData.title || `Test Ad ${index + 1}`,
      id: createdAd.id,
      user: 'current-session',
      imagesCount: savedCount
    };

  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`⏱️ [TestAds] Timeout creating ad ${index + 1}`);
      return {
        success: false,
        title: formData.title || `Test Ad ${index + 1}`,
        imagesCount: 0,
        error: 'Request timeout',
        index: index + 1
      };
    }

    const message = error instanceof Error ? error.message : String(error);

    // Пробрасываем ошибки аутентификации наверх, чтобы верхний handler вернул NOT_AUTHENTICATED
    if (
      message.includes('No authentication tokens') ||
      message.includes('backend_auth tokens missing') ||
      message.includes('Failed to refresh access token') ||
      message.includes('Authentication failed')
    ) {
      console.error(`❌ [TestAds] Auth error creating ad ${index + 1}:`, message);
      throw (error instanceof Error ? error : new Error(message));
    }

    console.error(`❌ [TestAds] Error creating ad ${index + 1}:`, error);
    return {
      success: false,
      error: message,
      title: formData.title || `Test Ad ${index + 1}`,
      imagesCount: 0,
      index: index + 1
    };
  }
};

// Image generation and saving
const generateAndSaveImages = async (
  authFetch: AuthFetchFn,
  createdAd: any,
  imageTypes: string[]
): Promise<number> => {
  try {
    console.log(`🎨 [TestAds] Generating images for ad ${createdAd.id}...`);

    // Получаем vehicle_type_name из разных источников
    let vehicleTypeName = createdAd?.vehicle_type_name || createdAd?.dynamic_fields?.vehicle_type_name;
    
    // Если vehicle_type_name отсутствует, пробуем получить из полных данных объявления
    if (!vehicleTypeName && createdAd?.id) {
      try {
        console.log(`🔍 [TestAds] Fetching full ad data to get vehicle_type_name...`);
        const adResponse = await authFetch(`${BACKEND_URL}/api/ads/cars/${createdAd.id}/`);
        if (adResponse.ok) {
          const fullAdData = await adResponse.json();
          vehicleTypeName = fullAdData?.vehicle_type_name || fullAdData?.dynamic_fields?.vehicle_type_name;
          console.log(`✅ [TestAds] Got vehicle_type_name from full ad data: ${vehicleTypeName}`);
        }
      } catch (fetchError) {
        console.warn(`⚠️ [TestAds] Failed to fetch full ad data:`, fetchError);
      }
    }
    
    // Fallback: используем "Легкові" как дефолт для легковых авто
    if (!vehicleTypeName) {
      vehicleTypeName = 'Легкові';
      console.warn(`⚠️ [TestAds] Using default vehicle_type_name: ${vehicleTypeName}`);
    }

    const carData = {
      brand:
        createdAd?.mark_name ||
        createdAd?.brand_name ||
        createdAd?.dynamic_fields?.brand_name ||
        'Unknown brand',
      model:
        createdAd?.model ||
        createdAd?.dynamic_fields?.model ||
        'Unknown model',
      year:
        createdAd?.car_specs?.year ??
        createdAd?.dynamic_fields?.year ??
        createdAd?.year ??
        2020,
      color: (
        createdAd?.car_specs?.color ??
        createdAd?.dynamic_fields?.color ??
        'silver'
      ).toLowerCase(),
      body_type:
        createdAd?.car_specs?.body_type ??
        createdAd?.dynamic_fields?.body_type ??
        'sedan',
      vehicle_type_name: vehicleTypeName,
      condition:
        createdAd?.car_specs?.condition ??
        createdAd?.dynamic_fields?.condition ??
        'used',
      description: createdAd?.description || '',
    };

    const { controller, timeoutId } = createTimeoutController(IMAGE_GEN_TIMEOUT_MS);

    let genResp: Response;
    let genData: any;
    
    try {
      genResp = await authFetch(`${BACKEND_URL}/api/chat/generate-car-images-mock/`, {
        method: 'POST',
        body: JSON.stringify({
          car_data: carData,
          angles: imageTypes,
          style: 'realistic',
          use_mock_algorithm: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!genResp.ok) {
        throw new Error(`Backend returned ${genResp.status}`);
      }

      genData = await genResp.json();
      
      if (!genData.success || !Array.isArray(genData.images) || genData.images.length === 0) {
        throw new Error('No images generated from backend');
      }
      
    } catch (error) {
      console.warn(`⚠️ [TestAds] Backend image generation failed for ad ${createdAd.id}:`, error);
      console.log(`🔄 [TestAds] Using fallback image generation...`);
      
      // TEMPORARY FALLBACK: Generate placeholder images using Pollinations.ai directly
      const fallbackImages = imageTypes.map((angle, idx) => ({
        url: `https://image.pollinations.ai/prompt/${encodeURIComponent(`${carData.brand} ${carData.model} ${carData.color} ${carData.year} ${angle} view, realistic car photo, high quality`)}?width=800&height=600&seed=${createdAd.id}_${idx}`,
        angle: angle,
        is_fallback: true
      }));
      
      genData = {
        success: true,
        images: fallbackImages,
        total_generated: fallbackImages.length,
        method: 'fallback'
      };
      
      console.log(`📸 [TestAds] Generated ${fallbackImages.length} fallback images for ad ${createdAd.id}`);
    }

    console.log(`📸 [TestAds] Saving ${genData.images.length} images for ad ${createdAd.id}...`);

    // Save images in parallel with better error handling
    const savePromises = genData.images.map(async (imageData: any, idx: number) => {
      try {
        const { controller: saveController, timeoutId: saveTimeoutId } = createTimeoutController(IMAGE_SAVE_TIMEOUT_MS);
        
        const saveResp = await authFetch(`${BACKEND_URL}/api/ads/${createdAd.id}/images`, {
          method: 'POST',
          body: JSON.stringify({
            image_url: imageData.url,
            caption: imageData.alt_text || imageData.title || `Generated image ${idx + 1}`,
            is_primary: idx === 0,
            order: idx + 1,
          }),
          signal: saveController.signal
        });

        clearTimeout(saveTimeoutId);
        
        if (saveResp.ok) {
          console.log(`💾 [TestAds] Saved image ${idx + 1}/${genData.images.length} for ad ${createdAd.id}`);
          return true;
        } else {
          const errorText = await saveResp.text().catch(() => 'Unknown error');
          console.warn(`⚠️ [TestAds] Failed to save image ${idx + 1} for ad ${createdAd.id}: ${saveResp.status} ${errorText}`);
          return false;
        }
      } catch (error: any) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn(`⏱️ [TestAds] Timeout saving image ${idx + 1} for ad ${createdAd.id}`);
        } else {
          console.warn(`⚠️ [TestAds] Error saving image ${idx + 1} for ad ${createdAd.id}:`, error.message);
        }
        return false;
      }
    });

    const saveResults = await Promise.all(savePromises);
    const savedCount = saveResults.filter(Boolean).length;
    
    console.log(`💾 [TestAds] Saved ${savedCount}/${genData.images.length} images for ad ${createdAd.id}`);
    return savedCount;

  } catch (error: any) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`⏱️ [TestAds] Image generation timeout for ad ${createdAd.id}`);
    } else {
      console.error(`❌ [TestAds] Error generating images for ad ${createdAd.id}:`, error);
    }
    return 0;
  }
};

export async function createTestAdsServer(
  requestOrToken: NextRequest | string,
  count: number,
  includeImages: boolean,
  imageTypes: string[],
  onProgress?: (progress: number, message: string) => void
): Promise<{
  created: number;
  totalImages: number;
  details: GenerationResult[];
}> {
  console.log(`🚀 Creating ${count} test ads on server...`);

  // Validate input
  const validatedCount = Math.min(Math.max(1, count), MAX_ADS_LIMIT);
  if (validatedCount !== count) {
    console.warn(`⚠️ [TestAds] Count adjusted from ${count} to ${validatedCount} (max: ${MAX_ADS_LIMIT})`);
  }

  const authFetch = createAuthFetch(requestOrToken);

  // Check if generation is already in progress (seeding control)
  console.log('🔒 [TestAds] Checking generation lock...');
  
  try {
    const lockResponse = await authFetch(`${BACKEND_URL}/api/ads/generation-status/`, {
      method: 'GET',
    });

    if (lockResponse.ok) {
      const lockData = await lockResponse.json();
      
      if (lockData.generation_in_progress) {
        console.warn(`🚫 [TestAds] Generation already in progress since ${lockData.started_at}`);
        return NextResponse.json(
          {
            success: false,
            error: 'GENERATION_IN_PROGRESS',
            message: 'Test ads generation is already in progress. Please wait for completion.',
            details: {
              started_at: lockData.started_at,
              estimated_completion: lockData.estimated_completion,
              current_progress: lockData.current_progress
            }
          },
          { status: 429 } // Too Many Requests
        );
      }
      
      console.log('✅ [TestAds] No active generation, proceeding...');
    }
  } catch (error) {
    console.warn('⚠️ [TestAds] Could not check generation status:', error);
    // Continue with generation - will handle conflicts at backend level
  }

  // Set generation lock
  console.log('🔒 [TestAds] Setting generation lock...');
  
  try {
    const lockSetResponse = await authFetch(`${BACKEND_URL}/api/ads/set-generation-lock/`, {
      method: 'POST',
      body: JSON.stringify({
        lock_key: GENERATION_LOCK_KEY,
        timeout: GENERATION_LOCK_TIMEOUT,
        requested_count: validatedCount
      })
    });

    if (!lockSetResponse.ok) {
      console.warn('⚠️ [TestAds] Could not set generation lock, proceeding anyway');
    } else {
      const lockResult = await lockSetResponse.json();
      console.log(`✅ [TestAds] Generation lock set: ${lockResult.lock_id}`);
    }
  } catch (error) {
    console.warn('⚠️ [TestAds] Error setting generation lock:', error);
  }

  // Check account limits before creating ads
  console.log('🔍 [TestAds] Checking account limits...');
  
  try {
    const limitsResponse = await authFetch(`${BACKEND_URL}/api/ads/check-limits/`, {
      method: 'GET',
    });

    if (!limitsResponse.ok) {
      console.warn('⚠️ [TestAds] Could not check account limits, proceeding with caution');
    } else {
      const limitsData = await limitsResponse.json();
      
      if (!limitsData.allowed) {
        console.warn(`🚫 [TestAds] Account limit exceeded: ${limitsData.reason}`);
        return NextResponse.json(
          {
            success: false,
            error: 'ACCOUNT_LIMIT_EXCEEDED',
            message: limitsData.reason,
            details: {
              current_ads: limitsData.current_ads,
              max_ads: limitsData.max_ads,
              account_type: limitsData.account_type,
              upgrade_message: limitsData.upgrade_message,
              upgrade_url: limitsData.upgrade_url
            }
          },
          { status: 429 } // Too Many Requests
        );
      }
      
      // Additional check: ensure we don't exceed limits with batch creation
      if (limitsData.max_ads !== null) {
        const totalAfterCreation = limitsData.current_ads + validatedCount;
        if (totalAfterCreation > limitsData.max_ads) {
          const maxAllowed = Math.max(0, limitsData.max_ads - limitsData.current_ads);
          console.warn(`🚫 [TestAds] Batch creation would exceed limits. Adjusting from ${validatedCount} to ${maxAllowed}`);
          
          if (maxAllowed === 0) {
            return NextResponse.json(
              {
                success: false,
                error: 'ACCOUNT_LIMIT_EXCEEDED',
                message: `Cannot create any ads. Account already has ${limitsData.current_ads}/${limitsData.max_ads} ads.`,
                details: {
                  current_ads: limitsData.current_ads,
                  max_ads: limitsData.max_ads,
                  account_type: limitsData.account_type,
                  requested: validatedCount,
                  allowed: maxAllowed
                }
              },
              { status: 429 }
            );
          }
          
          // Adjust count to fit within limits
          validatedCount = maxAllowed;
        }
      }
      
      console.log(`✅ [TestAds] Account limits check passed: ${limitsData.reason}`);
      console.log(`📊 [TestAds] Will create ${validatedCount} ads (current: ${limitsData.current_ads}, max: ${limitsData.max_ads || 'unlimited'})`);
    }
  } catch (error) {
    console.warn('⚠️ [TestAds] Error checking account limits:', error);
    // Continue with generation - backend will enforce limits anyway
  }
  onProgress?.(0, `Начинаем создание ${validatedCount} объявлений...`);

  const results: GenerationResult[] = [];
  let totalImages = 0;

  // Pre-load models cache
  console.log('📦 [TestAds] Pre-loading models cache...');
  let cachedModels: any[] = [];
  try {
    const modelsResponse = await authFetch(`${BACKEND_URL}/api/public/reference/models?page_size=1000`);
    if (modelsResponse.ok) {
      const modelsData = await modelsResponse.json();
      cachedModels = modelsData.options || [];
      console.log(`✅ [TestAds] Cached ${cachedModels.length} models`);
    }
  } catch (error) {
    console.warn('⚠️ [TestAds] Failed to cache models:', error);
  }

  // Create ads in parallel batches to optimize performance
  const BATCH_SIZE = 3; // Process 3 ads simultaneously
  const batches: number[][] = [];
  
  // Split ads into batches
  for (let i = 0; i < validatedCount; i += BATCH_SIZE) {
    batches.push(Array.from({ length: Math.min(BATCH_SIZE, validatedCount - i) }, (_, idx) => i + idx));
  }

  console.log(`📦 [TestAds] Processing ${validatedCount} ads in ${batches.length} batches of ${BATCH_SIZE}`);

  // Process batches sequentially, but ads within each batch in parallel
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    if (!batch) {
      console.warn(`⚠️ [TestAds] Batch ${batchIndex} is undefined, skipping`);
      continue;
    }
    
    const batchProgress = Math.round((batchIndex / batches.length) * (includeImages ? 50 : 90));
    
    onProgress?.(batchProgress, `Обрабатываем пакет ${batchIndex + 1}/${batches.length} (${batch.length} объявлений)...`);
    
    // Create all ads in current batch in parallel
    const batchPromises = batch.map(async (adIndex) => {
      try {
        // Generate mock data for this ad
        const formData = await generateFullMockData(cachedModels);
        
        // Create the ad
        const result = await createSingleAd(
          authFetch,
          formData as CarAdFormData,
          includeImages,
          imageTypes,
          adIndex
        );
        
        return result;
      } catch (error: any) {
        console.error(`❌ [TestAds] Error in batch processing for ad ${adIndex + 1}:`, error);
        return {
          success: false,
          error: error.message,
          title: `Ad ${adIndex + 1}`,
          imagesCount: 0,
          index: adIndex + 1
        } as GenerationResult;
      }
    });

    // Wait for all ads in current batch to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Add results and count images
    batchResults.forEach(result => {
      results.push(result);
      if (result.success && result.imagesCount) {
        totalImages += result.imagesCount;
      }
    });

    const completedCount = (batchIndex + 1) * BATCH_SIZE;
    const actualCompleted = Math.min(completedCount, validatedCount);
    console.log(`✅ [TestAds] Completed batch ${batchIndex + 1}/${batches.length} - ${actualCompleted}/${validatedCount} ads processed`);
    
    // Small delay between batches to avoid overwhelming the backend
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const created = results.filter(r => r.success).length;
  const totalAdsWithImages = results.filter(r => r.success && (r.imagesCount || 0) > 0).length;

  console.log(`🎉 [TestAds] Generation complete:`, {
    totalRequested: validatedCount,
    created,
    totalImages,
    adsWithImages: totalAdsWithImages,
    adsWithoutImages: created - totalAdsWithImages
  });

  // Clear generation lock
  console.log('🔓 [TestAds] Clearing generation lock...');
  
  try {
    const lockClearResponse = await authFetch(`${BACKEND_URL}/api/ads/clear-generation-lock/`, {
      method: 'POST',
      body: JSON.stringify({
        lock_key: GENERATION_LOCK_KEY
      })
    });

    if (lockClearResponse.ok) {
      console.log('✅ [TestAds] Generation lock cleared');
    } else {
      console.warn('⚠️ [TestAds] Could not clear generation lock');
    }
  } catch (error) {
    console.warn('⚠️ [TestAds] Error clearing generation lock:', error);
  }

  onProgress?.(100, `Завершено! Создано ${created} объявлений с ${totalImages} изображениями`);

  return {
    created,
    totalImages,
    details: results
  };
}

// Увеличиваем таймаут для Next.js API route
export const maxDuration = 300; // 5 минут

export async function POST(request: NextRequest) {
  console.log('🚀 [TestAds] POST /api/autoria/test-ads/generate - START');
  const startTime = Date.now();
  const body = await request.json();
  console.log('🚀 [TestAds] Request body:', body);
  const { count = 3, includeImages = true, imageTypes = ['front', 'side'] } = body;

  // Validate parameters
  if (typeof count !== 'number' || count < 1 || count > MAX_ADS_LIMIT) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'INVALID_COUNT',
        message: `Count must be between 1 and ${MAX_ADS_LIMIT}` 
      },
      { status: 400 }
    );
  }

  if (!Array.isArray(imageTypes) || imageTypes.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'INVALID_IMAGE_TYPES',
          message: 'imageTypes must be a non-empty array' 
        },
        { status: 400 }
      );
    }

    console.log(`📊 [TestAds] Starting generation:`, { count, includeImages, imageTypes });

  try {
    // Progress callback for logging
    const progressCallback = (progress: number, message: string) => {
      console.log(`📊 Progress: ${progress}% - ${message}`);
    };

    const result = await createTestAdsServer(request, count, includeImages, imageTypes, progressCallback);
    
    const duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
    const adsWithImages = result.details?.filter((d: any) => d.success && (d.imagesCount || 0) > 0).length || 0;
    const adsWithoutImages = result.created - adsWithImages;

    const success = result.created > 0;
    const statusCode = success ? 200 : 500;

    if (!success) {
      console.warn(`⚠️ [TestAds] Generation finished with zero created ads, returning error response`, {
        totalRequested: count,
        created: result.created,
        totalImages: result.totalImages,
        adsWithImages,
        adsWithoutImages,
      });
    } else {
      console.log(`✅ [TestAds] Successfully generated ${result.created} test ads in ${duration}:`, {
        totalAds: result.created,
        totalImages: result.totalImages,
        adsWithImages,
        adsWithoutImages
      });
    }

    return NextResponse.json({
      success,
      message: success
        ? `Successfully created ${result.created} test ads with ${result.totalImages} images in ${duration}`
        : `Failed to create test ads. No ads were created during generation (requested: ${count}).`,
      // Legacy fields expected by existing UI/translation keys
      count: result.created,
      duration,
      created: result.created,
      totalImages: result.totalImages,
      details: result.details,
      stats: {
        duration,
        adsWithImages,
        adsWithoutImages,
        averageImagesPerAd: result.created > 0 ? (result.totalImages / result.created).toFixed(1) : '0'
      }
    }, { status: statusCode });

  } catch (error: any) {
    const duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
    const errorMessage = error?.message || 'Unknown error occurred';
    
    console.error(`❌ [TestAds] Generation failed after ${duration}:`, error);

    // Handle authentication errors
    if (errorMessage.includes('No authentication tokens') || errorMessage.includes('backend_auth tokens missing')) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_AUTHENTICATED',
          message: 'Требуется аутентификация. Пожалуйста, войдите в систему.',
          requiresAuth: true,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Test ads generation failed',
        message: errorMessage,
        duration
      },
      { status: 500 }
    );
  }
}
