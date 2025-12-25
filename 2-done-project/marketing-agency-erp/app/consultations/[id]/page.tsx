"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Trash2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";

interface Consultation {
  id: number;
  consultationChannel: string;
  consultationDate: string;
  consultationTopic?: string;
  consultationContent?: string;
  actionItems?: string;
  consultationResult?: string;
  attachments?: any;
  customer: {
    id: number;
    name: string;
    businessNumber?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  store?: {
    id: number;
    name: string;
    address?: string;
    phone?: string;
  };
  relatedOrder?: {
    id: number;
    orderNumber: string;
    orderDate: string;
    status: string;
  };
  relatedQuotation?: {
    id: number;
    quotationNumber: string;
    quotationDate: string;
    status: string;
  };
  createdAt: string;
  updatedAt: string;
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

export default function ConsultationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchConsultation();
    }
  }, [params.id]);

  const fetchConsultation = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/consultations/${params.id}`);

      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        setConsultation(result.data);
      } else {
        throw new Error(result.error?.message || "상담 정보를 불러올 수 없습니다.");
      }
    } catch (error) {
      console.error("상담 정보 조회 실패:", error);
      const errorMessage =
        error instanceof Error ? error.message : "상담 정보를 불러올 수 없습니다.";
      setError(errorMessage);
      toast.error("데이터 로딩 실패", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!consultation) return;

    try {
      const response = await fetch(`/api/consultations/${consultation.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("삭제 완료", {
          description: "상담이 삭제되었습니다.",
        });
        router.push("/consultations");
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

  if (error || !consultation) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <ErrorState
            title="상담 정보를 불러올 수 없습니다"
            description={error || "상담 정보를 찾을 수 없습니다."}
            onRetry={fetchConsultation}
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
            <Link href="/consultations">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">상담 상세</h1>
              <p className="text-gray-500">상담 정보를 확인합니다.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/consultations/${consultation.id}/edit`}>
              <Button>
                <Edit className="mr-2 h-4 w-4" />
                수정
              </Button>
            </Link>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              삭제
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>상담 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">상담일시</label>
                <p className="mt-1">
                  {new Date(consultation.consultationDate).toLocaleString("ko-KR", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">상담 채널</label>
                <div className="mt-1">
                  <Badge variant={channelColors[consultation.consultationChannel] || "secondary"}>
                    {channelLabels[consultation.consultationChannel] || consultation.consultationChannel}
                  </Badge>
                </div>
              </div>
              {consultation.consultationTopic && (
                <div>
                  <label className="text-sm font-medium text-gray-500">상담 주제</label>
                  <p className="mt-1">{consultation.consultationTopic}</p>
                </div>
              )}
              {consultation.consultationContent && (
                <div>
                  <label className="text-sm font-medium text-gray-500">상담 내용</label>
                  <p className="mt-1 whitespace-pre-wrap">{consultation.consultationContent}</p>
                </div>
              )}
              {consultation.actionItems && (
                <div>
                  <label className="text-sm font-medium text-gray-500">액션 아이템</label>
                  <p className="mt-1 whitespace-pre-wrap">{consultation.actionItems}</p>
                </div>
              )}
              {consultation.consultationResult && (
                <div>
                  <label className="text-sm font-medium text-gray-500">상담 결과</label>
                  <div className="mt-1">
                    <Badge variant={resultColors[consultation.consultationResult] || "secondary"}>
                      {resultLabels[consultation.consultationResult] || consultation.consultationResult}
                    </Badge>
                  </div>
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
                    href={`/customers/${consultation.customer.id}`}
                    className="text-lg font-medium text-primary hover:underline"
                  >
                    {consultation.customer.name}
                  </Link>
                </p>
                {consultation.customer.contactPerson && (
                  <p className="mt-1 text-sm text-gray-600">
                    담당자: {consultation.customer.contactPerson}
                  </p>
                )}
                {consultation.customer.phone && (
                  <p className="mt-1 text-sm text-gray-600">{consultation.customer.phone}</p>
                )}
                {consultation.customer.email && (
                  <p className="mt-1 text-sm text-gray-600">{consultation.customer.email}</p>
                )}
              </div>
              {consultation.store && (
                <div>
                  <label className="text-sm font-medium text-gray-500">매장</label>
                  <p className="mt-1">
                    <Link
                      href={`/stores/${consultation.store.id}`}
                      className="text-lg font-medium text-primary hover:underline"
                    >
                      {consultation.store.name}
                    </Link>
                  </p>
                  {consultation.store.address && (
                    <p className="mt-1 text-sm text-gray-600">{consultation.store.address}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {(consultation.relatedOrder || consultation.relatedQuotation) && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>관련 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {consultation.relatedOrder && (
                <div>
                  <label className="text-sm font-medium text-gray-500">관련 주문</label>
                  <p className="mt-1">
                    <Link
                      href={`/orders/${consultation.relatedOrder.id}`}
                      className="text-primary hover:underline"
                    >
                      {consultation.relatedOrder.orderNumber}
                    </Link>
                    <span className="ml-2 text-sm text-gray-600">
                      ({new Date(consultation.relatedOrder.orderDate).toLocaleDateString("ko-KR")})
                    </span>
                  </p>
                </div>
              )}
              {consultation.relatedQuotation && (
                <div>
                  <label className="text-sm font-medium text-gray-500">관련 견적서</label>
                  <p className="mt-1">
                    <Link
                      href={`/quotations/${consultation.relatedQuotation.id}`}
                      className="text-primary hover:underline"
                    >
                      {consultation.relatedQuotation.quotationNumber}
                    </Link>
                    <span className="ml-2 text-sm text-gray-600">
                      ({new Date(consultation.relatedQuotation.quotationDate).toLocaleDateString("ko-KR")})
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="상담을 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다. 상담 정보가 삭제됩니다."
        itemName={consultation.consultationTopic || "상담"}
        requireConfirmation={true}
      />
    </MainLayout>
  );
}

