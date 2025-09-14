"use client";

/**
 * Проверяет, является ли URL ссылкой на изображение
 * @param url URL для проверки
 * @returns true, если URL указывает на изображение
 */
export function isImageUrl(url: string): boolean {
  // Проверяем, содержит ли URL параметры, характерные для изображений
  const isPollinationsImage = url.includes('pollinations.ai/prompt') &&
    (url.includes('width=') || url.includes('height=') || url.includes('model='));

  // Проверяем расширение файла
  const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url);

  return isPollinationsImage || hasImageExtension;
}

/**
 * Извлекает первый URL изображения из текста
 * @param text Текст с markdown-разметкой или обычными URL
 * @returns Первый найденный URL изображения или null, если изображений нет
 */
export function extractFirstImageUrl(text: string): string | null {
  if (!text) return null;

  // Сначала проверяем markdown-разметку
  // Формат: ![alt text](url)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/;
  const markdownMatch = text.match(imageRegex);
  if (markdownMatch && markdownMatch[2]) {
    return markdownMatch[2];
  }

  // Затем проверяем обычные URL
  // Ищем URL, которые могут быть ссылками на изображения
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = [];
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    if (match[1]) {
      urls.push(match[1]);
    }
  }

  // Проверяем каждый URL, является ли он ссылкой на изображение
  for (const url of urls) {
    if (isImageUrl(url)) {
      return url;
    }
  }

  return null;
}

/**
 * Извлекает URL изображений из markdown-разметки
 * @param text Текст с markdown-разметкой
 * @returns Массив URL изображений
 */
export function extractImagesFromMarkdown(text: string): string[] {
  if (!text) return [];

  // Регулярное выражение для поиска изображений в markdown
  // Формат: ![alt text](url)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;

  const images: string[] = [];
  let match;

  while ((match = imageRegex.exec(text)) !== null) {
    // match[1] - alt text, match[2] - URL изображения
    if (match[2]) {
      images.push(match[2]);
    }
  }

  return images;
}

/**
 * Заменяет ссылки на изображения (markdown или обычные URL) на пустую строку
 * @param text Текст с markdown-разметкой или обычными URL
 * @returns Текст без ссылок на изображения
 */
export function removeImagesFromMarkdown(text: string): string {
  if (!text) return '';

  // Заменяем все вхождения markdown-изображений на пустую строку
  let result = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '');

  // Заменяем все обычные URL-ссылки на изображения на пустую строку
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = [];
  let match;

  // Находим все URL в тексте
  while ((match = urlRegex.exec(text)) !== null) {
    if (match[1] && isImageUrl(match[1])) {
      matches.push(match[1]);
    }
  }

  // Удаляем каждый URL изображения из текста
  for (const url of matches) {
    result = result.replace(url, '');
  }

  // Удаляем лишние пробелы и переносы строк
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Проверяет, содержит ли текст ссылки на изображения (в markdown или обычные URL)
 * @param text Текст для проверки
 * @returns true, если текст содержит ссылки на изображения
 */
export function hasMarkdownImages(text: string): boolean {
  if (!text) return false;

  // Проверяем наличие изображений в markdown
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/;
  if (imageRegex.test(text)) {
    return true;
  }

  // Проверяем наличие обычных URL-ссылок на изображения
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = [];
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    if (match[1]) {
      urls.push(match[1]);
    }
  }

  // Проверяем каждый URL, является ли он ссылкой на изображение
  for (const url of urls) {
    if (isImageUrl(url)) {
      return true;
    }
  }

  return false;
}
