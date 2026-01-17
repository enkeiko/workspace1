"use client";

import * as React from "react";
import {
  ArrowRight,
  Loader2,
  Zap,
  Scale,
  Send,
  Undo2,
  AlertTriangle,
  Package,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  keyword: string;
  storeName: string;
  storeId: string;
  dailyQty: number;
  workDays: number;
  totalQty: number;
  productType: string;
}

interface ChannelCapacity {
  channelId: string;
  channelName: string;
  channelCode: string;
  baseUnitPrice: number;
  maxMonthlyQty: number;
  currentLoad: number;
  availableCapacity: number;
  assignedItems: OrderItem[];
}

interface TrafficDistributionBoardProps {
  initialItems: OrderItem[];
  onSubmit?: (distribution: Map<string, OrderItem[]>) => Promise<void>;
  className?: string;
}

export function TrafficDistributionBoard({
  initialItems,
  onSubmit,
  className,
}: TrafficDistributionBoardProps) {
  const [unassigned, setUnassigned] = React.useState<OrderItem[]>(initialItems);
  const [channels, setChannels] = React.useState<ChannelCapacity[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<string | null>(null);

  // 채널 용량 로드
  React.useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/distribution/bulk-assign");
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
      }
    } catch (error) {
      console.error("Failed to load channels:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 자동 분배
  const handleAutoDistribute = async (mode: "auto" | "balanced") => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/distribution/bulk-assign?mode=${mode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: unassigned }),
      });

      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
        setUnassigned(data.unassigned || []);
      }
    } catch (error) {
      console.error("Auto distribute failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 수동 할당
  const handleManualAssign = (itemId: string, channelId: string) => {
    const item = unassigned.find((i) => i.id === itemId);
    if (!item) return;

    // 미할당에서 제거
    setUnassigned((prev) => prev.filter((i) => i.id !== itemId));

    // 채널에 추가
    setChannels((prev) =>
      prev.map((ch) => {
        if (ch.channelId === channelId) {
          return {
            ...ch,
            assignedItems: [...ch.assignedItems, item],
            availableCapacity: ch.availableCapacity - item.totalQty,
          };
        }
        return ch;
      })
    );

    setSelectedItem(null);
  };

  // 할당 취소
  const handleUnassign = (itemId: string, channelId: string) => {
    const channel = channels.find((c) => c.channelId === channelId);
    const item = channel?.assignedItems.find((i) => i.id === itemId);
    if (!item) return;

    // 채널에서 제거
    setChannels((prev) =>
      prev.map((ch) => {
        if (ch.channelId === channelId) {
          return {
            ...ch,
            assignedItems: ch.assignedItems.filter((i) => i.id !== itemId),
            availableCapacity: ch.availableCapacity + item.totalQty,
          };
        }
        return ch;
      })
    );

    // 미할당에 추가
    setUnassigned((prev) => [...prev, item]);
  };

  // 전송
  const handleSubmit = async () => {
    if (!onSubmit) return;

    const distribution = new Map<string, OrderItem[]>();
    for (const channel of channels) {
      if (channel.assignedItems.length > 0) {
        distribution.set(channel.channelId, channel.assignedItems);
      }
    }

    if (distribution.size === 0) {
      alert("할당된 항목이 없습니다");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(distribution);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 금액 포맷
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ko-KR", {
      maximumFractionDigits: 0,
    }).format(value);
  };

  // 총 비용 계산
  const totalCost = channels.reduce(
    (sum, ch) =>
      sum +
      ch.assignedItems.reduce((s, item) => s + item.totalQty * ch.baseUnitPrice, 0),
    0
  );

  const totalAssigned = channels.reduce((sum, ch) => sum + ch.assignedItems.length, 0);

  return (
    <div className={cn("space-y-6", className)}>
      {/* 상단 액션 바 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => handleAutoDistribute("auto")}
            disabled={isLoading || unassigned.length === 0}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            최저가 자동 분배
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAutoDistribute("balanced")}
            disabled={isLoading || unassigned.length === 0}
          >
            <Scale className="h-4 w-4 mr-2" />
            부하 균형 분배
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {totalAssigned}건 할당 · 예상 비용: {formatCurrency(totalCost)}원
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || totalAssigned === 0}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {totalAssigned}건 발주 생성
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {/* 미할당 풀 */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              미할당
            </CardTitle>
            <CardDescription>{unassigned.length}건</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {unassigned.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-2 border rounded-lg cursor-pointer transition-colors",
                      selectedItem === item.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-gray-400"
                    )}
                    onClick={() =>
                      setSelectedItem(selectedItem === item.id ? null : item.id)
                    }
                  >
                    <div className="font-medium text-sm truncate">{item.keyword}</div>
                    <div className="text-xs text-muted-foreground">{item.storeName}</div>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant="outline" className="text-xs">
                        {item.productType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(item.totalQty)}건
                      </span>
                    </div>

                    {/* 채널 선택 드롭다운 */}
                    {selectedItem === item.id && (
                      <div className="mt-2 pt-2 border-t">
                        <Select
                          onValueChange={(channelId) =>
                            handleManualAssign(item.id, channelId)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="채널 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {channels.map((ch) => (
                              <SelectItem
                                key={ch.channelId}
                                value={ch.channelId}
                                disabled={ch.availableCapacity < item.totalQty}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span>{ch.channelName}</span>
                                  <span className="text-xs text-muted-foreground ml-2">
                                    {formatCurrency(ch.baseUnitPrice)}원
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ))}

                {unassigned.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    모두 할당됨
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* 채널별 칸반 */}
        <div className="lg:col-span-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {channels.map((channel) => {
            const loadRate =
              ((channel.currentLoad +
                channel.assignedItems.reduce((s, i) => s + i.totalQty, 0)) /
                channel.maxMonthlyQty) *
              100;
            const isOverCapacity = loadRate > 100;

            return (
              <Card
                key={channel.channelId}
                className={cn(isOverCapacity && "border-red-300 bg-red-50")}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{channel.channelName}</CardTitle>
                    <Badge variant="outline">
                      {formatCurrency(channel.baseUnitPrice)}원
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <span>{channel.assignedItems.length}건 할당</span>
                    {isOverCapacity && (
                      <span className="flex items-center text-red-600">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        용량 초과
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* 용량 바 */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>사용량</span>
                      <span>
                        {formatCurrency(
                          channel.currentLoad +
                            channel.assignedItems.reduce((s, i) => s + i.totalQty, 0)
                        )}
                        / {formatCurrency(channel.maxMonthlyQty)}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(loadRate, 100)}
                      className={cn(isOverCapacity && "[&>div]:bg-red-500")}
                    />
                  </div>

                  {/* 할당된 항목 */}
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-2">
                      {channel.assignedItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-2 bg-white border rounded-lg flex items-center justify-between"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {item.keyword}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {item.storeName}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(item.totalQty)}건
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleUnassign(item.id, channel.channelId)}
                            >
                              <Undo2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {channel.assignedItems.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          항목을 드래그하여 할당
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* 채널별 비용 */}
                  {channel.assignedItems.length > 0 && (
                    <div className="pt-2 border-t flex justify-between text-sm">
                      <span className="text-muted-foreground">예상 비용</span>
                      <span className="font-medium">
                        {formatCurrency(
                          channel.assignedItems.reduce(
                            (s, i) => s + i.totalQty * channel.baseUnitPrice,
                            0
                          )
                        )}
                        원
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
