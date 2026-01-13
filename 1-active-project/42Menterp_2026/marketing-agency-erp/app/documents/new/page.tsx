"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, Save, Upload } from "lucide-react";
import Link from "next/link";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";
import { FileUpload } from "@/components/documents/file-upload";

interface Customer {
  id: number;
  name: string;
}

interface Store {
  id: number;
  name: string;
  customerId: number;
}

interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
}

export default function NewDocumentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    customerId: "",
    storeId: "",
    orderId: "",
    documentType: "",
    description: "",
    tags: "",
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (formData.customerId) {
      fetchStores(Number(formData.customerId));
      fetchOrders(Number(formData.customerId));
    } else {
      setStores([]);
      setOrders([]);
      setFormData((prev) => ({ ...prev, storeId: "", orderId: "" }));
    }
  }, [formData.customerId]);

  const fetchCustomers = async () => {
    try {
      setCustomersLoading(true);
      setError(null);
      const response = await fetch("/api/customers?limit=100");

      if (!response.ok) {
        throw new Error("고객 목록을 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        setCustomers(result.data.customers || []);
      } else {
        throw new Error(result.error?.message || "고객 목록을 불러오는데 실패했습니다.");
      }
    } catch (error) {
      console.error("고객 목록 조회 실패:", error);
      setError(error instanceof Error ? error.message : "오류가 발생했습니다.");
      toast.error("데이터 로딩 실패", {
        description: error instanceof Error ? error.message : "오류가 발생했습니다.",
      });
    } finally {
      setCustomersLoading(false);
    }
  };

  const fetchStores = async (customerId: number) => {
    try {
      const response = await fetch(`/api/stores?customerId=${customerId}&limit=100`);
      const result = await response.json();

      if (result.success) {
        setStores(result.data.stores || []);
      }
    } catch (error) {
      console.error("매장 목록 조회 실패:", error);
    }
  };

  const fetchOrders = async (customerId: number) => {
    try {
      const response = await fetch(`/api/orders?customerId=${customerId}&limit=100`);
      const result = await response.json();

      if (result.success) {
        setOrders(result.data.orders || []);
      }
    } catch (error) {
      console.error("주문 목록 조회 실패:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!selectedFile) {
        toast.error("입력 오류", {
          description: "파일을 선택해주세요.",
        });
        setLoading(false);
        return;
      }

      if (!formData.documentType) {
        toast.error("입력 오류", {
          description: "문서 유형을 선택해주세요.",
        });
        setLoading(false);
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append("file", selectedFile);
      formDataToSend.append(
        "metadata",
        JSON.stringify({
          customerId: formData.customerId ? Number(formData.customerId) : undefined,
          storeId: formData.storeId ? Number(formData.storeId) : undefined,
          orderId: formData.orderId ? Number(formData.orderId) : undefined,
          documentType: formData.documentType,
          description: formData.description || undefined,
          tags: formData.tags
            ? formData.tags.split(",").map((tag) => tag.trim()).filter((tag) => tag.length > 0)
            : undefined,
        })
      );

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formDataToSend,
      });

      const result = await response.json();

      if (result.success) {
        toast.success("업로드 완료", {
          description: "문서가 업로드되었습니다.",
        });
        router.push(`/documents/${result.data.id}`);
      } else {
        throw new Error(result.error?.message || "문서 업로드에 실패했습니다.");
      }
    } catch (error) {
      console.error("문서 업로드 실패:", error);
      toast.error("업로드 실패", {
        description: error instanceof Error ? error.message : "오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (customersLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">로딩 중...</div>
        </div>
      </MainLayout>
    );
  }

  if (error && customers.length === 0) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <ErrorState
            title="데이터 로딩 실패"
            description={error}
            onRetry={fetchCustomers}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/documents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">문서 업로드</h1>
            <p className="text-gray-500">새로운 문서를 업로드합니다.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>문서 정보</CardTitle>
            <CardDescription>문서의 기본 정보를 입력하고 파일을 업로드하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <FileUpload
                onFileSelect={setSelectedFile}
                onFileRemove={() => setSelectedFile(null)}
                selectedFile={selectedFile}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="documentType">
                    문서 유형 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.documentType}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, documentType: value }))
                    }
                    required
                  >
                    <SelectTrigger id="documentType">
                      <SelectValue placeholder="문서 유형을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contract">계약서</SelectItem>
                      <SelectItem value="invoice">세금계산서</SelectItem>
                      <SelectItem value="quotation">견적서</SelectItem>
                      <SelectItem value="report">보고서</SelectItem>
                      <SelectItem value="other">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="customerId">고객사</Label>
                  <Select
                    value={formData.customerId || "none"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, customerId: value === "none" ? "" : value }))
                    }
                  >
                    <SelectTrigger id="customerId">
                      <SelectValue placeholder="고객사를 선택하세요 (선택사항)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택 안함</SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="storeId">매장</Label>
                  <Select
                    value={formData.storeId || "none"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, storeId: value === "none" ? "" : value }))
                    }
                    disabled={!formData.customerId}
                  >
                    <SelectTrigger id="storeId">
                      <SelectValue placeholder="매장을 선택하세요 (선택사항)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택 안함</SelectItem>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id.toString()}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="orderId">관련 주문</Label>
                  <Select
                    value={formData.orderId || "none"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, orderId: value === "none" ? "" : value }))
                    }
                    disabled={!formData.customerId}
                  >
                    <SelectTrigger id="orderId">
                      <SelectValue placeholder="주문을 선택하세요 (선택사항)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택 안함</SelectItem>
                      {orders.map((order) => (
                        <SelectItem key={order.id} value={order.id.toString()}>
                          {order.orderNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="문서에 대한 설명을 입력하세요"
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tags">태그 (쉼표로 구분)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, tags: e.target.value }))
                  }
                  placeholder="예: 중요, 계약서, 2024"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Link href="/documents">
                  <Button type="button" variant="outline">
                    취소
                  </Button>
                </Link>
                <Button type="submit" disabled={loading || !selectedFile}>
                  <Upload className="mr-2 h-4 w-4" />
                  {loading ? "업로드 중..." : "업로드"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

