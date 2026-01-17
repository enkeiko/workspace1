"use client";

import * as React from "react";
import {
  Search,
  Store,
  Tag,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface CampaignResult {
  keyword: string;
  stores: Array<{
    storeId: string;
    storeName: string;
    mid: string;
  }>;
  totalOrders: number;
  activeCount: number;
  completedCount: number;
  currentRank?: number;
}

interface StoreResult {
  id: string;
  name: string;
  mid: string;
  category: string | null;
  customerName: string | null;
  keywords: string[];
}

interface KeywordResult {
  id: string;
  keyword: string;
  storeId: string;
  storeName: string;
  latestRank: number | null;
  rankChange: number | null;
}

interface OrderResult {
  id: string;
  purchaseOrderNo: string;
  orderWeek: string;
  channelName: string;
  totalQty: number;
  totalAmount: number;
  status: string;
  itemCount: number;
}

interface SearchResults {
  campaigns: CampaignResult[];
  stores: StoreResult[];
  keywords: KeywordResult[];
  orders: OrderResult[];
}

interface SearchMeta {
  totalCount: number;
  query: string;
  searchTime: number;
}

interface UniversalSearchResultsProps {
  className?: string;
  onSelectCampaign?: (keyword: string) => void;
  onSelectStore?: (storeId: string) => void;
  onSelectOrder?: (orderId: string) => void;
}

export function UniversalSearchResults({
  className,
  onSelectCampaign,
  onSelectStore,
  onSelectOrder,
}: UniversalSearchResultsProps) {
  const [query, setQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [results, setResults] = React.useState<SearchResults | null>(null);
  const [meta, setMeta] = React.useState<SearchMeta | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // 검색 실행
  const handleSearch = React.useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults(null);
      setMeta(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/search/universal?q=${encodeURIComponent(searchQuery)}&limit=20`
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "검색 실패");
      }

      const data = await res.json();
      setResults(data.results);
      setMeta(data.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "검색 중 오류 발생");
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 디바운스 검색
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  // 순위 변화 아이콘
  const RankChangeIcon = ({ change }: { change: number | null }) => {
    if (change === null || change === 0) {
      return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
    if (change > 0) {
      return <TrendingUp className="h-3 w-3 text-green-500" />;
    }
    return <TrendingDown className="h-3 w-3 text-red-500" />;
  };

  // 상태 뱃지
  const StatusBadge = ({ status }: { status: string }) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      DRAFT: { variant: "secondary", label: "초안" },
      PENDING: { variant: "outline", label: "대기" },
      CONFIRMED: { variant: "default", label: "확정" },
      IN_PROGRESS: { variant: "default", label: "진행중" },
      COMPLETED: { variant: "secondary", label: "완료" },
      CANCELLED: { variant: "destructive", label: "취소" },
    };

    const config = variants[status] || { variant: "outline" as const, label: status };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* 검색 입력 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="키워드, 매장명, 주문번호로 검색..."
            value={query}
            onChange={handleInputChange}
            className="pl-10"
          />
        </div>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {/* 검색 메타 정보 */}
      {meta && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            &quot;{meta.query}&quot; 검색 결과: {meta.totalCount}건
          </span>
          <span>({meta.searchTime}ms)</span>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* 검색 결과 */}
      {results && (
        <Tabs defaultValue="campaigns" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="campaigns" className="gap-2">
              <Tag className="h-4 w-4" />
              캠페인 ({results.campaigns.length})
            </TabsTrigger>
            <TabsTrigger value="stores" className="gap-2">
              <Store className="h-4 w-4" />
              매장 ({results.stores.length})
            </TabsTrigger>
            <TabsTrigger value="keywords" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              키워드 ({results.keywords.length})
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <FileText className="h-4 w-4" />
              주문 ({results.orders.length})
            </TabsTrigger>
          </TabsList>

          {/* 캠페인 탭 */}
          <TabsContent value="campaigns" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {results.campaigns.map((campaign) => (
                <Card
                  key={campaign.keyword}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => onSelectCampaign?.(campaign.keyword)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{campaign.keyword}</CardTitle>
                    <CardDescription>
                      {campaign.stores.length}개 매장 · {campaign.totalOrders}건 주문
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span>진행중 {campaign.activeCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>완료 {campaign.completedCount}</span>
                      </div>
                    </div>
                    {/* 매장 미리보기 */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {campaign.stores.slice(0, 5).map((store) => (
                        <Badge key={store.storeId} variant="outline" className="text-xs">
                          {store.storeName}
                        </Badge>
                      ))}
                      {campaign.stores.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{campaign.stores.length - 5}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {results.campaigns.length === 0 && (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  검색 결과가 없습니다
                </div>
              )}
            </div>
          </TabsContent>

          {/* 매장 탭 */}
          <TabsContent value="stores" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {results.stores.map((store) => (
                <Card
                  key={store.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => onSelectStore?.(store.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{store.name}</CardTitle>
                    <CardDescription>{store.mid}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {store.customerName && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {store.customerName}
                      </p>
                    )}
                    {store.category && (
                      <Badge variant="secondary" className="text-xs mb-2">
                        {store.category}
                      </Badge>
                    )}
                    {store.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {store.keywords.map((kw) => (
                          <Badge key={kw} variant="outline" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {results.stores.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  검색 결과가 없습니다
                </div>
              )}
            </div>
          </TabsContent>

          {/* 키워드 탭 */}
          <TabsContent value="keywords" className="mt-4">
            <div className="space-y-2">
              {results.keywords.map((kw) => (
                <Card key={kw.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{kw.keyword}</p>
                      <p className="text-sm text-muted-foreground">{kw.storeName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {kw.latestRank !== null && (
                        <div className="flex items-center gap-1">
                          <span className="text-lg font-bold">{kw.latestRank}위</span>
                          <RankChangeIcon change={kw.rankChange} />
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              {results.keywords.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  검색 결과가 없습니다
                </div>
              )}
            </div>
          </TabsContent>

          {/* 주문 탭 */}
          <TabsContent value="orders" className="mt-4">
            <div className="space-y-2">
              {results.orders.map((order) => (
                <Card
                  key={order.id}
                  className="p-4 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => onSelectOrder?.(order.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{order.purchaseOrderNo}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.channelName} · {order.orderWeek} · {order.itemCount}건
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">{order.totalQty.toLocaleString()}개</p>
                        <p className="text-sm text-muted-foreground">
                          {order.totalAmount.toLocaleString()}원
                        </p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                </Card>
              ))}
              {results.orders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  검색 결과가 없습니다
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* 검색 전 상태 */}
      {!results && !isLoading && !error && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>검색어를 입력하세요</p>
          <p className="text-sm mt-1">키워드, 매장명, 주문번호로 검색할 수 있습니다</p>
        </div>
      )}
    </div>
  );
}
