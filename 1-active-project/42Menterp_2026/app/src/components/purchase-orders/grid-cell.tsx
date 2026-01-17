"use client";

import * as React from "react";
import { format } from "date-fns";
import { AlertTriangle, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { KeyboardInput } from "@/components/ui/keyboard-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { GridCellData, GridCellStatus } from "./types";
import { cellStatusColors } from "./types";
import type { DateRange } from "react-day-picker";

interface GridCellProps {
  data: GridCellData;
  onChange: (data: GridCellData) => void;
  disabled?: boolean;
  showDateRange?: boolean;
  compact?: boolean;
  /** 키보드 네비게이션 핸들러 */
  onEnter?: () => void;
  onShiftEnter?: () => void;
  onArrowDown?: () => void;
  onArrowUp?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  /** 셀 ref 등록 콜백 */
  inputRef?: (el: HTMLInputElement | null) => void;
  /** 그리드 좌표 (디버깅용) */
  gridPosition?: { row: number; col: number };
}

export function GridCell({
  data,
  onChange,
  disabled = false,
  showDateRange = true,
  compact = false,
  onEnter,
  onShiftEnter,
  onArrowDown,
  onArrowUp,
  onArrowLeft,
  onArrowRight,
  inputRef,
  gridPosition,
}: GridCellProps) {
  const [isDateOpen, setIsDateOpen] = React.useState(false);

  // 수량 변경
  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const qty = parseInt(e.target.value) || 0;
    onChange({
      ...data,
      qty,
      status: qty > 0 ? "PENDING" : "EMPTY",
    });
  };

  // 날짜 범위 변경
  const handleDateChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      onChange({
        ...data,
        startDate: format(range.from, "yyyy-MM-dd"),
        endDate: format(range.to, "yyyy-MM-dd"),
      });
      setIsDateOpen(false);
    }
  };

  // 날짜 포맷 (MM/dd)
  const formatDateShort = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MM/dd");
    } catch {
      return "-";
    }
  };

  const isLocked = data.isManualOverride || disabled;
  const statusColor = cellStatusColors[data.status];

  // 키보드 네비게이션이 있는 경우 KeyboardInput 사용
  const hasKeyboardNavigation = onEnter || onArrowDown || onArrowUp;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-8 px-1 border rounded",
          "transition-all duration-100",
          statusColor
        )}
      >
        {isLocked && <Lock className="h-3 w-3 mr-1 text-muted-foreground" />}
        {hasKeyboardNavigation ? (
          <KeyboardInput
            ref={inputRef}
            type="number"
            min={0}
            value={data.qty || ""}
            onChange={handleQtyChange}
            disabled={isLocked}
            className="h-6 w-16 text-center text-sm p-0 border-0 bg-transparent"
            placeholder="-"
            onEnter={onEnter}
            onShiftEnter={onShiftEnter}
            onArrowDown={onArrowDown}
            onArrowUp={onArrowUp}
            onArrowLeft={onArrowLeft}
            onArrowRight={onArrowRight}
            selectOnFocus
            enableArrowNavigation
            gridPosition={gridPosition}
          />
        ) : (
          <Input
            type="number"
            min={0}
            value={data.qty || ""}
            onChange={handleQtyChange}
            disabled={isLocked}
            className="h-6 w-16 text-center text-sm p-0 border-0 bg-transparent"
            placeholder="-"
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1 p-1 border rounded min-w-[100px]",
        statusColor
      )}
    >
      {/* 날짜 범위 */}
      {showDateRange && (
        <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={isLocked}
              className={cn(
                "text-xs text-muted-foreground hover:text-foreground",
                isLocked && "cursor-not-allowed"
              )}
            >
              {formatDateShort(data.startDate)}~{formatDateShort(data.endDate)}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{
                from: new Date(data.startDate),
                to: new Date(data.endDate),
              }}
              onSelect={handleDateChange}
              numberOfMonths={1}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* 수량 입력 */}
      <div className="flex items-center gap-1">
        {data.isManualOverride && (
          <AlertTriangle className="h-3 w-3 text-yellow-500" aria-label="수동 수정됨" />
        )}
        {hasKeyboardNavigation ? (
          <KeyboardInput
            ref={inputRef}
            type="number"
            min={0}
            value={data.qty || ""}
            onChange={handleQtyChange}
            disabled={isLocked}
            className="h-7 text-center text-sm"
            placeholder="-"
            onEnter={onEnter}
            onShiftEnter={onShiftEnter}
            onArrowDown={onArrowDown}
            onArrowUp={onArrowUp}
            onArrowLeft={onArrowLeft}
            onArrowRight={onArrowRight}
            selectOnFocus
            enableArrowNavigation
            gridPosition={gridPosition}
          />
        ) : (
          <Input
            type="number"
            min={0}
            value={data.qty || ""}
            onChange={handleQtyChange}
            disabled={isLocked}
            className="h-7 text-center text-sm"
            placeholder="-"
          />
        )}
      </div>
    </div>
  );
}

// 일괄 설정용 셀 (헤더 행)
interface BulkDateCellProps {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
  disabled?: boolean;
}

export function BulkDateCell({
  startDate,
  endDate,
  onChange,
  disabled = false,
}: BulkDateCellProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleDateChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      onChange(
        format(range.from, "yyyy-MM-dd"),
        format(range.to, "yyyy-MM-dd")
      );
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="text-xs"
        >
          {format(new Date(startDate), "MM/dd")}~
          {format(new Date(endDate), "MM/dd")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{
            from: new Date(startDate),
            to: new Date(endDate),
          }}
          onSelect={handleDateChange}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
