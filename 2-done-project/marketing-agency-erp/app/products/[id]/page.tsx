"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Trash2, Package } from "lucide-react";
import Link from "next/link";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";

interface Product {
  id: number;
  name: string;
  category?: string;
  description?: string;
  unitPrice: number;
  unit?: string;
  isActive: boolean;
  _count: {
    orderItems: number;
    quotationItems: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/products/${params.id}`);

      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        setProduct(result.data);
      } else {
        throw new Error(result.error?.message || "상품 정보를 불러올 수 없습니다.");
      }
    } catch (error) {
      console.error("상품 정보 조회 실패:", error);
      const errorMessage =
        error instanceof Error ? error.message : "상품 정보를 불러올 수 없습니다.";
      setError(errorMessage);
      toast.error("데이터 로딩 실패", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!product) return;

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.data.message || "삭제 완료", {
          description: result.data.deleted
            ? "상품이 삭제되었습니다."
            : "상품이 비활성화되었습니다.",
        });
        if (result.data.deleted) {
          router.push("/products");
        } else {
          fetchProduct();
        }
      } else {
        toast.error("삭제 실패", {
          description: result.error?.message || "삭제에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("삭제 실패:", error);
      toast.error("삭제 실패", {
        description: "상품 삭제 중 오류가 발생했습니다.",
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

  if (error || !product) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <ErrorState
            title="상품 정보를 불러올 수 없습니다"
            description={error || "알 수 없는 오류가 발생했습니다."}
            onRetry={fetchProduct}
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
            <Link href="/products">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{product.name}</h1>
              <p className="text-gray-500 mt-1">
                {product.category && (
                  <Badge variant="outline" className="mr-2">{product.category}</Badge>
                )}
                <Badge variant={product.isActive ? "default" : "secondary"}>
                  {product.isActive ? "활성" : "비활성"}
                </Badge>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/products/${product.id}/edit`}>
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
                <label className="text-sm font-medium text-gray-500">상품명</label>
                <p className="mt-1 font-medium">{product.name}</p>
              </div>
              {product.category && (
                <div>
                  <label className="text-sm font-medium text-gray-500">카테고리</label>
                  <p className="mt-1">
                    <Badge variant="outline">{product.category}</Badge>
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">단가</label>
                <p className="mt-1 font-medium">
                  {Number(product.unitPrice).toLocaleString()}원
                </p>
              </div>
              {product.unit && (
                <div>
                  <label className="text-sm font-medium text-gray-500">단위</label>
                  <p className="mt-1">{product.unit}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">상태</label>
                <p className="mt-1">
                  <Badge variant={product.isActive ? "default" : "secondary"}>
                    {product.isActive ? "활성" : "비활성"}
                  </Badge>
                </p>
              </div>
              {product.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">설명</label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{product.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>통계 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">사용 현황</label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">주문 항목: {product._count.orderItems}건</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">견적서 항목: {product._count.quotationItems}건</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>등록일: {new Date(product.createdAt).toLocaleString("ko-KR")}</p>
          <p>수정일: {new Date(product.updatedAt).toLocaleString("ko-KR")}</p>
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="상품을 삭제하시겠습니까?"
        description="관련 주문/견적서가 있으면 비활성화 처리되고, 없으면 삭제됩니다."
        itemName={product.name}
        requireConfirmation={true}
      />
    </MainLayout>
  );
}

