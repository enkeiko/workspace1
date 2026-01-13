"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Loader2,
  ClipboardList,
  FileText,
  Search,
  Calendar,
  Trash2,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { ko } from "date-fns/locale";

interface Store {
  id: string;
  name: string;
  mid: string;
}

interface Order {
  id: string;
  orderNo: string;
}

interface WorkLog {
  id: string;
  storeId: string;
  store: Store;
  orderId: string | null;
  order: Order | null;
  workType: string;
  workDate: string;
  description: string;
  qty: number | null;
  result: string | null;
  createdBy: { id: string; name: string };
  createdAt: string;
}

const workTypeMap: Record<string, { label: string; color: string }> = {
  ORDER_CREATED: { label: "발주 생성", color: "bg-blue-500" },
  ORDER_CONFIRMED: { label: "발주 확정", color: "bg-green-500" },
  ORDER_COMPLETED: { label: "발주 완료", color: "bg-emerald-500" },
  MANUAL_WORK: { label: "수동 작업", color: "bg-purple-500" },
  KEYWORD_CHECK: { label: "키워드 체크", color: "bg-yellow-500" },
  REVIEW_CHECK: { label: "리뷰 확인", color: "bg-orange-500" },
  OTHER: { label: "기타", color: "bg-gray-500" },
};

export default function WorkLogsPage() {
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [selectedWorkType, setSelectedWorkType] = useState<string>("");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    storeId: "",
    workType: "MANUAL_WORK",
    workDate: format(new Date(), "yyyy-MM-dd"),
    description: "",
    qty: "",
    result: "",
  });

  useEffect(() => {
    fetchData();
  }, [selectedStoreId, selectedWorkType, startDate, endDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStoreId) params.append("storeId", selectedStoreId);
      if (selectedWorkType) params.append("workType", selectedWorkType);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const [workLogsRes, storesRes] = await Promise.all([
        fetch(`/api/work-logs?${params}`),
        fetch("/api/stores"),
      ]);

      if (workLogsRes.ok) {
        const data = await workLogsRes.json();
        setWorkLogs(data.workLogs || []);
      }
      if (storesRes.ok) {
        const data = await storesRes.json();
        setStores(data.stores || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/work-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          qty: formData.qty ? parseInt(formData.qty) : null,
        }),
      });
      if (res.ok) {
        setIsDialogOpen(false);
        setFormData({
          storeId: "",
          workType: "MANUAL_WORK",
          workDate: format(new Date(), "yyyy-MM-dd"),
          description: "",
          qty: "",
          result: "",
        });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to create work log:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 작업 로그를 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/work-logs/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to delete work log:", error);
    }
  };

  // 통계 계산
  const totalLogs = workLogs.length;
  const orderLogs = workLogs.filter((log) =>
    ["ORDER_CREATED", "ORDER_CONFIRMED", "ORDER_COMPLETED"].includes(log.workType)
  ).length;
  const manualLogs = workLogs.filter((log) => log.workType === "MANUAL_WORK").length;

  if (loading && !workLogs.length) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">마케팅 작업 로그</h2>
          <p className="text-muted-foreground">
            매장별 마케팅 작업 내역을 기록하고 관리합니다.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> 작업 기록
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>작업 기록 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>매장</Label>
                <select
                  value={formData.storeId}
                  onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="">매장 선택</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name} ({store.mid})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>작업 유형</Label>
                  <select
                    value={formData.workType}
                    onChange={(e) => setFormData({ ...formData, workType: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    {Object.entries(workTypeMap).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>작업일</Label>
                  <Input
                    type="date"
                    value={formData.workDate}
                    onChange={(e) => setFormData({ ...formData, workDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>작업 내용</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="작업 내용을 입력하세요"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>수량 (선택)</Label>
                  <Input
                    type="number"
                    value={formData.qty}
                    onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                    placeholder="수량"
                  />
                </div>
                <div className="space-y-2">
                  <Label>결과 (선택)</Label>
                  <Input
                    value={formData.result}
                    onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                    placeholder="작업 결과"
                  />
                </div>
              </div>
              <Button
                onClick={handleCreate}
                className="w-full"
                disabled={!formData.storeId || !formData.description}
              >
                저장
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 작업</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLogs}건</div>
            <p className="text-xs text-muted-foreground">조회 기간 내</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">발주 관련</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{orderLogs}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">수동 작업</CardTitle>
            <ClipboardList className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{manualLogs}건</div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>작업 로그</CardTitle>
              <CardDescription>기간별 작업 내역을 확인합니다.</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-36"
                />
                <span>~</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-36"
                />
              </div>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">전체 매장</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedWorkType}
                onChange={(e) => setSelectedWorkType(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">전체 유형</option>
                {Object.entries(workTypeMap).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {workLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              해당 기간에 작업 기록이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {workLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-2 h-full min-h-[48px] rounded ${
                        workTypeMap[log.workType]?.color || "bg-gray-500"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary">
                          {workTypeMap[log.workType]?.label || log.workType}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(log.workDate), "yyyy-MM-dd (EEE)", { locale: ko })}
                        </span>
                      </div>
                      <p className="font-medium">{log.store.name}</p>
                      <p className="text-sm text-muted-foreground">{log.description}</p>
                      {(log.qty || log.result) && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {log.qty && `수량: ${log.qty}`}
                          {log.qty && log.result && " · "}
                          {log.result && `결과: ${log.result}`}
                        </p>
                      )}
                      {log.order && (
                        <p className="text-sm text-blue-600 mt-1">
                          발주: {log.order.orderNo}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{log.createdBy.name}</p>
                      <p>{format(new Date(log.createdAt), "HH:mm")}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(log.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
