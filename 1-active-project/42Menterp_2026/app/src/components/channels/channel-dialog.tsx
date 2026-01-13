"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ChannelDialog({
  open,
  onOpenChange,
  onSuccess,
}: ChannelDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    type: "REVIEW" | "SAVE" | "DIRECTION" | "TRAFFIC";
    baseUnitPrice: number;
  }>({
    name: "",
    code: "",
    type: "TRAFFIC",
    baseUnitPrice: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("채널이 등록되었습니다");
        onSuccess();
        onOpenChange(false);
        setFormData({
          name: "",
          code: "",
          type: "TRAFFIC",
          baseUnitPrice: 0,
        });
      } else {
        toast.error(data.error || "채널 등록에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to create channel:", error);
      toast.error("채널 등록 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>채널 추가</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">채널명 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="피닉스, 말차, 히든 등"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">채널 코드 *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  code: e.target.value.toUpperCase(),
                }))
              }
              placeholder="PHOENIX, MATCHA 등"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">유형 *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  type: value as "REVIEW" | "SAVE" | "DIRECTION" | "TRAFFIC",
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRAFFIC">트래픽</SelectItem>
                <SelectItem value="REVIEW">리뷰</SelectItem>
                <SelectItem value="SAVE">저장</SelectItem>
                <SelectItem value="DIRECTION">길찾기</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUnitPrice">기본 단가 (원) *</Label>
            <Input
              id="baseUnitPrice"
              type="number"
              min={0}
              value={formData.baseUnitPrice}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  baseUnitPrice: parseInt(e.target.value) || 0,
                }))
              }
              required
            />
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
