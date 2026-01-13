"use client";

import { WeeklyOrderGrid } from "@/components/purchase-orders";
import type {
  GridSaveRequest,
  GridSaveResponse,
} from "@/components/purchase-orders";
import { toast } from "sonner";

export default function WeeklyPurchaseOrdersPage() {
  // 그리드 저장 핸들러
  const handleSave = async (
    data: GridSaveRequest
  ): Promise<GridSaveResponse> => {
    const response = await fetch("/api/purchase-orders/grid-save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "저장 실패");
    }

    return response.json();
  };

  // 시트 전송 핸들러
  const handleExport = async (weekKey: string) => {
    try {
      toast.info("시트 전송 기능은 준비 중입니다");
      // TODO: Google Sheet 전송 구현
    } catch (error) {
      console.error("Export error:", error);
      toast.error("시트 전송 실패");
    }
  };

  return (
    <div className="container mx-auto py-6">
      <WeeklyOrderGrid onSave={handleSave} onExport={handleExport} />
    </div>
  );
}
