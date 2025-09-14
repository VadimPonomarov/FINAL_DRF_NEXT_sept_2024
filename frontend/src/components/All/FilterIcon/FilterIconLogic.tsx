"use client";

import { useState, useEffect } from 'react';
import { FilterIconProps } from './types';

export const useFilterIconLogic = (/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  _props: FilterIconProps
) => {
  const [isOpen, setIsOpen] = useState(false);

  // Обработчик открытия фильтра
  const handleOpenFilter = () => {
    setIsOpen(true);
  };

  // Обработчик закрытия фильтра
  const handleCloseFilter = () => {
    setIsOpen(false);
  };

  // Обработчик клика по фону
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Закрываем модальное окно только если клик был по самому фону
    if (e.target === e.currentTarget) {
      const wrapper = document.querySelector('div[data-filter-debug]');
      if (wrapper) {
        const width = (wrapper as HTMLElement).style.width || window.getComputedStyle(wrapper).width;
        const height = (wrapper as HTMLElement).style.height || window.getComputedStyle(wrapper).height;
        if (width && height) {
          const size = { width, height };
          localStorage.setItem('filterDialogSize', JSON.stringify(size));
          console.log(`Saved filter size on backdrop click: ${width} x ${height}`);
        }
      }
      setIsOpen(false);
    }
  };

  // Обработчик сохранения размеров перед закрытием
  const handleSaveSize = () => {
    const wrapper = document.querySelector('div[data-filter-debug]');
    if (wrapper) {
      const width = (wrapper as HTMLElement).style.width || window.getComputedStyle(wrapper).width;
      const height = (wrapper as HTMLElement).style.height || window.getComputedStyle(wrapper).height;
      if (width && height) {
        const size = { width, height };
        localStorage.setItem('filterDialogSize', JSON.stringify(size));
        console.log(`Saved filter size on close: ${width} x ${height}`);
      }
    }
    setIsOpen(false);
  };

  return {
    isOpen,
    handleOpenFilter,
    handleCloseFilter,
    handleBackdropClick,
    handleSaveSize
  };
};
