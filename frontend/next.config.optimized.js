// ОПТИМІЗОВАНА КОНФІГУРАЦІЯ для швидкої роботи
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

// Загружаем переменные из env-config/
const envConfigDir = path.resolve(__dirname, '../env-config');
const baseEnv = loadEnvFile(path.join(envConfigDir, '.env.base'));
const secretsEnv = loadEnvFile(path.join(envConfigDir, '.env.secrets'));
const localEnv = loadEnvFile(path.join(envConfigDir, '.env.local'));
const allEnv = { ...baseEnv, ...secretsEnv, ...localEnv };

Object.entries(allEnv).forEach(([key, value]) => {
  process.env[key] = value;
});

console.log('🔧 Loaded environment variables from env-config/');
console.log(`📂 Loaded files: .env.base, .env.secrets, .env.local`);
console.log(`📁 NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT_SET'}`);
console.log(`📁 NEXT_PUBLIC_BACKEND_URL: ${process.env.NEXT_PUBLIC_BACKEND_URL || 'NOT_SET'}`);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ⚡ ОПТИМІЗАЦІЇ ДЛЯ ШВИДКОСТІ
  reactStrictMode: false, // Вимкнено для швидшого dev
  
  experimental: {
    typedRoutes: false, // Вимкнено для швидшої компіляції
    optimizeCss: false,
    workerThreads: false,
    // Оптимізація імпортів тільки найнеобхідніших
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-slot',
    ],
  },

  // Turbopack з мінімальною конфігурацією
  turbopack: {
    resolveAlias: {
      'react-page-tracker': path.resolve(__dirname, 'src/lib/react-page-tracker-adapter.ts'),
    },
  },

  // Production optimizations
  poweredByHeader: false,
  generateEtags: false, // Вимкнено для швидшого відповіді
  compress: false, // Вимкнено для dev (nginx робить це в prod)

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Вимкнути оптимізацію зображень в dev
  images: {
    unoptimized: true, // Завжди не оптимізовані для швидкості
  },

  // Мінімальні headers
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      }
    ]
  },

  // Webpack config
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false
    };

    const adapterPath = path.resolve(__dirname, 'src/lib/react-page-tracker-adapter.ts');
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-page-tracker': adapterPath,
    };

    // ⚡ КРИТИЧНО: Кешування для швидшої компіляції
    config.cache = {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    };

    return config;
  }
};

export default nextConfig;
