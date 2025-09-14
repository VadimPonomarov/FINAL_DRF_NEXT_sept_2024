"use client";

import React from 'react';
import { FilterIconView } from './FilterIconView';
import { useFilterIconLogic } from './FilterIconLogic';
import { FilterIconProps } from './types';

export const FilterIcon: React.FC<React.PropsWithChildren<FilterIconProps>> = ({ children, ...props }) => {
  const {
    isOpen,
    handleOpenFilter,
    handleCloseFilter,
    handleBackdropClick,
    handleSaveSize
  } = useFilterIconLogic(props);

  return (
    <FilterIconView
      isOpen={isOpen}
      onOpenFilter={handleOpenFilter}
      onCloseFilter={handleCloseFilter}
      onBackdropClick={handleBackdropClick}
      onSaveSize={handleSaveSize}
    >
      {children}
    </FilterIconView>
  );
};

export * from './types';
