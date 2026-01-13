"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Trash2, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";
import { TimeTrackingSection } from "@/components/tasks/time-tracking-section";

interface Task {
  id: number;
  taskName: string;
  taskType?: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  customer: {
    id: number;
    name: string;
    businessNumber?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
  };
  store?: {
    id: number;
    name: string;
    address?: string;
    phone?: string;
  };
  order?: {
    id: number;
    orderNumber: string;
    orderDate: string;
    status: string;
    totalAmount: number;
  };
  timeEntries: Array<{
    id: number;
    entryDate: string;
    startTime: string;
    endTime?: string;
    durationMinutes: number;
    description?: string;
  }>;
  _count: {
    timeEntries: number;
  };
  createdAt: string;
  updatedAt: string;
}

const statusLabels: Record<string, string> = {
  pending: "대기중",
  in_progress: "진행중",
  completed: "완료",
  cancelled: "취소",
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  in_progress: "default",
  completed: "outline",
  cancelled: "destructive",
};

const priorityLabels: Record<string, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
  urgent: "긴급",
};

const priorityColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  urgent: "destructive",
};

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchTask();
    }
  }, [params.id]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/tasks/${params.id}`);

      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        setTask(result.data);
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
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!task) return;

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("삭제 완료", {
          description: "작업이 삭제되었습니다.",
        });
        router.push("/tasks");
      } else {
        toast.error("삭제 실패", {
          description: result.error?.message || "삭제에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("삭제 실패:", error);
      toast.error("삭제 실패", {
        description: "작업 삭제 중 오류가 발생했습니다.",
      });
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  if (loading) {
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

  const totalMinutes = task.timeEntries.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/tasks">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{task.taskName}</h1>
              {task.taskType && (
                <p className="text-gray-500 mt-1">유형: {task.taskType}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/tasks/${task.id}/edit`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                수정
              </Button>
            </Link>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              삭제
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>작업 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">상태</label>
                <div className="mt-1">
                  <Badge variant={statusColors[task.status] || "secondary"}>
                    {statusLabels[task.status] || task.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">우선순위</label>
                <div className="mt-1">
                  <Badge variant={priorityColors[task.priority] || "secondary"}>
                    {priorityLabels[task.priority] || task.priority}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">마감일</label>
                <div className="mt-1">
                  {task.dueDate ? (
                    <div className="flex items-center gap-2">
                      <span className={isOverdue(task.dueDate) ? "text-red-500 font-medium" : ""}>
                        {new Date(task.dueDate).toLocaleDateString("ko-KR")}
                      </span>
                      {isOverdue(task.dueDate) && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          지연됨
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">설정되지 않음</span>
                  )}
                </div>
              </div>
              {task.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">설명</label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{task.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>관련 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">고객사</label>
                <div className="mt-1">
                  <Link
                    href={`/customers/${task.customer.id}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {task.customer.name}
                  </Link>
                  {task.customer.contactPerson && (
                    <p className="text-sm text-gray-500 mt-1">
                      담당자: {task.customer.contactPerson}
                    </p>
                  )}
                  {task.customer.phone && (
                    <p className="text-sm text-gray-500">{task.customer.phone}</p>
                  )}
                </div>
              </div>
              {task.store && (
                <div>
                  <label className="text-sm font-medium text-gray-500">매장</label>
                  <div className="mt-1">
                    <Link
                      href={`/stores/${task.store.id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {task.store.name}
                    </Link>
                    {task.store.address && (
                      <p className="text-sm text-gray-500 mt-1">{task.store.address}</p>
                    )}
                  </div>
                </div>
              )}
              {task.order && (
                <div>
                  <label className="text-sm font-medium text-gray-500">관련 주문</label>
                  <div className="mt-1">
                    <Link
                      href={`/orders/${task.order.id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {task.order.orderNumber}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">
                      주문일: {new Date(task.order.orderDate).toLocaleDateString("ko-KR")}
                    </p>
                    <p className="text-sm text-gray-500">
                      금액: {Number(task.order.totalAmount).toLocaleString()}원
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>시간 추적</CardTitle>
                <CardDescription>
                  총 {totalHours}시간 {totalMinutes % 60}분 ({task._count.timeEntries}건)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TimeTrackingSection taskId={task.id} onUpdate={fetchTask} />
          </CardContent>
        </Card>

        <div className="mt-6 text-sm text-gray-500">
          <p>생성일: {new Date(task.createdAt).toLocaleString("ko-KR")}</p>
          <p>수정일: {new Date(task.updatedAt).toLocaleString("ko-KR")}</p>
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="작업을 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다. 작업 정보와 관련된 시간 기록이 모두 삭제됩니다."
        itemName={task.taskName}
        requireConfirmation={true}
      />
    </MainLayout>
  );
}

