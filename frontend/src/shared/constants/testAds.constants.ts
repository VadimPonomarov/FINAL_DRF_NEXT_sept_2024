/**
 * Test Ads Generation Constants
 * 
 * Centralized configuration for test ads generation feature.
 * All literals and magic numbers are defined here for easy modification.
 * 
 * @module testAds.constants
 */

// ============================================================================
// LIMITS
// ============================================================================

/**
 * Maximum number of test ads that can be generated in a single request
 */
export const MAX_ADS_COUNT = 10;

/**
 * Minimum number of test ads that can be generated
 */
export const MIN_ADS_COUNT = 1;

/**
 * Default number of test ads to generate
 */
export const DEFAULT_ADS_COUNT = 3;

// ============================================================================
// TIMEOUTS (in milliseconds)
// ============================================================================

/**
 * Timeout for creating a single ad
 */
export const CREATE_AD_TIMEOUT_MS = 30000;

/**
 * Timeout for generating images for an ad
 */
export const IMAGE_GEN_TIMEOUT_MS = 60000;

/**
 * Timeout for saving images to backend
 */
export const IMAGE_SAVE_TIMEOUT_MS = 15000;

/**
 * Maximum duration for the entire generation request (5 minutes)
 */
export const REQUEST_TIMEOUT_MS = 300000;

/**
 * Generation lock timeout to prevent simultaneous requests (5 minutes)
 */
export const GENERATION_LOCK_TIMEOUT_MS = 300000;

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Number of ads to process simultaneously in a batch
 */
export const BATCH_SIZE = 3;

/**
 * Delay between batches to avoid overwhelming the backend (ms)
 */
export const BATCH_DELAY_MS = 1000;

// ============================================================================
// KEYS
// ============================================================================

/**
 * Key for generation lock to prevent simultaneous generations
 */
export const GENERATION_LOCK_KEY = 'test_ads_generation_in_progress';

// ============================================================================
// EXPORT ALL AS OBJECT FOR CONVENIENCE
// ============================================================================

export const TEST_ADS_CONFIG = {
  limits: {
    maxAdsCount: MAX_ADS_COUNT,
    minAdsCount: MIN_ADS_COUNT,
    defaultAdsCount: DEFAULT_ADS_COUNT,
  },
  timeouts: {
    createAd: CREATE_AD_TIMEOUT_MS,
    imageGen: IMAGE_GEN_TIMEOUT_MS,
    imageSave: IMAGE_SAVE_TIMEOUT_MS,
    request: REQUEST_TIMEOUT_MS,
    generationLock: GENERATION_LOCK_TIMEOUT_MS,
  },
  batch: {
    size: BATCH_SIZE,
    delay: BATCH_DELAY_MS,
  },
  keys: {
    generationLock: GENERATION_LOCK_KEY,
  },
} as const;

export default TEST_ADS_CONFIG;
