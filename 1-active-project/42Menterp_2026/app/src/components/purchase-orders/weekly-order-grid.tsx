"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Save,
  FileSpreadsheet,
  Loader2,
  AlertTriangle,
  Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { WeekSelector, type WeekRange, getCurrentWeek } from "./week-selector";
import { GridCell, BulkDateCell } from "./grid-cell";
import { useGridKeyboardNavigation } from "@/hooks/use-grid-keyboard-navigation";
import type {
  GridCellData,
  GridStoreRow,
  GridProductColumn,
  WeeklyGridData,
  GridSaveRequest,
  GridSaveResponse,
} from "./types";
import { createEmptyCell } from "./types";

interface WeeklyOrderGridProps {
  onSave?: (data: GridSaveRequest) => Promise<GridSaveResponse>;
  onExport?: (weekKey: string) => void;
  className?: string;
}

export function WeeklyOrderGrid({
  onSave,
  onExport,
  className,
}: WeeklyOrderGridProps) {
  const [selectedWeek, setSelectedWeek] = React.useState<WeekRange>(getCurrentWeek);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showKeyboardGuide, setShowKeyboardGuide] = React.useState(false);

  // 그리드 데이터
  const [gridData, setGridData] = React.useState<WeeklyGridData | null>(null);
  const [products, setProducts] = React.useState<GridProductColumn[]>([]);
  const [stores, setStores] = React.useState<GridStoreRow[]>([]);

  // 일괄 설정
  const [applyGlobalDate, setApplyGlobalDate] = React.useState(true);
  const [globalStartDate, setGlobalStartDate] = React.useState(
    format(selectedWeek.startDate, "yyyy-MM-dd")
  );
  const [globalEndDate, setGlobalEndDate] = React.useState(
    format(selectedWeek.endDate, "yyyy-MM-dd")
  );

  // 선택된 행
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set());

  // 키보드 네비게이션 Hook
  const gridNavigation = useGridKeyboardNavigation(
    stores.length,
    products.length
  );

  // 데이터 로드
  const loadGridData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // 상품 목록 조회
      const productsRes = await fetch("/api/products?isActive=true&limit=100");
      if (!productsRes.ok) throw new Error("상품 목록 로드 실패");
      const productsData = await productsRes.json();

      const productColumns: GridProductColumn[] = productsData.products.map(
        (p: Record<string, unknown>) => ({
          productId: p.id,
          productCode: p.code,
          productName: p.name,
          productType: p.type,
          saleUnitPrice: p.saleUnitPrice,
          costUnitPrice: p.costUnitPrice,
        })
      );
      setProducts(productColumns);

      // 기존 발주 데이터 로드
      const ordersRes = await fetch(
        `/api/purchase-orders/grid-load?weekKey=${selectedWeek.weekKey}`
      );

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        if (ordersData.stores) {
          setStores(ordersData.stores);
        }
      } else {
        // 매장 목록만 로드
        const storesRes = await fetch("/api/stores?status=ACTIVE&limit=200");
        if (storesRes.ok) {
          const storesData = await storesRes.json();
          const storeRows: GridStoreRow[] = storesData.stores.map(
            (s: Record<string, unknown>) => ({
              storeId: s.id,
              storeName: s.name,
              storeMid: s.mid,
              customerId: s.customerId,
              customerName: (s.customer as Record<string, string> | null)?.name,
              cells: {},
              rowStatus: "NEW",
            })
          );
          setStores(storeRows);
        }
      }

      // 일괄 날짜 설정
      setGlobalStartDate(format(selectedWeek.startDate, "yyyy-MM-dd"));
      setGlobalEndDate(format(selectedWeek.endDate, "yyyy-MM-dd"));
    } catch (error) {
      console.error("Grid load error:", error);
      toast.error("데이터 로드 실패");
    } finally {
      setIsLoading(false);
    }
  }, [selectedWeek]);

  // 주 변경 시 데이터 리로드
  React.useEffect(() => {
    loadGridData();
  }, [loadGridData]);

  // 데이터 로드 후 첫 셀에 자동 포커스
  React.useEffect(() => {
    if (!isLoading && stores.length > 0 && products.length > 0) {
      // 렌더링 완료 후 포커스
      const timer = setTimeout(() => {
        gridNavigation.focusFirstCell();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading, stores.length, products.length, gridNavigation]);

  // 셀 데이터 변경
  const handleCellChange = (
    storeId: string,
    productCode: string,
    cellData: GridCellData
  ) => {
    setStores((prev) =>
      prev.map((store) => {
        if (store.storeId !== storeId) return store;

        return {
          ...store,
          cells: {
            ...store.cells,
            [productCode]: cellData,
          },
          rowStatus: store.rowStatus === "NEW" ? "NEW" : "MODIFIED",
        };
      })
    );
  };

  // 셀 데이터 가져오기 (없으면 기본값)
  const getCellData = (store: GridStoreRow, productCode: string): GridCellData => {
    return (
      store.cells[productCode] ||
      createEmptyCell(globalStartDate, globalEndDate)
    );
  };

  // 일괄 날짜 변경
  const handleGlobalDateChange = (startDate: string, endDate: string) => {
    setGlobalStartDate(startDate);
    setGlobalEndDate(endDate);

    if (applyGlobalDate) {
      // 모든 빈 셀에 적용
      setStores((prev) =>
        prev.map((store) => {
          const updatedCells = { ...store.cells };
          for (const productCode of Object.keys(updatedCells)) {
            const cell = updatedCells[productCode];
            if (!cell.isManualOverride && cell.qty === 0) {
              updatedCells[productCode] = {
                ...cell,
                startDate,
                endDate,
              };
            }
          }
          return { ...store, cells: updatedCells };
        })
      );
    }
  };

  // 저장
  const handleSave = async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      const request: GridSaveRequest = {
        weekKey: selectedWeek.weekKey,
        rows: stores
          .filter((store) => {
            // 수량이 있는 셀이 있는 행만
            return Object.values(store.cells).some((cell) => cell.qty > 0);
          })
          .map((store) => ({
            storeId: store.storeId,
            cells: Object.entries(store.cells)
              .filter(([_, cell]) => cell.qty > 0)
              .map(([productCode, cell]) => ({
                productCode,
                qty: cell.qty,
                startDate: cell.startDate,
                endDate: cell.endDate,
              })),
          })),
        createSalesOrder: true,
        createPurchaseOrder: true,
      };

      const response = await onSave(request);

      if (response.success) {
        toast.success(
          `저장 완료: ${response.summary.itemsCreated}건 생성, ${response.summary.itemsUpdated}건 수정`
        );
        await loadGridData();
      } else {
        toast.error("저장 실패");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("저장 중 오류 발생");
    } finally {
      setIsSaving(false);
    }
  };

  // 상품 유형별 그룹핑
  const productsByType = React.useMemo(() => {
    const grouped: Record<string, GridProductColumn[]> = {};
    for (const product of products) {
      if (!grouped[product.productType]) {
        grouped[product.productType] = [];
      }
      grouped[product.productType].push(product);
    }
    return grouped;
  }, [products]);

  // 유형별 한글 라벨
  const typeLabels: Record<string, string> = {
    TRAFFIC: "트래픽",
    DIRECTION: "길찾기",
    BLOG: "블로그",
    REVIEW: "리뷰",
    RECEIPT: "영수증",
    SAVE: "저장",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">주간 발주 그리드</h2>
          <WeekSelector
            value={selectedWeek}
            onChange={setSelectedWeek}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* 키보드 단축키 가이드 */}
          <Dialog open={showKeyboardGuide} onOpenChange={setShowKeyboardGuide}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Keyboard className="h-4 w-4 mr-2" />
                단축키
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>키보드 단축키</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <kbd className="px-2 py-1 bg-muted rounded text-sm font-mono">Enter</kbd>
                  <span className="text-sm">다음 셀로 이동</span>
                </div>
                <div className="flex items-center gap-4">
                  <kbd className="px-2 py-1 bg-muted rounded text-sm font-mono">Shift+Enter</kbd>
                  <span className="text-sm">이전 셀로 이동</span>
                </div>
                <div className="flex items-center gap-4">
                  <kbd className="px-2 py-1 bg-muted rounded text-sm font-mono">↑ ↓ ← →</kbd>
                  <span className="text-sm">방향키로 셀 이동</span>
                </div>
                <div className="flex items-center gap-4">
                  <kbd className="px-2 py-1 bg-muted rounded text-sm font-mono">Esc</kbd>
                  <span className="text-sm">편집 취소 및 포커스 해제</span>
                </div>
                <div className="flex items-center gap-4">
                  <kbd className="px-2 py-1 bg-muted rounded text-sm font-mono">Tab</kbd>
                  <span className="text-sm">다음 요소로 이동 (기본 동작)</span>
                </div>
              </div>
              <div className="pt-4 text-xs text-muted-foreground">
                <p>셀을 클릭하거나 포커스하면 기존 값이 자동 선택되어 바로 입력할 수 있습니다.</p>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={() => onExport?.(selectedWeek.weekKey)}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            시트 전송
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            저장
          </Button>
        </div>
      </div>

      {/* 일괄 설정 */}
      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
        <span className="text-sm font-medium">일괄 설정</span>
        <BulkDateCell
          startDate={globalStartDate}
          endDate={globalEndDate}
          onChange={handleGlobalDateChange}
        />
        <div className="flex items-center gap-2">
          <Checkbox
            id="applyGlobal"
            checked={applyGlobalDate}
            onCheckedChange={(checked) => setApplyGlobalDate(!!checked)}
          />
          <label htmlFor="applyGlobal" className="text-sm">
            신규 셀에 전체 적용
          </label>
        </div>
      </div>

      {/* 그리드 테이블 */}
      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10 w-10">
                <Checkbox
                  checked={selectedRows.size === stores.length && stores.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedRows(new Set(stores.map((s) => s.storeId)));
                    } else {
                      setSelectedRows(new Set());
                    }
                  }}
                />
              </TableHead>
              <TableHead className="sticky left-10 bg-background z-10 min-w-[150px]">
                매장명
              </TableHead>
              {/* 상품 유형별 그룹 */}
              {Object.entries(productsByType).map(([type, typeProducts]) => (
                <React.Fragment key={type}>
                  {typeProducts.map((product) => (
                    <TableHead
                      key={product.productCode}
                      className="text-center min-w-[120px]"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[type] || type}
                        </Badge>
                        <span className="text-xs">{product.productName}</span>
                      </div>
                    </TableHead>
                  ))}
                </React.Fragment>
              ))}
              <TableHead className="w-[80px]">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stores.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={products.length + 3}
                  className="text-center py-8 text-muted-foreground"
                >
                  등록된 매장이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              stores.map((store, rowIndex) => (
                <TableRow
                  key={store.storeId}
                  className={cn(
                    store.rowStatus === "MODIFIED" && "bg-yellow-50/50"
                  )}
                >
                  <TableCell className="sticky left-0 bg-background">
                    <Checkbox
                      checked={selectedRows.has(store.storeId)}
                      onCheckedChange={(checked) => {
                        setSelectedRows((prev) => {
                          const next = new Set(prev);
                          if (checked) {
                            next.add(store.storeId);
                          } else {
                            next.delete(store.storeId);
                          }
                          return next;
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell className="sticky left-10 bg-background font-medium">
                    <div className="flex flex-col">
                      <span>{store.storeName}</span>
                      {store.customerName && (
                        <span className="text-xs text-muted-foreground">
                          {store.customerName}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  {products.map((product, colIndex) => {
                    const cellData = getCellData(store, product.productCode);
                    return (
                      <TableCell
                        key={product.productCode}
                        className="p-1"
                      >
                        <GridCell
                          data={cellData}
                          onChange={(data) =>
                            handleCellChange(store.storeId, product.productCode, data)
                          }
                          compact
                          // 키보드 네비게이션 props
                          inputRef={(el) => gridNavigation.registerCell(rowIndex, colIndex, el)}
                          onEnter={() => gridNavigation.moveNext()}
                          onShiftEnter={() => gridNavigation.movePrevious()}
                          onArrowDown={() => gridNavigation.moveDown()}
                          onArrowUp={() => gridNavigation.moveUp()}
                          onArrowLeft={() => gridNavigation.moveLeft()}
                          onArrowRight={() => gridNavigation.moveRight()}
                          gridPosition={{ row: rowIndex, col: colIndex }}
                        />
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <Badge
                      variant={
                        store.rowStatus === "MODIFIED"
                          ? "default"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {store.rowStatus === "MODIFIED" ? "수정됨" : "-"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 text-yellow-500" />
          수동 수정됨 (보호)
        </span>
        <span>|</span>
        <span className="flex items-center gap-1">
          <Keyboard className="h-3 w-3" />
          Enter/화살표 키로 셀 이동
        </span>
        <span>|</span>
        <span>
          총 {stores.length}개 매장, {products.length}개 상품
        </span>
      </div>
    </div>
  );
}
