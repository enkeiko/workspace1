"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Search,
  Save,
  X,
  Store as StoreIcon,
  Package,
  Grid3X3,
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, startOfWeek, addWeeks, getWeek, getYear } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Types
interface Store {
  id: string;
  name: string;
  mid: string;
  address: string | null;
  customerId?: string;
  customerName?: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  type: string;
  saleUnitPrice: number;
  costUnitPrice: number;
}

interface GridCell {
  qty: number;
  startDate: string;
  endDate: string;
  unitPrice: number;
}

interface GridRow {
  store: Store;
  cells: Record<string, GridCell>; // productId -> cell
}

export default function BulkPurchaseOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 전체 데이터
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // 선택된 항목
  const [selectedStores, setSelectedStores] = useState<Store[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  // 그리드 데이터
  const [gridRows, setGridRows] = useState<GridRow[]>([]);

  // 검색/필터
  const [storeSearch, setStoreSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  // 다이얼로그 상태
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);

  // 다이얼로그 내 임시 선택
  const [tempSelectedStoreIds, setTempSelectedStoreIds] = useState<Set<string>>(new Set());
  const [tempSelectedProductIds, setTempSelectedProductIds] = useState<Set<string>>(new Set());

  // 주차 선택
  const [orderWeek, setOrderWeek] = useState("");

  // 일괄 날짜 설정
  const [globalStartDate, setGlobalStartDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [globalEndDate, setGlobalEndDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));

  // 주차 옵션 생성
  const weekOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 8; i++) {
      const weekStart = startOfWeek(addWeeks(today, i), { weekStartsOn: 1 });
      const weekNum = getWeek(weekStart, { weekStartsOn: 1 });
      const year = getYear(weekStart);
      const weekId = `${year}W${weekNum.toString().padStart(2, "0")}`;
      const label = `${year}년 ${weekNum}주차 (${format(weekStart, "M/d", { locale: ko })}~)`;
      options.push({ value: weekId, label });
    }
    return options;
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (weekOptions.length > 0 && !orderWeek) {
      setOrderWeek(weekOptions[0].value);
    }
  }, [weekOptions, orderWeek]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [storesRes, productsRes] = await Promise.all([
        fetch("/api/stores?limit=1000&status=ACTIVE"),
        fetch("/api/products?isActive=true&limit=100"),
      ]);

      if (storesRes.ok) {
        const data = await storesRes.json();
        setAllStores(
          data.stores.map((s: Record<string, unknown>) => ({
            id: s.id,
            name: s.name,
            mid: s.mid,
            address: s.address,
            customerId: s.customerId,
            customerName: (s.customer as Record<string, string> | null)?.name,
          }))
        );
      }

      if (productsRes.ok) {
        const data = await productsRes.json();
        setAllProducts(data.products);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  };

  // 필터링된 매장/상품
  const filteredStores = useMemo(() => {
    if (!storeSearch) return allStores;
    const search = storeSearch.toLowerCase();
    return allStores.filter(
      (s) =>
        s.name.toLowerCase().includes(search) ||
        s.mid.includes(search) ||
        s.customerName?.toLowerCase().includes(search)
    );
  }, [allStores, storeSearch]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return allProducts;
    const search = productSearch.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.code.toLowerCase().includes(search)
    );
  }, [allProducts, productSearch]);

  // 매장 다이얼로그 열 때 초기화
  const openStoreDialog = () => {
    setTempSelectedStoreIds(new Set(selectedStores.map((s) => s.id)));
    setStoreSearch("");
    setStoreDialogOpen(true);
  };

  // 상품 다이얼로그 열 때 초기화
  const openProductDialog = () => {
    setTempSelectedProductIds(new Set(selectedProducts.map((p) => p.id)));
    setProductSearch("");
    setProductDialogOpen(true);
  };

  // 매장 선택 확정
  const confirmStoreSelection = () => {
    const newStores = allStores.filter((s) => tempSelectedStoreIds.has(s.id));
    setSelectedStores(newStores);

    // 그리드 행 업데이트
    setGridRows((prev) => {
      const existingMap = new Map(prev.map((r) => [r.store.id, r]));
      return newStores.map((store) => {
        if (existingMap.has(store.id)) {
          return existingMap.get(store.id)!;
        }
        // 새로운 행 생성
        const cells: Record<string, GridCell> = {};
        selectedProducts.forEach((p) => {
          cells[p.id] = {
            qty: 0,
            startDate: globalStartDate,
            endDate: globalEndDate,
            unitPrice: p.costUnitPrice,
          };
        });
        return { store, cells };
      });
    });

    setStoreDialogOpen(false);
  };

  // 상품 선택 확정
  const confirmProductSelection = () => {
    const newProducts = allProducts.filter((p) => tempSelectedProductIds.has(p.id));
    setSelectedProducts(newProducts);

    // 그리드 셀 업데이트
    setGridRows((prev) =>
      prev.map((row) => {
        const newCells: Record<string, GridCell> = {};
        newProducts.forEach((p) => {
          if (row.cells[p.id]) {
            newCells[p.id] = row.cells[p.id];
          } else {
            newCells[p.id] = {
              qty: 0,
              startDate: globalStartDate,
              endDate: globalEndDate,
              unitPrice: p.costUnitPrice,
            };
          }
        });
        return { ...row, cells: newCells };
      })
    );

    setProductDialogOpen(false);
  };

  // 그리드에서 매장 제거
  const removeStore = (storeId: string) => {
    setSelectedStores((prev) => prev.filter((s) => s.id !== storeId));
    setGridRows((prev) => prev.filter((r) => r.store.id !== storeId));
  };

  // 그리드에서 상품 제거
  const removeProduct = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
    setGridRows((prev) =>
      prev.map((row) => {
        const newCells = { ...row.cells };
        delete newCells[productId];
        return { ...row, cells: newCells };
      })
    );
  };

  // 셀 값 변경
  const updateCell = (storeId: string, productId: string, field: keyof GridCell, value: number | string) => {
    setGridRows((prev) =>
      prev.map((row) => {
        if (row.store.id !== storeId) return row;
        return {
          ...row,
          cells: {
            ...row.cells,
            [productId]: {
              ...row.cells[productId],
              [field]: value,
            },
          },
        };
      })
    );
  };

  // 일괄 날짜 적용
  const applyGlobalDates = () => {
    setGridRows((prev) =>
      prev.map((row) => {
        const newCells: Record<string, GridCell> = {};
        Object.entries(row.cells).forEach(([productId, cell]) => {
          newCells[productId] = {
            ...cell,
            startDate: globalStartDate,
            endDate: globalEndDate,
          };
        });
        return { ...row, cells: newCells };
      })
    );
    toast.success("일괄 날짜가 적용되었습니다");
  };

  // 저장
  const handleSave = async () => {
    if (selectedStores.length === 0) {
      toast.error("매장을 선택해주세요");
      return;
    }
    if (selectedProducts.length === 0) {
      toast.error("상품을 선택해주세요");
      return;
    }

    // 수량이 입력된 셀이 있는지 확인
    const hasValidCells = gridRows.some((row) =>
      Object.values(row.cells).some((cell) => cell.qty > 0)
    );
    if (!hasValidCells) {
      toast.error("최소 1개 이상의 수량을 입력해주세요");
      return;
    }

    setSaving(true);
    try {
      // grid-save API 호출
      const request = {
        weekKey: orderWeek.replace("W", "-W"),
        rows: gridRows
          .filter((row) => Object.values(row.cells).some((cell) => cell.qty > 0))
          .map((row) => ({
            storeId: row.store.id,
            cells: Object.entries(row.cells)
              .filter(([_, cell]) => cell.qty > 0)
              .map(([productId, cell]) => {
                const product = selectedProducts.find((p) => p.id === productId);
                return {
                  productCode: product?.code || "",
                  qty: cell.qty,
                  startDate: cell.startDate,
                  endDate: cell.endDate,
                };
              }),
          })),
        createSalesOrder: true,
        createPurchaseOrder: true,
      };

      const res = await fetch("/api/purchase-orders/grid-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(
          `저장 완료: 발주 ${data.summary.purchaseOrdersCreated}건, 항목 ${data.summary.itemsCreated}건 생성`
        );
        router.push("/purchase-orders");
      } else {
        toast.error(data.error || "저장 실패");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("저장 중 오류가 발생했습니다");
    } finally {
      setSaving(false);
    }
  };

  // 상품 유형별 색상
  const typeColors: Record<string, string> = {
    TRAFFIC: "bg-blue-100 text-blue-800",
    DIRECTION: "bg-green-100 text-green-800",
    BLOG: "bg-purple-100 text-purple-800",
    REVIEW: "bg-orange-100 text-orange-800",
    RECEIPT: "bg-pink-100 text-pink-800",
    SAVE: "bg-yellow-100 text-yellow-800",
  };

  const typeLabels: Record<string, string> = {
    TRAFFIC: "트래픽",
    DIRECTION: "길찾기",
    BLOG: "블로그",
    REVIEW: "리뷰",
    RECEIPT: "영수증",
    SAVE: "저장",
  };

  // 합계 계산
  const totals = useMemo(() => {
    let totalQty = 0;
    let totalAmount = 0;
    gridRows.forEach((row) => {
      Object.values(row.cells).forEach((cell) => {
        totalQty += cell.qty;
        totalAmount += cell.qty * cell.unitPrice;
      });
    });
    return { totalQty, totalAmount };
  }, [gridRows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/purchase-orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              일괄발주{" "}
              <span className="text-sm font-normal text-muted-foreground">
                Bulk Purchase Order
              </span>
            </h2>
            <p className="text-muted-foreground">
              매장과 상품을 선택하여 일괄 발주를 생성합니다.
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || gridRows.length === 0}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              발주 저장
            </>
          )}
        </Button>
      </div>

      {/* 설정 영역 */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* 주차 선택 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">발주 주차</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={orderWeek}
              onChange={(e) => setOrderWeek(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {weekOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* 매장 선택 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <StoreIcon className="h-4 w-4" />
              매장 선택
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={storeDialogOpen} onOpenChange={setStoreDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={openStoreDialog}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {selectedStores.length > 0
                    ? `${selectedStores.length}개 매장 선택됨`
                    : "매장 선택"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>매장 선택</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="매장명, MID, 고객명 검색"
                      className="pl-9"
                      value={storeSearch}
                      onChange={(e) => setStoreSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{tempSelectedStoreIds.size}개 선택됨</span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setTempSelectedStoreIds(new Set())}
                    >
                      전체 해제
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() =>
                        setTempSelectedStoreIds(
                          new Set(filteredStores.map((s) => s.id))
                        )
                      }
                    >
                      전체 선택
                    </Button>
                  </div>
                  <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                    {filteredStores.map((store) => (
                      <div
                        key={store.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b last:border-0"
                        onClick={() => {
                          setTempSelectedStoreIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(store.id)) {
                              next.delete(store.id);
                            } else {
                              next.add(store.id);
                            }
                            return next;
                          });
                        }}
                      >
                        <Checkbox checked={tempSelectedStoreIds.has(store.id)} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{store.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {store.mid}
                            {store.customerName && ` · ${store.customerName}`}
                          </p>
                        </div>
                      </div>
                    ))}
                    {filteredStores.length === 0 && (
                      <div className="p-4 text-center text-muted-foreground">
                        검색 결과가 없습니다
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setStoreDialogOpen(false)}
                    >
                      취소
                    </Button>
                    <Button onClick={confirmStoreSelection}>
                      {tempSelectedStoreIds.size}개 매장 선택
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* 상품 선택 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              상품 선택
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={openProductDialog}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {selectedProducts.length > 0
                    ? `${selectedProducts.length}개 상품 선택됨`
                    : "상품 선택"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>상품 선택</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="상품명, 코드 검색"
                      className="pl-9"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{tempSelectedProductIds.size}개 선택됨</span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setTempSelectedProductIds(new Set())}
                    >
                      전체 해제
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() =>
                        setTempSelectedProductIds(
                          new Set(filteredProducts.map((p) => p.id))
                        )
                      }
                    >
                      전체 선택
                    </Button>
                  </div>
                  <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b last:border-0"
                        onClick={() => {
                          setTempSelectedProductIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(product.id)) {
                              next.delete(product.id);
                            } else {
                              next.add(product.id);
                            }
                            return next;
                          });
                        }}
                      >
                        <Checkbox checked={tempSelectedProductIds.has(product.id)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{product.name}</p>
                            <Badge
                              variant="secondary"
                              className={cn("text-xs", typeColors[product.type])}
                            >
                              {typeLabels[product.type] || product.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {product.code} · 원가 {product.costUnitPrice.toLocaleString()}원
                          </p>
                        </div>
                      </div>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="p-4 text-center text-muted-foreground">
                        검색 결과가 없습니다
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setProductDialogOpen(false)}
                    >
                      취소
                    </Button>
                    <Button onClick={confirmProductSelection}>
                      {tempSelectedProductIds.size}개 상품 선택
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* 일괄 날짜 설정 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">일괄 날짜 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="date"
                value={globalStartDate}
                onChange={(e) => setGlobalStartDate(e.target.value)}
                className="text-xs"
              />
              <Input
                type="date"
                value={globalEndDate}
                onChange={(e) => setGlobalEndDate(e.target.value)}
                className="text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={applyGlobalDates}
              disabled={gridRows.length === 0}
            >
              전체 적용
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 선택된 항목 표시 */}
      {(selectedStores.length > 0 || selectedProducts.length > 0) && (
        <div className="flex flex-wrap gap-4">
          {selectedStores.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">매장:</span>
              <div className="flex flex-wrap gap-1">
                {selectedStores.slice(0, 5).map((store) => (
                  <Badge key={store.id} variant="secondary" className="gap-1">
                    {store.name}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => removeStore(store.id)}
                    />
                  </Badge>
                ))}
                {selectedStores.length > 5 && (
                  <Badge variant="outline">+{selectedStores.length - 5}개</Badge>
                )}
              </div>
            </div>
          )}
          {selectedProducts.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">상품:</span>
              <div className="flex flex-wrap gap-1">
                {selectedProducts.map((product) => (
                  <Badge
                    key={product.id}
                    variant="secondary"
                    className={cn("gap-1", typeColors[product.type])}
                  >
                    {product.name}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => removeProduct(product.id)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 그리드 */}
      {selectedStores.length > 0 && selectedProducts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5" />
              발주 그리드
              <span className="text-sm font-normal text-muted-foreground">
                ({selectedStores.length}개 매장 × {selectedProducts.length}개 상품)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[180px]">
                      매장
                    </TableHead>
                    {selectedProducts.map((product) => (
                      <TableHead key={product.id} className="text-center min-w-[150px]">
                        <div className="flex flex-col items-center gap-1">
                          <Badge
                            variant="secondary"
                            className={cn("text-xs", typeColors[product.type])}
                          >
                            {typeLabels[product.type] || product.type}
                          </Badge>
                          <span className="text-xs">{product.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => removeProduct(product.id)}
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gridRows.map((row) => (
                    <TableRow key={row.store.id}>
                      <TableCell className="sticky left-0 bg-background font-medium">
                        <div className="flex flex-col">
                          <span>{row.store.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {row.store.mid}
                            {row.store.customerName && ` · ${row.store.customerName}`}
                          </span>
                        </div>
                      </TableCell>
                      {selectedProducts.map((product) => {
                        const cell = row.cells[product.id];
                        return (
                          <TableCell key={product.id} className="p-1">
                            <div className="flex flex-col gap-1">
                              <Input
                                type="number"
                                min={0}
                                value={cell?.qty || 0}
                                onChange={(e) =>
                                  updateCell(
                                    row.store.id,
                                    product.id,
                                    "qty",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="h-8 text-center"
                                placeholder="수량"
                              />
                              <div className="flex gap-1">
                                <Input
                                  type="date"
                                  value={cell?.startDate || globalStartDate}
                                  onChange={(e) =>
                                    updateCell(
                                      row.store.id,
                                      product.id,
                                      "startDate",
                                      e.target.value
                                    )
                                  }
                                  className="h-6 text-xs px-1"
                                />
                                <Input
                                  type="date"
                                  value={cell?.endDate || globalEndDate}
                                  onChange={(e) =>
                                    updateCell(
                                      row.store.id,
                                      product.id,
                                      "endDate",
                                      e.target.value
                                    )
                                  }
                                  className="h-6 text-xs px-1"
                                />
                              </div>
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStore(row.store.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* 합계 */}
            <div className="flex justify-end mt-4 pt-4 border-t">
              <div className="text-right space-y-1">
                <p className="text-sm text-muted-foreground">
                  총 {gridRows.length}개 매장, {selectedProducts.length}개 상품
                </p>
                <p className="text-sm">
                  총 수량: <span className="font-bold">{totals.totalQty.toLocaleString()}개</span>
                </p>
                <p className="text-lg font-bold">
                  합계: {totals.totalAmount.toLocaleString()}원
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">그리드를 생성하려면</p>
            <p>매장과 상품을 선택해주세요</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
