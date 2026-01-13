"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { ko } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  showWeekNavigation?: boolean;
}

export function DateRangePicker({
  value,
  onChange,
  className,
  placeholder = "날짜 선택",
  disabled = false,
  showWeekNavigation = true,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // 이번 주로 설정
  const handleThisWeek = () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // 월요일 시작
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    onChange?.({ from: weekStart, to: weekEnd });
    setIsOpen(false);
  };

  // 이전 주
  const handlePrevWeek = () => {
    const baseDate = value?.from || new Date();
    const prevStart = startOfWeek(subWeeks(baseDate, 1), { weekStartsOn: 1 });
    const prevEnd = endOfWeek(prevStart, { weekStartsOn: 1 });
    onChange?.({ from: prevStart, to: prevEnd });
  };

  // 다음 주
  const handleNextWeek = () => {
    const baseDate = value?.from || new Date();
    const nextStart = startOfWeek(addWeeks(baseDate, 1), { weekStartsOn: 1 });
    const nextEnd = endOfWeek(nextStart, { weekStartsOn: 1 });
    onChange?.({ from: nextStart, to: nextEnd });
  };

  // 주차 표시 (ex: "2026년 1월 2주차")
  const getWeekLabel = () => {
    if (!value?.from) return "";
    const date = value.from;
    const weekOfMonth = Math.ceil(date.getDate() / 7);
    return `${format(date, "yyyy년 M월", { locale: ko })} ${weekOfMonth}주차`;
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showWeekNavigation && (
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevWeek}
          disabled={disabled}
        >
          <CalendarIcon className="h-4 w-4 -rotate-180" />
        </Button>
      )}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "MM/dd", { locale: ko })} -{" "}
                  {format(value.to, "MM/dd", { locale: ko })}
                  <span className="ml-2 text-muted-foreground">
                    ({getWeekLabel()})
                  </span>
                </>
              ) : (
                format(value.from, "PPP", { locale: ko })
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-2 border-b flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleThisWeek}
              className="flex-1"
            >
              이번 주
            </Button>
          </div>
          <Calendar
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={(range) => {
              onChange?.(range);
              if (range?.from && range?.to) {
                setIsOpen(false);
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {showWeekNavigation && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleNextWeek}
          disabled={disabled}
        >
          <CalendarIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
