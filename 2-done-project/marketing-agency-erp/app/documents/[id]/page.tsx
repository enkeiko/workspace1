"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Trash2, Download, FileText } from "lucide-react";
import Link from "next/link";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";
import { formatFileSize } from "@/lib/utils/file-validator";

interface Document {
  id: number;
  documentType: string;
  fileName: string;
  filePath: string;
  fileSize?: string;
  mimeType?: string;
  description?: string;
  tags?: string[];
  customer?: {
    id: number;
    name: string;
    businessNumber?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
  };
  store?: {
    id: number;
    name: string;
    address?: string;
    phone?: string;
  };
  order?: {
    id: number;
    orderNumber: string;
    orderDate: string;
    status: string;
    totalAmount: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchDocument();
    }
  }, [params.id]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/documents/${params.id}`);

      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        setDocument(result.data);
      } else {
        throw new Error(result.error?.message || "문서 정보를 불러올 수 없습니다.");
      }
    } catch (error) {
      console.error("문서 정보 조회 실패:", error);
      const errorMessage =
        error instanceof Error ? error.message : "문서 정보를 불러올 수 없습니다.";
      setError(errorMessage);
      toast.error("데이터 로딩 실패", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!document) return;

    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("삭제 완료", {
          description: "문서가 삭제되었습니다.",
        });
        router.push("/documents");
      } else {
        toast.error("삭제 실패", {
          description: result.error?.message || "삭제에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("삭제 실패:", error);
      toast.error("삭제 실패", {
        description: "문서 삭제 중 오류가 발생했습니다.",
      });
    }
  };

  const handleDownload = async () => {
    if (!document) return;

    try {
      const response = await fetch(`/api/documents/${document.id}/download`);
      if (!response.ok) {
        throw new Error("다운로드에 실패했습니다.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = document.fileName;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);

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

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (error || !document) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <ErrorState
            title="문서 정보를 불러올 수 없습니다"
            description={error || "알 수 없는 오류가 발생했습니다."}
            onRetry={fetchDocument}
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
            <Link href="/documents">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{document.fileName}</h1>
              <p className="text-gray-500 mt-1">
                <Badge variant="outline" className="mr-2">{document.documentType}</Badge>
                {document.mimeType && (
                  <span className="text-sm">{document.mimeType}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              다운로드
            </Button>
            <Link href={`/documents/${document.id}/edit`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                수정
              </Button>
            </Link>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              삭제
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>문서 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">파일명</label>
                <p className="mt-1 font-medium">{document.fileName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">문서 유형</label>
                <div className="mt-1">
                  <Badge variant="outline">{document.documentType}</Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">파일 크기</label>
                <p className="mt-1">
                  {document.fileSize
                    ? formatFileSize(Number(document.fileSize))
                    : "알 수 없음"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">MIME 타입</label>
                <p className="mt-1">{document.mimeType || "-"}</p>
              </div>
              {document.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">설명</label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{document.description}</p>
                </div>
              )}
              {document.tags && document.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">태그</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {document.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>관련 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {document.customer && (
                <div>
                  <label className="text-sm font-medium text-gray-500">고객사</label>
                  <div className="mt-1">
                    <Link
                      href={`/customers/${document.customer.id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {document.customer.name}
                    </Link>
                    {document.customer.contactPerson && (
                      <p className="text-sm text-gray-500 mt-1">
                        담당자: {document.customer.contactPerson}
                      </p>
                    )}
                    {document.customer.phone && (
                      <p className="text-sm text-gray-500">{document.customer.phone}</p>
                    )}
                  </div>
                </div>
              )}
              {document.store && (
                <div>
                  <label className="text-sm font-medium text-gray-500">매장</label>
                  <div className="mt-1">
                    <Link
                      href={`/stores/${document.store.id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {document.store.name}
                    </Link>
                    {document.store.address && (
                      <p className="text-sm text-gray-500 mt-1">{document.store.address}</p>
                    )}
                  </div>
                </div>
              )}
              {document.order && (
                <div>
                  <label className="text-sm font-medium text-gray-500">관련 주문</label>
                  <div className="mt-1">
                    <Link
                      href={`/orders/${document.order.id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {document.order.orderNumber}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">
                      주문일: {new Date(document.order.orderDate).toLocaleDateString("ko-KR")}
                    </p>
                    <p className="text-sm text-gray-500">
                      금액: {Number(document.order.totalAmount).toLocaleString()}원
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>업로드일: {new Date(document.createdAt).toLocaleString("ko-KR")}</p>
          <p>수정일: {new Date(document.updatedAt).toLocaleString("ko-KR")}</p>
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="문서를 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다. 문서 정보와 파일이 모두 삭제됩니다."
        itemName={document.fileName}
        requireConfirmation={true}
      />
    </MainLayout>
  );
}

