/**
 * Service for replacing empty car advertisement images with AI-generated ones.
 * Uses existing CRUD operations without modifying the data schema.
 */

export interface CarData {
  brand: string;
  model: string;
  year?: number;
  color?: string;
  body_type?: string;
}

export interface GeneratedImage {
  url: string;
  angle: string;
  title: string;
  isMain: boolean;
  prompt?: string;
}

export interface AdImage {
  id: number;
  image: string;
  order: number;
  is_primary: boolean;
  caption: string;
  created_at: string;
  updated_at: string;
}

export interface ReplacementResult {
  success: boolean;
  message: string;
  generated_count: number;
  deleted_count: number;
  added_count: number;
  total_images: number;
  images: AdImage[];
  error?: string;
}

export class ImageReplacementService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Replace empty images with AI-generated ones using existing CRUD operations.
   * 
   * Process:
   * 1. Generate AI images using /api/chat/generate-car-images/
   * 2. Get current images using GET /api/ads/cars/{ad_id}/images
   * 3. Delete empty images using DELETE /api/ads/cars/{ad_id}/images/{id}
   * 4. Add new images using POST /api/ads/cars/{ad_id}/images
   */
  async replaceEmptyImages(
    adId: number,
    carData: CarData,
    options: {
      angles?: string[];
      style?: string;
      replaceEmptyOnly?: boolean;
      authToken?: string;
    } = {}
  ): Promise<ReplacementResult> {
    const {
      angles = ['front', 'side'],
      style = 'realistic',
      replaceEmptyOnly = true,
      authToken
    } = options;

    try {
      console.log(`🎨 Starting image replacement for ad ${adId}`);
      console.log(`🚗 Car: ${carData.brand} ${carData.model}`);
      console.log(`📐 Angles: ${angles.join(', ')}`);

      // Step 1: Generate AI images
      console.log('1️⃣ Generating AI images...');
      const generatedImages = await this.generateImages(carData, angles, style);
      console.log(`✅ Generated ${generatedImages.length} images`);

      // Step 2: Get current images
      console.log('2️⃣ Getting current images...');
      const currentImages = await this.getCurrentImages(adId, authToken);
      console.log(`📋 Found ${currentImages.length} current images`);

      // Step 3: Find and delete empty images (if replaceEmptyOnly is true)
      let deletedCount = 0;
      if (replaceEmptyOnly) {
        console.log('3️⃣ Finding and deleting empty images...');
        const emptyImages = this.findEmptyImages(currentImages);
        console.log(`🗑️ Found ${emptyImages.length} empty images to delete`);

        for (const emptyImage of emptyImages) {
          try {
            await this.deleteImage(adId, emptyImage.id, authToken);
            deletedCount++;
            console.log(`✅ Deleted empty image ${emptyImage.id}`);
          } catch (error) {
            console.warn(`⚠️ Failed to delete image ${emptyImage.id}:`, error);
          }
        }
      }

      // Step 4: Add new generated images
      console.log('4️⃣ Adding new generated images...');
      const maxOrder = Math.max(...currentImages.map(img => img.order), 0);
      let addedCount = 0;
      const newImages: AdImage[] = [];

      for (let i = 0; i < generatedImages.length; i++) {
        const genImage = generatedImages[i];
        try {
          const newImage = await this.addImage(adId, {
            url: genImage.url,
            caption: genImage.title,
            order: maxOrder + i + 1,
            is_primary: genImage.isMain && !currentImages.some(img => img.is_primary)
          }, authToken);
          
          newImages.push(newImage);
          addedCount++;
          console.log(`✅ Added image ${i + 1}: ${genImage.angle}`);
        } catch (error) {
          console.error(`❌ Failed to add image ${i + 1}:`, error);
        }
      }

      // Step 5: Get final image count
      const finalImages = await this.getCurrentImages(adId, authToken);
      const totalImages = finalImages.length;

      const operationType = deletedCount > 0 ? 'replaced' : 'added';
      const message = `Successfully generated ${generatedImages.length} images and ${operationType} ${addedCount} images`;

      console.log(`🎉 Image replacement completed for ad ${adId}`);
      console.log(`📊 Generated: ${generatedImages.length}, Deleted: ${deletedCount}, Added: ${addedCount}, Total: ${totalImages}`);

      return {
        success: true,
        message,
        generated_count: generatedImages.length,
        deleted_count: deletedCount,
        added_count: addedCount,
        total_images: totalImages,
        images: newImages
      };

    } catch (error) {
      console.error(`❌ Image replacement failed for ad ${adId}:`, error);
      return {
        success: false,
        message: `Image replacement failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        generated_count: 0,
        deleted_count: 0,
        added_count: 0,
        total_images: 0,
        images: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate AI images using existing API
   */
  private async generateImages(
    carData: CarData,
    angles: string[],
    style: string
  ): Promise<GeneratedImage[]> {
    const response = await fetch(`${this.baseUrl}/api/chat/generate-car-images/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        car_data: carData,
        angles,
        style
      })
    });

    if (!response.ok) {
      throw new Error(`Image generation failed: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success || !result.images) {
      throw new Error('No images were generated');
    }

    return result.images;
  }

  /**
   * Get current images using existing API
   */
  private async getCurrentImages(adId: number, authToken?: string): Promise<AdImage[]> {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${this.baseUrl}/api/ads/cars/${adId}/images`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to get current images: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Find empty images that need to be replaced
   */
  private findEmptyImages(images: AdImage[]): AdImage[] {
    return images.filter(img => {
      // Check if image is empty or contains placeholder content
      return !img.image || 
             img.image === '' ||
             img.image.includes('placeholder') ||
             img.image.includes('default') ||
             img.image.includes('Car Image') ||
             img.caption?.includes('Car Image');
    });
  }

  /**
   * Delete an image using existing API
   */
  private async deleteImage(adId: number, imageId: number, authToken?: string): Promise<void> {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${this.baseUrl}/api/ads/cars/${adId}/images/${imageId}`, {
      method: 'DELETE',
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to delete image ${imageId}: ${response.status}`);
    }
  }

  /**
   * Add a new image using existing API
   */
  private async addImage(
    adId: number,
    imageData: {
      url: string;
      caption: string;
      order: number;
      is_primary: boolean;
    },
    authToken?: string
  ): Promise<AdImage> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Note: This might need adjustment based on how the existing API handles URLs vs files
    // For now, we'll put the URL in the caption field as a workaround
    const response = await fetch(`${this.baseUrl}/api/ads/cars/${adId}/images`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        caption: `${imageData.caption} | URL: ${imageData.url}`,
        order: imageData.order,
        is_primary: imageData.is_primary
        // Note: The 'image' field might need special handling for URLs
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to add image: ${response.status}`);
    }

    return await response.json();
  }
}

// Export singleton instance
export const imageReplacementService = new ImageReplacementService();
