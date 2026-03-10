"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
  className = ''
}) => {
  const [inputPage, setInputPage] = useState(String(currentPage));

  useEffect(() => {
    setInputPage(String(currentPage));
  }, [currentPage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Дозволяємо тільки цифри
    if (/^\d*$/.test(value)) {
      setInputPage(value);
    }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(inputPage);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
    } else {
      // Повертаємо поточну сторінку якщо введено невалідне значення
      setInputPage(String(currentPage));
    }
  };

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage && !loading) {
      onPageChange(page);
    }
  };

  // Генеруємо масив сторінок для відображення
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7; // Максимум видимих кнопок сторінок

    if (totalPages <= maxVisible) {
      // Якщо сторінок мало - показуємо всі
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Завжди показуємо першу сторінку
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Показуємо сторінки навколо поточної
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Завжди показуємо останню сторінку
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex items-center justify-center gap-2 flex-wrap ${className}`}>
      {/* Перша сторінка */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageClick(1)}
        disabled={currentPage === 1 || loading}
        className="hidden sm:flex"
        title="Перша сторінка"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>

      {/* Попередня сторінка */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageClick(currentPage - 1)}
        disabled={currentPage === 1 || loading}
        title="Попередня сторінка"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline ml-1">Назад</span>
      </Button>

      {/* Кнопки сторінок */}
      <div className="hidden md:flex items-center gap-1">
        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                ...
              </span>
            );
          }

          const pageNum = page as number;
          return (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePageClick(pageNum)}
              disabled={loading}
              className={`min-w-[40px] ${
                currentPage === pageNum
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : ''
              }`}
            >
              {pageNum}
            </Button>
          );
        })}
      </div>

      {/* Поле вводу сторінки */}
      <form onSubmit={handleInputSubmit} className="flex items-center gap-2">
        <span className="text-sm text-gray-600 hidden sm:inline">Сторінка</span>
        <Input
          type="text"
          inputMode="numeric"
          value={inputPage}
          onChange={handleInputChange}
          onBlur={handleInputSubmit}
          disabled={loading}
          className="w-16 h-9 text-center"
          placeholder={String(currentPage)}
        />
        <span className="text-sm text-gray-600">/ {totalPages}</span>
      </form>

      {/* Наступна сторінка */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageClick(currentPage + 1)}
        disabled={currentPage === totalPages || loading}
        title="Наступна сторінка"
      >
        <span className="hidden sm:inline mr-1">Вперед</span>
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Остання сторінка */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageClick(totalPages)}
        disabled={currentPage === totalPages || loading}
        className="hidden sm:flex"
        title="Остання сторінка"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default Pagination;
