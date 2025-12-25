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
import { Plus, Search, Edit, Trash2, Eye, Package } from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@/hooks/use-debounce";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
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
  createdAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    fetchProducts();
  }, [page, debouncedSearch, categoryFilter, statusFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(categoryFilter !== "all" && { category: categoryFilter }),
        ...(statusFilter !== "all" && { isActive: statusFilter === "active" ? "true" : "false" }),
      });

      const response = await fetch(`/api/products?${params}`);

      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        setProducts(result.data.products || []);
        setTotalPages(result.data.pagination?.totalPages || 1);
      } else {
        throw new Error(result.error?.message || "데이터를 불러오는데 실패했습니다.");
      }
    } catch (error) {
      console.error("상품 목록 조회 실패:", error);
      setError(error instanceof Error ? error.message : "오류가 발생했습니다.");
      toast.error("상품 목록 조회 실패", {
        description: error instanceof Error ? error.message : "오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      const response = await fetch(`/api/products/${productToDelete.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("삭제 완료", {
          description: "상품이 삭제되었습니다.",
        });
        fetchProducts();
      } else {
        toast.error("삭제 실패", {
          description: result.error?.message || "상품 삭제에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("삭제 실패:", error);
      toast.error("삭제 실패", {
        description: "상품 삭제 중 오류가 발생했습니다.",
      });
    } finally {
      setProductToDelete(null);
    }
  };

  // 카테고리 목록 추출 (실제로는 API에서 받아와야 함)
  const categories = Array.from(
    new Set(products.map((p) => p.category).filter((c): c is string => !!c))
  );

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">상품 관리</h1>
            <p className="text-gray-500">상품 정보를 관리합니다.</p>
          </div>
          <Link href="/products/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              상품 추가
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>상품 목록</CardTitle>
            <CardDescription>등록된 상품을 검색하고 관리합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="상품명, 설명으로 검색..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select
                value={categoryFilter}
                onValueChange={(value) => {
                  setCategoryFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="카테고리" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 카테고리</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="active">활성</SelectItem>
                  <SelectItem value="inactive">비활성</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : error ? (
              <ErrorState
                title="데이터 로딩 실패"
                description={error}
                onRetry={fetchProducts}
              />
            ) : products.length === 0 ? (
              <EmptyState
                icon={Package}
                title={search || categoryFilter !== "all" || statusFilter !== "all" ? "검색 결과가 없습니다" : "등록된 상품이 없습니다"}
                description={
                  search || categoryFilter !== "all" || statusFilter !== "all"
                    ? "다른 검색 조건으로 다시 시도해보세요."
                    : "첫 번째 상품을 추가하여 시작하세요."
                }
                actionLabel={search || categoryFilter !== "all" || statusFilter !== "all" ? undefined : "상품 추가"}
                actionHref={search || categoryFilter !== "all" || statusFilter !== "all" ? undefined : "/products/new"}
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>상품명</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead>단가</TableHead>
                      <TableHead>단위</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/products/${product.id}`}
                            className="text-primary hover:underline"
                          >
                            {product.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {product.category ? (
                            <Badge variant="outline">{product.category}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {Number(product.unitPrice).toLocaleString()}원
                        </TableCell>
                        <TableCell>{product.unit || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={product.isActive ? "default" : "secondary"}
                          >
                            {product.isActive ? "활성" : "비활성"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/products/${product.id}`}>
                              <Button variant="ghost" size="icon" title="상세보기">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/products/${product.id}/edit`}>
                              <Button variant="ghost" size="icon" title="수정">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="삭제"
                              onClick={() => handleDeleteClick(product)}
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
        title="상품을 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다. 상품 정보가 삭제됩니다."
        itemName={productToDelete?.name || "상품"}
        requireConfirmation={true}
      />
    </MainLayout>
  );
}

