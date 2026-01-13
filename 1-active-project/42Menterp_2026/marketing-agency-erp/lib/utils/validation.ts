/**
 * 공통 유효성 검사 유틸리티 함수
 */

/**
 * ID 유효성 검사
 */
export function validateId(id: string | number | undefined | null): number {
  if (id === undefined || id === null) {
    throw new Error("ID는 필수입니다.");
  }

  const numId = typeof id === "string" ? Number(id) : id;

  if (isNaN(numId) || numId <= 0 || !Number.isInteger(numId)) {
    throw new Error("유효하지 않은 ID입니다.");
  }

  return numId;
}

/**
 * 날짜 범위 유효성 검사
 */
export function validateDateRange(
  startDate: Date | string | undefined | null,
  endDate: Date | string | undefined | null
): void {
  if (!startDate || !endDate) {
    return; // 둘 다 없으면 검증 스킵
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("유효하지 않은 날짜 형식입니다.");
  }

  if (start > end) {
    throw new Error("시작일은 종료일보다 이전이어야 합니다.");
  }
}

/**
 * 금액 유효성 검사
 */
export function validateAmount(amount: number, min: number = 0): void {
  if (isNaN(amount) || amount < min) {
    throw new Error(`금액은 ${min} 이상이어야 합니다.`);
  }
}

/**
 * 페이지네이션 파라미터 검증
 */
export function validatePagination(
  page?: number,
  limit?: number
): { page: number; limit: number } {
  const validPage = page && page > 0 ? page : 1;
  const validLimit = limit && limit > 0 && limit <= 100 ? limit : 20;

  return {
    page: validPage,
    limit: validLimit,
  };
}

/**
 * 사업자등록번호 형식 검증 (000-00-00000)
 */
export function validateBusinessNumber(value: string): boolean {
  // 포맷 확인: 3자리-2자리-5자리 숫자
  const formatRegex = /^\d{3}-\d{2}-\d{5}$/;
  if (!formatRegex.test(value)) return false;

  // 선택적: 유효성 검증 알고리즘 (Checksum)
  // 여기서는 형식만 검사합니다.
  return true;
}

/**
 * 전화번호 형식 검증
 * 02-123-4567, 010-1234-5678 등
 */
export function validatePhoneNumber(value: string): boolean {
  // 지역번호(2~3자리) - 국번(3~4자리) - 번호(4자리)
  // 하이픈(-)은 필수 또는 선택으로 처리 가능하나, 현재 UI 플레이스홀더에 맞춰 하이픈 포함으로 검사
  const regex = /^(010|02|0[3-9]{1}[0-9]{1})-?(\d{3,4})-?(\d{4})$/;
  return regex.test(value);
}





