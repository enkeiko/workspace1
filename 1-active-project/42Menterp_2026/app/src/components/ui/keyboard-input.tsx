"use client";

import * as React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

/**
 * KeyboardInput - Excel 스타일 키보드 네비게이션을 지원하는 Input 컴포넌트
 *
 * 지원 키:
 * - Enter: 다음 셀로 이동
 * - Shift+Enter: 이전 셀로 이동
 * - ArrowDown: 아래 셀로 이동
 * - ArrowUp: 위 셀로 이동
 * - ArrowLeft: 왼쪽 셀로 이동 (커서가 맨 앞일 때)
 * - ArrowRight: 오른쪽 셀로 이동 (커서가 맨 뒤일 때)
 * - Escape: 편집 취소 및 포커스 해제
 */

export interface KeyboardInputProps
  extends Omit<React.ComponentProps<typeof Input>, "onKeyDown"> {
  /** Enter 키 핸들러 */
  onEnter?: (value: string) => void;
  /** Shift+Enter 키 핸들러 */
  onShiftEnter?: (value: string) => void;
  /** Escape 키 핸들러 */
  onEscape?: () => void;
  /** 아래 화살표 키 핸들러 */
  onArrowDown?: () => void;
  /** 위 화살표 키 핸들러 */
  onArrowUp?: () => void;
  /** 왼쪽 화살표 키 핸들러 */
  onArrowLeft?: () => void;
  /** 오른쪽 화살표 키 핸들러 */
  onArrowRight?: () => void;
  /** 포커스 시 값 전체 선택 여부 */
  selectOnFocus?: boolean;
  /** 화살표 키 네비게이션 활성화 여부 */
  enableArrowNavigation?: boolean;
  /** 그리드 좌표 (네비게이션용) */
  gridPosition?: { row: number; col: number };
}

export const KeyboardInput = React.forwardRef<
  HTMLInputElement,
  KeyboardInputProps
>(
  (
    {
      onEnter,
      onShiftEnter,
      onEscape,
      onArrowDown,
      onArrowUp,
      onArrowLeft,
      onArrowRight,
      selectOnFocus = true,
      enableArrowNavigation = true,
      gridPosition,
      className,
      ...props
    },
    ref
  ) => {
    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        const value = e.currentTarget.value;
        const selectionStart = e.currentTarget.selectionStart ?? 0;
        const selectionEnd = e.currentTarget.selectionEnd ?? 0;

        switch (e.key) {
          case "Enter":
            e.preventDefault();
            if (e.shiftKey) {
              onShiftEnter?.(value);
            } else {
              onEnter?.(value);
            }
            break;

          case "Escape":
            e.preventDefault();
            e.currentTarget.blur();
            onEscape?.();
            break;

          case "ArrowDown":
            if (
              enableArrowNavigation &&
              !e.shiftKey &&
              !e.metaKey &&
              !e.ctrlKey &&
              !e.altKey
            ) {
              e.preventDefault();
              onArrowDown?.();
            }
            break;

          case "ArrowUp":
            if (
              enableArrowNavigation &&
              !e.shiftKey &&
              !e.metaKey &&
              !e.ctrlKey &&
              !e.altKey
            ) {
              e.preventDefault();
              onArrowUp?.();
            }
            break;

          case "ArrowLeft":
            // 커서가 맨 앞에 있고 선택 영역이 없을 때만 네비게이션
            if (
              enableArrowNavigation &&
              selectionStart === 0 &&
              selectionStart === selectionEnd &&
              !e.shiftKey &&
              !e.metaKey &&
              !e.ctrlKey
            ) {
              e.preventDefault();
              onArrowLeft?.();
            }
            break;

          case "ArrowRight":
            // 커서가 맨 뒤에 있고 선택 영역이 없을 때만 네비게이션
            if (
              enableArrowNavigation &&
              selectionStart === value.length &&
              selectionStart === selectionEnd &&
              !e.shiftKey &&
              !e.metaKey &&
              !e.ctrlKey
            ) {
              e.preventDefault();
              onArrowRight?.();
            }
            break;

          case "Tab":
            // Tab은 기본 동작 유지 (브라우저 접근성)
            break;
        }
      },
      [
        onEnter,
        onShiftEnter,
        onEscape,
        onArrowDown,
        onArrowUp,
        onArrowLeft,
        onArrowRight,
        enableArrowNavigation,
      ]
    );

    const handleFocus = React.useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        if (selectOnFocus) {
          // 짧은 딜레이 후 선택 (일부 브라우저 호환성)
          requestAnimationFrame(() => {
            e.target.select();
          });
        }
      },
      [selectOnFocus]
    );

    return (
      <Input
        ref={ref}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        className={cn(
          // 포커스 시 강조 스타일
          "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0",
          "focus-visible:border-blue-500",
          // 기본 스타일
          "transition-all duration-100",
          className
        )}
        data-grid-row={gridPosition?.row}
        data-grid-col={gridPosition?.col}
        {...props}
      />
    );
  }
);

KeyboardInput.displayName = "KeyboardInput";
