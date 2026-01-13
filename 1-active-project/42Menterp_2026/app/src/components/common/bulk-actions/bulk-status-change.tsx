"use client";

import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { BulkStatusChangeProps } from "./types";

export function BulkStatusChange({
  selectedIds,
  resource,
  options,
  onSuccess,
  onError,
  disabled = false,
}: BulkStatusChangeProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleStatusChange = async (status: string) => {
    if (selectedIds.length === 0) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/${resource}/bulk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedIds,
          data: { status },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "상태 변경에 실패했습니다.");
      }

      const result = await response.json();

      if (result.errors && result.errors.length > 0) {
        onError?.(result.errors);
        toast.error(`${result.errors.length}건 변경 실패`);
      } else {
        const statusLabel = options.find((o) => o.value === status)?.label || status;
        toast.success(`${selectedIds.length}건 "${statusLabel}"으로 변경 완료`);
        onSuccess?.();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      toast.error(message);
      onError?.(selectedIds.map((id) => ({ id, reason: message })));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isLoading || selectedIds.length === 0}
        >
          {isLoading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-4 w-4" />
          )}
          상태 변경
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleStatusChange(option.value)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
