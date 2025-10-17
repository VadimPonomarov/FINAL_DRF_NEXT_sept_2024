// Загрузка переменных среды из централизованной env-config/ директории
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Функция для загрузки .env файла
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      env[key.trim()] = value.trim();
    }
  });

  return env;
}

// Загружаем переменные из env-config/ в правильном порядке
const envConfigDir = path.resolve(__dirname, '../env-config');
const baseEnv = loadEnvFile(path.join(envConfigDir, '.env.base'));
const secretsEnv = loadEnvFile(path.join(envConfigDir, '.env.secrets'));
const localEnv = loadEnvFile(path.join(envConfigDir, '.env.local'));

// Объединяем переменные (поздние перезаписывают ранние)
const allEnv = { ...baseEnv, ...secretsEnv, ...localEnv };

// Устанавливаем переменные в process.env
Object.entries(allEnv).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
});

console.log('🔧 Loaded environment variables from env-config/');
console.log(`📁 NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT_SET'}`);
console.log(`📁 GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT_SET'}`);
console.log(`📁 GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT_SET'}`);
console.log(`📁 NEXT_PUBLIC_BACKEND_URL: ${process.env.NEXT_PUBLIC_BACKEND_URL || 'NOT_SET'}`);
console.log(`📁 REDIS_HOST: ${process.env.REDIS_HOST || 'NOT_SET'}`);
console.log(`📁 REDIS_URL: ${process.env.REDIS_URL || 'NOT_SET'}`);
console.log(`📁 IS_DOCKER: ${process.env.IS_DOCKER || 'NOT_SET'}`);
console.log(`📁 NEXT_PUBLIC_IS_DOCKER: ${process.env.NEXT_PUBLIC_IS_DOCKER || 'NOT_SET'}`);
console.log(`📁 NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'NOT_SET'}`);

// Проверка дешифровки переменных
console.log('🔐 Checking decrypted OAuth config:');
try {
  const crypto = require('./src/lib/simple-crypto');
  const decrypted = crypto.getDecryptedOAuthConfig();
  console.log(`✅ Decryption check - GOOGLE_CLIENT_ID: ${decrypted.GOOGLE_CLIENT_ID ? 'OK' : 'EMPTY'}`);
  console.log(`✅ Decryption check - GOOGLE_CLIENT_SECRET: ${decrypted.GOOGLE_CLIENT_SECRET ? 'OK' : 'EMPTY'}`);
} catch (error) {
  console.error('❌ Decryption check failed:', error.message);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use standalone output in production
  ...(process.env.NODE_ENV === 'production' && { output: 'standalone' }),

  // React strict mode off in development to avoid double-invoking effects (faster dev)
  reactStrictMode: process.env.NODE_ENV !== 'development',

  // Experimental features - оптимизировано для ChatBot
  experimental: {
    // React Compiler: отключен из-за отсутствия babel-plugin-react-compiler
    // reactCompiler: true,
    // Keep typedRoutes off for now
    typedRoutes: false,
    // Оптимизируем CSS обработку для ChatBot компонентов
    optimizeCss: false, // Отключаем для избежания застоев
    // Ускоряем сборку за счет параллельной обработки
    workerThreads: false, // Отключаем для стабильности
    // Package import optimizations for both dev and production
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-menubar',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-visually-hidden',
      'react-icons',
      'framer-motion',
      'chart.js',
      'recharts'
    ],
    // Faster builds in development - moved to turbopack config
    // ...(process.env.NODE_ENV === 'development' && {
    //   turbo: {
    //     rules: {
    //       '*.svg': {
    //         loaders: ['@svgr/webpack'],
    //         as: '*.js',
    //       },
    //     },
    //   },
    // }),
  },

  // Turbopack configuration (stable)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Production optimizations
  poweredByHeader: false,
  generateEtags: true,
  compress: true,



  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    domains: ['localhost'],
    // Turn off image optimization in development to speed up dev server
    unoptimized: process.env.NODE_ENV !== 'production',
  },

  // Production headers with caching and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' http://localhost:* https://localhost:*"
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate'
          },
          // CORS headers - полностью отключаем CORS для избегания ошибок запросов
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With, Accept, Origin'
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'false'
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400'
          }
        ],
      }
    ]
  },

  // Webpack config is only applied when NOT using Turbopack (to avoid conflicts)
  ...(process.env.TURBOPACK ? {} : {
    webpack: (config, { dev, isServer }) => {
      // Fallbacks for Node.js modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false
      };
      return config;
    }
  })
};

export default nextConfig;
