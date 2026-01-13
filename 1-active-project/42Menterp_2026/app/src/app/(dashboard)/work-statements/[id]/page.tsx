"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  ArrowLeft,
  Loader2,
  Check,
  Trash2,
  Edit,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface WorkStatementItem {
  id: string;
  seq: number;
  completedQty: number;
  unitPriceSnapshot: number;
  amount: number;
  note: string | null;
  purchaseOrderItem: {
    id: string;
    keyword: string;
    totalQty: number;
    store: {
      id: string;
      name: string;
      mid: string;
    };
    product: {
      id: string;
      name: string;
    } | null;
  };
}

interface SettlementLine {
  id: string;
  supplyAmount: number;
  taxAmount: number;
  totalAmount: number;
  settlement: {
    id: string;
    settlementMonth: string;
    type: string;
    status: string;
  };
}

interface WorkStatement {
  id: string;
  statementNo: string;
  periodStart: string;
  periodEnd: string;
  supplyAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  note: string | null;
  confirmedAt: string | null;
  createdAt: string;
  purchaseOrder: {
    id: string;
    purchaseOrderNo: string;
    channel: {
      id: string;
      name: string;
    };
    salesOrder: {
      id: string;
      salesOrderNo: string;
      customer: {
        id: string;
        name: string;
      };
    } | null;
  };
  items: WorkStatementItem[];
  settlementLines: SettlementLine[];
  createdBy: {
    id: string;
    name: string;
  };
  confirmedBy: {
    id: string;
    name: string;
  } | null;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "초안", variant: "outline" },
  CONFIRMED: { label: "확정", variant: "default" },
  LOCKED: { label: "잠김", variant: "secondary" },
};

