"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Eye, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@/hooks/use-debounce";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";

interface Task {
  id: number;
  taskName: string;
  taskType?: string;
  status: string;
  priority: string;
  dueDate?: string;
  customer: {
    id: number;
    name: string;
  };
  store?: {
    id: number;
    name: string;
  };
  order?: {
    id: number;
    orderNumber: string;
  };
  _count: {
    timeEntries: number;
  };
  createdAt: string;
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

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    fetchTasks();
  }, [page, debouncedSearch, statusFilter, priorityFilter]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(priorityFilter !== "all" && { priority: priorityFilter }),
      });

      const response = await fetch(`/api/tasks?${params}`);

      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        setTasks(result.data.tasks || []);
        setTotalPages(result.data.pagination?.totalPages || 1);
      } else {
        throw new Error(result.error?.message || "데이터를 불러오는데 실패했습니다.");
      }
    } catch (error) {
      console.error("작업 목록 조회 실패:", error);
      setError(error instanceof Error ? error.message : "오류가 발생했습니다.");
      toast.error("작업 목록 조회 실패", {
        description: error instanceof Error ? error.message : "오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (task: Task) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;

    try {
      const response = await fetch(`/api/tasks/${taskToDelete.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("삭제 완료", {
          description: "작업이 삭제되었습니다.",
        });
        fetchTasks();
      } else {
        toast.error("삭제 실패", {
          description: result.error?.message || "작업 삭제에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("삭제 실패:", error);
      toast.error("삭제 실패", {
        description: "작업 삭제 중 오류가 발생했습니다.",
      });
    } finally {
      setTaskToDelete(null);
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">작업 관리</h1>
            <p className="text-gray-500">작업을 관리하고 시간을 추적합니다.</p>
          </div>
          <Link href="/tasks/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              작업 추가
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>작업 목록</CardTitle>
            <CardDescription>등록된 작업을 검색하고 관리합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="작업명, 설명, 유형으로 검색..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="pending">대기중</SelectItem>
                  <SelectItem value="in_progress">진행중</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                  <SelectItem value="cancelled">취소</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={priorityFilter}
                onValueChange={(value) => {
                  setPriorityFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="우선순위" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 우선순위</SelectItem>
                  <SelectItem value="low">낮음</SelectItem>
                  <SelectItem value="medium">보통</SelectItem>
                  <SelectItem value="high">높음</SelectItem>
                  <SelectItem value="urgent">긴급</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <TableSkeleton rows={5} columns={8} />
            ) : error ? (
              <ErrorState
                title="데이터 로딩 실패"
                description={error}
                onRetry={fetchTasks}
              />
            ) : tasks.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title={search || statusFilter !== "all" || priorityFilter !== "all" ? "검색 결과가 없습니다" : "등록된 작업이 없습니다"}
                description={
                  search || statusFilter !== "all" || priorityFilter !== "all"
                    ? "다른 검색 조건으로 다시 시도해보세요."
                    : "첫 번째 작업을 추가하여 시작하세요."
                }
                actionLabel={search || statusFilter !== "all" || priorityFilter !== "all" ? undefined : "작업 추가"}
                actionHref={search || statusFilter !== "all" || priorityFilter !== "all" ? undefined : "/tasks/new"}
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>작업명</TableHead>
                      <TableHead>고객사</TableHead>
                      <TableHead>매장</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>우선순위</TableHead>
                      <TableHead>마감일</TableHead>
                      <TableHead>시간 기록</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="text-primary hover:underline"
                          >
                            {task.taskName}
                          </Link>
                          {task.taskType && (
                            <span className="ml-2 text-xs text-gray-500">({task.taskType})</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/customers/${task.customer.id}`}
                            className="text-primary hover:underline"
                          >
                            {task.customer.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {task.store ? (
                            <Link
                              href={`/stores/${task.store.id}`}
                              className="text-primary hover:underline"
                            >
                              {task.store.name}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusColors[task.status] || "secondary"}>
                            {statusLabels[task.status] || task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={priorityColors[task.priority] || "secondary"}>
                            {priorityLabels[task.priority] || task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {task.dueDate ? (
                            <span className={isOverdue(task.dueDate) ? "text-red-500 font-medium" : ""}>
                              {new Date(task.dueDate).toLocaleDateString("ko-KR")}
                              {isOverdue(task.dueDate) && " (지연)"}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{task._count.timeEntries}건</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/tasks/${task.id}`}>
                              <Button variant="ghost" size="icon" title="상세보기">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/tasks/${task.id}/edit`}>
                              <Button variant="ghost" size="icon" title="수정">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="삭제"
                              onClick={() => handleDeleteClick(task)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      이전
                    </Button>
                    <span className="text-sm text-gray-500">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      다음
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="작업을 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다. 작업 정보와 관련된 시간 기록이 모두 삭제됩니다."
        itemName={taskToDelete?.taskName || "작업"}
        requireConfirmation={true}
      />
    </MainLayout>
  );
}

