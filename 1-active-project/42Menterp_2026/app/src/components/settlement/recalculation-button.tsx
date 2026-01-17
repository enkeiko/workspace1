"use client";

import * as React from "react";
import { Calculator, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface RecalculationResult {
  success: boolean;
  originalTotal: number;
  recalculatedTotal: number;
  difference: number;
  adjustmentSettlementId?: string;
  message: string;
}

interface RecalculationButtonProps {
  settlementId?: string;
  month?: string;
  onRecalculate?: (result: RecalculationResult) => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function RecalculationButton({
  settlementId,
  month,
  onRecalculate,
  variant = "outline",
  size = "default",
  className,
}: RecalculationButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [result, setResult] = React.useState<RecalculationResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // 재계산 실행
  const handleRecalculate = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/settlements/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId, month }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "재계산 실패");
      }

      const data: RecalculationResult = await res.json();
      setResult(data);
      onRecalculate?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setIsLoading(false);
    }
  };

  // 금액 포맷
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // 다이얼로그 닫기
  const handleClose = () => {
    setIsOpen(false);
    // 결과 초기화는 하지 않음 (다시 열었을 때 이전 결과 볼 수 있도록)
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Calculator className="h-4 w-4 mr-2" />
          재계산
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>정산 재계산</DialogTitle>
          <DialogDescription>
            실제 데이터를 기반으로 정산 금액을 재계산합니다.
            차액이 있으면 조정 정산서가 생성됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 대상 정보 */}
          <div className="text-sm text-muted-foreground">
            {settlementId ? (
              <span>정산 ID: {settlementId}</span>
            ) : month ? (
              <span>대상 월: {month}</span>
            ) : (
              <span className="text-red-500">대상이 지정되지 않았습니다</span>
            )}
          </div>

          {/* 에러 */}
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 결과 */}
          {result && (
            <div
              className={cn(
                "p-4 rounded-lg space-y-3",
                result.difference === 0 ? "bg-green-50" : "bg-yellow-50"
              )}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">{result.message}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">기존 금액:</span>
                  <span className="ml-2 font-medium">
                    {formatCurrency(result.originalTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">재계산 금액:</span>
                  <span className="ml-2 font-medium">
                    {formatCurrency(result.recalculatedTotal)}
                  </span>
                </div>
              </div>

              {result.difference !== 0 && (
                <div
                  className={cn(
                    "pt-2 border-t",
                    result.difference > 0 ? "text-green-700" : "text-red-700"
                  )}
                >
                  <span>차액: </span>
                  <span className="font-bold">
                    {result.difference > 0 ? "+" : ""}
                    {formatCurrency(result.difference)}
                  </span>
                  <span className="text-sm ml-2">
                    ({result.difference > 0 ? "추가 청구" : "환불"})
                  </span>
                </div>
              )}

              {result.adjustmentSettlementId && (
                <div className="text-xs text-muted-foreground">
                  조정 정산서 ID: {result.adjustmentSettlementId}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {result ? (
            <Button onClick={handleClose}>확인</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                취소
              </Button>
              <Button
                onClick={handleRecalculate}
                disabled={isLoading || (!settlementId && !month)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    계산 중...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" />
                    재계산 실행
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
