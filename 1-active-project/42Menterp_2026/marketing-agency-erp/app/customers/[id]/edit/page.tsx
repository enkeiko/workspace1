"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  businessNumber?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  tags?: string[];
}

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    businessNumber: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    tags: "",
  });

  useEffect(() => {
    if (params.id) {
      fetchCustomer();
    }
  }, [params.id]);

  const fetchCustomer = async () => {
    try {
      setDataLoading(true);
      setError(null);
      const response = await fetch(`/api/customers/${params.id}`);

      if (!response.ok) {
        throw new Error("고객 정보를 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        const customerData = result.data;
        // tags 파싱
        let tags = [];
        if (customerData.tags) {
          if (typeof customerData.tags === 'string') {
            try {
              tags = JSON.parse(customerData.tags);
            } catch {
              tags = [];
            }
          } else {
            tags = customerData.tags;
          }
        }

        setCustomer(customerData);
        setFormData({
          name: customerData.name || "",
          businessNumber: customerData.businessNumber || "",
          contactPerson: customerData.contactPerson || "",
          email: customerData.email || "",
          phone: customerData.phone || "",
          address: customerData.address || "",
          notes: customerData.notes || "",
          tags: tags.join(", "),
        });
      } else {
        throw new Error(result.error?.message || "고객 정보를 불러올 수 없습니다.");
      }
    } catch (error) {
      console.error("고객 정보 조회 실패:", error);
      const errorMessage =
        error instanceof Error ? error.message : "고객 정보를 불러올 수 없습니다.";
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
      const payload: any = {
        name: formData.name,
      };

      if (formData.businessNumber) payload.businessNumber = formData.businessNumber;
      if (formData.contactPerson) payload.contactPerson = formData.contactPerson;
      if (formData.email) payload.email = formData.email;
      if (formData.phone) payload.phone = formData.phone;
      if (formData.address) payload.address = formData.address;
      if (formData.notes) payload.notes = formData.notes;
      if (formData.tags) {
        payload.tags = formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
      }

      const response = await fetch(`/api/customers/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("수정 완료", {
          description: "고객이 수정되었습니다.",
        });
        router.push(`/customers/${params.id}`);
      } else {
        throw new Error(result.error?.message || "고객 수정에 실패했습니다.");
      }
    } catch (error) {
      console.error("고객 수정 실패:", error);
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

  if (error || !customer) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <ErrorState
            title="고객 정보를 불러올 수 없습니다"
            description={error || "알 수 없는 오류가 발생했습니다."}
            onRetry={fetchCustomer}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <Link href={`/customers/${params.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">고객 수정</h1>
            <p className="text-gray-500">고객 정보를 수정합니다.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>고객 정보</CardTitle>
            <CardDescription>고객의 기본 정보를 수정하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    고객명 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                    placeholder="회사명 또는 개인명"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="businessNumber">사업자번호</Label>
                  <Input
                    id="businessNumber"
                    value={formData.businessNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, businessNumber: e.target.value }))
                    }
                    placeholder="000-00-00000"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="contactPerson">담당자</Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))
                    }
                    placeholder="담당자명"
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

                <div className="grid gap-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="example@email.com"
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
                    placeholder="주소를 입력하세요"
                  />
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="tags">태그 (쉼표로 구분)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, tags: e.target.value }))
                    }
                    placeholder="예: VIP, 정기고객, 신규"
                  />
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="notes">메모</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="추가 정보나 메모를 입력하세요"
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Link href={`/customers/${params.id}`}>
                  <Button type="button" variant="outline">
                    취소
                  </Button>
                </Link>
                <Button type="submit" disabled={loading}>
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

