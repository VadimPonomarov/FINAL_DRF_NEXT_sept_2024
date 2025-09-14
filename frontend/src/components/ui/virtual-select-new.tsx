"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Search, X, Loader2 } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface FetchResult {
  options: Option[];
  hasMore: boolean;
  total: number;
}

interface VirtualSelectProps {
  value?: string;
  onValueChange?: (value: string | null, label?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  fetchOptions: (search: string, page: number, pageSize: number) => Promise<FetchResult>;
  pageSize?: number;
  initialLabel?: string;
  searchable?: boolean;
  allowClear?: boolean;
}

export function VirtualSelect({
  value,
  onValueChange,
  placeholder = "Выберите опцию",
  disabled = false,
  fetchOptions,
  pageSize = 20,
  initialLabel,
  searchable = true,
  allowClear = false,
}: VirtualSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Инициализация выбранной опции
  useEffect(() => {
    if (value) {
      if (initialLabel) {
        setSelectedOption({ value, label: initialLabel });
      } else {
        // Ищем в загруженных опциях
        const found = options.find(opt => opt.value === value);
        if (found) {
          setSelectedOption(found);
        }
      }
    } else {
      setSelectedOption(null);
    }
  }, [value, initialLabel, options]);

  // Загрузка опций
  const loadOptions = useCallback(async (search: string, pageNum: number, reset: boolean = false) => {
    // Отменяем предыдущий запрос
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoading(true);
      
      const result = await fetchOptions(search, pageNum, pageSize);
      
      if (controller.signal.aborted) return;

      if (reset) {
        setOptions(result.options);
      } else {
        setOptions(prev => [...prev, ...result.options]);
      }
      
      setHasMore(result.hasMore);
      setPage(pageNum);
      
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('[VirtualSelect] Error loading options:', error);
        if (reset) {
          setOptions([]);
        }
        setHasMore(false);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [fetchOptions, pageSize]);

  // Загрузка при открытии
  useEffect(() => {
    if (open) {
      loadOptions(searchValue, 1, true);
      if (searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }, [open, loadOptions, searchValue, searchable]);

  // Поиск с дебаунсом
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      loadOptions(searchValue, 1, true);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, loadOptions, open]);

  // Обработка выбора опции
  const handleSelect = (selectedValue: string) => {
    const option = options.find(opt => opt.value === selectedValue);
    if (option) {
      setSelectedOption(option);
      onValueChange?.(selectedValue, option.label);
    }
    setOpen(false);
    setSearchValue("");
  };

  // Очистка выбора
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOption(null);
    onValueChange?.(null);
  };

  // Загрузка следующей страницы при скролле
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasMore && !isLoading) {
      loadOptions(searchValue, page + 1, false);
    }
  };

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearchValue("");
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <div
        className={`
          flex items-center justify-between w-full px-3 py-2 text-sm
          border border-gray-300 rounded-md cursor-pointer
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'}
          ${open ? 'border-blue-500 ring-1 ring-blue-500' : ''}
        `}
        onClick={() => !disabled && setOpen(!open)}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        
        <div className="flex items-center gap-1">
          {allowClear && selectedOption && !disabled && (
            <X 
              className="h-4 w-4 text-gray-400 hover:text-gray-600" 
              onClick={handleClear}
            />
          )}
          <ChevronDown 
            className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} 
          />
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          {/* Search */}
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full pl-8 pr-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  placeholder="Поиск..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Options */}
          <div 
            className="max-h-48 overflow-y-auto"
            onScroll={handleScroll}
          >
            {options.map((option) => (
              <div
                key={option.value}
                className={`
                  px-3 py-2 text-sm cursor-pointer hover:bg-gray-100
                  ${option.value === value ? 'bg-blue-50 text-blue-600' : 'text-gray-900'}
                `}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Загрузка...</span>
              </div>
            )}

            {/* No data */}
            {!isLoading && options.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                {searchValue ? 'Ничего не найдено' : 'Нет данных'}
              </div>
            )}

            {/* Load more indicator */}
            {!isLoading && hasMore && options.length > 0 && (
              <div className="px-3 py-2 text-xs text-gray-400 text-center">
                Прокрутите для загрузки еще...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
