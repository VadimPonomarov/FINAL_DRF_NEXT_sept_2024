const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Шлях до Next.js додатка для завантаження next.config.js та .env файлів
  dir: './',
})

// Додаємо кастомну конфігурацію для Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/tests/**/*.{test,spec}.{js,jsx,ts,tsx}'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**/layout.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/not-found.tsx',
    '!src/app/**/error.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testTimeout: 10000,
  // Налаштування для українських тестів
  displayName: 'CarHub Tests (Українські тести)',
  verbose: true,
}

// createJestConfig експортується таким чином для забезпечення завантаження Next.js конфігурації
module.exports = createJestConfig(customJestConfig)
