declare module '@/utils/chat/logger' {
  export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error'
  }

  interface LoggerOptions {
    level: LogLevel;
    prefix?: string;
  }

  interface Logger {
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
    isEnabled: () => boolean;
    restore: () => void;
  }

  export function createLogger(options: LoggerOptions): Logger;
  
  export const chatLogger: Logger;
  export const imageLogger: Logger;
  export const wsLogger: Logger;
  export const urlLogger: Logger;
  
  const defaultLogger: Logger;
  export default defaultLogger;
} 