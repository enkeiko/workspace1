"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Loader2,
  ExternalLink,
  Trash2,
  Plus,
  X,
  Tag,
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  ChevronLeft,
  ChevronRight,
  Store as StoreIcon,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";

interface StoreKeyword {
  id: string;
  keyword: string;
  isActive: boolean;
}

interface Customer {
  id: string;
  name: string;
  businessNo: string | null;
}

interface Store {
  id: string;
  name: string;
  mid: string;
  placeUrl: string | null;
  businessNo: string | null;
  representative: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string | null;
  category: string | null;
  status: string;
  memo: string | null;
  customerId: string | null;
  customer: Customer | null;
  createdAt: string;
  updatedAt: string;
  keywords?: StoreKeyword[];
}

interface KeywordRanking {
  id: string;
  storeKeywordId: string;
  ranking: number | null;
  checkDate: string;
  checkTime: string;
  previousRank: number | null;
  rankChange: number;
  storeKeyword: {
    id: string;
    keyword: string;
    store: { id: string; name: string; mid: string };
  };
}

interface WorkLog {
  id: string;
  storeId: string;
  purchaseOrderId: string | null;
  workType: string;
  workDate: string;
  description: string;
  qty: number | null;
  result: string | null;
  store: { id: string; name: string; mid: string };
  purchaseOrder: { id: string; purchaseOrderNo: string } | null;
  createdBy: { id: string; name: string };
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const workTypeMap: Record<string, { label: string; color: string }> = {
  SALES_ORDER_CREATED: { label: "수주 생성", color: "bg-blue-500" },
  SALES_ORDER_CONFIRMED: { label: "수주 확정", color: "bg-blue-600" },
  PURCHASE_ORDER_CREATED: { label: "발주 생성", color: "bg-green-500" },
  PURCHASE_ORDER_CONFIRMED: { label: "발주 확정", color: "bg-green-600" },
  PURCHASE_ORDER_COMPLETED: { label: "발주 완료", color: "bg-green-700" },
  MANUAL_WORK: { label: "수동 작업", color: "bg-purple-500" },
  KEYWORD_CHECK: { label: "키워드 확인", color: "bg-orange-500" },
};

export default function StoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "info";

