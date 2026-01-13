"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Settings,
  Loader2,
  LayoutGrid,
  List,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  code: string;
  name: string;
  type: string;
  description: string | null;
  saleUnitPrice: number;
  costUnitPrice: number;
  isActive: boolean;
  channel: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface ProductGroup {
  type: string;
  products: Product[];
  count: number;
}

const typeInfo: Record<
  string,
  { label: string; color: string; bgColor: string; description: string }
> = {
  TRAFFIC: {
    label: "트래픽",
    color: "text-orange-700",
    bgColor: "bg-orange-50 border-orange-200",
    description: "네이버 플레이스 방문 트래픽 상품",
  },
  DIRECTION: {
    label: "길찾기",
    color: "text-purple-700",
    bgColor: "bg-purple-50 border-purple-200",
    description: "네이버 지도 길찾기 요청 상품",
  },
  REVIEW: {
    label: "리뷰",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    description: "리뷰 작성 마케팅 상품",
  },
  BLOG: {
    label: "블로그",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
    description: "블로그 포스팅 마케팅 상품",
  },
  SAVE: {
    label: "저장",
    color: "text-cyan-700",
    bgColor: "bg-cyan-50 border-cyan-200",
    description: "플레이스 저장 마케팅 상품",
  },
  RECEIPT: {
    label: "영수증",
    color: "text-pink-700",
    bgColor: "bg-pink-50 border-pink-200",
    description: "영수증 리뷰 마케팅 상품",
  },
};

export default function ProductsPage() {
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedType, setSelectedType] = useState<string>("all");

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products?grouped=true");
      const data = await res.json();
      if (res.ok) {
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // 전체 상품 수
  const totalProducts = useMemo(
    () => groups.reduce((sum, g) => sum + g.count, 0),
    [groups]
  );

  // 필터링된 그룹
  const filteredGroups = useMemo(() => {
    if (selectedType === "all") return groups;
    return groups.filter((g) => g.type === selectedType);
  }, [groups, selectedType]);

  // 탭 옵션
  const tabOptions = useMemo(() => {
    const options = [{ value: "all", label: "전체", count: totalProducts }];
    for (const group of groups) {
      options.push({
        value: group.type,
        label: typeInfo[group.type]?.label || group.type,
        count: group.count,
      });
    }
    return options;
  }, [groups, totalProducts]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">상품 관리</h2>
          <p className="text-muted-foreground">
            마케팅 상품(서비스)을 관리합니다. 총 {totalProducts}개의 상품이
            등록되어 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button asChild>
            <Link href="/products/new">
              <Plus className="h-4 w-4 mr-2" />
              상품 추가
            </Link>
          </Button>
        </div>
      </div>

      {/* 유형별 탭 */}
      <Tabs value={selectedType} onValueChange={setSelectedType}>
        <TabsList className="flex-wrap h-auto gap-1">
          {tabOptions.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {tab.label}
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {tab.count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedType} className="mt-4">
          {viewMode === "grid" ? (
            // 그리드 뷰: 유형별 카드로 그룹화
            <div className="space-y-6">
              {filteredGroups.map((group) => (
                <Card
                  key={group.type}
                  className={cn(
                    "border",
                    typeInfo[group.type]?.bgColor || "bg-gray-50"
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package
                          className={cn(
                            "h-5 w-5",
                            typeInfo[group.type]?.color || "text-gray-700"
                          )}
                        />
                        <CardTitle
                          className={cn(
                            "text-lg",
                            typeInfo[group.type]?.color || "text-gray-700"
                          )}
                        >
                          {typeInfo[group.type]?.label || group.type}
                        </CardTitle>
                        <Badge variant="secondary">{group.count}개</Badge>
                      </div>
                    </div>
                    <CardDescription>
                      {typeInfo[group.type]?.description || ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {group.products.map((product) => (
                        <Link
                          key={product.id}
                          href={`/products/${product.id}`}
                          className={cn(
                            "flex flex-col rounded-lg border bg-background p-4 transition-colors hover:bg-muted/50",
                            !product.isActive && "opacity-60"
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {product.code}
                              </div>
                            </div>
                            {!product.isActive && (
                              <Badge variant="secondary" className="text-xs">
                                비활성
                              </Badge>
                            )}
                          </div>
                          <div className="mt-3 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              판매가
                            </span>
                            <span className="font-medium">
                              {product.saleUnitPrice.toLocaleString()}원
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              매입가
                            </span>
                            <span className="font-medium">
                              {product.costUnitPrice.toLocaleString()}원
                            </span>
                          </div>
                          {product.channel && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              채널: {product.channel.name}
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // 리스트 뷰: 테이블
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>상품명</TableHead>
                      <TableHead>코드</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead className="text-right">판매 단가</TableHead>
                      <TableHead className="text-right">매입 단가</TableHead>
                      <TableHead>채널</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="w-[80px]">설정</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGroups.flatMap((group) =>
                      group.products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            {product.name}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {product.code}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-normal",
                                typeInfo[product.type]?.color
                              )}
                            >
                              {typeInfo[product.type]?.label || product.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {product.saleUnitPrice.toLocaleString()}원
                          </TableCell>
                          <TableCell className="text-right">
                            {product.costUnitPrice.toLocaleString()}원
                          </TableCell>
                          <TableCell>
                            {product.channel?.name || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                product.isActive ? "default" : "secondary"
                              }
                            >
                              {product.isActive ? "활성" : "비활성"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/products/${product.id}`}>
                                <Settings className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {filteredGroups.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-8 text-muted-foreground"
                        >
                          등록된 상품이 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
