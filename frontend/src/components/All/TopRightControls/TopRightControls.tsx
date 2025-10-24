"use client";

import React from 'react';
import AuthBadge from '@/components/All/AuthBadge/AuthBadge';
import { RedisUserBadge } from '@/components/All/RedisUserBadge';

/**
 * Компактный компонент для управления элементами в правом верхнем углу
 * Уменьшенная версия в 2 раза
 */
const TopRightControls: React.FC = () => {
  return (
    <>
      {/* Компактная карточка с бейджами */}
      <div className="fixed top-[60px] right-4 z-[99998]">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1.5 space-y-1 min-w-[160px] backdrop-blur-sm bg-opacity-95">
          <AuthBadge />
          <RedisUserBadge />
        </div>
      </div>
    </>
  );
};

export default TopRightControls;
