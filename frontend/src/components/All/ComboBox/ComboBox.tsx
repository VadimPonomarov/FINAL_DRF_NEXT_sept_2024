"use client"
import { Check } from "lucide-react";
import {FC, useState, useEffect} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils.ts";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {IItem} from "@/components/All/ComboBox/interfaces.ts";

// Global styles for combobox - always light theme for dropdowns
const comboboxStyles = {
  button: "w-[200px] justify-between bg-transparent text-gray-900 hover:bg-transparent hover:text-gray-900 focus:bg-transparent focus:text-gray-900 focus-visible:bg-transparent border-gray-300 dark:text-gray-900 dark:hover:text-gray-900 dark:focus:text-gray-900",
  popover: "w-[200px] p-0 rounded-md shadow-md bg-white border border-gray-300 text-gray-900",
  input: "h-9 focus:ring-0 bg-white text-gray-900 placeholder-gray-500 border-b border-gray-200 rounded-none focus:border-gray-300 focus:outline-none",
  list: "max-h-[200px] overflow-y-auto bg-white",
  item: "cursor-pointer text-gray-900 hover:bg-gray-100 px-2",
  empty: "py-2 text-gray-900 px-2"
};

export interface ComboBoxProps {
  items: IItem[];
  onSelect: (id: number) => void;
  label?: string;
}

const ComboBox: FC<ComboBoxProps> = ({ items = [], onSelect, label = "Select ..." }) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  // Добавляем класс к body при открытии выпадающего списка
  useEffect(() => {
    if (open) {
      document.body.classList.add('combobox-open');
    } else {
      document.body.classList.remove('combobox-open');
    }
    
    return () => {
      document.body.classList.remove('combobox-open');
    };
  }, [open]);

  return (
    <div className="relative" style={{ zIndex: open ? 2147483647 : 'auto' }}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={comboboxStyles.button}
            style={{ borderColor: 'rgb(209, 213, 219)' }}
          >
            {value ? items.find(item => item.value === value)?.label : label}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={comboboxStyles.popover}
          sideOffset={5}
          align="start"
          style={{
            zIndex: 2147483647,
            position: 'relative',
            pointerEvents: 'auto'
          }}
        >
          <Command className="rounded-md bg-white text-gray-900">
            <CommandInput
              placeholder={`Search ${label}...`}
              className={comboboxStyles.input}
            />
            <CommandList className={comboboxStyles.list}>
              <CommandEmpty className={comboboxStyles.empty}>
                No {label} found.
              </CommandEmpty>
              <CommandGroup className="bg-white">
                {items.map(item => {
                  if (item.isSeparator) {
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-50 border-b border-gray-200",
                          item.value?.includes('divider') ? "text-center text-gray-400 py-0.5" : ""
                        )}
                      >
                        {item.label}
                      </div>
                    );
                  }

                  return (
                    <CommandItem
                      key={item.id}
                      value={item.value}
                      onSelect={(currentValue) => {
                        setValue(currentValue === value ? "" : currentValue);
                        setOpen(false);
                        onSelect(item.id);
                      }}
                      className={cn(comboboxStyles.item, "pointer-events-auto")}
                      role="option"
                      aria-selected={value === item.value}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 text-gray-900",
                          value === item.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="text-gray-900">{item.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ComboBox;