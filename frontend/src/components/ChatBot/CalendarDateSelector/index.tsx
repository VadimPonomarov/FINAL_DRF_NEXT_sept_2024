"use client";

import React from 'react';
import { CalendarDateSelectorView } from './CalendarDateSelectorView';
import { useCalendarDateSelectorLogic } from './CalendarDateSelectorLogic';
import { DateSelectorProps } from '../DateSelector/types';

export const CalendarDateSelector: React.FC<DateSelectorProps> = (props) => {
  const {
    formatDateString,
    datesWithHistory,
    handleDateSelect,
    selectedDate
  } = useCalendarDateSelectorLogic(props);

  return (
    <CalendarDateSelectorView
      availableDates={props.availableDates}
      currentDate={props.currentDate}
      onDateChange={props.onDateChange}
      formatDateString={formatDateString}
      datesWithHistory={datesWithHistory}
      onDateSelect={handleDateSelect}
      selectedDate={selectedDate}
    />
  );
};

export * from '../DateSelector/types';