  const [store, setStore] = useState<Store | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [addingKeyword, setAddingKeyword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    mid: "",
    placeUrl: "",
    businessNo: "",
    representative: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    address: "",
    category: "",
    status: "ACTIVE",
    memo: "",
    customerId: "",
  });

  // Keyword Rankings state
  const [rankings, setRankings] = useState<KeywordRanking[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [selectedKeywordId, setSelectedKeywordId] = useState<string>("all");
  const [rankingsDateRange, setRankingsDateRange] = useState({
    start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });

  // Work Logs state
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [workLogsLoading, setWorkLogsLoading] = useState(false);
  const [workLogsPagination, setWorkLogsPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [workTypeFilter, setWorkTypeFilter] = useState<string>("all");
  const [workLogsDateRange, setWorkLogsDateRange] = useState({
    start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });

  const handleTabChange = (value: string) => {
    router.push(`/stores/${id}?tab=${value}`);
  };

  useEffect(() => {
    fetchStore();
    fetchCustomers();
  }, [id]);

  useEffect(() => {
    if (currentTab === "keywords" && store?.keywords && store.keywords.length > 0) {
      fetchRankings();
    }
  }, [currentTab, store?.keywords, selectedKeywordId, rankingsDateRange]);

  useEffect(() => {
    if (currentTab === "work-logs") {
      fetchWorkLogs();
    }
  }, [currentTab, workLogsPagination.page, workTypeFilter, workLogsDateRange]);

  const fetchRankings = useCallback(async () => {
    if (!store?.keywords || store.keywords.length === 0) return;

    setRankingsLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: rankingsDateRange.start,
        endDate: rankingsDateRange.end,
        limit: "100",
      });
      if (selectedKeywordId !== "all") {
        params.append("storeKeywordId", selectedKeywordId);
      }

      const res = await fetch(`/api/keywords/rankings?${params}`);
      const data = await res.json();

      if (res.ok) {
        // Filter rankings for this store's keywords
        const storeKeywordIds = store.keywords.map((k) => k.id);
        const filteredRankings = (data.rankings || []).filter(
          (r: KeywordRanking) => storeKeywordIds.includes(r.storeKeywordId)
        );
        setRankings(filteredRankings);
      }
    } catch (error) {
      console.error("Failed to fetch rankings:", error);
    } finally {
      setRankingsLoading(false);
    }
  }, [store?.keywords, selectedKeywordId, rankingsDateRange]);

  const fetchWorkLogs = useCallback(async () => {
    setWorkLogsLoading(true);
    try {
      const params = new URLSearchParams({
        storeId: id,
        page: workLogsPagination.page.toString(),
        limit: workLogsPagination.limit.toString(),
        startDate: workLogsDateRange.start,
        endDate: workLogsDateRange.end,
      });
      if (workTypeFilter !== "all") {
        params.append("workType", workTypeFilter);
      }

      const res = await fetch(`/api/work-logs?${params}`);
      const data = await res.json();

      if (res.ok) {
        setWorkLogs(data.workLogs || []);
        setWorkLogsPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      }
    } catch (error) {
      console.error("Failed to fetch work logs:", error);
    } finally {
      setWorkLogsLoading(false);
    }
  }, [id, workLogsPagination.page, workLogsPagination.limit, workTypeFilter, workLogsDateRange]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers?limit=100&status=ACTIVE");
      const data = await res.json();
      if (res.ok) {
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const fetchStore = async () => {
    try {
      const res = await fetch(`/api/stores/${id}`);
      const data = await res.json();

      if (res.ok) {
        setStore(data);
        setFormData({
          name: data.name || "",
          mid: data.mid || "",
          placeUrl: data.placeUrl || "",
          businessNo: data.businessNo || "",
          representative: data.representative || "",
          contactName: data.contactName || "",
          contactPhone: data.contactPhone || "",
          contactEmail: data.contactEmail || "",
          address: data.address || "",
          category: data.category || "",
          status: data.status || "ACTIVE",
          memo: data.memo || "",
          customerId: data.customerId || "",
        });
      } else {
        toast.error(data.error || "매장 정보를 불러오는데 실패했습니다");
        router.push("/stores");
      }
    } catch (error) {
      console.error("Failed to fetch store:", error);
      toast.error("매장 정보를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/stores/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          placeUrl: formData.placeUrl || null,
          businessNo: formData.businessNo || null,
          representative: formData.representative || null,
          contactName: formData.contactName || null,
          contactPhone: formData.contactPhone || null,
          contactEmail: formData.contactEmail || null,
          address: formData.address || null,
          category: formData.category || null,
          memo: formData.memo || null,
          customerId: formData.customerId || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("매장 정보가 수정되었습니다");
        setStore(data);
        setEditMode(false);
      } else {
        toast.error(data.error || "매장 수정에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to update store:", error);
      toast.error("매장 수정 중 오류가 발생했습니다");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/stores/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("매장이 삭제되었습니다");
        router.push("/stores");
      } else {
        const data = await res.json();
        toast.error(data.error || "매장 삭제에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to delete store:", error);
      toast.error("매장 삭제 중 오류가 발생했습니다");
    } finally {
      setDeleting(false);
    }
  };

  const cancelEdit = () => {
    if (store) {
      setFormData({
        name: store.name || "",
        mid: store.mid || "",
        placeUrl: store.placeUrl || "",
        businessNo: store.businessNo || "",
        representative: store.representative || "",
        contactName: store.contactName || "",
        contactPhone: store.contactPhone || "",
        contactEmail: store.contactEmail || "",
        address: store.address || "",
        category: store.category || "",
        status: store.status || "ACTIVE",
        memo: store.memo || "",
        customerId: store.customerId || "",
      });
    }
    setEditMode(false);
  };

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) {
      toast.error("키워드를 입력하세요");
      return;
    }

    setAddingKeyword(true);
    try {
      const res = await fetch(`/api/stores/${id}/keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: newKeyword.trim() }),
      });

      if (res.ok) {
        toast.success("키워드가 추가되었습니다");
        setNewKeyword("");
        fetchStore();
      } else {
        const data = await res.json();
        toast.error(data.error || "키워드 추가에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to add keyword:", error);
      toast.error("키워드 추가 중 오류가 발생했습니다");
    } finally {
      setAddingKeyword(false);
    }
  };

  const handleDeleteKeyword = async (keywordId: string) => {
    try {
      const res = await fetch(`/api/stores/${id}/keywords?keywordId=${keywordId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("키워드가 삭제되었습니다");
        fetchStore();
      } else {
        const data = await res.json();
        toast.error(data.error || "키워드 삭제에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to delete keyword:", error);
      toast.error("키워드 삭제 중 오류가 발생했습니다");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!store) {
    return null;
  }

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    ACTIVE: { label: "활성", variant: "default" },
    PAUSED: { label: "일시정지", variant: "secondary" },
    TERMINATED: { label: "종료", variant: "destructive" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/stores">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">{store.name}</h2>
              <Badge variant={statusMap[store.status]?.variant}>
                {statusMap[store.status]?.label}
              </Badge>
            </div>
            <p className="text-muted-foreground font-mono">{store.mid}</p>
          </div>
        </div>
        {currentTab === "info" && (
          <div className="flex gap-2">
            {editMode ? (
              <>
                <Button variant="outline" onClick={cancelEdit}>
                  취소
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    "저장"
                  )}
                </Button>
              </>
            ) : (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      삭제
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>매장을 삭제하시겠습니까?</AlertDialogTitle>
                      <AlertDialogDescription>
                        이 작업은 되돌릴 수 없습니다. 매장 정보가 영구적으로 삭제됩니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={deleting}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {deleting ? "삭제 중..." : "삭제"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button onClick={() => setEditMode(true)}>수정</Button>
              </>
            )}
          </div>
        )}
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <StoreIcon className="h-4 w-4" />
            기본 정보
          </TabsTrigger>
          <TabsTrigger value="keywords" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            키워드 순위
          </TabsTrigger>
          <TabsTrigger value="work-logs" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            작업 로그
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">매장명</Label>
              {editMode ? (
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              ) : (
                <p className="text-sm py-2">{store.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mid">MID</Label>
              {editMode ? (
                <Input
                  id="mid"
                  name="mid"
                  value={formData.mid}
                  onChange={handleChange}
                  required
                />
              ) : (
                <p className="text-sm py-2 font-mono">{store.mid}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="placeUrl">Place URL</Label>
              {editMode ? (
                <Input
                  id="placeUrl"
                  name="placeUrl"
                  type="url"
                  value={formData.placeUrl}
                  onChange={handleChange}
                />
              ) : store.placeUrl ? (
                <a
                  href={store.placeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm py-2 text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  링크 열기 <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="text-sm py-2 text-muted-foreground">-</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              {editMode ? (
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                />
              ) : (
                <p className="text-sm py-2">{store.address || "-"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">업종</Label>
              {editMode ? (
                <Input
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                />
              ) : (
                <p className="text-sm py-2">{store.category || "-"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">상태</Label>
              {editMode ? (
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">활성</SelectItem>
                    <SelectItem value="PAUSED">일시정지</SelectItem>
                    <SelectItem value="TERMINATED">종료</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={statusMap[store.status]?.variant}>
                  {statusMap[store.status]?.label}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerId" className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                소속 고객사
              </Label>
              {editMode ? (
                <Select
                  value={formData.customerId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, customerId: value === "none" ? "" : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="고객사 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">없음</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                        {customer.businessNo && ` (${customer.businessNo})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : store.customer ? (
                <Link
                  href={`/customers/${store.customer.id}`}
                  className="text-sm py-2 text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {store.customer.name}
                  {store.customer.businessNo && ` (${store.customer.businessNo})`}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : (
                <p className="text-sm py-2 text-muted-foreground">-</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>사업자 / 담당자 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessNo">사업자번호</Label>
              {editMode ? (
                <Input
                  id="businessNo"
                  name="businessNo"
                  value={formData.businessNo}
                  onChange={handleChange}
                />
              ) : (
                <p className="text-sm py-2">{store.businessNo || "-"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="representative">대표자</Label>
              {editMode ? (
                <Input
                  id="representative"
                  name="representative"
                  value={formData.representative}
                  onChange={handleChange}
                />
              ) : (
                <p className="text-sm py-2">{store.representative || "-"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">담당자명</Label>
              {editMode ? (
                <Input
                  id="contactName"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                />
              ) : (
                <p className="text-sm py-2">{store.contactName || "-"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">연락처</Label>
              {editMode ? (
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                />
              ) : (
                <p className="text-sm py-2">{store.contactPhone || "-"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">이메일</Label>
              {editMode ? (
                <Input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleChange}
                />
              ) : (
                <p className="text-sm py-2">{store.contactEmail || "-"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="memo">메모</Label>
              {editMode ? (
                <Textarea
                  id="memo"
                  name="memo"
                  value={formData.memo}
                  onChange={handleChange}
                  rows={3}
                />
              ) : (
                <p className="text-sm py-2 whitespace-pre-wrap">
                  {store.memo || "-"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            키워드 관리
          </CardTitle>
          <CardDescription>
            이 매장에서 사용할 발주 키워드를 관리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="새 키워드 입력"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddKeyword();
                }
              }}
              disabled={addingKeyword}
            />
            <Button onClick={handleAddKeyword} disabled={addingKeyword}>
              {addingKeyword ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {store.keywords && store.keywords.length > 0 ? (
              store.keywords.map((kw) => (
                <Badge
                  key={kw.id}
                  variant="secondary"
                  className="text-sm py-1 px-3 flex items-center gap-1"
                >
                  {kw.keyword}
                  <button
                    onClick={() => handleDeleteKeyword(kw.id)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                등록된 키워드가 없습니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="keywords" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>키워드 순위 현황</CardTitle>
                  <CardDescription>등록된 키워드의 순위 변동을 확인합니다.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedKeywordId}
                    onValueChange={setSelectedKeywordId}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="키워드 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 키워드</SelectItem>
                      {store.keywords?.map((kw) => (
                        <SelectItem key={kw.id} value={kw.id}>
                          {kw.keyword}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    className="w-[140px]"
                    value={rankingsDateRange.start}
                    onChange={(e) =>
                      setRankingsDateRange((prev) => ({ ...prev, start: e.target.value }))
                    }
                  />
                  <span className="text-muted-foreground">~</span>
                  <Input
                    type="date"
                    className="w-[140px]"
                    value={rankingsDateRange.end}
                    onChange={(e) =>
                      setRankingsDateRange((prev) => ({ ...prev, end: e.target.value }))
                    }
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!store.keywords || store.keywords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  등록된 키워드가 없습니다. 기본 정보 탭에서 키워드를 먼저 등록해주세요.
                </div>
              ) : rankingsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : rankings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  해당 기간의 순위 기록이 없습니다.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>키워드</TableHead>
                      <TableHead>확인일</TableHead>
                      <TableHead>확인시간</TableHead>
                      <TableHead className="text-center">현재 순위</TableHead>
                      <TableHead className="text-center">이전 순위</TableHead>
                      <TableHead className="text-center">변동</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankings.map((ranking) => (
                      <TableRow key={ranking.id}>
                        <TableCell className="font-medium">
                          {ranking.storeKeyword.keyword}
                        </TableCell>
                        <TableCell>
                          {format(new Date(ranking.checkDate), "yyyy-MM-dd")}
                        </TableCell>
                        <TableCell>{ranking.checkTime}</TableCell>
                        <TableCell className="text-center font-mono">
                          {ranking.ranking ?? "-"}
                        </TableCell>
                        <TableCell className="text-center font-mono text-muted-foreground">
                          {ranking.previousRank ?? "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {ranking.rankChange !== 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              {ranking.rankChange > 0 ? (
                                <>
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                  <span className="text-green-600">+{ranking.rankChange}</span>
                                </>
                              ) : (
                                <>
                                  <TrendingDown className="h-4 w-4 text-red-600" />
                                  <span className="text-red-600">{ranking.rankChange}</span>
                                </>
                              )}
                            </div>
                          ) : (
                            <Minus className="h-4 w-4 text-muted-foreground mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work-logs" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>작업 로그</CardTitle>
                  <CardDescription>이 매장에 대한 모든 작업 기록을 확인합니다.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={workTypeFilter}
                    onValueChange={(value) => {
                      setWorkTypeFilter(value);
                      setWorkLogsPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="작업 유형" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="SALES_ORDER_CREATED">수주 생성</SelectItem>
                      <SelectItem value="SALES_ORDER_CONFIRMED">수주 확정</SelectItem>
                      <SelectItem value="PURCHASE_ORDER_CREATED">발주 생성</SelectItem>
                      <SelectItem value="PURCHASE_ORDER_CONFIRMED">발주 확정</SelectItem>
                      <SelectItem value="PURCHASE_ORDER_COMPLETED">발주 완료</SelectItem>
                      <SelectItem value="MANUAL_WORK">수동 작업</SelectItem>
                      <SelectItem value="KEYWORD_CHECK">키워드 확인</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    className="w-[140px]"
                    value={workLogsDateRange.start}
                    onChange={(e) =>
                      setWorkLogsDateRange((prev) => ({ ...prev, start: e.target.value }))
                    }
                  />
                  <span className="text-muted-foreground">~</span>
                  <Input
                    type="date"
                    className="w-[140px]"
                    value={workLogsDateRange.end}
                    onChange={(e) =>
                      setWorkLogsDateRange((prev) => ({ ...prev, end: e.target.value }))
                    }
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {workLogsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : workLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  해당 기간의 작업 기록이 없습니다.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>작업일</TableHead>
                      <TableHead>작업 유형</TableHead>
                      <TableHead>내용</TableHead>
                      <TableHead className="text-center">수량</TableHead>
                      <TableHead>결과</TableHead>
                      <TableHead>발주번호</TableHead>
                      <TableHead>작성자</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {format(new Date(log.workDate), "yyyy-MM-dd")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${workTypeMap[log.workType]?.color || "bg-gray-500"} text-white`}
                          >
                            {workTypeMap[log.workType]?.label || log.workType}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {log.description}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {log.qty ?? "-"}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {log.result || "-"}
                        </TableCell>
                        <TableCell>
                          {log.purchaseOrder ? (
                            <Link
                              href={`/purchase-orders/${log.purchaseOrder.id}`}
                              className="text-blue-600 hover:underline font-mono text-sm"
                            >
                              {log.purchaseOrder.purchaseOrderNo}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.createdBy.name}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {workLogsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    총 {workLogsPagination.total}건
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={workLogsPagination.page === 1}
                      onClick={() =>
                        setWorkLogsPagination((prev) => ({
                          ...prev,
                          page: prev.page - 1,
                        }))
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      {workLogsPagination.page} / {workLogsPagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={workLogsPagination.page === workLogsPagination.totalPages}
                      onClick={() =>
                        setWorkLogsPagination((prev) => ({
                          ...prev,
                          page: prev.page + 1,
                        }))
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
