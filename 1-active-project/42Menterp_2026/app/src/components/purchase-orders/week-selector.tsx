"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  getWeek,
  getYear,
} from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface WeekRange {
  year: number;
  week: number;
  startDate: Date;
  endDate: Date;
  label: string; // "2026년 1월 2주차"
  weekKey: string; // "2026-W02"
}

interface WeekSelectorProps {
  value?: WeekRange;
  onChange?: (week: WeekRange) => void;
  className?: string;
  disabled?: boolean;
}

// 주차 정보 생성 헬퍼
export function getWeekRange(date: Date): WeekRange {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // 월요일 시작
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const year = getYear(weekStart);
  const week = getWeek(weekStart, { weekStartsOn: 1, firstWeekContainsDate: 4 });
  const monthWeek = Math.ceil(weekStart.getDate() / 7);

  return {
    year,
    week,
    startDate: weekStart,
    endDate: weekEnd,
    label: `${format(weekStart, "yyyy년 M월", { locale: ko })} ${monthWeek}주차`,
    weekKey: `${year}-W${String(week).padStart(2, "0")}`,
  };
}

// 현재 주 가져오기
export function getCurrentWeek(): WeekRange {
  return getWeekRange(new Date());
}

// 최근 N주 목록 생성
export function getRecentWeeks(count: number = 8): WeekRange[] {
  const weeks: WeekRange[] = [];
  const current = new Date();

  for (let i = -2; i < count - 2; i++) {
    const date = addWeeks(current, i);
    weeks.push(getWeekRange(date));
  }

  return weeks;
}

export function WeekSelector({
  value,
  onChange,
  className,
  disabled = false,
}: WeekSelectorProps) {
  const recentWeeks = React.useMemo(() => getRecentWeeks(12), []);

  // 기본값: 이번 주
  const currentWeek = value || getCurrentWeek();

  // 이전 주 이동
  const handlePrevWeek = () => {
    const prevDate = subWeeks(currentWeek.startDate, 1);
    onChange?.(getWeekRange(prevDate));
  };

  // 다음 주 이동
  const handleNextWeek = () => {
    const nextDate = addWeeks(currentWeek.startDate, 1);
    onChange?.(getWeekRange(nextDate));
  };

  // 드롭다운 선택
  const handleSelectWeek = (weekKey: string) => {
    const selected = recentWeeks.find((w) => w.weekKey === weekKey);
    if (selected) {
      onChange?.(selected);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevWeek}
        disabled={disabled}
        title="이전 주"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Select
        value={currentWeek.weekKey}
        onValueChange={handleSelectWeek}
        disabled={disabled}
      >
        <SelectTrigger className="w-[200px]">
          <Calendar className="mr-2 h-4 w-4" />
          <SelectValue>{currentWeek.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {recentWeeks.map((week) => (
            <SelectItem key={week.weekKey} value={week.weekKey}>
              <div className="flex flex-col">
                <span>{week.label}</span>
                <span className="text-xs text-muted-foreground">
                  {format(week.startDate, "MM/dd")} -{" "}
                  {format(week.endDate, "MM/dd")}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        onClick={handleNextWeek}
        disabled={disabled}
        title="다음 주"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <div className="text-sm text-muted-foreground ml-2">
        {format(currentWeek.startDate, "MM/dd")} -{" "}
        {format(currentWeek.endDate, "MM/dd")}
      </div>
    </div>
  );
}
