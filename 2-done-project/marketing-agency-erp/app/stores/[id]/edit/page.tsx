"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Customer {
  id: number;
  name: string;
}

interface Store {
  id: number;
  name: string;
  type?: string;
  address?: string;
  phone?: string;
  website?: string;
  description?: string;
  customerId: number;
}

export default function EditStorePage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [formData, setFormData] = useState({
    customerId: "",
    name: "",
    type: "",
    address: "",
    phone: "",
    website: "",
    description: "",
  });

  useEffect(() => {
    if (params.id) {
      fetchStore();
      fetchCustomers();
    }
  }, [params.id]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers?limit=100");
      const result = await response.json();
      if (result.success) {
        setCustomers(result.data.customers || []);
      }
    } catch (error) {
      console.error("고객 목록 조회 실패:", error);
    }
  };

  const fetchStore = async () => {
    try {
      setDataLoading(true);
      setError(null);
      const response = await fetch(`/api/stores/${params.id}`);

      if (!response.ok) {
        throw new Error("매장 정보를 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        const storeData = result.data;
        setStore(storeData);
        setFormData({
          customerId: storeData.customerId?.toString() || "",
          name: storeData.name || "",
          type: storeData.type || "",
          address: storeData.address || "",
          phone: storeData.phone || "",
          website: storeData.website || "",
          description: storeData.description || "",
        });
      } else {
        throw new Error(result.error?.message || "매장 정보를 불러올 수 없습니다.");
      }
    } catch (error) {
      console.error("매장 정보 조회 실패:", error);
      const errorMessage =
        error instanceof Error ? error.message : "매장 정보를 불러올 수 없습니다.";
      setError(errorMessage);
      toast.error("데이터 로딩 실패", {
        description: errorMessage,
      });
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.customerId) {
        toast.error("입력 오류", {
          description: "고객사를 선택해주세요.",
        });
        setLoading(false);
        return;
      }

      const payload: any = {
        customerId: Number(formData.customerId),
        name: formData.name,
      };

      if (formData.type) payload.type = formData.type;
      if (formData.address) payload.address = formData.address;
      if (formData.phone) payload.phone = formData.phone;
      if (formData.website) payload.website = formData.website;
      if (formData.description) payload.description = formData.description;

      const response = await fetch(`/api/stores/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("수정 완료", {
          description: "매장이 수정되었습니다.",
        });
        router.push(`/stores/${params.id}`);
      } else {
        throw new Error(result.error?.message || "매장 수정에 실패했습니다.");
      }
    } catch (error) {
      console.error("매장 수정 실패:", error);
      toast.error("수정 실패", {
        description: error instanceof Error ? error.message : "오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (error || !store) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <ErrorState
            title="매장 정보를 불러올 수 없습니다"
            description={error || "알 수 없는 오류가 발생했습니다."}
            onRetry={fetchStore}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <Link href={`/stores/${params.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">매장 수정</h1>
            <p className="text-gray-500">매장 정보를 수정합니다.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>매장 정보</CardTitle>
            <CardDescription>매장의 기본 정보를 수정하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="customerId">
                    고객사 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, customerId: value }))
                    }
                    required
                  >
                    <SelectTrigger id="customerId">
                      <SelectValue placeholder="고객사를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="name">
                    매장명 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                    placeholder="매장명"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="type">매장 유형</Label>
                  <Input
                    id="type"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, type: e.target.value }))
                    }
                    placeholder="예: 카페, 레스토랑, 쇼핑몰"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">전화번호</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="010-0000-0000"
                  />
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="address">주소</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, address: e.target.value }))
                    }
                    placeholder="매장 주소"
                  />
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="website">웹사이트</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, website: e.target.value }))
                    }
                    placeholder="https://example.com"
                  />
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="description">설명</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="매장에 대한 설명을 입력하세요"
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Link href={`/stores/${params.id}`}>
                  <Button type="button" variant="outline">
                    취소
                  </Button>
                </Link>
                <Button type="submit" disabled={loading || !formData.customerId}>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "저장 중..." : "저장"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

