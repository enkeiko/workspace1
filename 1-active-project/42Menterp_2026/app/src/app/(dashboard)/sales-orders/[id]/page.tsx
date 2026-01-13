"use client";

import { useState, useEffect, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  CheckCircle,
  ArrowRightCircle,
  FileText,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format, addWeeks, startOfWeek, getWeek, getYear } from "date-fns";
import { ko } from "date-fns/locale";

interface SalesOrderItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
  store?: {
    id: string;
    name: string;
    mid: string;
  } | null;
  product?: {
    id: string;
    name: string;
  } | null;
}

interface SalesOrder {
  id: string;
  salesOrderNo: string;
  orderDate: string;
  status: string;
  totalAmount: number;
  taxAmount: number;
  note: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    businessName: string | null;
    businessNo: string | null;
    ceoName: string | null;
    phone: string | null;
    email: string | null;
  };
  sourceQuotation?: {
    id: string;
    quotationNo: string;
  } | null;
  createdBy: {
    name: string;
    email: string;
  };
  items: SalesOrderItem[];
  purchaseOrders: Array<{
    id: string;
    purchaseOrderNo: string;
    status: string;
    totalAmount: number;
  }>;
  statements: Array<{
    id: string;
    statementNo: string;
    status: string;
  }>;
}

interface Channel {
  id: string;
  name: string;
  code: string;
  type: string;
}

const statusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  DRAFT: { label: "초안", variant: "outline" },
  CONFIRMED: { label: "확정", variant: "secondary" },
  IN_PROGRESS: { label: "진행중", variant: "default" },
  COMPLETED: { label: "완료", variant: "default" },
  CANCELLED: { label: "취소", variant: "destructive" },
};

