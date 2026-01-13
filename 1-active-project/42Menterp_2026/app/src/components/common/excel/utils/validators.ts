import type {
  ExcelFieldDef,
  ValidationResult,
  ValidationRow,
  ValidationMessage,
} from "../types";

export function validateData(
  data: Record<string, unknown>[],
  fields: ExcelFieldDef[]
): ValidationResult {
  const rows: ValidationRow[] = data.map((row, index) => {
    const messages: ValidationMessage[] = [];

    for (const field of fields) {
      const value = row[field.key];
      const error = validateField(value, field, row);

      if (error) {
        messages.push({
          field: field.key,
          type: error.startsWith("경고:") ? "warning" : "error",
          message: error.replace(/^(경고:|오류:)\s*/, ""),
        });
      }
    }

    const hasError = messages.some((m) => m.type === "error");
    const hasWarning = messages.some((m) => m.type === "warning");

    return {
      rowIndex: index + 1,
      data: row,
      status: hasError ? "error" : hasWarning ? "warning" : "valid",
      messages,
    };
  });

  const valid = rows.filter((r) => r.status === "valid").length;
  const warnings = rows.filter((r) => r.status === "warning").length;
  const errors = rows.filter((r) => r.status === "error").length;

  return { valid, warnings, errors, rows };
}

function validateField(
  value: unknown,
  field: ExcelFieldDef,
  row: Record<string, unknown>
): string | null {
  const strValue = value === null || value === undefined ? "" : String(value).trim();

  // 필수 필드 검증
  if (field.required && strValue === "") {
    return `오류: ${field.header}은(는) 필수 항목입니다.`;
  }

  // 빈 값은 추가 검증 스킵
  if (strValue === "") return null;

  // 타입 검증
  switch (field.type) {
    case "number": {
      const num = Number(strValue.replace(/,/g, ""));
      if (isNaN(num)) {
        return `오류: ${field.header}은(는) 숫자여야 합니다.`;
      }
      break;
    }
    case "date": {
      const date = new Date(strValue);
      if (isNaN(date.getTime())) {
        return `오류: ${field.header}은(는) 올바른 날짜 형식이어야 합니다. (YYYY-MM-DD)`;
      }
      break;
    }
    case "enum": {
      if (field.enum && !field.enum.includes(strValue)) {
        return `오류: ${field.header}은(는) 다음 중 하나여야 합니다: ${field.enum.join(", ")}`;
      }
      break;
    }
    case "boolean": {
      const validValues = ["true", "false", "1", "0", "yes", "no", "예", "아니오"];
      if (!validValues.includes(strValue.toLowerCase())) {
        return `오류: ${field.header}은(는) true/false 값이어야 합니다.`;
      }
      break;
    }
  }

  // 패턴 검증
  if (field.pattern && !field.pattern.test(strValue)) {
    return `오류: ${field.header}의 형식이 올바르지 않습니다. ${field.description || ""}`;
  }

  // 커스텀 검증
  if (field.validate) {
    const customError = field.validate(value, row);
    if (customError) {
      return `오류: ${customError}`;
    }
  }

  return null;
}

export function transformValue(
  value: unknown,
  field: ExcelFieldDef
): unknown {
  if (value === null || value === undefined) return null;

  // 커스텀 변환
  if (field.transform) {
    return field.transform(value);
  }

  const strValue = String(value).trim();
  if (strValue === "") return null;

  switch (field.type) {
    case "number":
      return Number(strValue.replace(/,/g, ""));
    case "date":
      return new Date(strValue).toISOString();
    case "boolean": {
      const lower = strValue.toLowerCase();
      return ["true", "1", "yes", "예"].includes(lower);
    }
    default:
      return strValue;
  }
}

export function transformData(
  data: Record<string, unknown>[],
  fields: ExcelFieldDef[]
): Record<string, unknown>[] {
  return data.map((row) => {
    const transformed: Record<string, unknown> = {};

    for (const field of fields) {
      if (row[field.key] !== undefined) {
        transformed[field.key] = transformValue(row[field.key], field);
      }
    }

    return transformed;
  });
}
