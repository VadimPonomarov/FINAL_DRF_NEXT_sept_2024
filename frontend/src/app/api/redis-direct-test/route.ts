import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

/**
 * Test direct Railway Redis connection (without proxy)
 */

const possibleRedisConfigs = [
  // Try direct Railway Redis host (common patterns)
  'redis://default:VvVebClumAXXhCFWJgTShzQPYcXZFvCJ@redis.railway.app:6379',
  'redis://default:VvVebClumAXXhCFWJgTShzQPYcXZFvCJ@91.98.238.47:6379',
  'redis://default:VvVebClumAXXhCFWJgTShzQPYcXZFvCJ@junction.proxy.rlwy.net:6379',
  // Original proxy URL (for comparison)
  'redis://default:VvVebClumAXXhCFWJgTShzQPYcXZFvCJ@junction.proxy.rlwy.net:25906',
];

export async function GET(request: NextRequest) {
  const results = [];

  for (const redisUrl of possibleRedisConfigs) {
    try {
      console.log(`[Redis Direct Test] Trying: ${redisUrl}`);
      
      const client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000,
        }
      });

      await client.connect();
      
      // Test basic Redis operation
      const testKey = 'direct-connection-test';
      await client.set(testKey, 'success', { EX: 10 });
      const value = await client.get(testKey);
      await client.del(testKey);
      
      await client.disconnect();
      
      results.push({
        url: redisUrl,
        success: true,
        message: 'Connected successfully',
        testResult: value === 'success' ? 'PASS' : 'FAIL',
        timestamp: new Date().toISOString()
      });
      
      console.log(`[Redis Direct Test] ✅ SUCCESS: ${redisUrl}`);
      
    } catch (error) {
      results.push({
        url: redisUrl,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: (error as any)?.code,
        timestamp: new Date().toISOString()
      });
      
      console.log(`[Redis Direct Test] ❌ FAILED: ${redisUrl} - ${error}`);
    }
  }

  return NextResponse.json({
    message: 'Railway Redis direct connection test',
    results,
    summary: {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    }
  });
}
