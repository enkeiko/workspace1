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
  customerId: number;
}

interface Consultation {
  id: number;
  customerId: number;
  storeId?: number;
  consultationChannel: string;
  consultationDate: string;
  consultationTopic?: string;
  consultationContent?: string;
  actionItems?: string;
  consultationResult?: string;
  relatedOrderId?: number;
  relatedQuotationId?: number;
}

export default function EditConsultationPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Array<{ id: number; orderNumber: string }>>([]);
  const [quotations, setQuotations] = useState<Array<{ id: number; quotationNumber: string }>>([]);
  const [formData, setFormData] = useState({
    customerId: "",
    storeId: "",
    consultationChannel: "",
    consultationDate: "",
    consultationTopic: "",
    consultationContent: "",
    actionItems: "",
    consultationResult: "",
    relatedOrderId: "",
    relatedQuotationId: "",
  });

  useEffect(() => {
    if (params.id) {
      fetchConsultation();
      fetchCustomers();
    }
  }, [params.id]);

  useEffect(() => {
    if (formData.customerId) {
      fetchStores(Number(formData.customerId));
      fetchOrders(Number(formData.customerId));
      fetchQuotations(Number(formData.customerId));
    } else {
      setStores([]);
      setOrders([]);
      setQuotations([]);
    }
  }, [formData.customerId]);

  const fetchConsultation = async () => {
    try {
      setDataLoading(true);
      setError(null);
      const response = await fetch(`/api/consultations/${params.id}`);

      if (!response.ok) {
        throw new Error("상담 정보를 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        const data = result.data;
        setConsultation(data);
        setFormData({
          customerId: data.customerId.toString(),
          storeId: data.storeId?.toString() || "",
          consultationChannel: data.consultationChannel,
          consultationDate: new Date(data.consultationDate).toISOString().slice(0, 16),
          consultationTopic: data.consultationTopic || "",
          consultationContent: data.consultationContent || "",
          actionItems: data.actionItems || "",
          consultationResult: data.consultationResult || "",
          relatedOrderId: data.relatedOrderId?.toString() || "",
          relatedQuotationId: data.relatedQuotationId?.toString() || "",
        });
      } else {
        throw new Error(result.error?.message || "상담 정보를 불러올 수 없습니다.");
      }
    } catch (error) {
      console.error("상담 정보 조회 실패:", error);
      setError(error instanceof Error ? error.message : "오류가 발생했습니다.");
      toast.error("데이터 로딩 실패", {
        description: error instanceof Error ? error.message : "오류가 발생했습니다.",
      });
    } finally {
      setDataLoading(false);
    }
  };

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
    if (!consultation) return;

    setLoading(true);

    try {
      const payload: any = {};

      if (formData.customerId) {
        payload.customerId = Number(formData.customerId);
      }

      if (formData.storeId !== undefined) {
        payload.storeId = formData.storeId ? Number(formData.storeId) : null;
      }

      if (formData.consultationChannel) {
        payload.consultationChannel = formData.consultationChannel;
      }

      if (formData.consultationDate) {
        payload.consultationDate = new Date(formData.consultationDate).toISOString();
      }

      if (formData.consultationTopic !== undefined) {
        payload.consultationTopic = formData.consultationTopic || null;
      }

      if (formData.consultationContent !== undefined) {
        payload.consultationContent = formData.consultationContent || null;
      }

      if (formData.actionItems !== undefined) {
        payload.actionItems = formData.actionItems || null;
      }

      if (formData.consultationResult !== undefined) {
        payload.consultationResult = formData.consultationResult || null;
      }

      if (formData.relatedOrderId !== undefined) {
        payload.relatedOrderId = formData.relatedOrderId ? Number(formData.relatedOrderId) : null;
      }

      if (formData.relatedQuotationId !== undefined) {
        payload.relatedQuotationId = formData.relatedQuotationId
          ? Number(formData.relatedQuotationId)
          : null;
      }

      const response = await fetch(`/api/consultations/${consultation.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("수정 완료", {
          description: "상담이 수정되었습니다.",
        });
        router.push(`/consultations/${consultation.id}`);
      } else {
        toast.error("수정 실패", {
          description: result.error?.message || "상담 수정에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("상담 수정 실패:", error);
      toast.error("수정 실패", {
        description: "상담 수정 중 오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="mb-6 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j}>
                      <Skeleton className="mb-2 h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !consultation) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <ErrorState
            title="상담 정보를 불러올 수 없습니다"
            description={error || "상담 정보를 찾을 수 없습니다."}
            onRetry={fetchConsultation}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <Link href={`/consultations/${consultation.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">상담 수정</h1>
            <p className="text-gray-500">상담 정보를 수정합니다.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>기본 정보</CardTitle>
                <CardDescription>상담 기본 정보를 수정하세요.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customerId">고객사</Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, customerId: value }))
                    }
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
                  <Label htmlFor="consultationChannel">상담 채널</Label>
                  <Select
                    value={formData.consultationChannel}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, consultationChannel: value }))
                    }
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
                  <Label htmlFor="consultationDate">상담일시</Label>
                  <Input
                    id="consultationDate"
                    type="datetime-local"
                    value={formData.consultationDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, consultationDate: e.target.value }))
                    }
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
                <CardDescription>상담 내용 및 관련 정보를 수정하세요.</CardDescription>
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
            <Link href={`/consultations/${consultation.id}`}>
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

