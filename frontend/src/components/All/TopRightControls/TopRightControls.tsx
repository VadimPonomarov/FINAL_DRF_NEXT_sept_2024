"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import AuthBadge from '@/components/All/AuthBadge/AuthBadge';
import AutoRiaUserBadge from '@/components/AutoRia/Layout/AutoRiaUserBadge';
import FixedLanguageSwitch from '@/components/AutoRia/Layout/FixedLanguageSwitch';

/**
 * Компонент для управления элементами в правом верхнем углу
 * Условный рендеринг в зависимости от страницы
 */
const TopRightControls: React.FC = () => {
  const pathname = usePathname();

  // На страницах /autoria показываем оба бейджа (email из сессии + залогиненный пользователь AutoRia)
  if (pathname?.startsWith('/autoria')) {
    return (
      <>
        {/* Первый бейдж: Email из сессии */}
        <div className="fixed top-[60px] right-2 z-[99998] flex items-center gap-2">
          <AuthBadge />
          {/* Второй бейдж: Залогиненный пользователь AutoRia */}
          <AutoRiaUserBadge />
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
