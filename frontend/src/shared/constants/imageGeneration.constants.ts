/**
 * Image Generation Constants
 * 
 * Centralized configuration for car image generation feature.
 * All image types, angles, and related configuration.
 * 
 * @module imageGeneration.constants
 */

// ============================================================================
// IMAGE TYPES / ANGLES
// ============================================================================

/**
 * Available image type identifiers
 */
export const IMAGE_TYPE_IDS = {
  FRONT: 'front',
  REAR: 'rear',
  SIDE: 'side',
  TOP: 'top',
  INTERIOR: 'interior',
  DASHBOARD: 'dashboard',
  ENGINE: 'engine',
  TRUNK: 'trunk',
  WHEELS: 'wheels',
  DETAILS: 'details',
} as const;

export type ImageTypeId = typeof IMAGE_TYPE_IDS[keyof typeof IMAGE_TYPE_IDS];

/**
 * Default image types for test ads generation
 */
export const DEFAULT_IMAGE_TYPES: ImageTypeId[] = ['front', 'side'];

/**
 * All available image types for full generation
 */
export const ALL_IMAGE_TYPES: ImageTypeId[] = [
  IMAGE_TYPE_IDS.FRONT,
  IMAGE_TYPE_IDS.REAR,
  IMAGE_TYPE_IDS.SIDE,
  IMAGE_TYPE_IDS.TOP,
  IMAGE_TYPE_IDS.INTERIOR,
  IMAGE_TYPE_IDS.DASHBOARD,
  IMAGE_TYPE_IDS.ENGINE,
  IMAGE_TYPE_IDS.TRUNK,
  IMAGE_TYPE_IDS.WHEELS,
  IMAGE_TYPE_IDS.DETAILS,
];

/**
 * Basic image types (subset for quick generation)
 */
export const BASIC_IMAGE_TYPES: ImageTypeId[] = [
  IMAGE_TYPE_IDS.FRONT,
  IMAGE_TYPE_IDS.REAR,
  IMAGE_TYPE_IDS.SIDE,
  IMAGE_TYPE_IDS.TOP,
  IMAGE_TYPE_IDS.INTERIOR,
];

/**
 * Image type metadata for UI display
 */
export interface ImageTypeMetadata {
  id: ImageTypeId;
  nameKey: string;
  descriptionKey: string;
  iconName: string;
}

export const IMAGE_TYPE_METADATA: ImageTypeMetadata[] = [
  {
    id: IMAGE_TYPE_IDS.FRONT,
    nameKey: 'autoria.testAds.imageTypes.front',
    descriptionKey: 'autoria.testAds.imageTypes.frontDesc',
    iconName: 'Car',
  },
  {
    id: IMAGE_TYPE_IDS.REAR,
    nameKey: 'autoria.testAds.imageTypes.rear',
    descriptionKey: 'autoria.testAds.imageTypes.rearDesc',
    iconName: 'RotateCcw',
  },
  {
    id: IMAGE_TYPE_IDS.SIDE,
    nameKey: 'autoria.testAds.imageTypes.side',
    descriptionKey: 'autoria.testAds.imageTypes.sideDesc',
    iconName: 'Eye',
  },
  {
    id: IMAGE_TYPE_IDS.TOP,
    nameKey: 'autoria.testAds.imageTypes.top',
    descriptionKey: 'autoria.testAds.imageTypes.topDesc',
    iconName: 'Camera',
  },
  {
    id: IMAGE_TYPE_IDS.INTERIOR,
    nameKey: 'autoria.testAds.imageTypes.interior',
    descriptionKey: 'autoria.testAds.imageTypes.interiorDesc',
    iconName: 'Home',
  },
  {
    id: IMAGE_TYPE_IDS.DASHBOARD,
    nameKey: 'autoria.testAds.imageTypes.dashboard',
    descriptionKey: 'autoria.testAds.imageTypes.dashboardDesc',
    iconName: 'Camera',
  },
  {
    id: IMAGE_TYPE_IDS.ENGINE,
    nameKey: 'autoria.testAds.imageTypes.engine',
    descriptionKey: 'autoria.testAds.imageTypes.engineDesc',
    iconName: 'Car',
  },
  {
    id: IMAGE_TYPE_IDS.TRUNK,
    nameKey: 'autoria.testAds.imageTypes.trunk',
    descriptionKey: 'autoria.testAds.imageTypes.trunkDesc',
    iconName: 'Home',
  },
  {
    id: IMAGE_TYPE_IDS.WHEELS,
    nameKey: 'autoria.testAds.imageTypes.wheels',
    descriptionKey: 'autoria.testAds.imageTypes.wheelsDesc',
    iconName: 'Circle',
  },
  {
    id: IMAGE_TYPE_IDS.DETAILS,
    nameKey: 'autoria.testAds.imageTypes.details',
    descriptionKey: 'autoria.testAds.imageTypes.detailsDesc',
    iconName: 'CheckCircle2',
  },
];

// ============================================================================
// GENERATION MODES
// ============================================================================

export const GENERATION_MODES = {
  ADD: 'add',
  REPLACE: 'replace',
  UPDATE: 'update',
} as const;

export type GenerationMode = typeof GENERATION_MODES[keyof typeof GENERATION_MODES];

export const DEFAULT_GENERATION_MODE: GenerationMode = GENERATION_MODES.ADD;

// ============================================================================
// IMAGE LIMITS
// ============================================================================

/**
 * Maximum number of images per ad
 */
export const MAX_IMAGES_PER_AD = 10;

/**
 * Maximum file size for uploaded images (10MB)
 */
export const MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Supported image formats
 */
export const SUPPORTED_IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * Supported image extensions
 */
export const SUPPORTED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

// ============================================================================
// FALLBACK CONFIGURATION
// ============================================================================

/**
 * Pollinations.ai fallback configuration
 */
export const POLLINATIONS_CONFIG = {
  baseUrl: 'https://image.pollinations.ai/prompt',
  defaultWidth: 1024,
  defaultHeight: 768,
  defaultSeed: 42,
  noLogo: true,
} as const;

// ============================================================================
// EXPORT ALL AS OBJECT FOR CONVENIENCE
// ============================================================================

export const IMAGE_GENERATION_CONFIG = {
  types: {
    ids: IMAGE_TYPE_IDS,
    default: DEFAULT_IMAGE_TYPES,
    all: ALL_IMAGE_TYPES,
    basic: BASIC_IMAGE_TYPES,
    metadata: IMAGE_TYPE_METADATA,
  },
  modes: {
    values: GENERATION_MODES,
    default: DEFAULT_GENERATION_MODE,
  },
  limits: {
    maxImagesPerAd: MAX_IMAGES_PER_AD,
    maxFileSizeBytes: MAX_IMAGE_FILE_SIZE_BYTES,
  },
  formats: {
    supported: SUPPORTED_IMAGE_FORMATS,
    extensions: SUPPORTED_IMAGE_EXTENSIONS,
  },
  fallback: POLLINATIONS_CONFIG,
} as const;

export default IMAGE_GENERATION_CONFIG;
