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

  // На страницах /autoria показываем оба бейджа (залогиненный пользователь AutoRia + email из сессии)
  if (pathname?.startsWith('/autoria')) {
    return (
      <>
        {/* Бейджи: Email из сессии (сверху, оранжевый) + AutoRia пользователь с тултипом (снизу) */}
        <div className="fixed top-[60px] right-2 flex flex-col items-end gap-3">
          <div className="relative z-10">
            <AuthBadge />
          </div>
          <div className="relative z-50">
            <AutoRiaUserBadge />
          </div>
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
