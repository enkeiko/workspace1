"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface PurchaseOrder {
  id: string;
  purchaseOrderNo: string;
  orderDate: string;
  status: string;
  totalQty: number;
  totalAmount: number;
  channel: {
    id: string;
    name: string;
  };
  items: PurchaseOrderItem[];
}

interface PurchaseOrderItem {
  id: string;
  store: {
    id: string;
    name: string;
    mid: string;
  };
  product: {
    id: string;
    name: string;
  } | null;
  productType: string;
  keyword: string;
  totalQty: number;
  unitPrice: number;
  amount: number;
}

interface WorkStatementItem {
  purchaseOrderItemId: string;
  completedQty: number;
  unitPriceSnapshot: number;
  amount: number;
  note: string;
  selected: boolean;
}

export default function NewWorkStatementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseOrderId = searchParams.get("purchaseOrderId");

  const [loading, setLoading] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [items, setItems] = useState<WorkStatementItem[]>([]);
  const [periodStart, setPeriodStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");

  // 발주 목록 조회
  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      try {
        const res = await fetch("/api/purchase-orders?status=IN_PROGRESS&limit=100");
        const data = await res.json();
        if (res.ok) {
          setPurchaseOrders(data.purchaseOrders || []);

          // URL에서 purchaseOrderId가 있으면 자동 선택
          if (purchaseOrderId && data.purchaseOrders) {
            const po = data.purchaseOrders.find((p: PurchaseOrder) => p.id === purchaseOrderId);
            if (po) {
              handleSelectPO(po.id);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch purchase orders:", error);
      }
    };
    fetchPurchaseOrders();
  }, [purchaseOrderId]);

  // 발주 선택 시 상세 조회
  const handleSelectPO = async (poId: string) => {
    try {
      const res = await fetch(`/api/purchase-orders/${poId}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedPO(data);
        // 항목 초기화
        setItems(
          data.items.map((item: PurchaseOrderItem) => ({
            purchaseOrderItemId: item.id,
            completedQty: item.totalQty,
            unitPriceSnapshot: item.unitPrice,
            amount: item.amount,
            note: "",
            selected: true,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch purchase order:", error);
    }
  };

  // 항목 수량 변경
  const handleQtyChange = (index: number, qty: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const poItem = selectedPO?.items[index];
      if (poItem) {
        updated[index] = {
          ...updated[index],
          completedQty: qty,
          amount: qty * updated[index].unitPriceSnapshot,
        };
      }
      return updated;
    });
  };

  // 항목 선택 토글
  const handleToggleItem = (index: number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        selected: !updated[index].selected,
      };
      return updated;
    });
  };

  // 전체 선택/해제
  const handleToggleAll = (checked: boolean) => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: checked })));
  };

  // 합계 계산
  const selectedItems = items.filter((item) => item.selected);
  const totalAmount = selectedItems.reduce((sum, item) => sum + item.amount, 0);
  const totalQty = selectedItems.reduce((sum, item) => sum + item.completedQty, 0);

  // 저장
  const handleSubmit = async () => {
    if (!selectedPO) {
      toast.error("발주를 선택해주세요");
      return;
    }

    if (selectedItems.length === 0) {
      toast.error("최소 1개 이상의 항목을 선택해주세요");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/work-statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderId: selectedPO.id,
          periodStart,
          periodEnd,
          note: note || null,
          items: selectedItems.map((item) => ({
            purchaseOrderItemId: item.purchaseOrderItemId,
            completedQty: item.completedQty,
            unitPriceSnapshot: item.unitPriceSnapshot,
            amount: item.amount,
            note: item.note || null,
          })),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("작업 명세가 등록되었습니다");
        router.push(`/work-statements/${data.id}`);
      } else {
        toast.error(data.error || "등록에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to create work statement:", error);
      toast.error("등록에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/work-statements">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">작업 명세 등록</h2>
          <p className="text-muted-foreground">
            발주에 대한 작업 내역을 기록합니다.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* 발주 선택 */}
          <Card>
            <CardHeader>
              <CardTitle>발주 선택</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>발주</Label>
                <Select
                  value={selectedPO?.id || ""}
                  onValueChange={handleSelectPO}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="발주를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {purchaseOrders.map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.purchaseOrderNo} - {po.channel.name} ({po.totalQty}건)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPO && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label>작업 시작일</Label>
                    <Input
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>작업 종료일</Label>
                    <Input
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 항목 목록 */}
          {selectedPO && selectedPO.items.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>작업 항목</CardTitle>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={items.every((item) => item.selected)}
                      onCheckedChange={(checked) => handleToggleAll(!!checked)}
                    />
                    <span className="text-sm text-muted-foreground">전체 선택</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>매장</TableHead>
                      <TableHead>키워드</TableHead>
                      <TableHead className="text-right">발주수량</TableHead>
                      <TableHead className="text-right">완료수량</TableHead>
                      <TableHead className="text-right">단가</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPO.items.map((poItem, index) => (
                      <TableRow key={poItem.id}>
                        <TableCell>
                          <Checkbox
                            checked={items[index]?.selected || false}
                            onCheckedChange={() => handleToggleItem(index)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{poItem.store.name}</div>
                            <div className="text-xs text-muted-foreground">{poItem.store.mid}</div>
                          </div>
                        </TableCell>
                        <TableCell>{poItem.keyword}</TableCell>
                        <TableCell className="text-right">{poItem.totalQty}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            className="w-20 text-right"
                            value={items[index]?.completedQty || 0}
                            onChange={(e) => handleQtyChange(index, parseInt(e.target.value) || 0)}
                            min={0}
                            max={poItem.totalQty}
                            disabled={!items[index]?.selected}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {poItem.unitPrice.toLocaleString()}원
                        </TableCell>
                        <TableCell className="text-right">
                          {items[index]?.selected
                            ? items[index].amount.toLocaleString()
                            : "-"}원
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* 메모 */}
          <Card>
            <CardHeader>
              <CardTitle>메모</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="작업 명세에 대한 메모를 입력하세요"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* 요약 */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>요약</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedPO && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">발주번호</span>
                      <span className="font-medium">{selectedPO.purchaseOrderNo}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">채널</span>
                      <span>{selectedPO.channel.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">작업기간</span>
                      <span>{periodStart} ~ {periodEnd}</span>
                    </div>
                  </div>
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">선택 항목</span>
                      <span>{selectedItems.length}건</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">총 수량</span>
                      <span>{totalQty}건</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">공급가액</span>
                      <span>{totalAmount.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">세액 (10%)</span>
                      <span>{Math.round(totalAmount * 0.1).toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span>합계</span>
                      <span>{(totalAmount + Math.round(totalAmount * 0.1)).toLocaleString()}원</span>
                    </div>
                  </div>
                </>
              )}

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={loading || !selectedPO || selectedItems.length === 0}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                작업 명세 등록
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
