"use client";

import React from 'react';
import { ThemeControls } from '@/components/ui/theme-controls';
import GlobalProviderToggle from '@/components/All/GlobalProviderToggle/GlobalProviderToggle';

/**
 * Fixed top-right controls - DESKTOP ONLY
 * Mobile: ці контроли в burger menu
 * Desktop: завжди видимі top-right
 */
const TopRightControls: React.FC = () => {
  return (
    <div className="hidden md:flex fixed top-4 right-4 z-[130] flex-col items-end gap-2">
      <GlobalProviderToggle />
      <ThemeControls />
    </div>
  );
};

export default TopRightControls;
