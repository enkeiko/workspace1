"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface ExcelUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface UploadResult {
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
}

export function ExcelUploadDialog({
  open,
  onOpenChange,
  onSuccess,
}: ExcelUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error("엑셀 파일만 업로드 가능합니다 (.xlsx, .xls)");
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/stores/bulk", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data.results);
        toast.success(data.message);
        onSuccess();
      } else {
        toast.error(data.error || "업로드에 실패했습니다");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("업로드 중 오류가 발생했습니다");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excel 일괄 업로드</DialogTitle>
          <DialogDescription>
            매장 정보가 담긴 Excel 파일을 업로드하여 일괄 등록합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">필수 컬럼:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>매장명</li>
              <li>MID</li>
            </ul>
            <p className="font-medium mt-3 mb-2">선택 컬럼:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Place URL, 사업자번호, 대표자, 담당자</li>
              <li>연락처, 이메일, 주소, 업종, 메모</li>
            </ul>
          </div>

          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  클릭하여 파일을 선택하세요
                </p>
                <p className="text-xs text-muted-foreground">
                  .xlsx, .xls 파일만 지원
                </p>
              </>
            )}
          </div>

          {result && (
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>성공: {result.success}건</span>
              </div>
              {result.skipped > 0 && (
                <div className="flex items-center gap-2 text-yellow-600">
                  <span className="ml-6">중복 스킵: {result.skipped}건</span>
                </div>
              )}
              {result.failed > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-4 w-4" />
                  <span>실패: {result.failed}건</span>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="text-xs text-red-500 mt-2 max-h-20 overflow-y-auto">
                  {result.errors.slice(0, 5).map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                  {result.errors.length > 5 && (
                    <p>...외 {result.errors.length - 5}건</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              닫기
            </Button>
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  업로드 중...
                </>
              ) : (
                "업로드"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
