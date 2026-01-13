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
import { Plus, Search, Edit, Trash2, Eye, Download, FileText } from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@/hooks/use-debounce";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";
import { formatFileSize } from "@/lib/utils/file-validator";

interface Document {
  id: number;
  documentType: string;
  fileName: string;
  fileSize?: string;
  mimeType?: string;
  description?: string;
  tags?: string[];
  customer?: {
    id: number;
    name: string;
  };
  store?: {
    id: number;
    name: string;
  };
  order?: {
    id: number;
    orderNumber: string;
  };
  createdAt: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    fetchDocuments();
  }, [page, debouncedSearch, typeFilter]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(typeFilter !== "all" && { documentType: typeFilter }),
      });

      const response = await fetch(`/api/documents?${params}`);

      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        setDocuments(result.data.documents || []);
        setTotalPages(result.data.pagination?.totalPages || 1);
      } else {
        throw new Error(result.error?.message || "데이터를 불러오는데 실패했습니다.");
      }
    } catch (error) {
      console.error("문서 목록 조회 실패:", error);
      setError(error instanceof Error ? error.message : "오류가 발생했습니다.");
      toast.error("문서 목록 조회 실패", {
        description: error instanceof Error ? error.message : "오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (document: Document) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    try {
      const response = await fetch(`/api/documents/${documentToDelete.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("삭제 완료", {
          description: "문서가 삭제되었습니다.",
        });
        fetchDocuments();
      } else {
        toast.error("삭제 실패", {
          description: result.error?.message || "문서 삭제에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("삭제 실패:", error);
      toast.error("삭제 실패", {
        description: "문서 삭제 중 오류가 발생했습니다.",
      });
    } finally {
      setDocumentToDelete(null);
    }
  };

  const handleDownload = async (documentId: number, fileName: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/download`);
      if (!response.ok) {
        throw new Error("다운로드에 실패했습니다.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("다운로드 완료", {
        description: "파일이 다운로드되었습니다.",
      });
    } catch (error) {
      console.error("다운로드 실패:", error);
      toast.error("다운로드 실패", {
        description: error instanceof Error ? error.message : "오류가 발생했습니다.",
      });
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">문서 관리</h1>
            <p className="text-gray-500">문서를 업로드하고 관리합니다.</p>
          </div>
          <Link href="/documents/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              문서 업로드
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>문서 목록</CardTitle>
            <CardDescription>등록된 문서를 검색하고 관리합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="파일명, 설명, 유형으로 검색..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="문서 유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 유형</SelectItem>
                  <SelectItem value="contract">계약서</SelectItem>
                  <SelectItem value="invoice">세금계산서</SelectItem>
                  <SelectItem value="quotation">견적서</SelectItem>
                  <SelectItem value="report">보고서</SelectItem>
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
                onRetry={fetchDocuments}
              />
            ) : documents.length === 0 ? (
              <EmptyState
                icon={FileText}
                title={search || typeFilter !== "all" ? "검색 결과가 없습니다" : "등록된 문서가 없습니다"}
                description={
                  search || typeFilter !== "all"
                    ? "다른 검색 조건으로 다시 시도해보세요."
                    : "첫 번째 문서를 업로드하여 시작하세요."
                }
                actionLabel={search || typeFilter !== "all" ? undefined : "문서 업로드"}
                actionHref={search || typeFilter !== "all" ? undefined : "/documents/new"}
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>파일명</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>고객사</TableHead>
                      <TableHead>매장</TableHead>
                      <TableHead>크기</TableHead>
                      <TableHead>업로드일</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((document) => (
                      <TableRow key={document.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/documents/${document.id}`}
                            className="text-primary hover:underline"
                          >
                            {document.fileName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{document.documentType}</Badge>
                        </TableCell>
                        <TableCell>
                          {document.customer ? (
                            <Link
                              href={`/customers/${document.customer.id}`}
                              className="text-primary hover:underline"
                            >
                              {document.customer.name}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {document.store ? (
                            <Link
                              href={`/stores/${document.store.id}`}
                              className="text-primary hover:underline"
                            >
                              {document.store.name}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {document.fileSize
                            ? formatFileSize(Number(document.fileSize))
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {new Date(document.createdAt).toLocaleDateString("ko-KR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="다운로드"
                              onClick={() => handleDownload(document.id, document.fileName)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Link href={`/documents/${document.id}`}>
                              <Button variant="ghost" size="icon" title="상세보기">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/documents/${document.id}/edit`}>
                              <Button variant="ghost" size="icon" title="수정">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="삭제"
                              onClick={() => handleDeleteClick(document)}
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
        title="문서를 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다. 문서 정보와 파일이 모두 삭제됩니다."
        itemName={documentToDelete?.fileName || "문서"}
        requireConfirmation={true}
      />
    </MainLayout>
  );
}