export default function SalesOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [salesOrder, setSalesOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 발주 전환 관련
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [orderDate, setOrderDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [orderWeek, setOrderWeek] = useState("");

  const weekOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 8; i++) {
      const weekStart = startOfWeek(addWeeks(today, i), { weekStartsOn: 1 });
      const weekNum = getWeek(weekStart, { weekStartsOn: 1 });
      const year = getYear(weekStart);
      const weekId = `${year}W${weekNum.toString().padStart(2, "0")}`;
      const label = `${year}년 ${weekNum}주차 (${format(weekStart, "M/d", { locale: ko })}~)`;
      options.push({ value: weekId, label });
    }
    return options;
  }, []);

  useEffect(() => {
    fetchSalesOrder();
    fetchChannels();
  }, [id]);

  useEffect(() => {
    if (weekOptions.length > 0 && !orderWeek) {
      setOrderWeek(weekOptions[0].value);
    }
  }, [weekOptions, orderWeek]);

  const fetchSalesOrder = async () => {
    try {
      const res = await fetch(`/api/sales-orders/${id}`);
      const data = await res.json();

      if (res.ok) {
        setSalesOrder(data);
      } else {
        toast.error(data.error);
        router.push("/sales-orders");
      }
    } catch (error) {
      console.error("Failed to fetch sales order:", error);
      toast.error("수주 정보를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async () => {
    try {
      const res = await fetch("/api/channels");
      const data = await res.json();
      if (res.ok) {
        setChannels(data.channels || []);
      }
    } catch (error) {
      console.error("Failed to fetch channels:", error);
    }
  };

  const handleConfirm = async () => {
    if (!salesOrder) return;

    setStatusLoading(true);
    try {
      const res = await fetch(`/api/sales-orders/${id}/confirm`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("수주가 확정되었습니다");
        setSalesOrder(data.salesOrder);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Failed to confirm:", error);
      toast.error("수주 확정에 실패했습니다");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!salesOrder) return;

    setStatusLoading(true);
    try {
      const res = await fetch(`/api/sales-orders/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("수주가 취소되었습니다");
        setSalesOrder(data.salesOrder);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Failed to cancel:", error);
      toast.error("수주 취소에 실패했습니다");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!salesOrder) return;

    setStatusLoading(true);
    try {
      const res = await fetch(`/api/sales-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("수주가 완료 처리되었습니다");
        setSalesOrder({ ...salesOrder, status: "COMPLETED" });
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Failed to complete:", error);
      toast.error("완료 처리에 실패했습니다");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleConvertToPurchaseOrder = async () => {
    if (!salesOrder || !selectedChannelId) {
      toast.error("채널을 선택하세요");
      return;
    }

    setConverting(true);
    try {
      const res = await fetch(`/api/sales-orders/${id}/convert-to-po`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: selectedChannelId,
          orderDate,
          orderWeek,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("발주가 생성되었습니다");
        setConvertDialogOpen(false);
        router.push(`/purchase-orders/${data.purchaseOrder.id}`);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Failed to convert to purchase order:", error);
      toast.error("발주 전환에 실패했습니다");
    } finally {
      setConverting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/sales-orders/${id}`, { method: "DELETE" });

      if (res.ok) {
        toast.success("수주가 삭제되었습니다");
        router.push("/sales-orders");
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Failed to delete sales order:", error);
      toast.error("수주 삭제에 실패했습니다");
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

  if (!salesOrder) return null;

  const canDelete = salesOrder.status === "DRAFT";
  const canConfirm = salesOrder.status === "DRAFT";
  const canCancel = ["DRAFT", "CONFIRMED"].includes(salesOrder.status);
  const canConvertToPO = salesOrder.status === "CONFIRMED" || salesOrder.status === "IN_PROGRESS";
  const canComplete = salesOrder.status === "IN_PROGRESS" && salesOrder.purchaseOrders.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/sales-orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{salesOrder.salesOrderNo}</h2>
              <Badge variant={statusMap[salesOrder.status]?.variant}>
                {statusMap[salesOrder.status]?.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {salesOrder.customer.businessName || salesOrder.customer.name}
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
                  <AlertDialogTitle>수주를 삭제하시겠습니까?</AlertDialogTitle>
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
                  <AlertDialogTitle>수주를 취소하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    연결된 대기 상태의 발주도 함께 취소됩니다.
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
              variant="default"
              onClick={handleConfirm}
              disabled={statusLoading}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              수주 확정
            </Button>
          )}
          {canConvertToPO && (
            <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default">
                  <ArrowRightCircle className="h-4 w-4 mr-2" />
                  발주 생성
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>발주 생성</DialogTitle>
                  <DialogDescription>
                    이 수주를 기반으로 발주를 생성합니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>채널 *</Label>
                    <select
                      value={selectedChannelId}
                      onChange={(e) => setSelectedChannelId(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">채널 선택</option>
                      {channels.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          {channel.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>발주일</Label>
                      <input
                        type="date"
                        value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>주차</Label>
                      <select
                        value={orderWeek}
                        onChange={(e) => setOrderWeek(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                      >
                        {weekOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setConvertDialogOpen(false)}
                    disabled={converting}
                  >
                    취소
                  </Button>
                  <Button onClick={handleConvertToPurchaseOrder} disabled={converting || !selectedChannelId}>
                    {converting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        생성 중...
                      </>
                    ) : (
                      "발주 생성"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
        </div>
      </div>

      {salesOrder.sourceQuotation && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            이 수주는 견적서{" "}
            <Link
              href={`/quotations/${salesOrder.sourceQuotation.id}`}
              className="font-medium underline"
            >
              {salesOrder.sourceQuotation.quotationNo}
            </Link>
            에서 전환되었습니다.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>수주 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">수주번호</dt>
                <dd className="font-medium">{salesOrder.salesOrderNo}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">주문일</dt>
                <dd>
                  {format(new Date(salesOrder.orderDate), "yyyy-MM-dd", {
                    locale: ko,
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">담당자</dt>
                <dd>{salesOrder.createdBy.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">등록일</dt>
                <dd>
                  {format(new Date(salesOrder.createdAt), "yyyy-MM-dd HH:mm", {
                    locale: ko,
                  })}
                </dd>
              </div>
              {salesOrder.note && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">비고</dt>
                  <dd className="whitespace-pre-wrap">{salesOrder.note}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>고객 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">업체명</dt>
                <dd className="font-medium">
                  {salesOrder.customer.businessName || salesOrder.customer.name}
                </dd>
              </div>
              {salesOrder.customer.businessNo && (
                <div>
                  <dt className="text-muted-foreground">사업자번호</dt>
                  <dd>{salesOrder.customer.businessNo}</dd>
                </div>
              )}
              {salesOrder.customer.ceoName && (
                <div>
                  <dt className="text-muted-foreground">대표자</dt>
                  <dd>{salesOrder.customer.ceoName}</dd>
                </div>
              )}
              {salesOrder.customer.phone && (
                <div>
                  <dt className="text-muted-foreground">연락처</dt>
                  <dd>{salesOrder.customer.phone}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* 연결된 발주 */}
      {salesOrder.purchaseOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>연결된 발주 ({salesOrder.purchaseOrders.length}건)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {salesOrder.purchaseOrders.map((po) => (
                <div key={po.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <Link href={`/purchase-orders/${po.id}`} className="font-medium hover:underline">
                      {po.purchaseOrderNo}
                    </Link>
                    <Badge variant={statusMap[po.status]?.variant || "outline"}>
                      {statusMap[po.status]?.label || po.status}
                    </Badge>
                  </div>
                  <span className="text-sm">{po.totalAmount.toLocaleString()}원</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>수주 항목 ({salesOrder.items.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">No</TableHead>
                <TableHead>품목명</TableHead>
                <TableHead className="text-center w-[100px]">수량</TableHead>
                <TableHead className="text-right w-[120px]">단가</TableHead>
                <TableHead className="text-right w-[120px]">금액</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesOrder.items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="text-center">{index + 1}</TableCell>
                  <TableCell>
                    <p className="font-medium">{item.description}</p>
                    {item.store && (
                      <p className="text-xs text-muted-foreground">
                        {item.store.name} ({item.store.mid})
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{item.qty}</TableCell>
                  <TableCell className="text-right">
                    {item.unitPrice.toLocaleString()}원
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {item.amount.toLocaleString()}원
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end mt-4 pt-4 border-t">
            <div className="text-right space-y-1 w-64">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">공급가액</span>
                <span>{salesOrder.totalAmount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">부가세 (10%)</span>
                <span>{salesOrder.taxAmount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>합계</span>
                <span>{(salesOrder.totalAmount + salesOrder.taxAmount).toLocaleString()}원</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
