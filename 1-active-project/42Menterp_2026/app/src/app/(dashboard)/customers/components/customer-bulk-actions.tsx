"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Download, Trash2 } from "lucide-react";

interface CustomerBulkActionsProps {
  selectedCount: number;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
  onExport: () => void;
  onClear: () => void;
  loading?: boolean;
}

export function CustomerBulkActions({
  selectedCount,
  onStatusChange,
  onDelete,
  onExport,
  onClear,
  loading = false,
}: CustomerBulkActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
      <div className="text-sm font-medium">선택됨: {selectedCount}건</div>
      <div className="flex flex-wrap items-center gap-2">
        <Select onValueChange={onStatusChange} disabled={loading}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="상태 변경" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">활성</SelectItem>
            <SelectItem value="PAUSED">일시정지</SelectItem>
            <SelectItem value="TERMINATED">종료</SelectItem>
          </SelectContent>
        </Select>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="text-red-600" disabled={loading}>
              <Trash2 className="h-4 w-4 mr-2" />
              일괄 삭제
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>선택한 고객을 삭제하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>
                연결된 매장이나 진행 중 문서가 있는 고객은 삭제할 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700"
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button variant="outline" onClick={onExport} disabled={loading}>
          <Download className="h-4 w-4 mr-2" />
          엑셀 내보내기
        </Button>
        <Button variant="ghost" onClick={onClear} disabled={loading}>
          선택 해제
        </Button>
      </div>
    </div>
  );
}
