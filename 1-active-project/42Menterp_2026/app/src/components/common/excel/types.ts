export interface ExcelFieldDef {
  key: string;
  header: string;
  required?: boolean;
  type?: "string" | "number" | "date" | "enum" | "boolean";
  enum?: string[];
  pattern?: RegExp;
  transform?: (value: unknown) => unknown;
  validate?: (value: unknown, row: Record<string, unknown>) => string | null;
  description?: string;
}

export interface ImportError {
  row: number;
  field: string;
  value: unknown;
  message: string;
}

export interface ImportResult {
  success: boolean;
  summary: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  errors: ImportError[];
  createdIds: string[];
}

export interface ValidationResult {
  valid: number;
  warnings: number;
  errors: number;
  rows: ValidationRow[];
}

export interface ValidationRow {
  rowIndex: number;
  data: Record<string, unknown>;
  status: "valid" | "warning" | "error";
  messages: ValidationMessage[];
}

export interface ValidationMessage {
  field: string;
  type: "error" | "warning";
  message: string;
}

export interface ParseResult {
  headers: string[];
  data: Record<string, unknown>[];
  totalRows: number;
}

export interface ColumnMapping {
  excelColumn: string;
  systemField: string;
  matched: boolean;
}

export interface ExcelImportProps {
  resource: string;
  fields: ExcelFieldDef[];
  onSuccess?: (result: ImportResult) => void;
  onError?: (error: Error) => void;
  maxRows?: number;
  allowUpdate?: boolean;
  uniqueField?: string;
  trigger?: React.ReactNode;
}

export interface ExcelExportProps {
  resource: string;
  ids?: string[];
  fields?: ExcelFieldDef[];
  filename?: string;
  children?: React.ReactNode;
}

export interface ExcelTemplateProps {
  resource: string;
  fields: ExcelFieldDef[];
  filename?: string;
  children?: React.ReactNode;
}
