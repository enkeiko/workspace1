"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
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
import { Plus, Search, Edit, Trash2, Eye, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@/hooks/use-debounce";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";

interface Consultation {
  id: number;
  consultationChannel: string;
  consultationDate: string;
  consultationTopic?: string;
  consultationResult?: string;
  customer: {
    id: number;
    name: string;
  };
  store?: {
    id: number;
    name: string;
  };
  relatedOrder?: {
    id: number;
    orderNumber: string;
  };
  relatedQuotation?: {
    id: number;
    quotationNumber: string;
  };
  createdAt: string;
}

const channelLabels: Record<string, string> = {
  kakao: "카카오톡",
  phone: "전화",
  email: "이메일",
  face_to_face: "대면",
  other: "기타",
};

const channelColors: Record<string, "default" | "secondary" | "outline"> = {
  kakao: "default",
  phone: "secondary",
  email: "outline",
  face_to_face: "default",
  other: "secondary",
};

const resultLabels: Record<string, string> = {
  success: "성공",
  pending: "진행중",
  cancelled: "취소",
};

const resultColors: Record<string, "default" | "secondary" | "destructive"> = {
  success: "default",
  pending: "secondary",
  cancelled: "destructive",
};

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [consultationToDelete, setConsultationToDelete] = useState<Consultation | null>(null);

  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    fetchConsultations();
  }, [page, debouncedSearch, channelFilter]);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(channelFilter !== "all" && { channel: channelFilter }),
      });

      const response = await fetch(`/api/consultations?${params}`);

      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        setConsultations(result.data.consultations || []);
        setTotalPages(result.data.pagination?.totalPages || 1);
      } else {
        throw new Error(result.error?.message || "데이터를 불러오는데 실패했습니다.");
      }
    } catch (error) {
      console.error("상담 목록 조회 실패:", error);
      setError(error instanceof Error ? error.message : "오류가 발생했습니다.");
      toast.error("상담 목록 조회 실패", {
        description: error instanceof Error ? error.message : "오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (consultation: Consultation) => {
    setConsultationToDelete(consultation);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!consultationToDelete) return;

    try {
      const response = await fetch(`/api/consultations/${consultationToDelete.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("삭제 완료", {
          description: "상담이 삭제되었습니다.",
        });
        fetchConsultations();
      } else {
        toast.error("삭제 실패", {
          description: result.error?.message || "상담 삭제에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("삭제 실패:", error);
      toast.error("삭제 실패", {
        description: "상담 삭제 중 오류가 발생했습니다.",
      });
    } finally {
      setConsultationToDelete(null);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">상담 관리</h1>
            <p className="text-gray-500">상담 히스토리를 관리합니다.</p>
          </div>
          <Link href="/consultations/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              상담 추가
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>상담 목록</CardTitle>
            <CardDescription>등록된 상담을 검색하고 관리합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="주제, 내용, 액션 아이템으로 검색..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select
                value={channelFilter}
                onValueChange={(value) => {
                  setChannelFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="채널" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 채널</SelectItem>
                  <SelectItem value="kakao">카카오톡</SelectItem>
                  <SelectItem value="phone">전화</SelectItem>
                  <SelectItem value="email">이메일</SelectItem>
                  <SelectItem value="face_to_face">대면</SelectItem>
                  <SelectItem value="other">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <TableSkeleton rows={5} columns={7} />
            ) : error ? (
              <ErrorState
                title="데이터 로딩 실패"
                description={error}
                onRetry={fetchConsultations}
              />
            ) : consultations.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title={search || channelFilter !== "all" ? "검색 결과가 없습니다" : "등록된 상담이 없습니다"}
                description={
                  search || channelFilter !== "all"
                    ? "다른 검색 조건으로 다시 시도해보세요."
                    : "첫 번째 상담을 추가하여 시작하세요."
                }
                actionLabel={search || channelFilter !== "all" ? undefined : "상담 추가"}
                actionHref={search || channelFilter !== "all" ? undefined : "/consultations/new"}
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>상담일시</TableHead>
                      <TableHead>고객사</TableHead>
                      <TableHead>매장</TableHead>
                      <TableHead>채널</TableHead>
                      <TableHead>주제</TableHead>
                      <TableHead>결과</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consultations.map((consultation) => (
                      <TableRow key={consultation.id}>
                        <TableCell className="font-medium">
                          {new Date(consultation.consultationDate).toLocaleString("ko-KR", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/customers/${consultation.customer.id}`}
                            className="text-primary hover:underline"
                          >
                            {consultation.customer.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {consultation.store ? (
                            <Link
                              href={`/stores/${consultation.store.id}`}
                              className="text-primary hover:underline"
                            >
                              {consultation.store.name}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={channelColors[consultation.consultationChannel] || "secondary"}>
                            {channelLabels[consultation.consultationChannel] || consultation.consultationChannel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {consultation.consultationTopic || "-"}
                        </TableCell>
                        <TableCell>
                          {consultation.consultationResult ? (
                            <Badge variant={resultColors[consultation.consultationResult] || "secondary"}>
                              {resultLabels[consultation.consultationResult] || consultation.consultationResult}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/consultations/${consultation.id}`}>
                              <Button variant="ghost" size="icon" title="상세보기">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/consultations/${consultation.id}/edit`}>
                              <Button variant="ghost" size="icon" title="수정">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="삭제"
                              onClick={() => handleDeleteClick(consultation)}
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
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      이전
                    </Button>
                    <span className="text-sm text-gray-500">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="상담을 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다. 상담 정보가 삭제됩니다."
        itemName={consultationToDelete?.consultationTopic || "상담"}
        requireConfirmation={true}
      />
    </MainLayout>
  );
}

