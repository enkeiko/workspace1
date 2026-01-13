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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, Trash2, ExternalLink, Store } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CustomerTaxStatus } from "../components/customer-tax-status";
import { CustomerSyncOptions, SyncOptions } from "../components/customer-sync-options";

interface CustomerStore {
  id: string;
  name: string;
  mid: string;
  placeUrl: string | null;
  status: string;
}

interface Customer {
  id: string;
  name: string;
  businessNo: string | null;
  representative: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  monthlyBudget: number | null;
  status: string;
  memo: string | null;
  stores: CustomerStore[];
  _count?: {
    quotations: number;
    salesOrders: number;
    statements: number;
  };
  createdAt: string;
  updatedAt: string;
}

const defaultSyncOptions: SyncOptions = {
  syncBusinessNo: false,
  syncRepresentative: false,
  syncAddress: false,
  syncContactPhone: false,
  applyToAllStores: true,
  targetStoreIds: [],
};

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [syncOptions, setSyncOptions] = useState<SyncOptions>(defaultSyncOptions);
  const [formData, setFormData] = useState({
    name: "",
    businessNo: "",
    representative: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    address: "",
    contractStart: "",
    contractEnd: "",
    monthlyBudget: "",
    status: "ACTIVE",
    memo: "",
  });

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      const res = await fetch(`/api/customers/${id}`);
      const data = await res.json();

      if (res.ok) {
        setCustomer(data);
        setFormData({
          name: data.name || "",
          businessNo: data.businessNo || "",
          representative: data.representative || "",
          contactName: data.contactName || "",
          contactPhone: data.contactPhone || "",
          contactEmail: data.contactEmail || "",
          address: data.address || "",
          contractStart: data.contractStart ? data.contractStart.split("T")[0] : "",
          contractEnd: data.contractEnd ? data.contractEnd.split("T")[0] : "",
          monthlyBudget: data.monthlyBudget?.toString() || "",
          status: data.status || "ACTIVE",
          memo: data.memo || "",
        });
      } else {
        toast.error(data.error || "고객 정보를 불러오는데 실패했습니다");
        router.push("/customers");
      }
    } catch (error) {
      console.error("Failed to fetch customer:", error);
      toast.error("고객 정보를 불러오는데 실패했습니다");
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
      const shouldSync =
        syncOptions.syncBusinessNo ||
        syncOptions.syncRepresentative ||
        syncOptions.syncAddress ||
        syncOptions.syncContactPhone;

      const payload = {
        ...formData,
        businessNo: formData.businessNo || null,
        representative: formData.representative || null,
        contactName: formData.contactName || null,
        contactPhone: formData.contactPhone || null,
        contactEmail: formData.contactEmail || null,
        address: formData.address || null,
        contractStart: formData.contractStart || null,
        contractEnd: formData.contractEnd || null,
        monthlyBudget: formData.monthlyBudget ? parseInt(formData.monthlyBudget) : null,
        memo: formData.memo || null,
        ...(shouldSync
          ? {
              syncOptions: {
                syncBusinessNo: syncOptions.syncBusinessNo,
                syncRepresentative: syncOptions.syncRepresentative,
                syncAddress: syncOptions.syncAddress,
                syncContactPhone: syncOptions.syncContactPhone,
                targetStoreIds: syncOptions.applyToAllStores
                  ? null
                  : syncOptions.targetStoreIds,
              },
            }
          : {}),
      };

      const res = await fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("고객 정보가 수정되었습니다");
        fetchCustomer();
        setEditMode(false);
        setSyncOptions(defaultSyncOptions);
      } else {
        toast.error(data.error || "고객 수정에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to update customer:", error);
      toast.error("고객 수정 중 오류가 발생했습니다");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("고객이 삭제되었습니다");
        router.push("/customers");
      } else {
        const data = await res.json();
        toast.error(data.error || "고객 삭제에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to delete customer:", error);
      toast.error("고객 삭제 중 오류가 발생했습니다");
    } finally {
      setDeleting(false);
    }
  };

  const cancelEdit = () => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        businessNo: customer.businessNo || "",
        representative: customer.representative || "",
        contactName: customer.contactName || "",
        contactPhone: customer.contactPhone || "",
        contactEmail: customer.contactEmail || "",
        address: customer.address || "",
        contractStart: customer.contractStart ? customer.contractStart.split("T")[0] : "",
        contractEnd: customer.contractEnd ? customer.contractEnd.split("T")[0] : "",
        monthlyBudget: customer.monthlyBudget?.toString() || "",
        status: customer.status || "ACTIVE",
        memo: customer.memo || "",
      });
    }
    setEditMode(false);
    setSyncOptions(defaultSyncOptions);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    ACTIVE: { label: "활성", variant: "default" },
    PAUSED: { label: "일시정지", variant: "secondary" },
    TERMINATED: { label: "종료", variant: "destructive" },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/customers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">{customer.name}</h2>
              <Badge variant={statusMap[customer.status]?.variant}>
                {statusMap[customer.status]?.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {customer.businessNo || "사업자번호 미등록"} · 매장 {customer.stores.length}개
            </p>
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
                    <AlertDialogTitle>고객을 삭제하시겠습니까?</AlertDialogTitle>
                    <AlertDialogDescription>
                      이 작업은 되돌릴 수 없습니다. 연결된 매장이 있으면 삭제할 수 없습니다.
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
              <Button
                onClick={() => {
                  setEditMode(true);
                  setSyncOptions(defaultSyncOptions);
                }}
              >
                수정
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="basic">기본정보</TabsTrigger>
          <TabsTrigger value="stores">매장정보 ({customer.stores.length})</TabsTrigger>
          <TabsTrigger value="orders">
            주문이력 ({customer._count?.salesOrders ?? 0})
          </TabsTrigger>
          <TabsTrigger value="settlements">
            정산이력 ({customer._count?.statements ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>기본 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">고객명</Label>
                  {editMode ? (
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  ) : (
                    <p className="text-sm py-2">{customer.name}</p>
                  )}
                </div>

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
                    <p className="text-sm py-2">{customer.businessNo || "-"}</p>
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
                    <p className="text-sm py-2">{customer.representative || "-"}</p>
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
                    <p className="text-sm py-2">{customer.address || "-"}</p>
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
                    <Badge variant={statusMap[customer.status]?.variant}>
                      {statusMap[customer.status]?.label}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>담당자 / 계약 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    <p className="text-sm py-2">{customer.contactName || "-"}</p>
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
                    <p className="text-sm py-2">{customer.contactPhone || "-"}</p>
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
                    <p className="text-sm py-2">{customer.contactEmail || "-"}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contractStart">계약 시작일</Label>
                    {editMode ? (
                      <Input
                        id="contractStart"
                        name="contractStart"
                        type="date"
                        value={formData.contractStart}
                        onChange={handleChange}
                      />
                    ) : (
                      <p className="text-sm py-2">
                        {customer.contractStart
                          ? format(new Date(customer.contractStart), "yyyy-MM-dd")
                          : "-"}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contractEnd">계약 종료일</Label>
                    {editMode ? (
                      <Input
                        id="contractEnd"
                        name="contractEnd"
                        type="date"
                        value={formData.contractEnd}
                        onChange={handleChange}
                      />
                    ) : (
                      <p className="text-sm py-2">
                        {customer.contractEnd
                          ? format(new Date(customer.contractEnd), "yyyy-MM-dd")
                          : "-"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyBudget">월 예산</Label>
                  {editMode ? (
                    <Input
                      id="monthlyBudget"
                      name="monthlyBudget"
                      type="number"
                      value={formData.monthlyBudget}
                      onChange={handleChange}
                    />
                  ) : (
                    <p className="text-sm py-2">
                      {customer.monthlyBudget
                        ? `${customer.monthlyBudget.toLocaleString()}원`
                        : "-"}
                    </p>
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
                      {customer.memo || "-"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>세금계산서 준비 상태</CardTitle>
              </CardHeader>
              <CardContent>
                <CustomerTaxStatus
                  businessNo={customer.businessNo}
                  representative={customer.representative}
                  address={customer.address}
                  contactEmail={customer.contactEmail}
                />
              </CardContent>
            </Card>
          </div>

          {editMode && customer.stores.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>고객-매장 정보 동기화</CardTitle>
              </CardHeader>
              <CardContent>
                <CustomerSyncOptions
                  stores={customer.stores.map((store) => ({
                    id: store.id,
                    name: store.name,
                  }))}
                  value={syncOptions}
                  onChange={setSyncOptions}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stores">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  연결된 매장 ({customer.stores.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {customer.stores.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  연결된 매장이 없습니다.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>매장명</TableHead>
                      <TableHead>MID</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>링크</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.stores.map((store) => (
                      <TableRow key={store.id}>
                        <TableCell>
                          <Link
                            href={`/stores/${store.id}`}
                            className="font-medium hover:underline"
                          >
                            {store.name}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{store.mid}</TableCell>
                        <TableCell>
                          <Badge variant={statusMap[store.status]?.variant}>
                            {statusMap[store.status]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {store.placeUrl && (
                            <a
                              href={store.placeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
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

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>주문 이력 요약</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>견적: {customer._count?.quotations ?? 0}건</p>
              <p>수주: {customer._count?.salesOrders ?? 0}건</p>
              <p>상세 내역은 주문 관리 메뉴에서 확인할 수 있습니다.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settlements">
          <Card>
            <CardHeader>
              <CardTitle>정산 이력 요약</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>정산/명세: {customer._count?.statements ?? 0}건</p>
              <p>상세 내역은 정산 관리 메뉴에서 확인할 수 있습니다.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
