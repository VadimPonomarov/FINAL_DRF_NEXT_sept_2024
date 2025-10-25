/**
 * Безопасно логирует значение (скрывает чувствительные данные)
 * @param key - Ключ для логирования
 * @param value - Значение для логирования
 * @returns Строка для безопасного логирования
 */
export function safeLogValue(key: string, value: string): string {
  if (!value) {
    return `${key}: [EMPTY]`;
  }
  
  if (value.startsWith('ENC_')) {
    return `${key}: [ENCRYPTED - ${value.substring(0, 15)}...]`;
  }
  
  return `${key}: [DECRYPTED]`;
}

/**
 * Дешифрует зашифрованное значение
 * @param encryptedText - Зашифрованный текст
 * @returns Дешифрованный текст
 */
export function decryptValue(encryptedText: string): string {
  // 1. Check if value is encrypted (starts with ENC_)
  if (!encryptedText || !encryptedText.startsWith('ENC_')) {
    return encryptedText; // Return as-is if not encrypted
  }

  try {
    // 2. Remove ENC_ prefix
    const encoded = encryptedText.replace('ENC_', '');

    // 3. Reverse the string back
    const unreversed = encoded.split('').reverse().join('');

    // 4. Decode from Base64
    const decoded = Buffer.from(unreversed, 'base64').toString('utf8');

    return decoded;
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedText; // Return original if decryption fails
  }
}

/**
 * Получает дешифрованную переменную окружения
 * @param key - Ключ переменной
 * @param defaultValue - Значение по умолчанию
 * @returns Дешифрованное значение
 */
export function getDecryptedEnv(key: string, defaultValue: string = ''): string {
  const value = process.env[key] || defaultValue;
  return decryptValue(value);
}

/**
 * Получает расшифрованную конфигурацию OAuth
 * @returns Расшифрованная конфигурация OAuth
 */
export function getDecryptedOAuthConfig(): any {
  // Логируем переменные для диагностики
  console.log('[Constants] Raw environment variables:');
  console.log(`  ${safeLogValue('NEXTAUTH_SECRET', process.env.NEXTAUTH_SECRET || '')}`);
  console.log(`  ${safeLogValue('GOOGLE_CLIENT_ID', process.env.GOOGLE_CLIENT_ID || '')}`);
  console.log(`  ${safeLogValue('GOOGLE_CLIENT_SECRET', process.env.GOOGLE_CLIENT_SECRET || '')}`);

  // Получаем дешифрованную конфигурацию
  const decryptedConfig = {
    NEXTAUTH_SECRET: getDecryptedEnv('NEXTAUTH_SECRET'),
    GOOGLE_CLIENT_ID: getDecryptedEnv('GOOGLE_CLIENT_ID'),
    GOOGLE_CLIENT_SECRET: getDecryptedEnv('GOOGLE_CLIENT_SECRET'),
  };

  // Логируем финальную конфигурацию
  console.log('[Constants] Final AUTH_CONFIG:');
  console.log(`  NEXTAUTH_SECRET: ${decryptedConfig.NEXTAUTH_SECRET ? '[DECRYPTED]' : '[EMPTY]'}`);
  console.log(`  GOOGLE_CLIENT_ID: ${decryptedConfig.GOOGLE_CLIENT_ID ? '[DECRYPTED]' : '[EMPTY]'}`);
  console.log(`  GOOGLE_CLIENT_SECRET: ${decryptedConfig.GOOGLE_CLIENT_SECRET ? '[DECRYPTED]' : '[EMPTY]'}`);

  // Логируем первые символы для проверки
  if (decryptedConfig.GOOGLE_CLIENT_ID) {
    console.log(`  GOOGLE_CLIENT_ID preview: ${decryptedConfig.GOOGLE_CLIENT_ID.substring(0, 20)}...`);
  }
  if (decryptedConfig.GOOGLE_CLIENT_SECRET) {
    console.log(`  GOOGLE_CLIENT_SECRET length: ${decryptedConfig.GOOGLE_CLIENT_SECRET.length}`);
  }

  return decryptedConfig;
}