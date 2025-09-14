"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Option {
  value: string;
  label: string;
}

interface TestSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  options: Option[];
}

export function TestSelect({
  value,
  onValueChange,
  placeholder = "Выберите опцию...",
  disabled = false,
  className,
  options,
}: TestSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = options.find((option) => option.value === value);

  const handleSelect = (selectedValue: string) => {
    console.log('[TestSelect] handleSelect called with:', selectedValue);
    onValueChange?.(selectedValue);
    setOpen(false);
  };

  const handleToggle = () => {
    console.log('[TestSelect] Toggle clicked, current open:', open);
    setOpen(!open);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        onClick={handleToggle}
        className={cn(
          "w-full justify-between text-left font-normal",
          !selectedOption && "text-muted-foreground",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        disabled={disabled}
      >
        <span className="truncate">
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>
      
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                console.log('[TestSelect] Option clicked:', option.value, option.label);
                handleSelect(option.value);
              }}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center"
            >
              <span className="truncate">{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
