"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Search,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Store {
  id: string;
  name: string;
  mid: string;
}

interface KeywordRanking {
  date: string;
  ranking: number | null;
}

interface StoreKeyword {
  id: string;
  storeId: string;
  store: Store;
  keyword: string;
  isActive: boolean;
  currentRank: number | null;
  previousRank: number | null;
  rankChange: number;
  lastChecked: string | null;
  recentRankings: KeywordRanking[];
}

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<StoreKeyword[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rankingInputs, setRankingInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<StoreKeyword | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedStoreId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStoreId) params.append("storeId", selectedStoreId);
      params.append("isActive", "true");

      const [keywordsRes, storesRes] = await Promise.all([
        fetch(`/api/keywords?${params}`),
        fetch("/api/stores"),
      ]);

      if (keywordsRes.ok) {
        const data = await keywordsRes.json();
        setKeywords(data.keywords || []);
      }
      if (storesRes.ok) {
        const data = await storesRes.json();
        setStores(data.stores || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRankingSubmit = async () => {
    try {
      setSubmitting(true);
      const rankings = Object.entries(rankingInputs)
        .filter(([_, value]) => value !== "")
        .map(([storeKeywordId, value]) => ({
          storeKeywordId,
          ranking: value === "0" ? null : parseInt(value),
        }));

      if (rankings.length === 0) {
        alert("순위를 입력해주세요");
        return;
      }

      const res = await fetch("/api/keywords/rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rankings }),
      });

      if (res.ok) {
        setIsDialogOpen(false);
        setRankingInputs({});
        fetchData();
      }
    } catch (error) {
      console.error("Failed to submit rankings:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredKeywords = keywords.filter((kw) => {
    const matchesSearch =
      !searchTerm ||
      kw.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kw.store.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getRankChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <ArrowDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getRankBadge = (rank: number | null) => {
    if (rank === null) return <Badge variant="outline">순위권 밖</Badge>;
    if (rank <= 3) return <Badge className="bg-yellow-500">TOP {rank}</Badge>;
    if (rank <= 10) return <Badge className="bg-blue-500">{rank}위</Badge>;
    if (rank <= 50) return <Badge variant="secondary">{rank}위</Badge>;
    return <Badge variant="outline">{rank}위</Badge>;
  };

  if (loading && !keywords.length) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 통계 계산
  const totalKeywords = keywords.length;
  const rankedKeywords = keywords.filter((kw) => kw.currentRank !== null).length;
  const top10Keywords = keywords.filter((kw) => kw.currentRank !== null && kw.currentRank <= 10).length;
  const improvedKeywords = keywords.filter((kw) => kw.rankChange > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">키워드 순위 트래킹</h2>
          <p className="text-muted-foreground">
            매장별 키워드 순위를 추적하고 변동을 확인합니다.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <RefreshCw className="h-4 w-4 mr-2" /> 순위 입력
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>순위 일괄 입력</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                각 키워드의 현재 순위를 입력하세요. 순위권 밖인 경우 0을 입력하세요.
              </p>
              <div className="space-y-3">
                {keywords.map((kw) => (
                  <div key={kw.id} className="flex items-center gap-4 p-2 border rounded">
                    <div className="flex-1">
                      <p className="font-medium">{kw.store.name}</p>
                      <p className="text-sm text-muted-foreground">{kw.keyword}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">현재:</span>
                      {getRankBadge(kw.currentRank)}
                    </div>
                    <Input
                      type="number"
                      min="0"
                      max="1000"
                      placeholder="순위"
                      className="w-24"
                      value={rankingInputs[kw.id] || ""}
                      onChange={(e) =>
                        setRankingInputs({ ...rankingInputs, [kw.id]: e.target.value })
                      }
                    />
                  </div>
                ))}
              </div>
              <Button
                onClick={handleBulkRankingSubmit}
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                저장
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 키워드</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalKeywords}개</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">순위권 내</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{rankedKeywords}개</div>
            <p className="text-xs text-muted-foreground">
              {totalKeywords > 0 ? ((rankedKeywords / totalKeywords) * 100).toFixed(0) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TOP 10</CardTitle>
            <Badge className="bg-yellow-500">TOP</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{top10Keywords}개</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">순위 상승</CardTitle>
            <ArrowUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{improvedKeywords}개</div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>키워드 목록</CardTitle>
              <CardDescription>매장별 키워드 순위 현황</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="키워드 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">전체 매장</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredKeywords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              등록된 키워드가 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredKeywords.map((keyword) => (
                <div
                  key={keyword.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0 cursor-pointer hover:bg-slate-50 p-2 rounded"
                  onClick={() => setSelectedKeyword(keyword)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-2 h-12 rounded ${
                        keyword.currentRank && keyword.currentRank <= 10
                          ? "bg-yellow-500"
                          : keyword.currentRank
                          ? "bg-blue-500"
                          : "bg-gray-300"
                      }`}
                    />
                    <div>
                      <p className="font-medium">{keyword.keyword}</p>
                      <p className="text-sm text-muted-foreground">
                        {keyword.store.name} ({keyword.store.mid})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        {getRankBadge(keyword.currentRank)}
                        {keyword.rankChange !== 0 && (
                          <span
                            className={`flex items-center text-sm ${
                              keyword.rankChange > 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {getRankChangeIcon(keyword.rankChange)}
                            {Math.abs(keyword.rankChange)}
                          </span>
                        )}
                      </div>
                      {keyword.lastChecked && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(keyword.lastChecked), "M/d HH:mm", { locale: ko })}
                        </p>
                      )}
                    </div>
                    {/* 미니 차트 */}
                    {keyword.recentRankings.length > 1 && (
                      <div className="w-24 h-10">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={keyword.recentRankings}>
                            <Line
                              type="monotone"
                              dataKey="ranking"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 키워드 상세 차트 다이얼로그 */}
      {selectedKeyword && (
        <Dialog open={!!selectedKeyword} onOpenChange={() => setSelectedKeyword(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedKeyword.store.name} - {selectedKeyword.keyword}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-2xl font-bold flex items-center gap-2">
                    {getRankBadge(selectedKeyword.currentRank)}
                    {selectedKeyword.rankChange !== 0 && (
                      <span
                        className={`flex items-center text-lg ${
                          selectedKeyword.rankChange > 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        ({selectedKeyword.rankChange > 0 ? "+" : ""}
                        {selectedKeyword.rankChange})
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    이전 순위: {selectedKeyword.previousRank || "-"}위
                  </p>
                </div>
              </div>
              {selectedKeyword.recentRankings.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={selectedKeyword.recentRankings}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => format(new Date(value), "M/d")}
                    />
                    <YAxis
                      reversed
                      domain={[1, "dataMax"]}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${value}위`}
                    />
                    <Tooltip
                      formatter={(value) =>
                        value ? [`${value}위`, "순위"] : ["순위권 밖", "순위"]
                      }
                      labelFormatter={(label) => format(new Date(String(label)), "yyyy년 M월 d일")}
                    />
                    <Line
                      type="monotone"
                      dataKey="ranking"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6" }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  순위 기록이 없습니다
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
