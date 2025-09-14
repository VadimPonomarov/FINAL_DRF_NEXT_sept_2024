/**
 * Types for DateSelector component
 */
export interface DateSelectorProps {
  availableDates: string[];
  currentDate: string | undefined;
  onDateChange: (date: string) => void;
  formatDate?: (date: string | undefined) => string;
  onDeleteAllDates?: () => void;
}
