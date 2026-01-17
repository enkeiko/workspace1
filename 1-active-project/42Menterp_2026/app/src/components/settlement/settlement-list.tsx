"use client";

import * as React from "react";
import { Calendar, Filter, History, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { RecalculationButton } from "./recalculation-button";

interface Settlement {
  id: string;
  settlementMonth: string;
  storeName: string;
  type: "REVENUE" | "COST";
  amount: number;
  status: "PENDING" | "CONFIRMED" | "PAID";
  isRetroactive: boolean;
  originalMonth?: string;
  adjustmentNote?: string;
  createdAt: string;
}

interface SettlementListProps {
  settlements?: Settlement[];
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function SettlementList({
  settlements: initialSettlements,
  isLoading = false,
  onRefresh,
  className,
}: SettlementListProps) {
  const [settlements, setSettlements] = React.useState<Settlement[]>(
    initialSettlements || []
  );
  const [includeRetroactive, setIncludeRetroactive] = React.useState(true);
  const [selectedMonth, setSelectedMonth] = React.useState<string>("all");

  // 초기 데이터 동기화
  React.useEffect(() => {
    if (initialSettlements) {
      setSettlements(initialSettlements);
    }
  }, [initialSettlements]);

  // 필터링된 데이터
  const filteredSettlements = React.useMemo(() => {
    return settlements.filter((s) => {
      // 소급분 필터
      if (!includeRetroactive && s.isRetroactive) return false;

      // 월 필터
      if (selectedMonth !== "all" && s.settlementMonth !== selectedMonth) return false;

      return true;
    });
  }, [settlements, includeRetroactive, selectedMonth]);

  // 월 옵션 생성
  const monthOptions = React.useMemo(() => {
    const months = new Set(settlements.map((s) => s.settlementMonth));
    return Array.from(months).sort().reverse();
  }, [settlements]);

  // 금액 포맷
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // 상태 뱃지
  const StatusBadge = ({ status }: { status: string }) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
      PENDING: { variant: "outline", label: "대기" },
      CONFIRMED: { variant: "secondary", label: "확정" },
      PAID: { variant: "default", label: "지급완료" },
    };
    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // 유형 뱃지
  const TypeBadge = ({ type }: { type: string }) => {
    return (
      <Badge variant={type === "REVENUE" ? "default" : "destructive"}>
        {type === "REVENUE" ? "매출" : "매입"}
      </Badge>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>정산 내역</CardTitle>
            <CardDescription>
              {filteredSettlements.length}건의 정산 내역
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            {/* 소급분 필터 */}
            <div className="flex items-center gap-2">
              <Switch
                id="retroactive"
                checked={includeRetroactive}
                onCheckedChange={setIncludeRetroactive}
              />
              <Label htmlFor="retroactive" className="text-sm">
                소급분 포함
              </Label>
            </div>

            {/* 월 필터 */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[150px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {monthOptions.map((month) => (
                  <SelectItem key={month} value={month}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 새로고침 */}
            {onRefresh && (
              <Button variant="outline" size="icon" onClick={onRefresh}>
                <Filter className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>정산월</TableHead>
                <TableHead>매장</TableHead>
                <TableHead>유형</TableHead>
                <TableHead className="text-right">금액</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>비고</TableHead>
                <TableHead className="w-[100px]">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSettlements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    정산 내역이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                filteredSettlements.map((settlement) => (
                  <TableRow
                    key={settlement.id}
                    className={cn(settlement.isRetroactive && "bg-yellow-50")}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {settlement.settlementMonth}
                        {settlement.isRetroactive && (
                          <Badge variant="outline" className="text-xs">
                            <History className="h-3 w-3 mr-1" />
                            소급 ({settlement.originalMonth})
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{settlement.storeName}</TableCell>
                    <TableCell>
                      <TypeBadge type={settlement.type} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(settlement.amount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={settlement.status} />
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {settlement.adjustmentNote || "-"}
                    </TableCell>
                    <TableCell>
                      <RecalculationButton
                        settlementId={settlement.id}
                        variant="ghost"
                        size="sm"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {/* 합계 */}
        {filteredSettlements.length > 0 && (
          <div className="mt-4 pt-4 border-t flex justify-end gap-8 text-sm">
            <div>
              <span className="text-muted-foreground">총 매출:</span>
              <span className="ml-2 font-medium text-green-600">
                {formatCurrency(
                  filteredSettlements
                    .filter((s) => s.type === "REVENUE")
                    .reduce((sum, s) => sum + s.amount, 0)
                )}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">총 매입:</span>
              <span className="ml-2 font-medium text-red-600">
                {formatCurrency(
                  filteredSettlements
                    .filter((s) => s.type === "COST")
                    .reduce((sum, s) => sum + s.amount, 0)
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
