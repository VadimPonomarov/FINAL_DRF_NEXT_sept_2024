"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import AuthBadge from '@/components/All/AuthBadge/AuthBadge';
import FixedLanguageSwitch from '@/components/AutoRia/Layout/FixedLanguageSwitch';

/**
 * Компонент для управления элементами в правом верхнем углу
 * Условный рендеринг в зависимости от страницы
 */
const TopRightControls: React.FC = () => {
  const pathname = usePathname();

  // На страницах /autoria тоже показываем переключатель языка
  if (pathname?.startsWith('/autoria')) {
    return (
      <>
        <div className="fixed top-[60px] right-2 z-[99998]">
          <AuthBadge />
        </div>
        <FixedLanguageSwitch />
      </>
    );
  }

  return (
    <>
      {/* Auth Badge */}
      <div className="fixed top-[60px] right-2 z-[99998]">
        <AuthBadge />
      </div>

      {/* Language Selector - manages its own position */}
      <FixedLanguageSwitch />
    </>
  );
};

export default TopRightControls;
