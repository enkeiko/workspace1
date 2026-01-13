"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { BulkDeleteProps } from "./types";

export function BulkDelete({
  selectedIds,
  resource,
  onSuccess,
  onError,
  confirmMessage = "선택한 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
  disabled = false,
}: BulkDeleteProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/${resource}/bulk`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "삭제에 실패했습니다.");
      }

      const result = await response.json();

      if (result.errors && result.errors.length > 0) {
        onError?.(result.errors);
        toast.error(`${result.errors.length}건 삭제 실패`);
      } else {
        toast.success(`${selectedIds.length}건 삭제 완료`);
        onSuccess?.();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      toast.error(message);
      onError?.(selectedIds.map((id) => ({ id, reason: message })));
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          disabled={disabled || selectedIds.length === 0}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          일괄 삭제
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>삭제 확인</AlertDialogTitle>
          <AlertDialogDescription>
            {confirmMessage}
            <br />
            <span className="mt-2 block font-medium text-foreground">
              {selectedIds.length}건이 삭제됩니다.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                삭제 중...
              </>
            ) : (
              "삭제"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
