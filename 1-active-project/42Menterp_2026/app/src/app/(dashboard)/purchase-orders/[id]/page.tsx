"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import {
  ArrowLeft,
  Loader2,
  Trash2,
  FileSpreadsheet,
  ExternalLink,
  CheckCircle,
  PlayCircle,
  XCircle,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface PurchaseOrderItem {
  id: string;
  productType: string;
  keyword: string;
  dailyQty: number;
  startDate: string;
  endDate: string;
  workDays: number;
  totalQty: number;
  unitPrice: number;
  amount: number;
  note: string | null;
  store: {
    id: string;
    name: string;
    mid: string;
    placeUrl: string | null;
  };
  product?: {
    id: string;
    name: string;
  } | null;
}

interface PurchaseOrderExport {
  id: string;
  spreadsheetUrl: string;
  status: string;
  exportedAt: string;
  channelSheet: {
    sheetName: string;
    sheetType: string;
  };
  exportedBy: {
    name: string;
  };
}

interface PurchaseOrder {
  id: string;
  purchaseOrderNo: string;
  orderWeek: string;
  orderDate: string;
  status: string;
  totalQty: number;
  totalAmount: number;
  memo: string | null;
  createdAt: string;
  channel: {
    id: string;
    name: string;
    code: string;
    type: string;
    sheets: Array<{
      id: string;
      sheetType: string;
      sheetName: string;
    }>;
  };
  salesOrder?: {
    salesOrderNo: string;
    customerId: string;
  } | null;
  createdBy: {
    name: string;
    email: string;
  };
  items: PurchaseOrderItem[];
  exports: PurchaseOrderExport[];
}

const statusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  DRAFT: { label: "초안", variant: "outline" },
  PENDING: { label: "대기", variant: "secondary" },
  CONFIRMED: { label: "확정", variant: "default" },
  IN_PROGRESS: { label: "진행중", variant: "default" },
  COMPLETED: { label: "완료", variant: "default" },
  CANCELLED: { label: "취소", variant: "destructive" },
};

const statusOptions = [
  { value: "DRAFT", label: "초안" },
  { value: "PENDING", label: "대기" },
  { value: "CONFIRMED", label: "확정" },
  { value: "IN_PROGRESS", label: "진행중" },
  { value: "COMPLETED", label: "완료" },
  { value: "CANCELLED", label: "취소" },
];

