"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SheetSettingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  sheetType: "ORDER" | "RECEIPT";
  onSuccess: () => void;
}

export function SheetSettingDialog({
  open,
  onOpenChange,
  channelId,
  sheetType,
  onSuccess,
}: SheetSettingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sheetName: "",
    spreadsheetUrl: "",
    sheetTabName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/channels/${channelId}/sheets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          sheetType,
          sheetTabName: formData.sheetTabName || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("시트가 등록되었습니다");
        onSuccess();
        onOpenChange(false);
        setFormData({
          sheetName: "",
          spreadsheetUrl: "",
          sheetTabName: "",
        });
      } else {
        toast.error(data.error || "시트 등록에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to create sheet:", error);
      toast.error("시트 등록 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {sheetType === "ORDER" ? "발주" : "수주"} 시트 설정
          </DialogTitle>
          <DialogDescription>
            Google Sheets URL을 입력하여 {sheetType === "ORDER" ? "발주서" : "수주서"} 시트를 연동합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sheetName">시트 이름 *</Label>
            <Input
              id="sheetName"
              value={formData.sheetName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, sheetName: e.target.value }))
              }
              placeholder="예: 피닉스 발주시트"
              required
            />
            <p className="text-xs text-muted-foreground">
              관리를 위한 이름입니다.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="spreadsheetUrl">Google Sheets URL *</Label>
            <Input
              id="spreadsheetUrl"
              type="url"
              value={formData.spreadsheetUrl}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  spreadsheetUrl: e.target.value,
                }))
              }
              placeholder="https://docs.google.com/spreadsheets/d/..."
              required
            />
            <p className="text-xs text-muted-foreground">
              Google Sheets 공유 URL을 입력하세요.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sheetTabName">탭 이름 (선택)</Label>
            <Input
              id="sheetTabName"
              value={formData.sheetTabName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  sheetTabName: e.target.value,
                }))
              }
              placeholder="예: Sheet1, 발주내역"
            />
            <p className="text-xs text-muted-foreground">
              특정 탭에 데이터를 기록하려면 탭 이름을 입력하세요.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  등록 중...
                </>
              ) : (
                "등록"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
