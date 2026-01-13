import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { ExcelFieldDef } from "../types";

export function generateTemplate(
  fields: ExcelFieldDef[],
  filename: string
): void {
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  // 헤더 행
  const headers = fields.map((f) => f.header);
  XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });

  // 설명 행 (필수 표시 및 형식 설명)
  const descriptions = fields.map((f) => {
    const parts: string[] = [];
    if (f.required) parts.push("(필수)");
    if (f.description) parts.push(f.description);
    if (f.enum) parts.push(`허용값: ${f.enum.join(", ")}`);
    return parts.join(" ");
  });
  XLSX.utils.sheet_add_aoa(worksheet, [descriptions], { origin: "A2" });

  // 예시 행
  const examples = fields.map((f) => {
    if (f.enum && f.enum.length > 0) return f.enum[0];
    switch (f.type) {
      case "number":
        return "1000";
      case "date":
        return "2026-01-01";
      case "boolean":
        return "true";
      default:
        return f.required ? "입력값" : "";
    }
  });
  XLSX.utils.sheet_add_aoa(worksheet, [examples], { origin: "A3" });

  // 컬럼 너비 설정
  worksheet["!cols"] = fields.map((f) => ({
    wch: Math.max(f.header.length * 2, 15),
  }));

  // 워크북 생성 및 다운로드
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, `${filename}.xlsx`);
}

export function generateExcel(
  data: Record<string, unknown>[],
  fields: ExcelFieldDef[],
  filename: string
): void {
  // 헤더 생성
  const headers = fields.map((f) => f.header);

  // 데이터 행 생성
  const rows = data.map((row) =>
    fields.map((f) => {
      const value = row[f.key];
      if (value === null || value === undefined) return "";
      if (f.type === "date" && value instanceof Date) {
        return value.toISOString().split("T")[0];
      }
      return String(value);
    })
  );

  // 워크시트 생성
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // 컬럼 너비 설정
  worksheet["!cols"] = fields.map((f) => ({
    wch: Math.max(f.header.length * 2, 15),
  }));

  // 워크북 생성 및 다운로드
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, `${filename}.xlsx`);
}
