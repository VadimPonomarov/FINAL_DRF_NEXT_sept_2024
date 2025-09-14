"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface SimpleSelectProps {
  options: Option[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SimpleSelect({
  options,
  value,
  onValueChange,
  placeholder = "Выберите опцию...",
  disabled = false,
  className,
}: SimpleSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = options.find((option) => option.value === value);

  const handleSelect = (selectedValue: string) => {
    console.log('[SimpleSelect] Option selected:', selectedValue);
    onValueChange?.(selectedValue);
    setOpen(false);
  };

  const handleToggle = () => {
    if (!disabled) {
      setOpen(!open);
    }
  };

  // Закрываем при клике вне компонента
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-simple-select]')) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative" data-simple-select>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        <span className="truncate">
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {options.length === 0 ? (
            <div className="py-6 text-center text-sm">Нет опций</div>
          ) : (
            options.map((option) => (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  value === option.value && "bg-accent text-accent-foreground"
                )}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="truncate">{option.label}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
