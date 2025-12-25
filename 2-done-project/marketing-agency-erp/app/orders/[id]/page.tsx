"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Edit, Trash2, ShoppingCart, CheckCircle, XCircle, DollarSign, FileText } from "lucide-react";
import Link from "next/link";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";

interface OrderItem {
  id: number;
  productId?: number;
  productName?: string;
  productDescription?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  product?: {
    id: number;
    name: string;
    category?: string;
    unit?: string;
  };
}

interface Order {
  id: number;
  orderNumber: string;
  orderDate: string;
  dueDate?: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  notes?: string;
  customer: {
    id: number;
    name: string;
    businessNumber?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  store: {
    id: number;
    name: string;
    address?: string;
    phone?: string;
  };
  quotation?: {
    id: number;
    quotationNumber: string;
  };
  items: OrderItem[];
  invoices?: Array<{
    id: number;
    invoiceNumber: string;
    invoiceDate: string;
    amount: number;
    isPaid: boolean;
    paidDate?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  in_progress: "outline",
  completed: "default",
  cancelled: "destructive",
};

const statusLabels: Record<string, string> = {
  pending: "대기중",
  in_progress: "진행중",
  completed: "완료",
  cancelled: "취소",
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [creatingQuotation, setCreatingQuotation] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchOrder();
    }
  }, [params.id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/orders/${params.id}`);

      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        setOrder(result.data);
      } else {
        throw new Error(result.error?.message || "주문 정보를 불러올 수 없습니다.");
      }
    } catch (error) {
      console.error("주문 정보 조회 실패:", error);
      const errorMessage =
        error instanceof Error ? error.message : "주문 정보를 불러올 수 없습니다.";
      setError(errorMessage);
      toast.error("데이터 로딩 실패", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;

    try {
      setChangingStatus(true);
      const response = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("상태 변경 완료", {
          description: `주문 상태가 ${statusLabels[newStatus]}로 변경되었습니다.`,
        });
        fetchOrder();
      } else {
        toast.error("상태 변경 실패", {
          description: result.error?.message || "상태 변경에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("상태 변경 실패:", error);
      toast.error("상태 변경 실패", {
        description: "상태 변경 중 오류가 발생했습니다.",
      });
    } finally {
      setChangingStatus(false);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!order || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("입력 오류", {
        description: "유효한 결제 금액을 입력하세요.",
      });
      return;
    }

    try {
      setProcessingPayment(true);
      const response = await fetch(`/api/orders/${order.id}/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          paymentDate: new Date().toISOString().split("T")[0],
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("결제 처리 완료", {
          description: `${formatPrice(amount)}원이 결제 처리되었습니다.`,
        });
        setPaymentDialogOpen(false);
        setPaymentAmount("");
        fetchOrder();
      } else {
        toast.error("결제 처리 실패", {
          description: result.error?.message || "결제 처리에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("결제 처리 실패:", error);
      toast.error("결제 처리 실패", {
        description: "결제 처리 중 오류가 발생했습니다.",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCreateQuotation = async () => {
    if (!order) return;

    try {
      setCreatingQuotation(true);
      const response = await fetch(`/api/quotations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: order.customer.id,
          storeId: order.store.id,
          quotationDate: order.orderDate,
          items: order.items.map((item) => ({
            productId: item.product?.id,
            productName: item.productName || item.product?.name,
            productDescription: item.productDescription,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            description: item.notes,
          })),
          notes: order.notes,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("견적서 생성 완료", {
          description: "견적서가 생성되었습니다.",
        });
        fetchOrder();
      } else {
        toast.error("견적서 생성 실패", {
          description: result.error?.message || "견적서 생성에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("견적서 생성 실패:", error);
      toast.error("견적서 생성 실패", {
        description: "견적서 생성 중 오류가 발생했습니다.",
      });
    } finally {
      setCreatingQuotation(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!order) return;

    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("삭제 완료", {
          description: `${order.orderNumber} 주문이 삭제되었습니다.`,
        });
        router.push("/orders");
      } else {
        toast.error("삭제 실패", {
          description: result.error?.message || "삭제에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("삭제 실패:", error);
      toast.error("삭제 실패", {
        description: "삭제 중 오류가 발생했습니다.",
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR").format(price);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="mb-6 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j}>
                      <Skeleton className="mb-2 h-4 w-24" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !order) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <ErrorState
            title="주문 정보를 불러올 수 없습니다"
            description={error || "주문 정보를 찾을 수 없습니다."}
            onRetry={fetchOrder}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/orders">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{order.orderNumber}</h1>
              <p className="text-gray-500">주문 상세 정보</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!order.quotation && (
              <Button
                variant="outline"
                onClick={handleCreateQuotation}
                disabled={creatingQuotation}
              >
                <FileText className="mr-2 h-4 w-4" />
                {creatingQuotation ? "생성 중..." : "견적서 생성"}
              </Button>
            )}
            {order.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange("in_progress")}
                  disabled={changingStatus}
                >
                  진행 시작
                </Button>
                <Link href={`/orders/${order.id}/edit`}>
                  <Button>
                    <Edit className="mr-2 h-4 w-4" />
                    수정
                  </Button>
                </Link>
              </>
            )}
            {order.status === "in_progress" && (
              <>
                <Button
                  variant="default"
                  onClick={() => handleStatusChange("completed")}
                  disabled={changingStatus}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  완료
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleStatusChange("cancelled")}
                  disabled={changingStatus}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  취소
                </Button>
              </>
            )}
            {order.unpaidAmount > 0 && order.status !== "cancelled" && (
              <Button
                variant="outline"
                onClick={() => setPaymentDialogOpen(true)}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                결제 처리
              </Button>
            )}
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              삭제
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">주문번호</label>
                <p className="mt-1 text-lg font-medium">{order.orderNumber}</p>
                {order.quotation && (
                  <p className="mt-1 text-sm text-gray-600">
                    견적서:{" "}
                    <Link
                      href={`/quotations/${order.quotation.id}`}
                      className="text-primary hover:underline"
                    >
                      {order.quotation.quotationNumber}
                    </Link>
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">상태</label>
                <div className="mt-1">
                  <Badge variant={statusColors[order.status] || "secondary"}>
                    {statusLabels[order.status] || order.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">주문일</label>
                <p className="mt-1">{new Date(order.orderDate).toLocaleDateString("ko-KR")}</p>
              </div>
              {order.dueDate && (
                <div>
                  <label className="text-sm font-medium text-gray-500">납기일</label>
                  <p className="mt-1">{new Date(order.dueDate).toLocaleDateString("ko-KR")}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">총 금액</label>
                <p className="mt-1 text-xl font-bold">
                  {formatPrice(Number(order.totalAmount))}원
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">지불 금액</label>
                <p className="mt-1 text-lg font-semibold text-green-600">
                  {formatPrice(Number(order.paidAmount))}원
                </p>
              </div>
              {order.unpaidAmount > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">미지불 금액</label>
                  <p className="mt-1 text-lg font-semibold text-red-600">
                    {formatPrice(order.unpaidAmount)}원
                  </p>
                </div>
              )}
              {order.paidAmount > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">선금</label>
                  <p className="mt-1">{formatPrice(Number(order.paidAmount))}원</p>
                </div>
              )}
              {order.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">메모</label>
                  <p className="mt-1 whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>고객/매장 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">고객사</label>
                <p className="mt-1">
                  <Link
                    href={`/customers/${order.customer.id}`}
                    className="text-lg font-medium text-primary hover:underline"
                  >
                    {order.customer.name}
                  </Link>
                </p>
                {order.customer.contactPerson && (
                  <p className="mt-1 text-sm text-gray-600">
                    담당자: {order.customer.contactPerson}
                  </p>
                )}
                {order.customer.phone && (
                  <p className="mt-1 text-sm text-gray-600">{order.customer.phone}</p>
                )}
                {order.customer.email && (
                  <p className="mt-1 text-sm text-gray-600">{order.customer.email}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">매장</label>
                <p className="mt-1">
                  <Link
                    href={`/stores/${order.store.id}`}
                    className="text-lg font-medium text-primary hover:underline"
                  >
                    {order.store.name}
                  </Link>
                </p>
                {order.store.address && (
                  <p className="mt-1 text-sm text-gray-600">{order.store.address}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>주문 항목</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>상품명</TableHead>
                    <TableHead>수량</TableHead>
                    <TableHead>단가</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead>메모</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item, index) => (
                    <TableRow key={item.id || index}>
                      <TableCell className="font-medium">
                        {item.product?.name || item.productName || "커스텀 상품"}
                        {item.product?.category && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({item.product.category})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.quantity} {item.product?.unit || ""}
                      </TableCell>
                      <TableCell>{formatPrice(Number(item.unitPrice))}원</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatPrice(Number(item.totalPrice))}원
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {item.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableBody>
                  <TableRow className="border-t-2 font-bold">
                    <TableCell colSpan={3} className="text-right">
                      합계
                    </TableCell>
                    <TableCell className="text-right text-lg">
                      {formatPrice(Number(order.totalAmount))}원
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {order.invoices && order.invoices.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>세금계산서</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {order.invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(invoice.invoiceDate).toLocaleDateString("ko-KR")} -{" "}
                        {formatPrice(Number(invoice.amount))}원
                      </p>
                    </div>
                    <Badge variant={invoice.isPaid ? "default" : "secondary"}>
                      {invoice.isPaid ? "지불완료" : "미지불"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="주문을 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다. 주문과 관련된 모든 데이터가 삭제됩니다."
        itemName={order.orderNumber}
        requireConfirmation={true}
      />

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>결제 처리</DialogTitle>
            <DialogDescription>
              주문번호: {order.orderNumber}
              <br />
              총 금액: {formatPrice(Number(order.totalAmount))}원
              <br />
              지불 금액: {formatPrice(Number(order.paidAmount))}원
              <br />
              미지불 금액: {formatPrice(order.unpaidAmount)}원
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">
                결제 금액 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="paymentAmount"
                type="number"
                min="0"
                max={order.unpaidAmount}
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={`최대 ${formatPrice(order.unpaidAmount)}원`}
              />
              <p className="text-xs text-gray-500">
                결제 후 남은 금액:{" "}
                {paymentAmount
                  ? formatPrice(
                      Math.max(0, order.unpaidAmount - parseFloat(paymentAmount || "0"))
                    )
                  : formatPrice(order.unpaidAmount)}
                원
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPaymentDialogOpen(false);
                setPaymentAmount("");
              }}
              disabled={processingPayment}
            >
              취소
            </Button>
            <Button onClick={handlePaymentSubmit} disabled={processingPayment}>
              {processingPayment ? "처리 중..." : "결제 처리"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}


