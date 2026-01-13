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
  CheckCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface StatementItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

interface Statement {
  id: string;
  statementNo: string;
  issueDate: string;
  status: string;
  totalAmount: number;
  taxAmount: number;
  note: string | null;
  createdAt: string;
  salesOrder: {
    id: string;
    salesOrderNo: string;
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
  };
  createdBy: {
    name: string;
    email: string;
  };
  items: StatementItem[];
}

const statusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  DRAFT: { label: "초안", variant: "outline" },
  ISSUED: { label: "발행됨", variant: "secondary" },
  DELIVERED: { label: "전달됨", variant: "default" },
};

export default function StatementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchStatement();
  }, [id]);

  const fetchStatement = async () => {
    try {
      const res = await fetch(`/api/statements/${id}`);
      const data = await res.json();

      if (res.ok) {
        setStatement(data);
      } else {
        toast.error(data.error);
        router.push("/statements");
      }
    } catch (error) {
      console.error("Failed to fetch statement:", error);
      toast.error("거래명세서 정보를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!statement) return;

    setStatusLoading(true);
    try {
      const res = await fetch(`/api/statements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("상태가 변경되었습니다");
        setStatement({ ...statement, status: newStatus });
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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/statements/${id}`, { method: "DELETE" });

      if (res.ok) {
        toast.success("거래명세서가 삭제되었습니다");
        router.push("/statements");
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Failed to delete statement:", error);
      toast.error("거래명세서 삭제에 실패했습니다");
    } finally {
      setDeleting(false);
    }
  };

  const handlePrint = () => {
    window.open(`/statements/${id}/preview`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!statement) return null;

  const canDelete = statement.status === "DRAFT";
  const canIssue = statement.status === "DRAFT";
  const canDeliver = statement.status === "ISSUED";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/statements">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{statement.statementNo}</h2>
              <Badge variant={statusMap[statement.status]?.variant}>
                {statusMap[statement.status]?.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {statement.salesOrder.customer.businessName || statement.salesOrder.customer.name}
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
                  <AlertDialogTitle>거래명세서를 삭제하시겠습니까?</AlertDialogTitle>
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
          {canIssue && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange("ISSUED")}
              disabled={statusLoading}
            >
              <Send className="h-4 w-4 mr-2" />
              발행 처리
            </Button>
          )}
          {canDeliver && (
            <Button
              onClick={() => handleStatusChange("DELIVERED")}
              disabled={statusLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              전달 완료
            </Button>
          )}
          <Button variant="outline" onClick={handlePrint}>
            <FileText className="h-4 w-4 mr-2" />
            인쇄/PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>명세서 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">명세서번호</dt>
                <dd className="font-medium">{statement.statementNo}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">발행일</dt>
                <dd>
                  {format(new Date(statement.issueDate), "yyyy-MM-dd", {
                    locale: ko,
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">수주번호</dt>
                <dd>
                  <Link
                    href={`/sales-orders/${statement.salesOrder.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {statement.salesOrder.salesOrderNo}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">작성일</dt>
                <dd>
                  {format(new Date(statement.createdAt), "yyyy-MM-dd HH:mm", {
                    locale: ko,
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">담당자</dt>
                <dd>{statement.createdBy.name}</dd>
              </div>
              {statement.note && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">비고</dt>
                  <dd className="whitespace-pre-wrap">{statement.note}</dd>
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
                  {statement.salesOrder.customer.businessName || statement.salesOrder.customer.name}
                </dd>
              </div>
              {statement.salesOrder.customer.businessNo && (
                <div>
                  <dt className="text-muted-foreground">사업자번호</dt>
                  <dd>{statement.salesOrder.customer.businessNo}</dd>
                </div>
              )}
              {statement.salesOrder.customer.ceoName && (
                <div>
                  <dt className="text-muted-foreground">대표자</dt>
                  <dd>{statement.salesOrder.customer.ceoName}</dd>
                </div>
              )}
              {statement.salesOrder.customer.phone && (
                <div>
                  <dt className="text-muted-foreground">연락처</dt>
                  <dd>{statement.salesOrder.customer.phone}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>명세 항목 ({statement.items.length}건)</CardTitle>
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
              {statement.items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="text-center">{index + 1}</TableCell>
                  <TableCell>{item.description}</TableCell>
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
                <span>{statement.totalAmount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">부가세 (10%)</span>
                <span>{statement.taxAmount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>합계</span>
                <span>{(statement.totalAmount + statement.taxAmount).toLocaleString()}원</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
