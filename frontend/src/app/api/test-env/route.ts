import { NextResponse } from 'next/server';

/**
 * Тестовый endpoint для проверки переменных среды
 * GET /api/test-env
 */
export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_IS_DOCKER: process.env.NEXT_PUBLIC_IS_DOCKER,
    BACKEND_URL: process.env.BACKEND_URL,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_URL: process.env.REDIS_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  });
}
