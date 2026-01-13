"use client";

import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Clock, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TimeEntry {
  id: number;
  entryDate: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  description?: string;
}

interface TimeTrackingSectionProps {
  taskId: number;
  onUpdate?: () => void;
}

export function TimeTrackingSection({ taskId, onUpdate }: TimeTrackingSectionProps) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [formData, setFormData] = useState({
    entryDate: new Date().toISOString().slice(0, 10),
    startTime: "",
    endTime: "",
    durationMinutes: "",
    description: "",
  });

  useEffect(() => {
    fetchTimeEntries();
  }, [taskId]);

  const fetchTimeEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tasks/${taskId}/time`);

      if (!response.ok) {
        throw new Error("시간 기록을 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        setTimeEntries(result.data.timeEntries || []);
      }
    } catch (error) {
      console.error("시간 기록 조회 실패:", error);
      toast.error("시간 기록 조회 실패", {
        description: error instanceof Error ? error.message : "오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (entry?: TimeEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData({
        entryDate: new Date(entry.entryDate).toISOString().slice(0, 10),
        startTime: new Date(entry.startTime).toISOString().slice(11, 16),
        endTime: entry.endTime ? new Date(entry.endTime).toISOString().slice(11, 16) : "",
        durationMinutes: entry.durationMinutes?.toString() || "",
        description: entry.description || "",
      });
    } else {
      setEditingEntry(null);
      setFormData({
        entryDate: new Date().toISOString().slice(0, 10),
        startTime: "",
        endTime: "",
        durationMinutes: "",
        description: "",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEntry(null);
    setFormData({
      entryDate: new Date().toISOString().slice(0, 10),
      startTime: "",
      endTime: "",
      durationMinutes: "",
      description: "",
    });
  };

  const calculateDuration = () => {
    if (formData.startTime && formData.endTime) {
      const start = new Date(`${formData.entryDate}T${formData.startTime}`);
      const end = new Date(`${formData.entryDate}T${formData.endTime}`);
      const diffMs = end.getTime() - start.getTime();
      if (diffMs > 0) {
        const minutes = Math.floor(diffMs / (1000 * 60));
        setFormData((prev) => ({ ...prev, durationMinutes: minutes.toString() }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.entryDate || !formData.startTime) {
      toast.error("입력 오류", {
        description: "기록일과 시작 시간은 필수입니다.",
      });
      return;
    }

    if (!formData.durationMinutes && !formData.endTime) {
      toast.error("입력 오류", {
        description: "소요 시간을 입력하거나 종료 시간을 입력해야 합니다.",
      });
      return;
    }

    try {
      const startDateTime = new Date(`${formData.entryDate}T${formData.startTime}`);
      const endDateTime = formData.endTime ? new Date(`${formData.entryDate}T${formData.endTime}`) : null;

      const payload = {
        entryDate: formData.entryDate,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime ? endDateTime.toISOString() : null,
        durationMinutes: formData.durationMinutes ? Number(formData.durationMinutes) : undefined,
        description: formData.description || undefined,
      };

      if (editingEntry) {
        const response = await fetch(`/api/time-entries/${editingEntry.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (result.success) {
          toast.success("수정 완료", {
            description: "시간 기록이 수정되었습니다.",
          });
          handleCloseDialog();
          fetchTimeEntries();
          onUpdate?.();
        } else {
          throw new Error(result.error?.message || "수정에 실패했습니다.");
        }
      } else {
        const response = await fetch(`/api/tasks/${taskId}/time`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (result.success) {
          toast.success("추가 완료", {
            description: "시간 기록이 추가되었습니다.",
          });
          handleCloseDialog();
          fetchTimeEntries();
          onUpdate?.();
        } else {
          throw new Error(result.error?.message || "추가에 실패했습니다.");
        }
      }
    } catch (error) {
      console.error("시간 기록 저장 실패:", error);
      toast.error("저장 실패", {
        description: error instanceof Error ? error.message : "오류가 발생했습니다.",
      });
    }
  };

  const handleDelete = async (entryId: number) => {
    if (!confirm("시간 기록을 삭제하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch(`/api/time-entries/${entryId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("삭제 완료", {
          description: "시간 기록이 삭제되었습니다.",
        });
        fetchTimeEntries();
        onUpdate?.();
      } else {
        throw new Error(result.error?.message || "삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("시간 기록 삭제 실패:", error);
      toast.error("삭제 실패", {
        description: error instanceof Error ? error.message : "오류가 발생했습니다.",
      });
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}시간 ${mins}분`;
    }
    return `${mins}분`;
  };

  if (loading) {
    return <div className="text-center py-4 text-gray-500">로딩 중...</div>;
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          시간 기록 추가
        </Button>
      </div>

      {timeEntries.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-2 text-gray-400" />
          <p>등록된 시간 기록이 없습니다.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>기록일</TableHead>
              <TableHead>시작 시간</TableHead>
              <TableHead>종료 시간</TableHead>
              <TableHead>소요 시간</TableHead>
              <TableHead>설명</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {timeEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  {new Date(entry.entryDate).toLocaleDateString("ko-KR")}
                </TableCell>
                <TableCell>
                  {new Date(entry.startTime).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  {entry.endTime
                    ? new Date(entry.endTime).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </TableCell>
                <TableCell className="font-medium">
                  {formatDuration(entry.durationMinutes || 0)}
                </TableCell>
                <TableCell>{entry.description || "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(entry)}
                      title="수정"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(entry.id)}
                      title="삭제"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "시간 기록 수정" : "시간 기록 추가"}
            </DialogTitle>
            <DialogDescription>
              작업에 소요된 시간을 기록합니다.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="entryDate">기록일 *</Label>
                <Input
                  id="entryDate"
                  type="date"
                  value={formData.entryDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, entryDate: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startTime">시작 시간 *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, startTime: e.target.value }));
                      if (formData.endTime) {
                        setTimeout(calculateDuration, 100);
                      }
                    }}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endTime">종료 시간</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, endTime: e.target.value }));
                      setTimeout(calculateDuration, 100);
                    }}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="durationMinutes">소요 시간 (분)</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  min="1"
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, durationMinutes: e.target.value }))
                  }
                  placeholder="시작/종료 시간 입력 시 자동 계산"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="작업 내용을 입력하세요"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                취소
              </Button>
              <Button type="submit">
                {editingEntry ? "수정" : "추가"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

