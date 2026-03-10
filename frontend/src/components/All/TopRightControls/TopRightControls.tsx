"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import AuthBadge from '@/components/All/AuthBadge/AuthBadge';
import AutoRiaUserBadge from '@/components/AutoRia/Layout/AutoRiaUserBadge';
import FixedLanguageSwitch from '@/components/AutoRia/Layout/FixedLanguageSwitch';

/**
 * Компонент для управления элементами в правом верхнем углу
 * Desktop: справа с отступом 50px
 * Mobile: под свитчером провайдеров, компактный горизонтальный layout
 */
const TopRightControls: React.FC = () => {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: вертикальный layout справа */}
      <div 
        className="fixed hidden md:flex flex-col items-end gap-2 pointer-events-none"
        style={{ top: '60px', right: '50px', zIndex: 99999999 }}
      >
        <div className="pointer-events-auto">
          <AuthBadge />
        </div>
        <div className="pointer-events-auto">
          <AutoRiaUserBadge />
        </div>
      </div>

      {/* Mobile: горизонтальный компактный layout под header */}
      <div 
        className="fixed md:hidden flex items-center gap-2 pointer-events-none"
        style={{ top: '55px', left: '10px', zIndex: 99999998 }}
      >
        <div className="pointer-events-auto scale-90 origin-left">
          <AuthBadge />
        </div>
        <div className="pointer-events-auto scale-90 origin-left">
          <AutoRiaUserBadge />
        </div>
      </div>

      {/* Language Selector - manages its own position */}
      <FixedLanguageSwitch />
    </>
  );
};

export default TopRightControls;
