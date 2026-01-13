/**
 * 애플리케이션 커스텀 에러 클래스
 */

export class AppError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "리소스를 찾을 수 없습니다.") {
    super(message, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public errors?: Array<{ path: string; message: string }>
  ) {
    super(message, "VALIDATION_ERROR");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "인증이 필요합니다.") {
    super(message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "권한이 없습니다.") {
    super(message, "FORBIDDEN");
  }
}

