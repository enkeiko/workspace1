"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Eye, FileText } from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@/hooks/use-debounce";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";

interface Quotation {
  id: number;
  quotationNumber: string;
  quotationDate: string;
  validUntil?: string;
  status: string;
  totalAmount: number;
  customer: {
    id: number;
    name: string;
  };
  store: {
    id: number;
    name: string;
  } | null;
  _count?: {
    items: number;
  };
  createdAt: string;
}

interface QuotationsTableProps {
  initialQuotations: Quotation[];
  initialTotalPages: number;
  initialPage: number;
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

function formatPrice(price: number) {
  return new Intl.NumberFormat("ko-KR").format(price);
}

export function QuotationsTable({
  initialQuotations,
  initialTotalPages,
  initialPage,
}: QuotationsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quotations, setQuotations] = useState(initialQuotations);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<Quotation | null>(null);

  const debouncedSearch = useDebounce(search, 500);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`/quotations?${params.toString()}`);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value !== "all") {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    params.set("page", "1");
    router.push(`/quotations?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/quotations?${params.toString()}`);
  };

  const handleDeleteClick = (quotation: Quotation) => {
    setQuotationToDelete(quotation);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!quotationToDelete) return;

    try {
      const response = await fetch(`/api/quotations/${quotationToDelete.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("삭제 완료", {
          description: "견적서가 삭제되었습니다.",
        });
        router.refresh();
      } else {
        toast.error("삭제 실패", {
          description: result.error?.message || "견적서 삭제에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("삭제 실패:", error);
      toast.error("삭제 실패", {
        description: "견적서 삭제 중 오류가 발생했습니다.",
      });
    } finally {
      setQuotationToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>견적서 목록</CardTitle>
          <CardDescription>등록된 견적서를 검색하고 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="견적서번호, 메모로 검색..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="draft">초안</SelectItem>
                <SelectItem value="sent">발송</SelectItem>
                <SelectItem value="accepted">수락</SelectItem>
                <SelectItem value="rejected">거절</SelectItem>
                <SelectItem value="expired">만료</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {quotations.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={search || statusFilter !== "all" ? "검색 결과가 없습니다" : "등록된 견적서가 없습니다"}
              description={
                search || statusFilter !== "all"
                  ? "다른 검색 조건으로 다시 시도해보세요."
                  : "첫 번째 견적서를 작성하여 시작하세요."
              }
              actionLabel={search || statusFilter !== "all" ? undefined : "견적서 작성"}
              actionHref={search || statusFilter !== "all" ? undefined : "/quotations/new"}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>견적서번호</TableHead>
                    <TableHead>고객</TableHead>
                    <TableHead>매장</TableHead>
                    <TableHead>견적일</TableHead>
                    <TableHead>유효기간</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>총액</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations.map((quotation) => (
                    <TableRow key={quotation.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/quotations/${quotation.id}`}
                          className="text-primary hover:underline"
                        >
                          {quotation.quotationNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{quotation.customer.name}</TableCell>
                      <TableCell>{quotation.store?.name || "-"}</TableCell>
                      <TableCell>
                        {new Date(quotation.quotationDate).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell>
                        {quotation.validUntil
                          ? new Date(quotation.validUntil).toLocaleDateString("ko-KR")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[quotation.status] || "default"}>
                          {statusLabels[quotation.status] || quotation.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatPrice(Number(quotation.totalAmount))}원</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/quotations/${quotation.id}`}>
                            <Button variant="ghost" size="icon" title="상세보기">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/quotations/${quotation.id}/edit`}>
                            <Button variant="ghost" size="icon" title="수정">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="삭제"
                            onClick={() => handleDeleteClick(quotation)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    이전
                  </Button>
                  <span className="text-sm text-gray-500">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                  >
                    다음
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="견적서를 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다. 견적서 정보와 관련된 모든 데이터가 삭제됩니다."
        itemName={quotationToDelete?.quotationNumber || "견적서"}
        requireConfirmation={true}
      />
    </>
  );
}