export default function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPurchaseOrder();
  }, [id]);

  const fetchPurchaseOrder = async () => {
    try {
      const res = await fetch(`/api/purchase-orders/${id}`);
      const data = await res.json();

      if (res.ok) {
        setPurchaseOrder(data);
      } else {
        toast.error(data.error);
        router.push("/purchase-orders");
      }
    } catch (error) {
      console.error("Failed to fetch purchase order:", error);
      toast.error("발주 정보를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!purchaseOrder) return;

    setStatusLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("상태가 변경되었습니다");
        setPurchaseOrder({ ...purchaseOrder, status: newStatus });
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("상태 변경에 실패했습니다");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!purchaseOrder) return;

    setStatusLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}/confirm`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("발주가 확정되었습니다");
        fetchPurchaseOrder();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Failed to confirm:", error);
      toast.error("발주 확정에 실패했습니다");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!purchaseOrder) return;

    setStatusLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("발주가 취소되었습니다");
        fetchPurchaseOrder();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Failed to cancel:", error);
      toast.error("발주 취소에 실패했습니다");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!purchaseOrder) return;

    setStatusLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}/complete`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("발주가 완료되었습니다");
        fetchPurchaseOrder();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Failed to complete:", error);
      toast.error("발주 완료에 실패했습니다");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleExport = async () => {
    if (!purchaseOrder) return;

    const orderSheet = purchaseOrder.channel.sheets?.find(
      (s) => s.sheetType === "ORDER"
    );

    if (!orderSheet) {
      toast.error("발주 시트가 설정되지 않았습니다. 채널 설정을 확인하세요.");
      return;
    }

    setExporting(true);
    try {
      const res = await fetch("/api/sheets/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderId: purchaseOrder.id,
          channelSheetId: orderSheet.id,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("발주서가 출력되었습니다");
        fetchPurchaseOrder();
        if (data.spreadsheetUrl) {
          window.open(data.spreadsheetUrl, "_blank");
        }
      } else {
        toast.error(data.error || "발주서 출력에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to export:", error);
      toast.error("발주서 출력 중 오류가 발생했습니다");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}`, { method: "DELETE" });

      if (res.ok) {
        toast.success("발주가 삭제되었습니다");
        router.push("/purchase-orders");
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Failed to delete purchase order:", error);
      toast.error("발주 삭제에 실패했습니다");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!purchaseOrder) return null;

  const canDelete = purchaseOrder.status === "DRAFT";
  const canExport = ["PENDING", "CONFIRMED", "IN_PROGRESS"].includes(
    purchaseOrder.status
  );
  const canConfirm = purchaseOrder.status === "PENDING";
  const canCancel = ["DRAFT", "PENDING", "CONFIRMED"].includes(purchaseOrder.status);
  const canStart = purchaseOrder.status === "CONFIRMED";
  const canComplete = purchaseOrder.status === "IN_PROGRESS";
  const canCreateWorkStatement = ["CONFIRMED", "IN_PROGRESS"].includes(purchaseOrder.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/purchase-orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{purchaseOrder.purchaseOrderNo}</h2>
              <Badge variant={statusMap[purchaseOrder.status]?.variant}>
                {statusMap[purchaseOrder.status]?.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {purchaseOrder.channel.name} · {format(new Date(purchaseOrder.orderDate), "yyyy년 M월 d일", { locale: ko })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>발주를 삭제하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    이 작업은 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deleting ? "삭제 중..." : "삭제"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={statusLoading}>
                  <XCircle className="h-4 w-4 mr-2" />
                  취소
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>발주를 취소하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    이 작업은 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>닫기</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>
                    취소 처리
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {canConfirm && (
            <Button
              variant="outline"
              onClick={handleConfirm}
              disabled={statusLoading}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              발주 확정
            </Button>
          )}
          {canStart && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange("IN_PROGRESS")}
              disabled={statusLoading}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              작업 시작
            </Button>
          )}
          {canCreateWorkStatement && (
            <Button variant="outline" asChild>
              <Link href={`/work-statements/new?purchaseOrderId=${purchaseOrder.id}`}>
                <ClipboardList className="h-4 w-4 mr-2" />
                작업 명세 등록
              </Link>
            </Button>
          )}
          {canComplete && (
            <Button
              onClick={handleComplete}
              disabled={statusLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              완료 처리
            </Button>
          )}
          {canExport && (
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              발주서 출력
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>발주 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">발주번호</dt>
                <dd className="font-medium">{purchaseOrder.purchaseOrderNo}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">채널</dt>
                <dd className="font-medium">{purchaseOrder.channel.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">발주일</dt>
                <dd>
                  {format(new Date(purchaseOrder.orderDate), "yyyy-MM-dd", {
                    locale: ko,
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">주차</dt>
                <dd>{purchaseOrder.orderWeek}</dd>
              </div>
              {purchaseOrder.salesOrder && (
                <div>
                  <dt className="text-muted-foreground">연결된 수주</dt>
                  <dd className="font-medium">
                    <Link href={`/sales-orders/${purchaseOrder.salesOrder.customerId}`} className="text-blue-600 hover:underline">
                      {purchaseOrder.salesOrder.salesOrderNo}
                    </Link>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">총 수량</dt>
                <dd className="font-medium">
                  {purchaseOrder.totalQty.toLocaleString()}건
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">총 금액</dt>
                <dd className="font-medium">
                  {purchaseOrder.totalAmount.toLocaleString()}원
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">등록자</dt>
                <dd>{purchaseOrder.createdBy.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">등록일</dt>
                <dd>
                  {format(new Date(purchaseOrder.createdAt), "yyyy-MM-dd HH:mm", {
                    locale: ko,
                  })}
                </dd>
              </div>
              {purchaseOrder.memo && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">메모</dt>
                  <dd className="whitespace-pre-wrap">{purchaseOrder.memo}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>상태 변경</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={purchaseOrder.status}
              onValueChange={handleStatusChange}
              disabled={statusLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {purchaseOrder.exports.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">출력 이력</p>
                <div className="space-y-2">
                  {purchaseOrder.exports.map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        {format(
                          new Date(exp.exportedAt),
                          "MM-dd HH:mm"
                        )}
                      </span>
                      <a
                        href={exp.spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        열기 <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>발주 항목 ({purchaseOrder.items.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>매장</TableHead>
                <TableHead>키워드</TableHead>
                <TableHead>유형</TableHead>
                <TableHead className="text-center">일수량</TableHead>
                <TableHead>기간</TableHead>
                <TableHead className="text-center">일수</TableHead>
                <TableHead className="text-center">총수량</TableHead>
                <TableHead className="text-right">단가</TableHead>
                <TableHead className="text-right">금액</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrder.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.store.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.store.mid}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{item.keyword}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.productType}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{item.dailyQty}</TableCell>
                  <TableCell>
                    {format(new Date(item.startDate), "MM-dd")} ~{" "}
                    {format(new Date(item.endDate), "MM-dd")}
                  </TableCell>
                  <TableCell className="text-center">{item.workDays}</TableCell>
                  <TableCell className="text-center">{item.totalQty}</TableCell>
                  <TableCell className="text-right">
                    {item.unitPrice.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {item.amount.toLocaleString()}원
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end mt-4 pt-4 border-t">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                총 {purchaseOrder.items.length}건, {purchaseOrder.totalQty.toLocaleString()}개
              </p>
              <p className="text-lg font-bold">
                합계: {purchaseOrder.totalAmount.toLocaleString()}원
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
