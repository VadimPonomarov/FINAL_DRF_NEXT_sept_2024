"use client";

import React from 'react';
import FixedLanguageSwitch from '@/components/AutoRia/Layout/FixedLanguageSwitch';

/**
 * Language selector - fixed bottom-left position
 * Theme toggle and User menu are now in MenuMain (desktop header)
 */
const TopRightControls: React.FC = () => {
  return <FixedLanguageSwitch />;
};

export default TopRightControls;
