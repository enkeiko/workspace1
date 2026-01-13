"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, Loader2, ExternalLink, Trash2, Plus, X, Tag, Building2 } from "lucide-react";
import { toast } from "sonner";

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

export default function StoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
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

  useEffect(() => {
    fetchStore();
    fetchCustomers();
  }, [id]);

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
      </div>

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
    </div>
  );
}