export default function WorkStatementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [workStatement, setWorkStatement] = useState<WorkStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchWorkStatement = async () => {
      try {
        const res = await fetch(`/api/work-statements/${id}`);
        const data = await res.json();
        if (res.ok) {
          setWorkStatement(data);
        } else {
          toast.error(data.error || "명세를 불러오는데 실패했습니다");
          router.push("/work-statements");
        }
      } catch (error) {
        console.error("Failed to fetch work statement:", error);
        toast.error("명세를 불러오는데 실패했습니다");
      } finally {
        setLoading(false);
      }
    };
    fetchWorkStatement();
  }, [id, router]);

  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/work-statements/${id}/confirm`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("작업 명세가 확정되었습니다");
        setWorkStatement(data.workStatement);
      } else {
        toast.error(data.error || "확정에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to confirm:", error);
      toast.error("확정에 실패했습니다");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/work-statements/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("작업 명세가 삭제되었습니다");
        router.push("/work-statements");
      } else {
        const data = await res.json();
        toast.error(data.error || "삭제에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("삭제에 실패했습니다");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workStatement) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/work-statements">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">
                {workStatement.statementNo}
              </h2>
              <Badge variant={statusMap[workStatement.status]?.variant}>
                {statusMap[workStatement.status]?.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {workStatement.purchaseOrder.channel.name} / {workStatement.purchaseOrder.purchaseOrderNo}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {workStatement.status === "DRAFT" && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/work-statements/${id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  수정
                </Link>
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={actionLoading}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    삭제
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>작업 명세 삭제</AlertDialogTitle>
                    <AlertDialogDescription>
                      이 작업 명세를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      삭제
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button onClick={handleConfirm} disabled={actionLoading}>
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                확정
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">발주번호</p>
                  <Link
                    href={`/purchase-orders/${workStatement.purchaseOrder.id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {workStatement.purchaseOrder.purchaseOrderNo}
                  </Link>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">채널</p>
                  <p className="font-medium">{workStatement.purchaseOrder.channel.name}</p>
                </div>
                {workStatement.purchaseOrder.salesOrder && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">수주번호</p>
                      <Link
                        href={`/sales-orders/${workStatement.purchaseOrder.salesOrder.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {workStatement.purchaseOrder.salesOrder.salesOrderNo}
                      </Link>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">고객</p>
                      <p className="font-medium">
                        {workStatement.purchaseOrder.salesOrder.customer.name}
                      </p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">작업 시작일</p>
                  <p className="font-medium">
                    {format(new Date(workStatement.periodStart), "yyyy-MM-dd", { locale: ko })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">작업 종료일</p>
                  <p className="font-medium">
                    {format(new Date(workStatement.periodEnd), "yyyy-MM-dd", { locale: ko })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">등록자</p>
                  <p className="font-medium">{workStatement.createdBy.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">등록일시</p>
                  <p className="font-medium">
                    {format(new Date(workStatement.createdAt), "yyyy-MM-dd HH:mm", { locale: ko })}
                  </p>
                </div>
                {workStatement.confirmedBy && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">확정자</p>
                      <p className="font-medium">{workStatement.confirmedBy.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">확정일시</p>
                      <p className="font-medium">
                        {workStatement.confirmedAt &&
                          format(new Date(workStatement.confirmedAt), "yyyy-MM-dd HH:mm", { locale: ko })}
                      </p>
                    </div>
                  </>
                )}
              </div>
              {workStatement.note && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">메모</p>
                  <p className="mt-1">{workStatement.note}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 작업 항목 */}
          <Card>
            <CardHeader>
              <CardTitle>작업 항목</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>매장</TableHead>
                    <TableHead>키워드</TableHead>
                    <TableHead className="text-right">완료수량</TableHead>
                    <TableHead className="text-right">단가</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workStatement.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.seq}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.purchaseOrderItem.store.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.purchaseOrderItem.store.mid}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{item.purchaseOrderItem.keyword}</TableCell>
                      <TableCell className="text-right">{item.completedQty}건</TableCell>
                      <TableCell className="text-right">
                        {item.unitPriceSnapshot.toLocaleString()}원
                      </TableCell>
                      <TableCell className="text-right">
                        {item.amount.toLocaleString()}원
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 정산 연결 */}
          {workStatement.settlementLines.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>정산 연결</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>정산월</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">공급가액</TableHead>
                      <TableHead className="text-right">세액</TableHead>
                      <TableHead className="text-right">합계</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workStatement.settlementLines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <Link
                            href={`/settlements?month=${line.settlement.settlementMonth}`}
                            className="text-blue-600 hover:underline"
                          >
                            {line.settlement.settlementMonth}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={line.settlement.type === "REVENUE" ? "default" : "secondary"}>
                            {line.settlement.type === "REVENUE" ? "매출" : "비용"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{line.settlement.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {line.supplyAmount.toLocaleString()}원
                        </TableCell>
                        <TableCell className="text-right">
                          {line.taxAmount.toLocaleString()}원
                        </TableCell>
                        <TableCell className="text-right">
                          {line.totalAmount.toLocaleString()}원
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 요약 */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>금액 요약</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">항목 수</span>
                  <span>{workStatement.items.length}건</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">총 수량</span>
                  <span>
                    {workStatement.items.reduce((sum, item) => sum + item.completedQty, 0)}건
                  </span>
                </div>
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">공급가액</span>
                  <span>{workStatement.supplyAmount.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">세액 (10%)</span>
                  <span>{workStatement.taxAmount.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between font-medium text-lg border-t pt-2">
                  <span>합계</span>
                  <span>{workStatement.totalAmount.toLocaleString()}원</span>
                </div>
              </div>

              {workStatement.status === "CONFIRMED" && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">정산 상태</p>
                  {workStatement.settlementLines.length > 0 ? (
                    <Badge variant="default">
                      <FileText className="h-3 w-3 mr-1" />
                      {workStatement.settlementLines.length}건 연결됨
                    </Badge>
                  ) : (
                    <Badge variant="outline">정산 대기</Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
