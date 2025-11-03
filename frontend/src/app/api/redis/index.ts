/**
 * Redis API Client
 * Provides functions to interact with Redis via the Next.js API route
 */

/**
 * Get data from Redis
 * @param key - The Redis key to retrieve
 * @returns The value stored in Redis, or null if not found
 */
export async function getRedisData(key: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/redis?key=${encodeURIComponent(key)}`);
    
    if (!response.ok) {
      console.error(`[Redis Client] Failed to get data for key: ${key}`);
      return null;
    }

    const data = await response.json();
    
    if (data.success && data.exists) {
      return data.value;
    }
    
    return null;
  } catch (error) {
    console.error(`[Redis Client] Error getting data for key ${key}:`, error);
    return null;
  }
}

/**
 * Set data in Redis
 * @param key - The Redis key
 * @param value - The value to store
 * @param ttl - Time to live in seconds (default: 3600 = 1 hour)
 * @returns True if successful, false otherwise
 */
export async function setRedisData(
  key: string,
  value: string,
  ttl?: number
): Promise<boolean> {
  try {
    const response = await fetch('/api/redis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key, value, ttl }),
    });

    if (!response.ok) {
      console.error(`[Redis Client] Failed to set data for key: ${key}`);
      return false;
    }

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error(`[Redis Client] Error setting data for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete data from Redis
 * @param key - The Redis key to delete
 * @returns True if successful, false otherwise
 */
export async function deleteRedisData(key: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/redis?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      console.error(`[Redis Client] Failed to delete data for key: ${key}`);
      return false;
    }

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error(`[Redis Client] Error deleting data for key ${key}:`, error);
    return false;
  }
}

/**
 * Check if a key exists in Redis
 * @param key - The Redis key to check
 * @returns True if the key exists, false otherwise
 */
export async function existsRedisKey(key: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/redis?key=${encodeURIComponent(key)}`);
    
    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.exists === true;
  } catch (error) {
    console.error(`[Redis Client] Error checking key existence for ${key}:`, error);
    return false;
  }
}

export default {
  getRedisData,
  setRedisData,
  deleteRedisData,
  existsRedisKey,
};

