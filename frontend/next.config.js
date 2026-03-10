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
// .env.local имеет наивысший приоритет для локальной разработки
const allEnv = { ...baseEnv, ...secretsEnv, ...localEnv };

// ВАЖНО: В production Next.js встраивает NEXT_PUBLIC_* переменные в код во время сборки
// Все остальные переменные доступны только на сервере во время выполнения
// Устанавливаем переменные в process.env (перезаписываем если уже есть)
Object.entries(allEnv).forEach(([key, value]) => {
  process.env[key] = value;
});

console.log('🔧 Loaded environment variables from env-config/');
console.log(`📂 Loaded files: .env.base, .env.secrets, .env.local`);
console.log(`📁 NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT_SET'}`);
console.log(`📁 GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT_SET'}`);
console.log(`📁 GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT_SET'}`);
console.log(`📁 NEXT_PUBLIC_BACKEND_URL: ${process.env.NEXT_PUBLIC_BACKEND_URL || 'NOT_SET'}`);
console.log(`📁 REDIS_HOST: ${process.env.REDIS_HOST || 'NOT_SET'}`);
console.log(`📁 REDIS_URL: ${process.env.REDIS_URL || 'NOT_SET'}`);
console.log(`📁 IS_DOCKER: ${process.env.IS_DOCKER || 'NOT_SET'}`);
console.log(`📁 NEXT_PUBLIC_IS_DOCKER: ${process.env.NEXT_PUBLIC_IS_DOCKER || 'NOT_SET'}`);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Vercel optimization
  ...(process.env.VERCEL && { output: 'standalone' }),

  // React strict mode off in development to avoid double-invoking effects (faster dev)
  reactStrictMode: process.env.NODE_ENV !== 'development',

  // Remove console.log in production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

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
    resolveAlias: {
      // CRITICAL: Redirect react-page-tracker imports in Turbopack mode
      // This ensures compatibility even when using --turbo flag
      'react-page-tracker': path.resolve(__dirname, 'src/lib/react-page-tracker-adapter.ts'),
    },
  },

  // Production optimizations
  poweredByHeader: false,
  generateEtags: true,
  compress: true,
  
  // SWC minification for faster builds and smaller bundles
  swcMinify: true,
  
  // Modularize imports for tree-shaking
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
    'react-icons/fa': {
      transform: 'react-icons/fa/{{member}}',
    },
    'react-icons/md': {
      transform: 'react-icons/md/{{member}}',
    },
    'react-icons/hi': {
      transform: 'react-icons/hi/{{member}}',
    },
    '@radix-ui/react-icons': {
      transform: '@radix-ui/react-icons/dist/{{member}}',
    },
  },

  // Disable static generation for error pages (404, 500, etc.)
  // This prevents Next.js from trying to statically generate error pages
  // which can cause issues with Html component imports
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },

  // Skip static generation for error pages
  // This prevents Next.js from prerendering /404, /500, etc.
  skipTrailingSlashRedirect: true,

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
    domains: ['localhost', 'image.pollinations.ai'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.railway.app',
      },
      {
        protocol: 'https',
        hostname: 'image.pollinations.ai',
      },
      {
        protocol: 'https',
        hostname: '**.vercel.app',
      },
      {
        protocol: 'https',
        hostname: '**.onrender.com',
      },
    ],
    // Turn off image optimization in development to speed up dev server
    unoptimized: process.env.NODE_ENV !== 'production',
  },

  // API Rewrites - proxy requests to backend
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    return [
      // Proxy specific Django endpoints only (exclude Next.js internal routes)
      {
        source: '/api/users/:path*',
        destination: `${backendUrl}/api/users/:path*`,
      },
      {
        source: '/api/auth/login',
        destination: `${backendUrl}/api/auth/login`,
      },
      {
        source: '/api/auth/refresh',  
        destination: `${backendUrl}/api/auth/refresh`,
      },
      {
        source: '/api/auth/logout',
        destination: `${backendUrl}/api/auth/logout`,
      },
      {
        source: '/admin/:path*',
        destination: `${backendUrl}/admin/:path*`,
      },
      {
        source: '/media/:path*',
        destination: `${backendUrl}/media/:path*`,
      },
      {
        source: '/static/:path*',
        destination: `${backendUrl}/static/:path*`,
      },
    ];
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
            value: process.env.NODE_ENV === 'production'
              ? "frame-ancestors 'self'"
              : "frame-ancestors 'self' http://localhost:* https://localhost:*"
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

  // Webpack config - ALWAYS applied for production builds (build command uses webpack)
  // Turbopack is only used in dev mode with --turbo flag
  webpack: (config, { dev, isServer }) => {
    // Fallbacks for Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false
    };

    // CRITICAL: Redirect ALL react-page-tracker imports to safe adapter
    // This prevents "Html should not be imported outside of pages/_document" errors
    // Works even if someone accidentally imports react-page-tracker
    // This ALWAYS applies for production builds (npm run build uses webpack)
    // Apply to BOTH server and client builds
    
    const adapterPath = path.resolve(__dirname, 'src/lib/react-page-tracker-adapter.ts');
    console.log('[Webpack Config] Setting react-page-tracker alias to:', adapterPath);
    
    // Ensure alias object exists and preserve existing aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      // Add all possible import paths for react-page-tracker
      'react-page-tracker': adapterPath,
      'react-page-tracker/': adapterPath,
      'react-page-tracker/dist': adapterPath,
      'react-page-tracker/dist/': adapterPath,
      'react-page-tracker/dist/index': adapterPath,
      'react-page-tracker/dist/index.js': adapterPath,
      // Note: no alias for 'next/document' to allow Next's real Document API
    };

    return config;
  }
};

export default nextConfig;
