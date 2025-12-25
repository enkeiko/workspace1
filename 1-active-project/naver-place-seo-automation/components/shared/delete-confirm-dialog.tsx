"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemName?: string;
  requireConfirmation?: boolean;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemName,
  requireConfirmation = false,
}: DeleteConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState("");

  const handleConfirm = () => {
    if (requireConfirmation && confirmText !== itemName) {
      return;
    }
    onConfirm();
    setConfirmText("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {requireConfirmation && (
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-2">
              확인을 위해 <strong>{itemName}</strong>을(를) 입력하세요:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={itemName}
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText("")}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={requireConfirmation && confirmText !== itemName}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

