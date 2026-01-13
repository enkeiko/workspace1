"use client";

import { X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulkActionBarProps } from "./types";

export function BulkActionBar({
  selectedCount,
  onClear,
  children,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transform">
      <div className="flex items-center gap-2 rounded-lg border bg-background px-4 py-3 shadow-lg">
        {/* 선택 정보 */}
        <div className="flex items-center gap-2 border-r pr-4">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {selectedCount.toLocaleString()}건 선택됨
          </span>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex items-center gap-2">{children}</div>

        {/* 선택 해제 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="ml-2 border-l pl-4"
        >
          <X className="mr-1 h-4 w-4" />
          선택 해제
        </Button>
      </div>
    </div>
  );
}
