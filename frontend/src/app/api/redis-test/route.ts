import { NextResponse } from 'next/server';
import '@/lib/env-loader';

export async function GET() {
  try {
    console.log('[Redis Test] Testing Redis configuration...');
    
    // Check environment variables
    const redisUrl = process.env.REDIS_URL || process.env.NEXT_PUBLIC_REDIS_URL;
    const redisHost = process.env.REDIS_HOST || process.env.NEXT_PUBLIC_REDIS_HOST;
    const redisPort = process.env.REDIS_PORT || process.env.NEXT_PUBLIC_REDIS_PORT;
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    
    console.log('[Redis Test] Environment check:', {
      hasRedisUrl: !!redisUrl,
      hasRedisHost: !!redisHost,
      hasRedisPort: !!redisPort,
      hasNextAuthUrl: !!nextAuthUrl,
      hasBackendUrl: !!backendUrl,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    });

    // Test Redis connection
    let redisConnectionResult = null;
    try {
      const { createClient } = await import('redis');
      
      const getRedisConfig = () => {
        if (redisUrl) return { url: redisUrl };
        if (redisHost) return { url: `redis://${redisHost}:${redisPort || 6379}/0` };
        if (process.env.NEXT_PUBLIC_IS_DOCKER === 'true') return { url: 'redis://redis:6379/0' };
        return { url: 'redis://localhost:6379/0' };
      };

      const config = getRedisConfig();
      console.log('[Redis Test] Using Redis config:', config);

      const client = createClient({ url: config.url });
      
      client.on('error', (err) => {
        console.error('[Redis Test] Redis Client Error:', err);
      });

      await client.connect();
      await client.set('test-key', 'test-value', { EX: 10 });
      const testValue = await client.get('test-key');
      await client.del('test-key');
      await client.disconnect();

      redisConnectionResult = { success: true, testValue };
      console.log('[Redis Test] ✅ Redis connection successful');
    } catch (redisError: any) {
      redisConnectionResult = { success: false, error: redisError.message };
      console.error('[Redis Test] ❌ Redis connection failed:', redisError);
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        hasRedisUrl: !!redisUrl,
        hasRedisHost: !!redisHost,
        hasNextAuthUrl: !!nextAuthUrl,
        hasBackendUrl: !!backendUrl,
        redisUrl: redisUrl ? `${redisUrl.substring(0, 20)}...` : null,
        nextAuthUrl,
        backendUrl
      },
      redis: redisConnectionResult,
      message: 'Redis diagnostic test completed'
    });

  } catch (error: any) {
    console.error('[Redis Test] Diagnostic failed:', error);
    return NextResponse.json(
      { 
        error: 'Diagnostic failed',
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
