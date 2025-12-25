import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/errors/app-error";

/**
 * Zod 에러를 ValidationError로 변환
 */
export function handleZodError(zodError: z.ZodError): ValidationError {
  return new ValidationError(
    "입력 데이터가 유효하지 않습니다.",
    zodError.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message
    }))
  );
}

/**
 * 에러를 적절한 HTTP 응답으로 변환
 */
export function handleError(error: unknown): NextResponse {
  // 커스텀 에러 처리
  if (error instanceof NotFoundError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || "NOT_FOUND",
          message: error.message,
        },
      },
      { status: 404 }
    );
  }

  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || "VALIDATION_ERROR",
          message: error.message,
          errors: error.errors,
        },
      },
      { status: 400 }
    );
  }

  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || "UNAUTHORIZED",
          message: error.message,
        },
      },
      { status: 401 }
    );
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || "FORBIDDEN",
          message: error.message,
        },
      },
      { status: 403 }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || "INTERNAL_ERROR",
          message: error.message,
        },
      },
      { status: 500 }
    );
  }

  // 일반 에러 처리
  const errorMessage =
    error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

  console.error("Unhandled error:", error);

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: errorMessage,
      },
    },
    { status: 500 }
  );
}

