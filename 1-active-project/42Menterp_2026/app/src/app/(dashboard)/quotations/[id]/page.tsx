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
  Send,
  FileText,
  ArrowRightCircle,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface QuotationItem {
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

interface Quotation {
  id: string;
  quotationNo: string;
  subject: string | null;
  status: string;
  totalAmount: number;
  taxAmount: number;
  validUntil: string;
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
    address: string | null;
  };
  createdBy: {
    name: string;
    email: string;
  };
  items: QuotationItem[];
  convertedToSalesOrder?: {
    id: string;
    salesOrderNo: string;
  } | null;
}

const statusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  DRAFT: { label: "초안", variant: "outline" },
  SENT: { label: "발송됨", variant: "secondary" },
  ACCEPTED: { label: "승인됨", variant: "default" },
  REJECTED: { label: "거절됨", variant: "destructive" },
  EXPIRED: { label: "만료됨", variant: "destructive" },
};

export default function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const fetchQuotation = async () => {
    try {
      const res = await fetch(`/api/quotations/${id}`);
      const data = await res.json();

      if (res.ok) {
        setQuotation(data);
      } else {
        toast.error(data.error);
        router.push("/quotations");
      }
    } catch (error) {
      console.error("Failed to fetch quotation:", error);
      toast.error("견적서 정보를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!quotation) return;

    setStatusLoading(true);
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("상태가 변경되었습니다");
        setQuotation({ ...quotation, status: newStatus });
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

  const handleConvertToSalesOrder = async () => {
    if (!quotation) return;

    setConverting(true);
    try {
      const res = await fetch(`/api/quotations/${id}/convert`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("수주로 전환되었습니다");
        router.push(`/sales-orders/${data.salesOrder.id}`);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Failed to convert to sales order:", error);
      toast.error("수주 전환에 실패했습니다");
    } finally {
      setConverting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/quotations/${id}`, { method: "DELETE" });

      if (res.ok) {
        toast.success("견적서가 삭제되었습니다");
        router.push("/quotations");
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Failed to delete quotation:", error);
      toast.error("견적서 삭제에 실패했습니다");
    } finally {
      setDeleting(false);
    }
  };

  const handlePrint = () => {
    window.open(`/quotations/${id}/preview`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quotation) return null;

  const canDelete = quotation.status === "DRAFT";
  const canSend = quotation.status === "DRAFT";
  const canConvert = (quotation.status === "SENT" || quotation.status === "ACCEPTED") && !quotation.convertedToSalesOrder;
  const isExpired = new Date(quotation.validUntil) < new Date() && quotation.status !== "ACCEPTED" && quotation.status !== "REJECTED";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/quotations">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{quotation.quotationNo}</h2>
              <Badge variant={statusMap[quotation.status]?.variant}>
                {statusMap[quotation.status]?.label}
              </Badge>
              {isExpired && quotation.status === "SENT" && (
                <Badge variant="destructive">만료됨</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {quotation.customer.businessName || quotation.customer.name}
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
                  <AlertDialogTitle>견적서를 삭제하시겠습니까?</AlertDialogTitle>
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
          {canSend && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange("SENT")}
              disabled={statusLoading}
            >
              <Send className="h-4 w-4 mr-2" />
              발송 처리
            </Button>
          )}
          {canConvert && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="default" disabled={converting}>
                  <ArrowRightCircle className="h-4 w-4 mr-2" />
                  수주 전환
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>수주로 전환하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    이 견적서를 기반으로 수주가 생성됩니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConvertToSalesOrder}>
                    {converting ? "전환 중..." : "수주 전환"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="outline" onClick={handlePrint}>
            <FileText className="h-4 w-4 mr-2" />
            인쇄/PDF
          </Button>
        </div>
      </div>

      {quotation.convertedToSalesOrder && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            이 견적서는{" "}
            <Link
              href={`/sales-orders/${quotation.convertedToSalesOrder.id}`}
              className="font-medium underline"
            >
              {quotation.convertedToSalesOrder.salesOrderNo}
            </Link>
            로 수주 전환되었습니다.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>견적 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">견적번호</dt>
                <dd className="font-medium">{quotation.quotationNo}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">유효기간</dt>
                <dd className={isExpired ? "text-red-500" : ""}>
                  {format(new Date(quotation.validUntil), "yyyy-MM-dd", {
                    locale: ko,
                  })}
                  {isExpired && " (만료됨)"}
                </dd>
              </div>
              {quotation.subject && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">제목</dt>
                  <dd className="font-medium">{quotation.subject}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">작성자</dt>
                <dd>{quotation.createdBy.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">작성일</dt>
                <dd>
                  {format(new Date(quotation.createdAt), "yyyy-MM-dd HH:mm", {
                    locale: ko,
                  })}
                </dd>
              </div>
              {quotation.note && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">비고</dt>
                  <dd className="whitespace-pre-wrap">{quotation.note}</dd>
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
                  {quotation.customer.businessName || quotation.customer.name}
                </dd>
              </div>
              {quotation.customer.businessNo && (
                <div>
                  <dt className="text-muted-foreground">사업자번호</dt>
                  <dd>{quotation.customer.businessNo}</dd>
                </div>
              )}
              {quotation.customer.ceoName && (
                <div>
                  <dt className="text-muted-foreground">대표자</dt>
                  <dd>{quotation.customer.ceoName}</dd>
                </div>
              )}
              {quotation.customer.phone && (
                <div>
                  <dt className="text-muted-foreground">연락처</dt>
                  <dd>{quotation.customer.phone}</dd>
                </div>
              )}
              {quotation.customer.email && (
                <div>
                  <dt className="text-muted-foreground">이메일</dt>
                  <dd>{quotation.customer.email}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>견적 항목 ({quotation.items.length}건)</CardTitle>
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
              {quotation.items.map((item, index) => (
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
                <span>{quotation.totalAmount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">부가세 (10%)</span>
                <span>{quotation.taxAmount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>합계</span>
                <span>{(quotation.totalAmount + quotation.taxAmount).toLocaleString()}원</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
