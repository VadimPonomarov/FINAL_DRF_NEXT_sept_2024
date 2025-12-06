// Image validation utilities for test ads generation

export interface ImageData {
  url: string;
  alt_text?: string;
  title?: string;
  content?: string | Buffer;
  size?: number;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  processedData?: ImageData;
}

/**
 * Validates that an image has proper URL and non-empty content
 */
export async function validateImageContent(imageData: any): Promise<ValidationResult> {
  try {
    // Check basic structure
    if (!imageData || typeof imageData !== 'object') {
      return { isValid: false, reason: 'Invalid image data structure' };
    }

    // Check URL exists and is valid
    const imageUrl = imageData.url;
    if (!imageUrl || typeof imageUrl !== 'string') {
      return { isValid: false, reason: 'Missing or invalid URL' };
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch {
      return { isValid: false, reason: 'Invalid URL format' };
    }

    // Check if URL points to empty content (for base64 or blob URLs)
    if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
      const isEmpty = await checkDataUrlContent(imageUrl);
      if (isEmpty) {
        return { isValid: false, reason: 'Empty image content in data URL' };
      }
    } else {
      // For HTTP URLs, check if content is accessible and not empty
      const isContentEmpty = await checkHttpImageContent(imageUrl);
      if (isContentEmpty) {
        return { isValid: false, reason: 'Empty or inaccessible image content' };
      }
    }

    // Check image size if available
    if (imageData.size !== undefined && imageData.size === 0) {
      return { isValid: false, reason: 'Image size is zero' };
    }

    // Return validated data
    return {
      isValid: true,
      processedData: {
        url: imageUrl,
        alt_text: imageData.alt_text || imageData.title || `Generated image`,
        title: imageData.title,
        content: imageData.content,
        size: imageData.size
      }
    };

  } catch (error) {
    return {
      isValid: false,
      reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Checks if data URL content is empty
 */
async function checkDataUrlContent(dataUrl: string): Promise<boolean> {
  try {
    // Extract the base64 part
    const base64Data = dataUrl.split(',')[1];
    if (!base64Data) return true;

    // Check if base64 data is empty or just whitespace
    const trimmed = base64Data.trim();
    if (trimmed.length === 0) return true;

    // Try to decode and check if it results in empty data
    const decoded = Buffer.from(trimmed, 'base64');
    return decoded.length === 0;
  } catch {
    return true; // Assume empty if decoding fails
  }
}

/**
 * Checks if HTTP image content is accessible and not empty
 */
async function checkHttpImageContent(imageUrl: string): Promise<boolean> {
  try {
    // Make a HEAD request first to check content length
    const headResponse = await fetch(imageUrl, { method: 'HEAD' });
    if (!headResponse.ok) return true;

    const contentLength = headResponse.headers.get('content-length');
    if (contentLength && parseInt(contentLength) === 0) return true;

    // If no content-length, make a lightweight GET request
    const response = await fetch(imageUrl);
    if (!response.ok) return true;

    const content = await response.arrayBuffer();
    return content.byteLength === 0;
  } catch {
    return true; // Assume empty if we can't verify
  }
}

/**
 * Filters out invalid images from an array
 */
export async function filterValidImages(images: any[]): Promise<ImageData[]> {
  if (!Array.isArray(images)) return [];

  const validationPromises = images.map(validateImageContent);
  const results = await Promise.all(validationPromises);

  const validImages = results
    .filter((result): result is ValidationResult & { isValid: true } => result.isValid)
    .map(result => result.processedData!);

  console.log(`[ImageValidation] Filtered ${images.length} images, ${validImages.length} are valid`);

  return validImages;
}

/**
 * Generates fallback placeholder image data when validation fails
 */
export function generateFallbackImage(index: number, total: number): ImageData {
  return {
    url: `https://picsum.photos/seed/car-${index}-${total}/800/600.jpg`,
    alt_text: `Placeholder car image ${index + 1}`,
    title: `Generated placeholder image`,
    size: 50000 // Approximate size
  };
}
