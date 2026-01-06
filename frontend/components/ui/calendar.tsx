"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";

interface CalendarProps {
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  className?: string;
}

export function Calendar({ value, onChange, minDate, className }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(value));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (day: Date) => {
    if (minDate && day < minDate) return;
    onChange(day);
  };

  const isDateDisabled = (day: Date) => {
    return minDate ? day < minDate : false;
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className={cn("w-full bg-zinc-800/50 rounded-lg border border-zinc-700 p-2.5 max-w-full overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <button
          onClick={previousMonth}
          className="p-1 hover:bg-zinc-700 rounded transition-colors"
        >
          <ChevronLeft className="h-3 w-3 text-zinc-400" />
        </button>
        <div className="text-xs font-semibold text-white">
          {format(currentMonth, "MMM yyyy")}
        </div>
        <button
          onClick={nextMonth}
          className="p-1 hover:bg-zinc-700 rounded transition-colors"
        >
          <ChevronRight className="h-3 w-3 text-zinc-400" />
        </button>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-[10px] font-medium text-zinc-500 text-center py-1"
          >
            {day.substring(0, 1)}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = isSameDay(day, value);
          const isDisabled = isDateDisabled(day);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={idx}
              onClick={() => handleDateClick(day)}
              disabled={isDisabled}
              className={cn(
                "h-6 w-full text-xs rounded transition-all flex items-center justify-center",
                !isCurrentMonth && "text-zinc-600",
                isCurrentMonth && !isSelected && !isDisabled && "text-zinc-300 hover:bg-zinc-700",
                isSelected && "bg-emerald-500 text-white font-semibold",
                isDisabled && "opacity-30 cursor-not-allowed",
                isToday && !isSelected && "ring-1 ring-zinc-500"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

