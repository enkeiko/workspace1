import { NextRequest, NextResponse } from "next/server";
import { validateId } from "./validation";

/**
 * API Route에서 ID 파라미터 검증 및 파싱
 */
export async function parseAndValidateId(
  params: Promise<{ id: string }>
): Promise<number> {
  const { id } = await params;
  return validateId(id);
}

/**
 * ID 검증 실패 시 에러 응답 생성
 */
export function createInvalidIdResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INVALID_ID",
        message: "유효하지 않은 ID입니다.",
      },
    },
    { status: 400 }
  );
}





