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
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";

interface Customer {
  id: number;
  name: string;
}

interface Store {
  id: number;
  name: string;
  customerId: number;
}

export default function NewConsultationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Array<{ id: number; orderNumber: string }>>([]);
  const [quotations, setQuotations] = useState<Array<{ id: number; quotationNumber: string }>>([]);
  const [formData, setFormData] = useState({
    customerId: "",
    storeId: "",
    consultationChannel: "",
    consultationDate: new Date().toISOString().slice(0, 16),
    consultationTopic: "",
    consultationContent: "",
    actionItems: "",
    consultationResult: "",
    relatedOrderId: "",
    relatedQuotationId: "",
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (formData.customerId) {
      fetchStores(Number(formData.customerId));
      fetchOrders(Number(formData.customerId));
      fetchQuotations(Number(formData.customerId));
    } else {
      setStores([]);
      setOrders([]);
      setQuotations([]);
      setFormData((prev) => ({ ...prev, storeId: "", relatedOrderId: "", relatedQuotationId: "" }));
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

  const fetchQuotations = async (customerId: number) => {
    try {
      const response = await fetch(`/api/quotations?customerId=${customerId}&limit=100`);
      const result = await response.json();

      if (result.success) {
        setQuotations(result.data.quotations || []);
      }
    } catch (error) {
      console.error("견적서 목록 조회 실패:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.customerId || !formData.consultationChannel || !formData.consultationDate) {
        toast.error("입력 오류", {
          description: "고객, 상담 채널, 상담일시는 필수입니다.",
        });
        setLoading(false);
        return;
      }

      const payload: any = {
        customerId: Number(formData.customerId),
        consultationChannel: formData.consultationChannel,
        consultationDate: new Date(formData.consultationDate).toISOString(),
      };

      if (formData.storeId) {
        payload.storeId = Number(formData.storeId);
      }

      if (formData.consultationTopic) {
        payload.consultationTopic = formData.consultationTopic;
      }

      if (formData.consultationContent) {
        payload.consultationContent = formData.consultationContent;
      }

      if (formData.actionItems) {
        payload.actionItems = formData.actionItems;
      }

      if (formData.consultationResult) {
        payload.consultationResult = formData.consultationResult;
      }

      if (formData.relatedOrderId) {
        payload.relatedOrderId = Number(formData.relatedOrderId);
      }

      if (formData.relatedQuotationId) {
        payload.relatedQuotationId = Number(formData.relatedQuotationId);
      }

      const response = await fetch("/api/consultations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("생성 완료", {
          description: "상담이 생성되었습니다.",
        });
        router.push(`/consultations/${result.data.id}`);
      } else {
        toast.error("생성 실패", {
          description: result.error?.message || "상담 생성에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("상담 생성 실패:", error);
      toast.error("생성 실패", {
        description: "상담 생성 중 오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (customersLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <ErrorState title="로딩 중..." description="고객 목록을 불러오는 중입니다." />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <ErrorState title="데이터 로딩 실패" description={error} onRetry={fetchCustomers} />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/consultations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">상담 추가</h1>
            <p className="text-gray-500">새로운 상담을 등록합니다.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>기본 정보</CardTitle>
                <CardDescription>상담 기본 정보를 입력하세요.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
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
                      <SelectValue placeholder="고객사 선택" />
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

                <div className="space-y-2">
                  <Label htmlFor="storeId">매장</Label>
                  <Select
                    value={formData.storeId || "none"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, storeId: value === "none" ? "" : value }))
                    }
                    disabled={!formData.customerId}
                  >
                    <SelectTrigger id="storeId">
                      <SelectValue placeholder="매장 선택 (선택사항)" />
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

                <div className="space-y-2">
                  <Label htmlFor="consultationChannel">
                    상담 채널 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.consultationChannel}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, consultationChannel: value }))
                    }
                    required
                  >
                    <SelectTrigger id="consultationChannel">
                      <SelectValue placeholder="채널 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kakao">카카오톡</SelectItem>
                      <SelectItem value="phone">전화</SelectItem>
                      <SelectItem value="email">이메일</SelectItem>
                      <SelectItem value="face_to_face">대면</SelectItem>
                      <SelectItem value="other">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consultationDate">
                    상담일시 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="consultationDate"
                    type="datetime-local"
                    value={formData.consultationDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, consultationDate: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consultationTopic">상담 주제</Label>
                  <Input
                    id="consultationTopic"
                    value={formData.consultationTopic}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, consultationTopic: e.target.value }))
                    }
                    placeholder="상담 주제를 입력하세요"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consultationResult">상담 결과</Label>
                  <Select
                    value={formData.consultationResult || "none"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, consultationResult: value === "none" ? "" : value }))
                    }
                  >
                    <SelectTrigger id="consultationResult">
                      <SelectValue placeholder="결과 선택 (선택사항)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택 안함</SelectItem>
                      <SelectItem value="success">성공</SelectItem>
                      <SelectItem value="pending">진행중</SelectItem>
                      <SelectItem value="cancelled">취소</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>상세 정보</CardTitle>
                <CardDescription>상담 내용 및 관련 정보를 입력하세요.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="consultationContent">상담 내용</Label>
                  <Textarea
                    id="consultationContent"
                    value={formData.consultationContent}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, consultationContent: e.target.value }))
                    }
                    placeholder="상담 내용을 입력하세요"
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actionItems">액션 아이템</Label>
                  <Textarea
                    id="actionItems"
                    value={formData.actionItems}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, actionItems: e.target.value }))
                    }
                    placeholder="다음 액션 아이템을 입력하세요"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relatedOrderId">관련 주문</Label>
                  <Select
                    value={formData.relatedOrderId || "none"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, relatedOrderId: value === "none" ? "" : value }))
                    }
                    disabled={!formData.customerId}
                  >
                    <SelectTrigger id="relatedOrderId">
                      <SelectValue placeholder="주문 선택 (선택사항)" />
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

                <div className="space-y-2">
                  <Label htmlFor="relatedQuotationId">관련 견적서</Label>
                  <Select
                    value={formData.relatedQuotationId || "none"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, relatedQuotationId: value === "none" ? "" : value }))
                    }
                    disabled={!formData.customerId}
                  >
                    <SelectTrigger id="relatedQuotationId">
                      <SelectValue placeholder="견적서 선택 (선택사항)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택 안함</SelectItem>
                      {quotations.map((quotation) => (
                        <SelectItem key={quotation.id} value={quotation.id.toString()}>
                          {quotation.quotationNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Link href="/consultations">
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
      </div>
    </MainLayout>
  );
}

