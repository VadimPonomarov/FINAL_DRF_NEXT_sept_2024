"use client";

import React, { useMemo } from 'react';
import { convertMarkdownLinksToHtml } from '@/utils/chat/linkParser';

interface MarkdownTextProps {
  text: string;
  className?: string;
}

/**
 * Компонент для отображения текста с поддержкой Markdown ссылок
 * Простое и надежное решение: преобразует [текст](URL) в HTML ссылки
 */
export const MarkdownText: React.FC<MarkdownTextProps> = React.memo(({ text, className = '' }) => {
  // Мемоизируем преобразование Markdown ссылок в HTML ссылки
  const htmlContent = useMemo(() => convertMarkdownLinksToHtml(text), [text]);

  // Мемоизируем проверку наличия Markdown ссылок
  const hasMarkdownLinks = useMemo(() => htmlContent !== text, [htmlContent, text]);

  if (hasMarkdownLinks) {
    // Если были Markdown ссылки, отображаем как HTML
    return (
      <div
        className={`whitespace-pre-wrap ${className}`}
        style={{ color: 'black !important' }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  }

  // Если Markdown ссылок не было, отображаем как обычный текст
  return (
    <div 
      className={`whitespace-pre-wrap ${className}`}
      style={{ color: 'black !important' }}
    >
      {text}
    </div>
  );
});

export default MarkdownText;
