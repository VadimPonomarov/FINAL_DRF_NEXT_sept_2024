import { urlLogger } from './logger';

/**
 * Sanitizes a URL by removing invisible characters and ensuring it's valid
 * @param url The URL to sanitize
 * @returns A sanitized URL or null if invalid
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) {
    urlLogger.debug("URL is null or undefined");
    return null;
  }

  try {
    urlLogger.debug("Processing URL", {
      originalUrl: url.substring(0, 100) + (url.length > 100 ? '...' : ''),
      length: url.length
    });

    // Сначала пробуем создать URL объект для правильного кодирования
    let cleanUrl = url;
    try {
      const urlObj = new URL(url);
      // Пересобираем URL из объекта, что автоматически кодирует параметры
      cleanUrl = urlObj.toString();
    } catch {
      // Если URL невалидный, используем ручное кодирование
      // Список известных невидимых символов, которые могут вызывать проблемы
      const invisibleChars = [
        '\u200b',  // ZERO WIDTH SPACE
        '\u200c',  // ZERO WIDTH NON-JOINER
        '\u200d',  // ZERO WIDTH JOINER
        '\u200e',  // LEFT-TO-RIGHT MARK
        '\u200f',  // RIGHT-TO-LEFT MARK
        '\u2060',  // WORD JOINER
        '\u2061',  // FUNCTION APPLICATION
        '\u2062',  // INVISIBLE TIMES
        '\u2063',  // INVISIBLE SEPARATOR
        '\u2064',  // INVISIBLE PLUS
        '\ufeff',  // ZERO WIDTH NO-BREAK SPACE
        '\u00a0',  // NO-BREAK SPACE
        '\u00ad',  // SOFT HYPHEN
      ];

      // Удаляем все известные невидимые символы
      let cleanUrl = url;
      for (const char of invisibleChars) {
        const regex = new RegExp(char, 'g');
        cleanUrl = cleanUrl.replace(regex, '');
      }

      // Удаляем все невидимые и управляющие символы
      cleanUrl = cleanUrl
        .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202F\u2060-\u206F]/g, '') // Управляющие символы
        .trim(); // Удаляем пробелы в начале и конце

      // Кодируем кириллические символы и другие не-ASCII символы
      cleanUrl = encodeURI(cleanUrl);

      // Проверяем наличие символа WORD JOINER (U+2060) в любом месте URL
      if (cleanUrl.includes('\u2060')) {
        urlLogger.debug("Removing WORD JOINER (U+2060) from URL");
        cleanUrl = cleanUrl.replace(/\u2060/g, '');
      }
    }

    urlLogger.debug("Cleaned URL", {
      cleanUrl: cleanUrl.substring(0, 100) + (cleanUrl.length > 100 ? '...' : ''),
      length: cleanUrl.length
    });

    // Проверяем, что URL не пустой после очистки
    if (!cleanUrl) {
      urlLogger.error("URL is empty after sanitization");
      return null;
    }

    // Проверяем, что URL начинается с http:// или https://
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      urlLogger.warn("URL does not start with http:// or https://, adding https://", { cleanUrl: cleanUrl.substring(0, 100) });
      cleanUrl = 'https://' + cleanUrl;
    }

    // Валидируем URL
    try {
      new URL(cleanUrl);
    } catch (urlError) {
      urlLogger.error("Invalid URL after sanitization", { cleanUrl: cleanUrl.substring(0, 100), error: urlError });
      return null;
    }

    return cleanUrl;
  } catch (error) {
    urlLogger.error("Error sanitizing URL", { error, url });
    return null;
  }
}

/**
 * Adds cache-busting parameters to a URL
 * @param url The URL to modify
 * @returns URL with cache-busting parameters
 */
export function addCacheBusting(url: string | null): string | null {
  if (!url) {
    urlLogger.debug("URL is null or undefined");
    return null;
  }

  try {
    urlLogger.debug("Adding cache busting to URL", { url: url.substring(0, 100) + (url.length > 100 ? '...' : '') });

    // Сначала очищаем URL
    const cleanUrl = sanitizeUrl(url);
    if (!cleanUrl) {
      urlLogger.error("URL is invalid after sanitization");
      return null;
    }

    // Добавляем параметры для предотвращения кэширования
    const timestamp = Date.now();
    const randomValue = Math.floor(Math.random() * 1000000);

    // Создаем URL объект для правильного добавления параметров
    try {
      const urlObj = new URL(cleanUrl);

      // Добавляем параметры
      urlObj.searchParams.set('t', timestamp.toString());
      urlObj.searchParams.set('nocache', randomValue.toString());

      const result = urlObj.toString();
      urlLogger.debug("URL with cache busting", { result: result.substring(0, 100) + (result.length > 100 ? '...' : '') });

      return result;
    } catch {
      // Если не можем создать URL объект, используем старый метод
      // Проверяем, есть ли уже параметры в URL
      const hasParams = cleanUrl.includes('?');

      // Добавляем несколько параметров для надежности
      const result = cleanUrl + (hasParams ? '&' : '?') + `t=${timestamp}&nocache=${randomValue}`;
      urlLogger.debug("URL with cache busting (fallback)", { result: result.substring(0, 100) + (result.length > 100 ? '...' : '') });

      return result;
    }
  } catch (error) {
    urlLogger.error("Error adding cache busting", { error, url: url.substring(0, 100) });
    // В случае ошибки возвращаем очищенный URL или исходный, если очистка невозможна
    return sanitizeUrl(url) || url;
  }
}
