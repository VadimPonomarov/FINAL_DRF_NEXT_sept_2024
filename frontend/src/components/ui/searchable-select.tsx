"use client";

import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loading?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Выберите опцию...",
  disabled = false,
  className,
  searchPlaceholder = "Поиск...",
  emptyMessage = "Ничего не найдено",
  loading = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  // Find selected option
  const selectedOption = options.find((option) => option.value === value);

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options;
    
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
      option.value.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [options, searchValue]);

  const handleSelect = (selectedValue: string) => {
    if (selectedValue === value) {
      onValueChange?.("");
    } else {
      onValueChange?.(selectedValue);
    }
    setOpen(false);
    setSearchValue("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange?.("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-left font-normal",
            !selectedOption && "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
          disabled={disabled || loading}
        >
          <span className="truncate">
            {loading ? "Загрузка..." : selectedOption?.label || placeholder}
          </span>
          <div className="flex items-center gap-1">
            {selectedOption && !disabled && !loading && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-white text-gray-900 border-gray-200 z-50" align="start">
        <div className="bg-white text-gray-900">
          <div className="flex items-center border-b border-gray-200 px-3 bg-white">
            <Search className="mr-2 h-4 w-4 shrink-0 text-gray-500" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex h-10 w-full rounded-md bg-white text-gray-900 py-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 border-0"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto bg-white">
            {filteredOptions.length === 0 && (
              <div className="py-6 text-center text-sm text-gray-900">{emptyMessage}</div>
            )}
            <div className="bg-white">
              {filteredOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => {
                    console.log('[SearchableSelect] Option clicked:', option.value, option.label);
                    handleSelect(option.value);
                  }}
                  className="flex items-center px-2 py-2 cursor-pointer text-gray-900 hover:bg-gray-100 select-none"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-gray-900",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate text-gray-900">{option.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
