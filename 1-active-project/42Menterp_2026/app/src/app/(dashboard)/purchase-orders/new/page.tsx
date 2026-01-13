"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Loader2, Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, differenceInBusinessDays, startOfWeek, addWeeks, getWeek, getYear } from "date-fns";
import { ko } from "date-fns/locale";

interface Channel {
  id: string;
  name: string;
  code: string;
  type: string;
  baseUnitPrice: number;
}

interface StoreKeyword {
  id: string;
  keyword: string;
}

interface Store {
  id: string;
  name: string;
  mid: string;
  address: string | null;
  keywords?: StoreKeyword[];
}

interface PurchaseOrderItem {
  storeId: string;
  storeName: string;
  storeKeywords: StoreKeyword[];
  productType: "TRAFFIC" | "SAVE" | "REVIEW" | "DIRECTION";
  keyword: string;
  dailyQty: number;
  startDate: string;
  endDate: string;
  workDays: number;
  totalQty: number;
  unitPrice: number;
  amount: number;
  note: string;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeSearch, setStoreSearch] = useState("");
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [orderDate, setOrderDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [orderWeek, setOrderWeek] = useState("");
  const [memo, setMemo] = useState("");
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    fetchChannels();
    fetchStores();
  }, []);

  useEffect(() => {
    if (weekOptions.length > 0 && !orderWeek) {
      setOrderWeek(weekOptions[0].value);
    }
  }, [weekOptions, orderWeek]);

  useEffect(() => {
    if (storeSearch) {
      const filtered = stores.filter(
        (store) =>
          store.name.toLowerCase().includes(storeSearch.toLowerCase()) ||
          store.mid.includes(storeSearch)
      );
      setFilteredStores(filtered.slice(0, 10));
    } else {
      setFilteredStores([]);
    }
  }, [storeSearch, stores]);

  const fetchChannels = async () => {
    try {
      const res = await fetch("/api/channels");
      const data = await res.json();
      if (res.ok) {
        const channels = data.channels || [];
        setChannels(channels.filter((c: Channel) => c.type));
      }
    } catch (error) {
      console.error("Failed to fetch channels:", error);
    }
  };

  const fetchStores = async () => {
    try {
      const res = await fetch("/api/stores?limit=1000&includeKeywords=true");
      const data = await res.json();
      if (res.ok) {
        setStores(data.stores);
      }
    } catch (error) {
      console.error("Failed to fetch stores:", error);
    }
  };

  const handleChannelChange = (channelId: string) => {
    setSelectedChannelId(channelId);
  };

  const selectedChannel = channels.find((c) => c.id === selectedChannelId) || null;

  const toggleStore = (store: Store) => {
    const newSelected = new Set(selectedStores);
    if (newSelected.has(store.id)) {
      newSelected.delete(store.id);
    } else {
      newSelected.add(store.id);
    }
    setSelectedStores(newSelected);
  };

  const addItemsFromSelectedStores = () => {
    if (!selectedChannel) {
      toast.error("채널을 먼저 선택하세요");
      return;
    }

    const startDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
    const endDate = format(addDays(new Date(), 7), "yyyy-MM-dd");
    const workDays = differenceInBusinessDays(new Date(endDate), new Date(startDate)) + 1;

    const newItems: PurchaseOrderItem[] = [];
    selectedStores.forEach((storeId) => {
      const store = stores.find((s) => s.id === storeId);
      if (store) {
        const existingItem = items.find((item) => item.storeId === storeId);
        if (!existingItem) {
          const dailyQty = 10;
          const totalQty = dailyQty * workDays;
          const unitPrice = selectedChannel.baseUnitPrice;
          const storeKeywords = (store.keywords || []).filter(
            (kw) => kw.keyword && kw.keyword.trim() !== ""
          );
          const firstValidKeyword = storeKeywords.length > 0 ? storeKeywords[0].keyword : "";
          newItems.push({
            storeId: store.id,
            storeName: store.name,
            storeKeywords,
            productType: selectedChannel.type as PurchaseOrderItem["productType"],
            keyword: firstValidKeyword,
            dailyQty,
            startDate,
            endDate,
            workDays,
            totalQty,
            unitPrice,
            amount: totalQty * unitPrice,
            note: "",
          });
        }
      }
    });

    setItems([...items, ...newItems]);
    setSelectedStores(new Set());
    setStoreSearch("");
  };

  const updateItem = (index: number, field: keyof PurchaseOrderItem, value: unknown) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    if (field === "startDate" || field === "endDate" || field === "dailyQty") {
      const start = field === "startDate" ? (value as string) : item.startDate;
      const end = field === "endDate" ? (value as string) : item.endDate;
      const dailyQty = field === "dailyQty" ? (value as number) : item.dailyQty;

      const workDays =
        differenceInBusinessDays(new Date(end), new Date(start)) + 1;
      item.workDays = workDays > 0 ? workDays : 1;
      item.totalQty = dailyQty * item.workDays;
      item.amount = item.totalQty * item.unitPrice;
    }

    if (field === "unitPrice") {
      item.amount = item.totalQty * (value as number);
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedChannel) {
      toast.error("채널을 선택하세요");
      return;
    }

    if (!orderWeek) {
      toast.error("발주 주차를 선택하세요");
      return;
    }

    if (items.length === 0) {
      toast.error("최소 1개 이상의 발주 항목이 필요합니다");
      return;
    }

    const emptyKeywords = items.filter((item) => !item.keyword.trim());
    if (emptyKeywords.length > 0) {
      toast.error("모든 항목에 키워드를 입력하세요");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: selectedChannel.id,
          orderDate,
          orderWeek,
          memo: memo || null,
          items: items.map((item) => ({
            storeId: item.storeId,
            productType: item.productType,
            keyword: item.keyword,
            dailyQty: item.dailyQty,
            startDate: item.startDate,
            endDate: item.endDate,
            workDays: item.workDays,
            totalQty: item.totalQty,
            unitPrice: item.unitPrice,
            amount: item.amount,
            note: item.note || null,
          })),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("발주가 등록되었습니다");
        router.push(`/purchase-orders/${data.id}`);
      } else {
        toast.error(data.error || "발주 등록에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to create purchase order:", error);
      toast.error("발주 등록 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const totalQty = items.reduce((sum, item) => sum + item.totalQty, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/purchase-orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            발주 등록 <span className="text-sm font-normal text-muted-foreground">New Purchase Order</span>
          </h2>
          <p className="text-muted-foreground">새로운 발주를 등록하세요.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>채널 *</Label>
                  <select
                    value={selectedChannelId}
                    onChange={(e) => handleChannelChange(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">채널 선택</option>
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.name} ({channel.baseUnitPrice.toLocaleString()}원)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>발주 주차 *</Label>
                  <select
                    value={orderWeek}
                    onChange={(e) => setOrderWeek(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">주차 선택</option>
                    {weekOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>발주일 *</Label>
                  <Input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>메모</Label>
                <Textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="발주 관련 메모"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>매장 선택</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="매장명 또는 MID 검색"
                  className="pl-9"
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                />
              </div>
              {filteredStores.length > 0 && (
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {filteredStores.map((store) => (
                    <div
                      key={store.id}
                      className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer"
                      onClick={() => toggleStore(store)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStores.has(store.id)}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {store.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {store.mid}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedStores.size > 0 && (
                <Button
                  type="button"
                  onClick={addItemsFromSelectedStores}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {selectedStores.size}개 매장 추가
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>발주 항목</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                매장을 검색하여 발주 항목을 추가하세요.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">매장</TableHead>
                      <TableHead className="min-w-[150px]">키워드 *</TableHead>
                      <TableHead className="w-[80px]">일수량</TableHead>
                      <TableHead className="w-[120px]">시작일</TableHead>
                      <TableHead className="w-[120px]">종료일</TableHead>
                      <TableHead className="w-[60px]">일수</TableHead>
                      <TableHead className="w-[80px]">총수량</TableHead>
                      <TableHead className="w-[80px]">단가</TableHead>
                      <TableHead className="w-[100px] text-right">금액</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {item.storeName}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const validKeywords = item.storeKeywords?.filter(
                              (kw) => kw.keyword && kw.keyword.trim() !== ""
                            ) || [];
                            return validKeywords.length > 0 ? (
                              <select
                                value={item.keyword}
                                onChange={(e) =>
                                  updateItem(index, "keyword", e.target.value)
                                }
                                className="h-8 w-[150px] rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              >
                                <option value="">키워드 선택</option>
                                {validKeywords.map((kw) => (
                                  <option key={kw.id} value={kw.keyword}>
                                    {kw.keyword}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <Input
                                value={item.keyword}
                                onChange={(e) =>
                                  updateItem(index, "keyword", e.target.value)
                                }
                                placeholder="키워드 입력"
                                className="h-8"
                              />
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.dailyQty}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "dailyQty",
                                parseInt(e.target.value) || 1
                              )
                            }
                            min={1}
                            className="h-8 w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={item.startDate}
                            onChange={(e) =>
                              updateItem(index, "startDate", e.target.value)
                            }
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={item.endDate}
                            onChange={(e) =>
                              updateItem(index, "endDate", e.target.value)
                            }
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {item.workDays}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.totalQty}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "unitPrice",
                                parseInt(e.target.value) || 0
                              )
                            }
                            min={0}
                            className="h-8 w-20"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {item.amount.toLocaleString()}원
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {items.length > 0 && (
              <div className="flex justify-end mt-4 pt-4 border-t">
                <div className="text-right space-y-1">
                  <p className="text-sm text-muted-foreground">
                    총 {items.length}건, {totalQty.toLocaleString()}개
                  </p>
                  <p className="text-lg font-bold">
                    합계: {totalAmount.toLocaleString()}원
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" type="button" asChild>
            <Link href="/purchase-orders">취소</Link>
          </Button>
          <Button type="submit" disabled={loading || items.length === 0}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                등록 중...
              </>
            ) : (
              "발주 등록"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
