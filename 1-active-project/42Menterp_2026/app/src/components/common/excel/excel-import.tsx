"use client";

import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { parseExcelFile, autoMapColumns, applyColumnMapping } from "./utils/parser";
import { validateData, transformData } from "./utils/validators";
import { generateTemplate } from "./utils/generator";
import type {
  ExcelImportProps,
  ParseResult,
  ValidationResult,
  ColumnMapping,
} from "./types";

type Step = "upload" | "mapping" | "validation" | "complete";

export function ExcelImport({
  resource,
  fields,
  onSuccess,
  onError,
  maxRows = 10000,
  allowUpdate = false,
  uniqueField,
  trigger,
}: ExcelImportProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [isLoading, setIsLoading] = useState(false);

  // 파일 업로드 단계
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // 매핑 단계
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // 검증 단계
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [skipErrors, setSkipErrors] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);

  // 결과 단계
  const [importSummary, setImportSummary] = useState<{
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  } | null>(null);

  // 초기화
  const resetState = useCallback(() => {
    setStep("upload");
    setParseResult(null);
    setColumnMapping({});
    setValidationResult(null);
    setSkipErrors(true);
    setUpdateExisting(false);
    setImportSummary(null);
  }, []);

  // 파일 업로드 핸들러
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsLoading(true);
      try {
        const result = await parseExcelFile(file);

        if (result.totalRows > maxRows) {
          throw new Error(`최대 ${maxRows}행까지 업로드 가능합니다.`);
        }

        setParseResult(result);

        // 자동 매핑
        const autoMapping = autoMapColumns(result.headers, fields);
        setColumnMapping(autoMapping);

        setStep("mapping");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "파일 처리 중 오류 발생";
        toast.error(message);
      } finally {
        setIsLoading(false);
        e.target.value = "";
      }
    },
    [fields, maxRows]
  );

  // 매핑 완료 → 검증 진행
  const handleMappingComplete = useCallback(() => {
    if (!parseResult) return;

    const mappedData = applyColumnMapping(parseResult.data, columnMapping);
    const result = validateData(mappedData, fields);
    setValidationResult(result);
    setStep("validation");
  }, [parseResult, columnMapping, fields]);

  // 업로드 실행
  const handleImport = useCallback(async () => {
    if (!parseResult || !validationResult) return;

    setIsLoading(true);
    try {
      const mappedData = applyColumnMapping(parseResult.data, columnMapping);
      const transformedData = transformData(mappedData, fields);

      // 오류 행 필터링
      const validRows = skipErrors
        ? validationResult.rows
            .filter((r) => r.status !== "error")
            .map((r) => transformedData[r.rowIndex - 1])
        : transformedData;

      const response = await fetch(`/api/${resource}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: validRows,
          allowUpdate: allowUpdate && updateExisting,
          uniqueField,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "업로드에 실패했습니다.");
      }

      const result = await response.json();

      setImportSummary(result.summary);
      setStep("complete");

      onSuccess?.(result);
    } catch (error) {
      const err = error instanceof Error ? error : new Error("알 수 없는 오류");
      toast.error(err.message);
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  }, [
    parseResult,
    validationResult,
    columnMapping,
    fields,
    skipErrors,
    resource,
    allowUpdate,
    updateExisting,
    uniqueField,
    onSuccess,
    onError,
  ]);

  // 양식 다운로드
  const handleDownloadTemplate = () => {
    generateTemplate(fields, `${resource}_template`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetState();
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Upload className="mr-1 h-4 w-4" />
            엑셀 업로드
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>엑셀 업로드</DialogTitle>
        </DialogHeader>

        {/* Step 1: 파일 업로드 */}
        {step === "upload" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">
                파일을 드래그하거나 클릭하여 선택하세요
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                지원 형식: .xlsx, .xls, .csv | 최대 {maxRows.toLocaleString()}행
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" asChild>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      disabled={isLoading}
                    />
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        처리 중...
                      </>
                    ) : (
                      "파일 선택"
                    )}
                  </label>
                </Button>
                <Button variant="ghost" onClick={handleDownloadTemplate}>
                  양식 다운로드
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: 컬럼 매핑 */}
        {step === "mapping" && parseResult && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              엑셀 컬럼과 시스템 필드를 매핑하세요. ({parseResult.totalRows}행
              감지됨)
            </p>

            <div className="border rounded-lg divide-y max-h-64 overflow-auto">
              {parseResult.headers.map((header) => {
                const isMatched = !!columnMapping[header];
                return (
                  <div
                    key={header}
                    className="flex items-center justify-between p-3"
                  >
                    <span className="font-medium">{header}</span>
                    <span className="text-muted-foreground mx-4">→</span>
                    <select
                      value={columnMapping[header] || ""}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({
                          ...prev,
                          [header]: e.target.value,
                        }))
                      }
                      className="w-48 rounded-md border px-3 py-2"
                    >
                      <option value="">선택하세요</option>
                      {fields.map((field) => (
                        <option key={field.key} value={field.key}>
                          {field.header}
                          {field.required ? " (필수)" : ""}
                        </option>
                      ))}
                    </select>
                    {isMatched ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 ml-2" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500 ml-2" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>
                ← 이전
              </Button>
              <Button onClick={handleMappingComplete}>다음 →</Button>
            </div>
          </div>
        )}

        {/* Step 3: 검증 결과 */}
        {step === "validation" && validationResult && (
          <div className="space-y-4">
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                유효: {validationResult.valid}건
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                경고: {validationResult.warnings}건
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" />
                오류: {validationResult.errors}건
              </span>
            </div>

            {validationResult.rows.filter((r) => r.status !== "valid").length >
              0 && (
              <div className="border rounded-lg max-h-48 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>필드</TableHead>
                      <TableHead>메시지</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationResult.rows
                      .filter((r) => r.status !== "valid")
                      .flatMap((row) =>
                        row.messages.map((msg, idx) => (
                          <TableRow key={`${row.rowIndex}-${idx}`}>
                            <TableCell>{row.rowIndex}</TableCell>
                            <TableCell>
                              {fields.find((f) => f.key === msg.field)
                                ?.header || msg.field}
                            </TableCell>
                            <TableCell
                              className={cn(
                                msg.type === "error"
                                  ? "text-red-500"
                                  : "text-yellow-600"
                              )}
                            >
                              {msg.message}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="skipErrors"
                  checked={skipErrors}
                  onCheckedChange={(checked) => setSkipErrors(!!checked)}
                />
                <Label htmlFor="skipErrors">오류 행 건너뛰기</Label>
              </div>
              {allowUpdate && uniqueField && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="updateExisting"
                    checked={updateExisting}
                    onCheckedChange={(checked) => setUpdateExisting(!!checked)}
                  />
                  <Label htmlFor="updateExisting">
                    중복 시 기존 데이터 업데이트
                  </Label>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("mapping")}>
                ← 이전
              </Button>
              <Button onClick={handleImport} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    업로드 중...
                  </>
                ) : (
                  "업로드"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: 완료 */}
        {step === "complete" && importSummary && (
          <div className="text-center py-8">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-4">업로드 완료</h3>
            <div className="text-muted-foreground space-y-1">
              <p>등록: {importSummary.created}건</p>
              {importSummary.updated > 0 && (
                <p>수정: {importSummary.updated}건</p>
              )}
              {importSummary.skipped > 0 && (
                <p>건너뜀: {importSummary.skipped}건</p>
              )}
              {importSummary.failed > 0 && (
                <p className="text-red-500">실패: {importSummary.failed}건</p>
              )}
            </div>
            <Button className="mt-6" onClick={() => setOpen(false)}>
              확인
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
