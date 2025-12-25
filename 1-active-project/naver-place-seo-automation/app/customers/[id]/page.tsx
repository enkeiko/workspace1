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

interface Customer {
  id: number;
  name: string;
  businessNumber?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  tags?: string[];
  stores: Array<{
    id: number;
    name: string;
    type?: string;
    address?: string;
    phone?: string;
  }>;
  _count: {
    orders: number;
    stores: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchCustomer();
    }
  }, [params.id]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/customers/${params.id}`);

      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        // tags가 문자열인 경우 파싱
        const customerData = result.data;
        if (customerData.tags && typeof customerData.tags === 'string') {
          try {
            customerData.tags = JSON.parse(customerData.tags);
          } catch {
            customerData.tags = [];
          }
        }
        setCustomer(customerData);
      } else {
        throw new Error(result.error?.message || "고객 정보를 불러올 수 없습니다.");
      }
    } catch (error) {
      console.error("고객 정보 조회 실패:", error);
      const errorMessage =
        error instanceof Error ? error.message : "고객 정보를 불러올 수 없습니다.";
      setError(errorMessage);
      toast.error("데이터 로딩 실패", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!customer) return;

    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("삭제 완료", {
          description: "고객이 삭제되었습니다.",
        });
        router.push("/customers");
      } else {
        toast.error("삭제 실패", {
          description: result.error?.message || "삭제에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("삭제 실패:", error);
      toast.error("삭제 실패", {
        description: "고객 삭제 중 오류가 발생했습니다.",
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

  if (error || !customer) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <ErrorState
            title="고객 정보를 불러올 수 없습니다"
            description={error || "알 수 없는 오류가 발생했습니다."}
            onRetry={fetchCustomer}
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
            <Link href="/customers">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{customer.name}</h1>
              <p className="text-gray-500 mt-1">
                {customer.businessNumber && (
                  <span className="mr-2">사업자번호: {customer.businessNumber}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/customers/${customer.id}/edit`}>
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
                <label className="text-sm font-medium text-gray-500">고객명</label>
                <p className="mt-1 font-medium">{customer.name}</p>
              </div>
              {customer.businessNumber && (
                <div>
                  <label className="text-sm font-medium text-gray-500">사업자번호</label>
                  <p className="mt-1">{customer.businessNumber}</p>
                </div>
              )}
              {customer.contactPerson && (
                <div>
                  <label className="text-sm font-medium text-gray-500">담당자</label>
                  <p className="mt-1">{customer.contactPerson}</p>
                </div>
              )}
              {customer.phone && (
                <div>
                  <label className="text-sm font-medium text-gray-500">전화번호</label>
                  <p className="mt-1">{customer.phone}</p>
                </div>
              )}
              {customer.email && (
                <div>
                  <label className="text-sm font-medium text-gray-500">이메일</label>
                  <p className="mt-1">{customer.email}</p>
                </div>
              )}
              {customer.address && (
                <div>
                  <label className="text-sm font-medium text-gray-500">주소</label>
                  <p className="mt-1">{customer.address}</p>
                </div>
              )}
              {customer.tags && customer.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">태그</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {customer.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {customer.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">메모</label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{customer.notes}</p>
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
                <label className="text-sm font-medium text-gray-500">통계</label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">매장: {customer._count.stores}개</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">주문: {customer._count.orders}건</span>
                  </div>
                </div>
              </div>

              {customer.stores && customer.stores.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">매장 목록</label>
                  <div className="mt-2 space-y-2">
                    {customer.stores.map((store) => (
                      <Link
                        key={store.id}
                        href={`/stores/${store.id}`}
                        className="block p-2 border rounded-md hover:bg-gray-50 transition-colors"
                      >
                        <p className="font-medium">{store.name}</p>
                        {store.type && (
                          <p className="text-sm text-gray-500">{store.type}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>등록일: {new Date(customer.createdAt).toLocaleString("ko-KR")}</p>
          <p>수정일: {new Date(customer.updatedAt).toLocaleString("ko-KR")}</p>
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="고객을 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다. 고객 정보와 관련된 모든 데이터가 삭제됩니다."
        itemName={customer.name}
        requireConfirmation={true}
      />
    </MainLayout>
  );
}

