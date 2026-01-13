import * as XLSX from "xlsx";
import type { ParseResult } from "../types";

export async function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          worksheet,
          {
            raw: false,
            defval: "",
          }
        );

        const headers =
          jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

        resolve({
          headers,
          data: jsonData,
          totalRows: jsonData.length,
        });
      } catch (error) {
        reject(new Error("엑셀 파일을 읽는 중 오류가 발생했습니다."));
      }
    };

    reader.onerror = () => {
      reject(new Error("파일을 읽을 수 없습니다."));
    };

    reader.readAsArrayBuffer(file);
  });
}

export function autoMapColumns(
  excelHeaders: string[],
  systemFields: { key: string; header: string }[]
): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const field of systemFields) {
    const matchedHeader = excelHeaders.find(
      (h) =>
        h.toLowerCase() === field.header.toLowerCase() ||
        h.toLowerCase() === field.key.toLowerCase()
    );

    if (matchedHeader) {
      mapping[matchedHeader] = field.key;
    }
  }

  return mapping;
}

export function applyColumnMapping(
  data: Record<string, unknown>[],
  mapping: Record<string, string>
): Record<string, unknown>[] {
  return data.map((row) => {
    const mappedRow: Record<string, unknown> = {};

    for (const [excelColumn, systemField] of Object.entries(mapping)) {
      if (systemField && row[excelColumn] !== undefined) {
        mappedRow[systemField] = row[excelColumn];
      }
    }

    return mappedRow;
  });
}
