"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import AuthBadge from '@/components/All/AuthBadge/AuthBadge';
import AutoRiaUserBadge from '@/components/AutoRia/Layout/AutoRiaUserBadge';
import FixedLanguageSwitch from '@/components/AutoRia/Layout/FixedLanguageSwitch';

/**
 * Компонент для управления элементами в правом верхнем углу
 * Всегда показываем оба бейджа (email сессии + AutoRia пользователь)
 */
const TopRightControls: React.FC = () => {
  const pathname = usePathname();

  return (
    <>
      {/* Контейнер для бейджей - справа с отступом 50px от viewport */}
      <div 
        className="fixed flex flex-col items-end gap-2 pointer-events-none"
        style={{ top: '60px', right: '50px', zIndex: 99999999 }}
      >
        {/* Email бейдж - белый/серый */}
        <div className="pointer-events-auto">
          <AuthBadge />
        </div>
        {/* AutoRia пользователь - желтый/серый 
            Показываем всегда, компонент сам решит показывать или нет на основе авторизации */}
        <div className="pointer-events-auto">
          <AutoRiaUserBadge />
        </div>
      </div>

      {/* Language Selector - manages its own position */}
      <FixedLanguageSwitch />
    </>
  );
};

export default TopRightControls;
