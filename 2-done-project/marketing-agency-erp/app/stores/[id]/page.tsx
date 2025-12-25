"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Trash2, Store, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";

interface Store {
  id: number;
  name: string;
  type?: string;
  address?: string;
  phone?: string;
  website?: string;
  description?: string;
  customer: {
    id: number;
    name: string;
    businessNumber?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
  };
  _count: {
    orders: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function StoreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchStore();
    }
  }, [params.id]);

  const fetchStore = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/stores/${params.id}`);

      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        setStore(result.data);
      } else {
        throw new Error(result.error?.message || "매장 정보를 불러올 수 없습니다.");
      }
    } catch (error) {
      console.error("매장 정보 조회 실패:", error);
      const errorMessage =
        error instanceof Error ? error.message : "매장 정보를 불러올 수 없습니다.";
      setError(errorMessage);
      toast.error("데이터 로딩 실패", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!store) return;

    try {
      const response = await fetch(`/api/stores/${store.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("삭제 완료", {
          description: "매장이 삭제되었습니다.",
        });
        router.push("/stores");
      } else {
        toast.error("삭제 실패", {
          description: result.error?.message || "삭제에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("삭제 실패:", error);
      toast.error("삭제 실패", {
        description: "매장 삭제 중 오류가 발생했습니다.",
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

  if (error || !store) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <ErrorState
            title="매장 정보를 불러올 수 없습니다"
            description={error || "알 수 없는 오류가 발생했습니다."}
            onRetry={fetchStore}
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
            <Link href="/stores">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{store.name}</h1>
              <p className="text-gray-500 mt-1">
                {store.type && (
                  <Badge variant="outline" className="mr-2">{store.type}</Badge>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/stores/${store.id}/edit`}>
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
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">매장명</label>
                <p className="mt-1 font-medium">{store.name}</p>
              </div>
              {store.type && (
                <div>
                  <label className="text-sm font-medium text-gray-500">매장 유형</label>
                  <p className="mt-1">
                    <Badge variant="outline">{store.type}</Badge>
                  </p>
                </div>
              )}
              {store.phone && (
                <div>
                  <label className="text-sm font-medium text-gray-500">전화번호</label>
                  <p className="mt-1">{store.phone}</p>
                </div>
              )}
              {store.address && (
                <div>
                  <label className="text-sm font-medium text-gray-500">주소</label>
                  <p className="mt-1">{store.address}</p>
                </div>
              )}
              {store.website && (
                <div>
                  <label className="text-sm font-medium text-gray-500">웹사이트</label>
                  <p className="mt-1">
                    <a
                      href={store.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {store.website}
                    </a>
                  </p>
                </div>
              )}
              {store.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">설명</label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{store.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>관련 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">고객사</label>
                <div className="mt-1">
                  <Link
                    href={`/customers/${store.customer.id}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {store.customer.name}
                  </Link>
                  {store.customer.contactPerson && (
                    <p className="text-sm text-gray-500 mt-1">
                      담당자: {store.customer.contactPerson}
                    </p>
                  )}
                  {store.customer.phone && (
                    <p className="text-sm text-gray-500">{store.customer.phone}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">통계</label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">주문: {store._count.orders}건</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>등록일: {new Date(store.createdAt).toLocaleString("ko-KR")}</p>
          <p>수정일: {new Date(store.updatedAt).toLocaleString("ko-KR")}</p>
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="매장을 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다. 매장 정보와 관련된 모든 데이터가 삭제됩니다."
        itemName={store.name}
        requireConfirmation={true}
      />
    </MainLayout>
  );
}

