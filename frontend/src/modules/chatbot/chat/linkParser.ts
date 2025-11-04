"use client";

/**
 * Регулярное выражение для поиска URL-ссылок в тексте
 * Поддерживает http, https, ftp протоколы
 * Учитывает различные домены и пути
 */
const URL_REGEX = /(https?:\/\/|www\.)[^\s\n]+/gi;

/**
 * Регулярное выражение для поиска Markdown ссылок формата [текст](URL)
 */
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/gi;

/**
 * Проверяет, является ли строка URL-ссылкой
 * @param text Текст для проверки
 * @returns true, если текст является URL-ссылкой
 */
export function isUrl(text: string): boolean {
  if (!text) return false;
  return URL_REGEX.test(text);
}

/**
 * Разбивает текст на части: обычный текст и URL-ссылки
 * Поддерживает как прямые URL, так и Markdown ссылки [текст](URL)
 * @param text Исходный текст
 * @returns Массив объектов с типом (text или url) и содержимым
 */
export function parseTextWithLinks(text: string): Array<{ type: 'text' | 'url', content: string, label?: string }> {
  if (!text) return [];

  const parts: Array<{ type: 'text' | 'url', content: string, label?: string }> = [];
  const allMatches: Array<{ index: number, length: number, url: string, label?: string }> = [];

  // Сбрасываем индексы регулярных выражений
  URL_REGEX.lastIndex = 0;
  MARKDOWN_LINK_REGEX.lastIndex = 0;

  // Находим все Markdown ссылки
  let markdownMatch;
  while ((markdownMatch = MARKDOWN_LINK_REGEX.exec(text)) !== null) {
    const label = markdownMatch[1];
    let url = markdownMatch[2];

    // Если ссылка начинается с www., добавляем https://
    if (url.startsWith('www.')) {
      url = 'https://' + url;
    }

    allMatches.push({
      index: markdownMatch.index,
      length: markdownMatch[0].length,
      url: url,
      label: label
    });
  }

  // Находим все прямые URL (но исключаем те, что уже в Markdown ссылках)
  let urlMatch;
  while ((urlMatch = URL_REGEX.exec(text)) !== null) {
    // Проверяем, не находится ли этот URL внутри Markdown ссылки
    const isInsideMarkdown = allMatches.some(mdMatch =>
      urlMatch.index >= mdMatch.index &&
      urlMatch.index < mdMatch.index + mdMatch.length
    );

    if (!isInsideMarkdown) {
      let url = urlMatch[0];

      // Если ссылка начинается с www., добавляем https://
      if (url.startsWith('www.')) {
        url = 'https://' + url;
      }

      allMatches.push({
        index: urlMatch.index,
        length: urlMatch[0].length,
        url: url
      });
    }
  }

  // Сортируем все найденные ссылки по позиции в тексте
  allMatches.sort((a, b) => a.index - b.index);

  let lastIndex = 0;

  // Обрабатываем все найденные ссылки
  for (const match of allMatches) {
    // Добавляем текст до ссылки
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }

    // Добавляем ссылку
    parts.push({
      type: 'url',
      content: match.url,
      label: match.label
    });

    lastIndex = match.index + match.length;
  }

  // Добавляем оставшийся текст после последней ссылки
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  return parts;
}

/**
 * Проверяет, содержит ли текст URL-ссылки (прямые или Markdown)
 * @param text Текст для проверки
 * @returns true, если текст содержит URL-ссылки
 */
export function hasLinks(text: string): boolean {
  if (!text) return false;

  // Сбрасываем индексы регулярных выражений
  URL_REGEX.lastIndex = 0;
  MARKDOWN_LINK_REGEX.lastIndex = 0;

  return URL_REGEX.test(text) || MARKDOWN_LINK_REGEX.test(text);
}

/**
 * Преобразует Markdown ссылки в HTML ссылки
 * @param text Текст с Markdown ссылками формата [текст](URL)
 * @returns Текст с HTML ссылками
 */
export function convertMarkdownLinksToHtml(text: string): string {
  if (!text) return text;

  // Регулярное выражение для поиска Markdown ссылок [текст](URL)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  // Заменяем все Markdown ссылки на HTML ссылки
  const convertedText = text.replace(markdownLinkRegex, (match, linkText, url) => {
    // Определяем, является ли это файлом для скачивания
    const isFile = /\.(xlsx|xls|csv|pdf|doc|docx|txt|json|xml)(\?.*)?$/i.test(url);
    const isMinioFile = url.includes('localhost:9000');

    if (isFile || isMinioFile) {
      // Для файлов создаем ссылку с download атрибутом
      const fileName = url.split('/').pop() || 'file';
      return `<a href="${url}" download="${fileName}" target="_blank" style="color: #3b82f6; text-decoration: underline; font-weight: 500;">📁 ${linkText}</a>`;
    } else {
      // Для обычных ссылок создаем стандартную ссылку
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">🔗 ${linkText}</a>`;
    }
  });

  return convertedText;
}

/**
 * Тестовая функция для отладки парсера
 */
export function testMarkdownParser() {
  const testText = "- [Excel таблица](http://localhost:9000/analytics-tables/table_20250525_214504_aa7dd062.xlsx)";
  console.log("Testing markdown parser:");
  console.log("Input:", testText);

  const converted = convertMarkdownLinksToHtml(testText);
  console.log("Converted:", converted);

  return converted;
}
