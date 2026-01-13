"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Edit, Trash2, FileText, CheckCircle, XCircle, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";

interface QuotationItem {
  id: number;
  productId?: number;
  productName?: string;
  productDescription?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  description?: string;
  product?: {
    id: number;
    name: string;
    category?: string;
    unit?: string;
  };
}

interface Quotation {
  id: number;
  quotationNumber: string;
  quotationDate: string;
  validUntil?: string;
  status: string;
  totalAmount: number;
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
  items: QuotationItem[];
  orders?: Array<{
    id: number;
    orderNumber: string;
    orderDate: string;
    status: string;
    totalAmount: number;
    paidAmount: number;
    unpaidAmount: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  sent: "outline",
  accepted: "default",
  rejected: "destructive",
  expired: "secondary",
};

const statusLabels: Record<string, string> = {
  draft: "초안",
  sent: "발송",
  accepted: "수락",
  rejected: "거절",
  expired: "만료",
};

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchQuotation();
    }
  }, [params.id]);

  const fetchQuotation = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/quotations/${params.id}`);

      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        setQuotation(result.data);
      } else {
        throw new Error(result.error?.message || "견적서 정보를 불러올 수 없습니다.");
      }
    } catch (error) {
      console.error("견적서 정보 조회 실패:", error);
      const errorMessage =
        error instanceof Error ? error.message : "견적서 정보를 불러올 수 없습니다.";
      setError(errorMessage);
      toast.error("데이터 로딩 실패", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!quotation) return;

    try {
      setChangingStatus(true);
      const response = await fetch(`/api/quotations/${quotation.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("상태 변경 완료", {
          description: `견적서 상태가 ${statusLabels[newStatus]}로 변경되었습니다.`,
        });
        fetchQuotation();
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

  const handleDeleteConfirm = async () => {
    if (!quotation) return;

    try {
      const response = await fetch(`/api/quotations/${quotation.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("삭제 완료", {
          description: `${quotation.quotationNumber} 견적서가 삭제되었습니다.`,
        });
        router.push("/quotations");
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

  if (error || !quotation) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <ErrorState
            title="견적서 정보를 불러올 수 없습니다"
            description={error || "견적서 정보를 찾을 수 없습니다."}
            onRetry={fetchQuotation}
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
            <Link href="/quotations">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{quotation.quotationNumber}</h1>
              <p className="text-gray-500">견적서 상세 정보</p>
            </div>
          </div>
          <div className="flex gap-2">
            {quotation.status === "draft" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange("sent")}
                  disabled={changingStatus}
                >
                  발송
                </Button>
                <Link href={`/quotations/${quotation.id}/edit`}>
                  <Button>
                    <Edit className="mr-2 h-4 w-4" />
                    수정
                  </Button>
                </Link>
              </>
            )}
            {quotation.status === "sent" && (
              <>
                <Button
                  variant="default"
                  onClick={() => handleStatusChange("accepted")}
                  disabled={changingStatus}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  수락
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleStatusChange("rejected")}
                  disabled={changingStatus}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  거절
                </Button>
              </>
            )}
            {quotation.status === "accepted" && (
              <Button
                variant="default"
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/quotations/${quotation.id}/convert`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({}),
                    });
                    const result = await response.json();
                    if (result.success) {
                      toast.success("주문 전환 완료", {
                        description: "견적서가 주문으로 전환되었습니다.",
                      });
                      router.push(`/orders/${result.data.id}`);
                    } else {
                      toast.error("주문 전환 실패", {
                        description: result.error?.message || "주문 전환에 실패했습니다.",
                      });
                    }
                  } catch (error) {
                    toast.error("주문 전환 실패", {
                      description: "주문 전환 중 오류가 발생했습니다.",
                    });
                  }
                }}
              >
                주문으로 전환
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
                <label className="text-sm font-medium text-gray-500">견적서 번호</label>
                <p className="mt-1 text-lg font-medium">{quotation.quotationNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">상태</label>
                <div className="mt-1">
                  <Badge variant={statusColors[quotation.status] || "secondary"}>
                    {statusLabels[quotation.status] || quotation.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">견적일</label>
                <p className="mt-1">
                  {new Date(quotation.quotationDate).toLocaleDateString("ko-KR")}
                </p>
              </div>
              {quotation.validUntil && (
                <div>
                  <label className="text-sm font-medium text-gray-500">유효기간</label>
                  <p className="mt-1">
                    {new Date(quotation.validUntil).toLocaleDateString("ko-KR")}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">총 금액</label>
                <p className="mt-1 text-xl font-bold">
                  {formatPrice(Number(quotation.totalAmount))}원
                </p>
              </div>
              {quotation.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">메모</label>
                  <p className="mt-1 whitespace-pre-wrap">{quotation.notes}</p>
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
                    href={`/customers/${quotation.customer.id}`}
                    className="text-lg font-medium text-primary hover:underline"
                  >
                    {quotation.customer.name}
                  </Link>
                </p>
                {quotation.customer.contactPerson && (
                  <p className="mt-1 text-sm text-gray-600">
                    담당자: {quotation.customer.contactPerson}
                  </p>
                )}
                {quotation.customer.phone && (
                  <p className="mt-1 text-sm text-gray-600">{quotation.customer.phone}</p>
                )}
                {quotation.customer.email && (
                  <p className="mt-1 text-sm text-gray-600">{quotation.customer.email}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">매장</label>
                <p className="mt-1">
                  <Link
                    href={`/stores/${quotation.store.id}`}
                    className="text-lg font-medium text-primary hover:underline"
                  >
                    {quotation.store.name}
                  </Link>
                </p>
                {quotation.store.address && (
                  <p className="mt-1 text-sm text-gray-600">{quotation.store.address}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>견적서 항목</CardTitle>
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
                    <TableHead>설명</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotation.items.map((item, index) => (
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
                        {item.description || item.productDescription || "-"}
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
                      {formatPrice(Number(quotation.totalAmount))}원
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {quotation.orders && quotation.orders.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                연결된 주문 ({quotation.orders.length}건)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>주문번호</TableHead>
                      <TableHead>주문일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">총액</TableHead>
                      <TableHead className="text-right">결제금액</TableHead>
                      <TableHead className="text-right">미지불금액</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotation.orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/orders/${order.id}`}
                            className="text-primary hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {new Date(order.orderDate).toLocaleDateString("ko-KR")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.status === "completed"
                                ? "default"
                                : order.status === "cancelled"
                                ? "destructive"
                                : order.status === "in_progress"
                                ? "outline"
                                : "secondary"
                            }
                          >
                            {order.status === "pending"
                              ? "대기중"
                              : order.status === "in_progress"
                              ? "진행중"
                              : order.status === "completed"
                              ? "완료"
                              : order.status === "cancelled"
                              ? "취소"
                              : order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatPrice(Number(order.totalAmount))}원
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatPrice(Number(order.paidAmount))}원
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatPrice(Number(order.unpaidAmount))}원
                        </TableCell>
                        <TableCell>
                          <Link href={`/orders/${order.id}`}>
                            <Button variant="ghost" size="sm">
                              상세보기
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="견적서를 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다. 견적서와 관련된 모든 데이터가 삭제됩니다."
        itemName={quotation.quotationNumber}
        requireConfirmation={true}
      />
    </MainLayout>
  );
}


