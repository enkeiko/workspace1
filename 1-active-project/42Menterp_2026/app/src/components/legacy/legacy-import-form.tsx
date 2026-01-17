"use client";

import * as React from "react";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, Download } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
  settlementIds: string[];
}

interface LegacyImportFormProps {
  onImportComplete?: (result: ImportResult) => void;
  className?: string;
}

export function LegacyImportForm({
  onImportComplete,
  className,
}: LegacyImportFormProps) {
  const [month, setMonth] = React.useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [file, setFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 파일 선택
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  // 업로드
  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("month", month);

      const res = await fetch("/api/legacy/import-settlement", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "업로드 실패");
      }

      const data: ImportResult = await res.json();
      setResult(data);
      onImportComplete?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 중 오류 발생");
    } finally {
      setIsUploading(false);
    }
  };

  // 샘플 다운로드
  const handleDownloadSample = () => {
    // 간단한 CSV 샘플 생성
    const csvContent = `매장명,키워드,작업유형,수량,단가,금액,성공여부
강남식당,강남역맛집,TRAFFIC,100,50,5000,Y
역삼카페,역삼역카페,SAVE,50,100,5000,Y
홍대식당,홍대맛집,TRAFFIC,200,50,10000,N`;

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "정산_임포트_양식.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          과거 정산 데이터 임포트
        </CardTitle>
        <CardDescription>
          엑셀 또는 CSV 파일에서 과거 정산 데이터를 가져옵니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 대상 월 선택 */}
        <div className="space-y-2">
          <Label htmlFor="month">대상 월</Label>
          <Input
            id="month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full max-w-[200px]"
          />
        </div>

        {/* 파일 업로드 */}
        <div className="space-y-2">
          <Label>파일 선택</Label>
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              file ? "border-green-300 bg-green-50" : "border-gray-300 hover:border-gray-400"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">{file.name}</span>
                <Badge variant="outline">{(file.size / 1024).toFixed(1)} KB</Badge>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-gray-400" />
                <p className="text-sm text-muted-foreground">
                  클릭하여 파일 선택 또는 드래그 앤 드롭
                </p>
                <p className="text-xs text-muted-foreground">
                  .xlsx, .xls, .csv 형식 지원
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                임포트 중...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                임포트
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleDownloadSample}>
            <Download className="h-4 w-4 mr-2" />
            샘플
          </Button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* 결과 표시 */}
        {result && (
          <div
            className={cn(
              "p-4 rounded-lg",
              result.success ? "bg-green-50" : "bg-yellow-50"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">
                {result.success ? "임포트 완료" : "일부 항목 실패"}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="default">{result.imported}건 성공</Badge>
                {result.skipped > 0 && (
                  <Badge variant="destructive">{result.skipped}건 실패</Badge>
                )}
              </div>
            </div>

            {/* 에러 상세 */}
            {result.errors.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-sm font-medium text-red-700">오류 내역:</p>
                <ul className="text-sm text-red-600 list-disc list-inside">
                  {result.errors.slice(0, 5).map((err, idx) => (
                    <li key={idx}>
                      {err.row > 0 ? `행 ${err.row}: ` : ""}
                      {err.message}
                    </li>
                  ))}
                  {result.errors.length > 5 && (
                    <li>... 외 {result.errors.length - 5}건</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 파일 형식 안내 */}
        <div className="text-xs text-muted-foreground border-t pt-4">
          <p className="font-medium mb-1">파일 형식:</p>
          <p>| 매장명 | 키워드 | 작업유형 | 수량 | 단가 | 금액 | 성공여부 |</p>
        </div>
      </CardContent>
    </Card>
  );
}
