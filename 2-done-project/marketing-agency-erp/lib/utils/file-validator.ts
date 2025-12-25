/**
 * 파일 검증 유틸리티
 */

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "text/plain",
  "text/csv",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * 파일명 sanitization (경로 탐색 공격 방지)
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/\.\./g, "") // 상위 디렉토리 접근 방지
    .replace(/[\/\\]/g, "_") // 경로 구분자 제거
    .replace(/[^a-zA-Z0-9._-]/g, "_") // 특수문자 제거
    .trim();
}

/**
 * 파일 검증
 */
export async function validateFile(file: File): Promise<{ valid: boolean; error?: string }> {
  // 1. 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "파일 크기는 10MB 이하여야 합니다." };
  }

  // 2. MIME 타입 검증
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `허용되지 않은 파일 형식입니다. 허용 형식: PDF, 이미지, Excel, Word, 텍스트`,
    };
  }

  // 3. 파일명 검증
  if (!file.name || file.name.trim().length === 0) {
    return { valid: false, error: "파일명이 필요합니다." };
  }

  return { valid: true };
}

/**
 * 파일 크기 포맷팅
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

