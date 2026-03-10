"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import AuthBadge from '@/components/All/AuthBadge/AuthBadge';
import AutoRiaUserBadge from '@/components/AutoRia/Layout/AutoRiaUserBadge';
import FixedLanguageSwitch from '@/components/AutoRia/Layout/FixedLanguageSwitch';

/**
 * Компонент для управления элементами в правом верхнем углу
 * Использует условный рендеринг для desktop/mobile чтобы избежать дублирования
 */
const TopRightControls: React.FC = () => {
  const pathname = usePathname();

  // Определяем, находимся ли мы на AutoRia страницах
  const isAutoRiaPage = pathname?.startsWith('/autoria');
  
  // Показываем бейджи только на не-AutoRia страницах
  const shouldShowBadges = !isAutoRiaPage;

  return (
    <>
      {/* Language Selector - показываем всегда, управляет своей позицией */}
      <FixedLanguageSwitch />
      
      {/* Бейджи пользователей - только на не-AutoRia страницах */}
      {shouldShowBadges && (
        <div 
          className="fixed flex flex-col items-end gap-2 pointer-events-none z-[110]"
          style={{ top: '60px', right: '50px' }}
        >
          {/* Email бейдж - белый/серый */}
          <div className="pointer-events-auto">
            <AuthBadge />
          </div>
          {/* AutoRia пользователь - желтый/серый */}
          <div className="pointer-events-auto">
            <AutoRiaUserBadge />
          </div>
        </div>
      )}
    </>
  );
};

export default TopRightControls;
