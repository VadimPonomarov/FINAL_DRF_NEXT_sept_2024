"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, getDay } from 'date-fns'

export interface CalendarProps {
  className?: string;
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  mode?: "single";
  disabled?: (date: Date) => boolean;
  initialFocus?: boolean;
  locale?: Locale;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  modifiers?: {
    hasHistory?: (date: Date) => boolean;
    [key: string]: ((date: Date) => boolean) | undefined;
  };
  modifiersClassNames?: {
    hasHistory?: string;
    [key: string]: string | undefined;
  };
  showOutsideDays?: boolean;
}

function Calendar({
  className,
  selected,
  onSelect,
  mode = "single",
  disabled,
  initialFocus,
  locale,
  weekStartsOn = 1,
  modifiers,
  modifiersClassNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(selected || new Date());

  // Получаем дни недели, начиная с указанного дня
  const weekDays = React.useMemo(() => {
    const days = [];
    const date = new Date();
    date.setDate(date.getDate() - date.getDay() + weekStartsOn);

    for (let i = 0; i < 7; i++) {
      days.push(format(date, 'EEEEEE', { locale }));
      date.setDate(date.getDate() + 1);
    }

    return days;
  }, [locale, weekStartsOn]);

  // Получаем дни для текущего месяца
  const days = React.useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Функция для перехода к предыдущему месяцу
  const handlePreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  // Функция для перехода к следующему месяцу
  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  // Функция для выбора даты
  const handleSelectDate = (date: Date) => {
    if (onSelect) {
      if (mode === "single") {
        onSelect(date);
      }
    }
  };

  // Функция для проверки, имеет ли дата модификатор
  const hasModifier = (date: Date, modifierKey: string): boolean => {
    return modifiers?.[modifierKey] ? modifiers[modifierKey]!(date) : false;
  };

  // Функция для проверки, отключена ли дата
  const isDateDisabled = (date: Date): boolean => {
    return disabled ? disabled(date) : false;
  };

  // Группируем дни по неделям
  const weeks = React.useMemo(() => {
    const result = [];
    let week = [];

    // Добавляем дни до начала месяца, если нужно
    if (showOutsideDays) {
      const firstDay = days[0];
      const dayOfWeek = getDay(firstDay) || 7; // Воскресенье = 0, преобразуем в 7
      const daysToAdd = (dayOfWeek - weekStartsOn + 7) % 7;

      for (let i = daysToAdd - 1; i >= 0; i--) {
        const date = new Date(firstDay);
        date.setDate(firstDay.getDate() - i - 1);
        week.push(date);
      }
    }

    // Добавляем дни текущего месяца
    days.forEach(day => {
      week.push(day);

      if (week.length === 7) {
        result.push(week);
        week = [];
      }
    });

    // Добавляем дни после конца месяца, если нужно
    if (week.length > 0 && showOutsideDays) {
      const lastDay = days[days.length - 1];
      const daysToAdd = 7 - week.length;

      for (let i = 1; i <= daysToAdd; i++) {
        const date = new Date(lastDay);
        date.setDate(lastDay.getDate() + i);
        week.push(date);
      }

      result.push(week);
    }

    return result;
  }, [days, weekStartsOn, showOutsideDays]);

  return (
    <div className={cn("p-3", className)} {...props}>
      <div className="space-y-4">
        <div className="flex justify-center pt-1 relative items-center">
          <div className="text-sm font-medium">
            {format(currentMonth, 'LLLL yyyy', { locale })}
          </div>
          <div className="space-x-1 flex items-center absolute right-1">
            <button
              onClick={handlePreviousMonth}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
              )}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
              )}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="w-full border-collapse space-y-1">
          <div className="flex">
            {weekDays.map((day, index) => (
              <div
                key={index}
                className="text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center"
              >
                {day}
              </div>
            ))}
          </div>

          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex w-full mt-2">
              {week.map((day, dayIndex) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelectedDay = selected && isSameDay(day, selected);
                const isDayToday = isToday(day);
                const isDayDisabled = isDateDisabled(day);

                // Проверяем все модификаторы
                const modifierClasses = modifiers
                  ? Object.keys(modifiers)
                      .filter(key => modifiers[key] && modifiers[key]!(day))
                      .map(key => modifiersClassNames?.[key])
                      .filter(Boolean)
                      .join(' ')
                  : '';

                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      "h-9 w-9 text-center text-sm p-0 relative",
                      isSelectedDay && "bg-accent",
                      hasModifier(day, 'hasHistory') && modifiersClassNames?.hasHistory
                    )}
                  >
                    <button
                      onClick={() => !isDayDisabled && handleSelectDate(day)}
                      className={cn(
                        buttonVariants({ variant: "ghost" }),
                        "h-9 w-9 p-0 font-normal relative z-[5]",
                        isSelectedDay && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground relative z-10",
                        isDayToday && "bg-accent text-accent-foreground relative z-10",
                        !isCurrentMonth && "text-muted-foreground opacity-50",
                        isDayDisabled && "text-muted-foreground opacity-50 cursor-not-allowed"
                      )}
                      disabled={isDayDisabled}
                      type="button"
                    >
                      {format(day, 'd')}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
