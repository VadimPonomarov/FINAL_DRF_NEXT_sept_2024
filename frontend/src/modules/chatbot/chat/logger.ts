/**
 * Уровни логирования
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Интерфейс для логгера
 */
interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  isEnabled: () => boolean;
  restore: () => void;
}

/**
 * Настройки логгера
 */
interface LoggerOptions {
  level: LogLevel;
  prefix?: string;
}

// Определяем, включено ли логирование
const isLoggingEnabled = process.env.NEXT_PUBLIC_LOGGING_ENABLED === 'true';

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

// Override console methods if logging is disabled
if (!isLoggingEnabled) {
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.debug = () => {};
}

/**
 * Создает логгер с указанными настройками
 * @param options Настройки логгера
 * @returns Объект логгера
 */
export function createLogger(options: LoggerOptions): Logger {
  const { level, prefix = '' } = options;

  // Определяем, какие уровни логирования включены
  const isDebugEnabled = isLoggingEnabled && level === LogLevel.DEBUG;
  const isInfoEnabled = isLoggingEnabled && (level === LogLevel.DEBUG || level === LogLevel.INFO);
  const isWarnEnabled = isLoggingEnabled && (level === LogLevel.DEBUG || level === LogLevel.INFO || level === LogLevel.WARN);
  const isErrorEnabled = isLoggingEnabled; // Errors are always logged if logging is enabled

  // Форматируем префикс
  const formattedPrefix = prefix ? `[${prefix}] ` : '';

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (isDebugEnabled) {
        originalConsole.debug(`${formattedPrefix}${message}`, ...args);
      }
    },
    info: (message: string, ...args: unknown[]) => {
      if (isInfoEnabled) {
        originalConsole.info(`${formattedPrefix}${message}`, ...args);
      }
    },
    warn: (message: string, ...args: unknown[]) => {
      if (isWarnEnabled) {
        originalConsole.warn(`${formattedPrefix}${message}`, ...args);
      }
    },
    error: (message: string, ...args: unknown[]) => {
      if (isErrorEnabled) {
        originalConsole.error(`${formattedPrefix}${message}`, ...args);
      }
    },
    isEnabled: () => isLoggingEnabled,
    restore: () => {
      console.log = originalConsole.log;
      console.info = originalConsole.info;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.debug = originalConsole.debug;
    }
  };
}

// Создаем логгеры для разных компонентов
export const chatLogger = createLogger({
  level: LogLevel.DEBUG,
  prefix: 'Chat'
});

export const imageLogger = createLogger({
  level: LogLevel.DEBUG,
  prefix: 'Image'
});

export const wsLogger = createLogger({
  level: LogLevel.DEBUG,
  prefix: 'WebSocket'
});

export const urlLogger = createLogger({
  level: LogLevel.DEBUG,
  prefix: 'URL'
});

// Экспортируем дефолтный логгер
const defaultLogger = createLogger({
  level: LogLevel.INFO
});

export default defaultLogger;
