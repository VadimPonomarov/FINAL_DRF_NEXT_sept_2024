"use client";

import React from 'react';
import FixedLanguageSwitch from '@/components/AutoRia/Layout/FixedLanguageSwitch';

/**
 * Компонент для управления элементами в правом нижнем углу
 * Селектор языков рядом с кнопкой чата, поднят выше
 */
const BottomRightControls: React.FC = () => {
  return (
    <>
      {/* Language Selector - поднят выше кнопки чата */}
      <div className="fixed z-[9999]
        bottom-24 right-6 
        lg:bottom-24 lg:right-6
        md:bottom-24 md:right-6
        sm:bottom-24 sm:right-6
        transition-all duration-300">
        <FixedLanguageSwitch />
      </div>
    </>
  );
};

export default BottomRightControls;
