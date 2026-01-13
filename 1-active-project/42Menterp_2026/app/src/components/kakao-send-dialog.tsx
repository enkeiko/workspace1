"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface KakaoSendDialogProps {
  documentType: "quotation" | "statement" | "tax-invoice";
  documentId: string;
  defaultPhone?: string;
  customerName?: string;
}

export function KakaoSendDialog({
  documentType,
  documentId,
  defaultPhone = "",
  customerName,
}: KakaoSendDialogProps) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(defaultPhone);
  const [includeImage, setIncludeImage] = useState(true);
  const [sending, setSending] = useState(false);

  const documentTypeNames: Record<string, string> = {
    quotation: "견적서",
    statement: "거래명세서",
    "tax-invoice": "세금계산서",
  };

  const handleSend = async () => {
    if (!phone || phone.length < 10) {
      toast.error("올바른 전화번호를 입력해주세요");
      return;
    }

    setSending(true);

    try {
      const response = await fetch("/api/notifications/kakao/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType,
          documentId,
          recipientPhone: phone,
          includeImage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "발송에 실패했습니다");
      }

      toast.success("카카오톡 발송이 완료되었습니다");
      setOpen(false);
    } catch (error) {
      console.error("Kakao send error:", error);
      toast.error(
        error instanceof Error ? error.message : "카카오톡 발송에 실패했습니다"
      );
    } finally {
      setSending(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <MessageCircle className="h-4 w-4" />
          카카오톡 발송
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {documentTypeNames[documentType]} 카카오톡 발송
          </DialogTitle>
          <DialogDescription>
            {customerName
              ? `${customerName}님에게 ${documentTypeNames[documentType]}를 카카오톡으로 발송합니다.`
              : `${documentTypeNames[documentType]}를 카카오톡으로 발송합니다.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="phone" className="text-sm font-medium">
              수신 전화번호
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="010-0000-0000"
              value={formatPhoneNumber(phone)}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
              maxLength={13}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeImage"
              checked={includeImage}
              onCheckedChange={(checked) => setIncludeImage(checked as boolean)}
            />
            <label
              htmlFor="includeImage"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              문서 이미지 포함
            </label>
          </div>

          <p className="text-xs text-muted-foreground">
            이미지 포함 시 문서를 이미지로 변환하여 함께 발송합니다.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                발송 중...
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4 mr-2" />
                발송
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
