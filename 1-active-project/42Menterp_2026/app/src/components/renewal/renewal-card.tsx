"use client";

import * as React from "react";
import {
  Calendar,
  Clock,
  RefreshCw,
  X,
  Check,
  Store,
  Tag,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface RenewalItem {
  keyword: string;
  storeName: string;
  dailyQty: number;
  unitPrice: number;
}

interface RenewalCardProps {
  renewal: {
    id: string;
    originalOrderNo: string;
    channelName: string;
    proposedStartDate: string;
    proposedEndDate: string;
    proposedAmount: number;
    expiryDate: string;
    items: RenewalItem[];
    status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  };
  onAccept?: (renewalId: string) => Promise<void>;
  onDecline?: (renewalId: string) => Promise<void>;
  className?: string;
}

export function RenewalCard({
  renewal,
  onAccept,
  onDecline,
  className,
}: RenewalCardProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadingAction, setLoadingAction] = React.useState<"accept" | "decline" | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  // D-Day 계산
  const getDaysUntil = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(renewal.expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const daysUntil = getDaysUntil();

  // D-Day 색상
  const getDDayStyle = () => {
    if (daysUntil <= 0) return { bg: "bg-red-50 border-red-200", text: "text-red-700", badge: "destructive" as const };
    if (daysUntil <= 3) return { bg: "bg-orange-50 border-orange-200", text: "text-orange-700", badge: "default" as const };
    if (daysUntil <= 7) return { bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700", badge: "secondary" as const };
    return { bg: "bg-green-50 border-green-200", text: "text-green-700", badge: "outline" as const };
  };

  const style = getDDayStyle();

  // 연장 수락
  const handleAccept = async () => {
    if (!onAccept) return;
    setIsLoading(true);
    setLoadingAction("accept");
    try {
      await onAccept(renewal.id);
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  // 연장 거절
  const handleDecline = async () => {
    if (!onDecline) return;
    setIsLoading(true);
    setLoadingAction("decline");
    try {
      await onDecline(renewal.id);
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
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

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 상태별 렌더링
  if (renewal.status !== "PENDING") {
    return (
      <Card className={cn("opacity-60", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{renewal.originalOrderNo}</CardTitle>
            <Badge
              variant={
                renewal.status === "ACCEPTED"
                  ? "default"
                  : renewal.status === "DECLINED"
                  ? "destructive"
                  : "secondary"
              }
            >
              {renewal.status === "ACCEPTED"
                ? "연장됨"
                : renewal.status === "DECLINED"
                ? "거절됨"
                : "만료됨"}
            </Badge>
          </div>
          <CardDescription>{renewal.channelName}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={cn(style.bg, "border-2", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{renewal.originalOrderNo}</CardTitle>
          <Badge variant={style.badge} className={style.text}>
            <Clock className="h-3 w-3 mr-1" />
            D{daysUntil > 0 ? `-${daysUntil}` : daysUntil === 0 ? "-Day" : `+${Math.abs(daysUntil)}`}
          </Badge>
        </div>
        <CardDescription>{renewal.channelName}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 연장 기간 */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>
            {formatDate(renewal.proposedStartDate)} ~ {formatDate(renewal.proposedEndDate)}
          </span>
        </div>

        {/* 연장 금액 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">연장 금액</span>
          <span className="font-semibold">{formatCurrency(renewal.proposedAmount)}</span>
        </div>

        {/* 항목 미리보기 */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {renewal.items.length}개 키워드
              </span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {renewal.items.slice(0, 5).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm py-1 px-2 bg-white/50 rounded"
              >
                <div className="flex items-center gap-2">
                  <Store className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate max-w-[120px]">{item.storeName}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {item.keyword}
                </Badge>
              </div>
            ))}
            {renewal.items.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                +{renewal.items.length - 5}개 더보기
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleDecline}
          disabled={isLoading}
        >
          {loadingAction === "decline" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <X className="h-4 w-4 mr-1" />
              거절
            </>
          )}
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={handleAccept}
          disabled={isLoading}
        >
          {loadingAction === "accept" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-1" />
              동일 조건으로 연장
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export { type RenewalCardProps };
