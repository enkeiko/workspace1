"use client";

import * as React from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProcessResult {
  success: boolean;
  row: number;
  purchaseOrderNo: string;
  keyword: string;
  storeName: string;
  proofUrl: string;
  error?: string;
}

interface UploadResponse {
  success: boolean;
  summary: {
    total: number;
    success: number;
    failed: number;
  };
  results: ProcessResult[];
  thumbnailJobIds?: string[];
}

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";

interface BulkUploadFormProps {
  className?: string;
  onComplete?: (response: UploadResponse) => void;
}

export function BulkUploadForm({ className, onComplete }: BulkUploadFormProps) {
  const [uploadState, setUploadState] = React.useState<UploadState>("idle");
  const [progress, setProgress] = React.useState(0);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [response, setResponse] = React.useState<UploadResponse | null>(null);
  const [showFailedDetails, setShowFailedDetails] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 파일 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 파일 타입 검증
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];
      const validExtensions = [".xlsx", ".xls", ".csv"];

      const isValidType = validTypes.includes(file.type);
      const isValidExtension = validExtensions.some((ext) =>
        file.name.toLowerCase().endsWith(ext)
      );

      if (!isValidType && !isValidExtension) {
        toast.error("지원하지 않는 파일 형식입니다. xlsx, xls, csv 파일만 가능합니다.");
        return;
      }

      // 파일 크기 검증 (10MB 제한)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("파일 크기가 너무 큽니다. 10MB 이하 파일만 가능합니다.");
        return;
      }

      setSelectedFile(file);
      setResponse(null);
      setUploadState("idle");
    }
  };

  // 업로드 핸들러
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("파일을 선택해주세요");
      return;
    }

    setUploadState("uploading");
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      setProgress(30);
      setUploadState("processing");

      const res = await fetch("/api/proof/bulk-upload", {
        method: "POST",
        body: formData,
      });

      setProgress(80);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "업로드 실패");
      }

      const data: UploadResponse = await res.json();

      setProgress(100);
      setResponse(data);
      setUploadState("complete");

      if (data.summary.failed === 0) {
        toast.success(
          `${data.summary.success}건 모두 업로드 완료`
        );
      } else {
        toast.warning(
          `${data.summary.success}건 성공, ${data.summary.failed}건 실패`
        );
      }

      onComplete?.(data);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadState("error");
      toast.error(error instanceof Error ? error.message : "업로드 실패");
    }
  };

  // 초기화
  const handleReset = () => {
    setSelectedFile(null);
    setResponse(null);
    setUploadState("idle");
    setProgress(0);
    setShowFailedDetails(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 양식 다운로드
  const handleDownloadTemplate = () => {
    // CSV 템플릿 생성
    const headers = ["발주번호", "키워드", "매장명", "작업URL", "완료일"];
    const sampleRow = [
      "PO260115-0001",
      "강남역맛집",
      "강남식당",
      "https://blog.naver.com/example/123",
      "2026-01-15",
    ];

    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "증빙_일괄업로드_양식.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // 실패 건수
  const failedResults = response?.results.filter((r) => !r.success) || [];

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          증빙 일괄 업로드
        </CardTitle>
        <CardDescription>
          엑셀 파일로 작업 증빙 URL을 일괄 등록합니다.
          발주번호, 키워드, 매장명으로 자동 매칭됩니다.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 양식 다운로드 */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <p className="text-sm font-medium">업로드 양식</p>
            <p className="text-xs text-muted-foreground">
              발주번호 | 키워드 | 매장명 | 작업URL | 완료일
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            양식 다운로드
          </Button>
        </div>

        {/* 파일 업로드 영역 */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">파일 선택</Label>
            <div className="flex items-center gap-4">
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={uploadState === "uploading" || uploadState === "processing"}
                className="flex-1"
              />
              {selectedFile && uploadState === "idle" && (
                <Button onClick={handleUpload}>
                  <Upload className="h-4 w-4 mr-2" />
                  업로드
                </Button>
              )}
            </div>
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                선택된 파일: {selectedFile.name} (
                {(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* 진행 상태 */}
          {(uploadState === "uploading" || uploadState === "processing") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploadState === "uploading" ? "파일 업로드 중..." : "데이터 처리 중..."}
                </span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>

        {/* 결과 표시 */}
        {response && (
          <div className="space-y-4">
            {/* 요약 카드 */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{response.summary.total}</div>
                  <p className="text-xs text-muted-foreground">총 건수</p>
                </CardContent>
              </Card>
              <Card className={response.summary.success > 0 ? "border-green-200" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold text-green-600">
                      {response.summary.success}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">성공</p>
                </CardContent>
              </Card>
              <Card className={response.summary.failed > 0 ? "border-red-200" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="text-2xl font-bold text-red-600">
                      {response.summary.failed}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">실패</p>
                </CardContent>
              </Card>
            </div>

            {/* 실패 건 상세 */}
            {failedResults.length > 0 && (
              <Collapsible open={showFailedDetails} onOpenChange={setShowFailedDetails}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      실패 건 상세 ({failedResults.length}건)
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {showFailedDetails ? "접기" : "펼치기"}
                    </span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="border rounded-lg overflow-auto max-h-64">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">행</TableHead>
                          <TableHead>발주번호</TableHead>
                          <TableHead>키워드</TableHead>
                          <TableHead>매장명</TableHead>
                          <TableHead>오류</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {failedResults.map((result, idx) => (
                          <TableRow key={idx} className="bg-red-50/50">
                            <TableCell className="font-mono">{result.row}</TableCell>
                            <TableCell>{result.purchaseOrderNo || "-"}</TableCell>
                            <TableCell>{result.keyword || "-"}</TableCell>
                            <TableCell>{result.storeName || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="destructive" className="text-xs">
                                {result.error}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* 썸네일 생성 알림 */}
            {response.thumbnailJobIds && response.thumbnailJobIds.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {response.thumbnailJobIds.length}건의 썸네일 이미지가 백그라운드에서 생성 중입니다.
                </span>
              </div>
            )}

            {/* 재업로드 버튼 */}
            <Button variant="outline" onClick={handleReset} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              다시 업로드
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
