"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export interface DateRange {
  from?: Date;
  to?: Date;
}

interface DatePickerWithRangeProps {
  date?: DateRange;
  onDateChange?: (date: DateRange | undefined) => void;
  className?: string;
  placeholder?: string;
}

export function DatePickerWithRange({
  date,
  onDateChange,
  className,
  placeholder = "Выберите диапазон дат"
}: DatePickerWithRangeProps) {
  const [fromDate, setFromDate] = React.useState(date?.from ? format(date.from, 'yyyy-MM-dd') : '');
  const [toDate, setToDate] = React.useState(date?.to ? format(date.to, 'yyyy-MM-dd') : '');

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFromDate(value);

    if (value && onDateChange) {
      const newFromDate = new Date(value);
      const newToDate = toDate ? new Date(toDate) : undefined;
      onDateChange({
        from: newFromDate,
        to: newToDate
      });
    }
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setToDate(value);

    if (value && onDateChange) {
      const newFromDate = fromDate ? new Date(fromDate) : undefined;
      const newToDate = new Date(value);
      onDateChange({
        from: newFromDate,
        to: newToDate
      });
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd MMM yyyy", { locale: ru })} -{" "}
                  {format(date.to, "dd MMM yyyy", { locale: ru })}
                </>
              ) : (
                format(date.from, "dd MMM yyyy", { locale: ru })
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">От:</label>
              <Input
                type="date"
                value={fromDate}
                onChange={handleFromDateChange}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">До:</label>
              <Input
                type="date"
                value={toDate}
                onChange={handleToDateChange}
                className="w-full"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
