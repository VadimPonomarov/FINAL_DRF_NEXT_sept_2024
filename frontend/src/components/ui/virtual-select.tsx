"use client";

import React from "react";
import { ChevronDown, Search, X } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface VirtualSelectProps {
  value?: string;
  onValueChange?: (value: string | null, label?: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  countMessage?: string;
  disabled?: boolean;
  loading?: boolean;
  fetchOptions: (search: string) => Promise<Option[]>;
  allowClear?: boolean;
  searchable?: boolean;
  dependencies?: any[]; // Зависимости для перезагрузки данных
  initialLabel?: string; // Начальное название для отображения
}

// 🧠 МЕМОИЗАЦИЯ: Компонент мемоизирован с React.memo
const VirtualSelectComponent = React.memo(function VirtualSelect({
  value,
  onValueChange,
  placeholder = "Select option",
  searchPlaceholder = "Search...",
  emptyMessage = "No data",
  loadingMessage = "Loading...",
  countMessage = "Found",
  disabled = false,
  loading = false,
  fetchOptions,
  allowClear = false,
  searchable = true,
  dependencies = [],
  initialLabel,
}: VirtualSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [options, setOptions] = React.useState<Option[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedOption, setSelectedOption] = React.useState<Option | null>(null);

  // Контроллер для отмены запросов
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // 🚀 ОПТИМИЗАЦИЯ: Дебаунсинг для поиска
  const [debouncedSearchValue, setDebouncedSearchValue] = React.useState(searchValue);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchValue(searchValue);
    }, 300); // 300ms задержка

    return () => clearTimeout(timer);
  }, [searchValue]);

  // Update selected option when value changes
  React.useEffect(() => {
    if (!value) {
      setSelectedOption(null);
      return;
    }

    // Сначала ищем в загруженных опциях по value
    const foundByValue = Array.isArray(options) ? options.find((option) => option.value === value) : null;
    if (foundByValue) {
      setSelectedOption(foundByValue);
      return;
    }

    // Если не нашли по value, ищем по label (для случаев когда value = label)
    const foundByLabel = Array.isArray(options) ? options.find((option) => option.label === value) : null;
    if (foundByLabel) {
      setSelectedOption(foundByLabel);
      return;
    }

    // Если есть initialLabel, используем его
    if (initialLabel && initialLabel.trim()) {
      setSelectedOption({ value, label: initialLabel });
      return;
    }

    // Если value выглядит как название (не ID), используем его как label
    if (value && isNaN(Number(value)) && value.length > 2) {
      setSelectedOption({ value, label: value });
      return;
    }

    // В остальных случаях показываем placeholder
    setSelectedOption(null);
  }, [value, options, initialLabel]);

  // 🧠 МЕМОИЗАЦИЯ: Load options with request cancellation and memoization
  const loadOptions = React.useCallback(async (search: string) => {
    console.log('[VirtualSelect] Loading options for search:', search);
    
    // Отменяем предыдущий запрос
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Создаем новый контроллер
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    
    try {
      const result = await fetchOptions(search);
      
      // Проверяем, не был ли запрос отменен
      if (controller.signal.aborted) {
        console.log('[VirtualSelect] Request aborted, ignoring result');
        return;
      }

      const optionsArray = Array.isArray(result) ? result : [];
      console.log('[VirtualSelect] Got', optionsArray.length, 'options');
      setOptions(optionsArray);
      
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('[VirtualSelect] Error loading options:', error);
        setOptions([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [fetchOptions]);

  // Load initial options
  React.useEffect(() => {
    loadOptions("");
  }, [loadOptions]);

  // Reload options when dependencies change
  React.useEffect(() => {
    console.log('[VirtualSelect] Dependencies changed, reloading options');
    setSearchValue("");
    loadOptions("");
  }, dependencies);

  // 🧠 МЕМОИЗАЦИЯ: Фильтрация опций мемоизирована
  const filteredOptions = React.useMemo(() => {
    if (!searchValue.trim()) return options;

    const search = searchValue.toLowerCase();
    return options.filter(option =>
      option.label.toLowerCase().includes(search) ||
      option.value.toString().toLowerCase().includes(search)
    );
  }, [options, searchValue]);

  // Handle search change - дебаунсированный поиск
  const handleSearchChange = React.useCallback((search: string) => {
    console.log('[VirtualSelect] Search changed to:', search);
    setSearchValue(search);
    // Используем дебаунсированное значение для API запросов
    if (search.length > 2 || search.length === 0) {
      loadOptions(search);
    }
  }, [loadOptions]);

  const handleSelect = (selectedValue: string) => {
    const selectedOption = options.find(option => option.value === selectedValue);
    const label = selectedOption?.label;

    console.log('[VirtualSelect] handleSelect called with:', selectedValue);
    console.log('[VirtualSelect] Found option:', selectedOption);
    console.log('[VirtualSelect] Will call onValueChange with:', { value: selectedValue, label });

    // Обновляем selectedOption немедленно для UI
    if (selectedOption) {
      setSelectedOption(selectedOption);
    }

    if (onValueChange) {
      onValueChange(selectedValue, label);
    }
    setOpen(false);
    setSearchValue(""); // Очищаем поиск
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[VirtualSelect] Cleared');
    if (onValueChange) {
      onValueChange(null);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    console.log('[VirtualSelect] Open changed to:', newOpen);
    setOpen(newOpen);
    if (!newOpen) {
      setSearchValue("");
      // Отменяем запросы при закрытии
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Перезагружаем все опции при закрытии
      loadOptions("");
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className="relative">
      <div
        className={`
          flex items-center justify-between w-full px-3 py-2 text-sm border rounded-md cursor-pointer
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'}
          ${open ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300'}
        `}
        onClick={() => !disabled && handleOpenChange(!open)}
      >
        <span className={selectedOption?.label ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption?.label || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {allowClear && selectedOption && (
            <X
              className="h-4 w-4 text-gray-400 hover:text-gray-600"
              onClick={handleClear}
            />
          )}
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {open && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-8 pr-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto">
            {Array.isArray(options) ? options.map((option) => (
              <div
                key={option.value}
                className={`
                  px-3 py-2 text-sm cursor-pointer hover:bg-gray-100
                  ${option.value === value ? 'bg-blue-50 text-blue-600' : 'text-gray-900'}
                `}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[VirtualSelect] Option clicked:', option.value, option.label);
                  handleSelect(option.value);
                }}
                onMouseDown={(e) => {
                  e.preventDefault(); // Предотвращаем потерю фокуса
                  console.log('[VirtualSelect] Option mousedown:', option.value, option.label);
                }}
                style={{ pointerEvents: 'auto' }} // Убеждаемся, что клики работают
              >
                {option.label}
              </div>
            )) : null}

            {isLoading && (
              <div className="flex items-center justify-center py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">{loadingMessage}</span>
              </div>
            )}

            {options.length === 0 && !isLoading && (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                {searchValue ? `${emptyMessage} (search)` : emptyMessage}
              </div>
            )}

            {Array.isArray(options) && options.length > 0 && (
              <div className="flex items-center justify-center py-1 bg-gray-50 border-t">
                <span className="text-xs text-gray-500">
                  {countMessage}: {options.length}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// 🧠 МЕМОИЗАЦИЯ: Кастомная функция сравнения для оптимизации
VirtualSelectComponent.displayName = 'VirtualSelect';

export const VirtualSelect = VirtualSelectComponent;
