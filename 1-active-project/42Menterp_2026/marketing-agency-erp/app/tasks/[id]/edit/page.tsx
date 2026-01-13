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

interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
}

interface Task {
  id: number;
  customerId: number;
  storeId?: number;
  orderId?: number;
  taskName: string;
  taskType?: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
}

export default function EditTaskPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [formData, setFormData] = useState({
    customerId: "",
    storeId: "",
    orderId: "",
    taskName: "",
    taskType: "",
    description: "",
    status: "pending",
    priority: "medium",
    dueDate: "",
  });

  useEffect(() => {
    if (params.id) {
      fetchTask();
      fetchCustomers();
    }
  }, [params.id]);

  useEffect(() => {
    if (formData.customerId) {
      fetchStores(Number(formData.customerId));
      fetchOrders(Number(formData.customerId));
    } else {
      setStores([]);
      setOrders([]);
    }
  }, [formData.customerId]);

  const fetchTask = async () => {
    try {
      setDataLoading(true);
      setError(null);
      const response = await fetch(`/api/tasks/${params.id}`);

      if (!response.ok) {
        throw new Error("작업 정보를 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        const taskData = result.data;
        setTask(taskData);
        setFormData({
          customerId: taskData.customerId.toString(),
          storeId: taskData.storeId?.toString() || "",
          orderId: taskData.orderId?.toString() || "",
          taskName: taskData.taskName,
          taskType: taskData.taskType || "",
          description: taskData.description || "",
          status: taskData.status,
          priority: taskData.priority,
          dueDate: taskData.dueDate
            ? new Date(taskData.dueDate).toISOString().slice(0, 10)
            : "",
        });
      } else {
        throw new Error(result.error?.message || "작업 정보를 불러올 수 없습니다.");
      }
    } catch (error) {
      console.error("작업 정보 조회 실패:", error);
      const errorMessage =
        error instanceof Error ? error.message : "작업 정보를 불러올 수 없습니다.";
      setError(errorMessage);
      toast.error("데이터 로딩 실패", {
        description: errorMessage,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.customerId || !formData.taskName) {
        toast.error("입력 오류", {
          description: "고객과 작업명은 필수입니다.",
        });
        setLoading(false);
        return;
      }

      const payload: any = {
        customerId: Number(formData.customerId),
        taskName: formData.taskName,
        status: formData.status,
        priority: formData.priority,
      };

      if (formData.storeId) {
        payload.storeId = Number(formData.storeId);
      } else {
        payload.storeId = null;
      }

      if (formData.orderId) {
        payload.orderId = Number(formData.orderId);
      } else {
        payload.orderId = null;
      }

      if (formData.taskType) {
        payload.taskType = formData.taskType;
      }

      if (formData.description) {
        payload.description = formData.description;
      }

      if (formData.dueDate) {
        payload.dueDate = formData.dueDate;
      } else {
        payload.dueDate = null;
      }

      const response = await fetch(`/api/tasks/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("수정 완료", {
          description: "작업이 수정되었습니다.",
        });
        router.push(`/tasks/${params.id}`);
      } else {
        throw new Error(result.error?.message || "작업 수정에 실패했습니다.");
      }
    } catch (error) {
      console.error("작업 수정 실패:", error);
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

  if (error || !task) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <ErrorState
            title="작업 정보를 불러올 수 없습니다"
            description={error || "알 수 없는 오류가 발생했습니다."}
            onRetry={fetchTask}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <Link href={`/tasks/${params.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">작업 수정</h1>
            <p className="text-gray-500">작업 정보를 수정합니다.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>작업 정보</CardTitle>
            <CardDescription>작업의 기본 정보를 수정하세요.</CardDescription>
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

                <div className="grid gap-2">
                  <Label htmlFor="taskName">
                    작업명 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="taskName"
                    value={formData.taskName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, taskName: e.target.value }))
                    }
                    placeholder="작업명을 입력하세요"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="taskType">작업 유형</Label>
                  <Input
                    id="taskType"
                    value={formData.taskType}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, taskType: e.target.value }))
                    }
                    placeholder="예: 마케팅, 디자인, 개발 등"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status">상태</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">대기중</SelectItem>
                      <SelectItem value="in_progress">진행중</SelectItem>
                      <SelectItem value="completed">완료</SelectItem>
                      <SelectItem value="cancelled">취소</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="priority">우선순위</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">낮음</SelectItem>
                      <SelectItem value="medium">보통</SelectItem>
                      <SelectItem value="high">높음</SelectItem>
                      <SelectItem value="urgent">긴급</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="dueDate">마감일</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                  />
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
                  placeholder="작업에 대한 상세 설명을 입력하세요"
                  rows={5}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Link href={`/tasks/${params.id}`}>
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

