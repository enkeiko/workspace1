"use client";

import { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateExcel } from "./utils/generator";
import type { ExcelExportProps, ExcelFieldDef } from "./types";

export function ExcelExport({
  resource,
  ids,
  fields,
  filename,
  children,
}: ExcelExportProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);

    try {
      // API에서 데이터 가져오기
      const params = new URLSearchParams();
      if (ids && ids.length > 0) {
        params.set("ids", ids.join(","));
      }

      const response = await fetch(`/api/${resource}/export?${params}`);

      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }

      const { data, fields: apiFields } = await response.json();
      const exportFields: ExcelFieldDef[] = fields || apiFields || [];

      if (data.length === 0) {
        toast.warning("내보낼 데이터가 없습니다.");
        return;
      }

      // 현재 날짜를 포함한 파일명 생성
      const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
      const name = filename || `${resource}_${today}`;

      generateExcel(data, exportFields, name);
      toast.success(`${data.length}건 내보내기 완료`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "내보내기 중 오류가 발생했습니다.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (children) {
    return (
      <div onClick={handleExport} className={isLoading ? "pointer-events-none" : ""}>
        {children}
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="mr-1 h-4 w-4" />
      )}
      내보내기
    </Button>
  );
}
