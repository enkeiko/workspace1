/**
 * 카카오 알림톡 서비스
 *
 * Solapi (구 CoolSMS) API를 사용한 카카오 알림톡 발송
 * https://solapi.com/
 *
 * 환경 변수:
 * - SOLAPI_API_KEY: API 키
 * - SOLAPI_API_SECRET: API 시크릿
 * - SOLAPI_PFID: 카카오 채널 ID (발신 프로필)
 */

import crypto from "crypto";

interface SolapiConfig {
  apiKey: string;
  apiSecret: string;
  pfId: string; // 카카오 채널 ID
}

interface KakaoMessageButton {
  buttonType: "WL" | "AL" | "BK" | "MD" | "DS"; // 웹링크, 앱링크, 봇키워드, 메시지전달, 배송조회
  buttonName: string;
  linkMo?: string;
  linkPc?: string;
}

interface KakaoAlimtalkRequest {
  to: string; // 수신번호
  templateId: string; // 템플릿 ID
  variables?: Record<string, string>; // 치환 변수
  buttons?: KakaoMessageButton[];
}

interface KakaoImageAlimtalkRequest {
  to: string;
  templateId: string;
  imageUrl: string; // 이미지 URL
  variables?: Record<string, string>;
  buttons?: KakaoMessageButton[];
}

interface SolapiResponse {
  groupId: string;
  messageId: string;
  statusCode: string;
  statusMessage: string;
  to: string;
  type: string;
}

export class KakaoService {
  private config: SolapiConfig;
  private baseUrl = "https://api.solapi.com";

  constructor(config: SolapiConfig) {
    this.config = config;
  }

  /**
   * Solapi 인증 헤더 생성
   */
  private generateAuthHeader(): string {
    const date = new Date().toISOString();
    const salt = crypto.randomBytes(16).toString("hex");
    const signature = crypto
      .createHmac("sha256", this.config.apiSecret)
      .update(`${date}${salt}`)
      .digest("hex");

    return `HMAC-SHA256 apiKey=${this.config.apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
  }

  /**
   * 카카오 알림톡 발송
   */
  async sendAlimtalk(request: KakaoAlimtalkRequest): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/messages/v4/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.generateAuthHeader(),
        },
        body: JSON.stringify({
          message: {
            to: request.to.replace(/[^0-9]/g, ""),
            from: process.env.SOLAPI_SENDER_NUMBER || "",
            kakaoOptions: {
              pfId: this.config.pfId,
              templateId: request.templateId,
              variables: request.variables || {},
              buttons: request.buttons,
            },
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.errorMessage || "알림톡 발송에 실패했습니다",
        };
      }

      return {
        success: true,
        messageId: data.groupId,
      };
    } catch (error) {
      console.error("알림톡 발송 실패:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "알림톡 발송 실패",
      };
    }
  }

  /**
   * 이미지 포함 알림톡 발송 (친구톡)
   */
  async sendImageMessage(request: KakaoImageAlimtalkRequest): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/messages/v4/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.generateAuthHeader(),
        },
        body: JSON.stringify({
          message: {
            to: request.to.replace(/[^0-9]/g, ""),
            from: process.env.SOLAPI_SENDER_NUMBER || "",
            kakaoOptions: {
              pfId: this.config.pfId,
              templateId: request.templateId,
              imageUrl: request.imageUrl,
              variables: request.variables || {},
              buttons: request.buttons,
            },
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.errorMessage || "이미지 메시지 발송에 실패했습니다",
        };
      }

      return {
        success: true,
        messageId: data.groupId,
      };
    } catch (error) {
      console.error("이미지 메시지 발송 실패:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "이미지 메시지 발송 실패",
      };
    }
  }

  /**
   * 친구톡 (이미지 + 텍스트) 발송 - 템플릿 없이 자유 형식
   */
  async sendFriendtalk(params: {
    to: string;
    text: string;
    imageUrl?: string;
    buttons?: KakaoMessageButton[];
  }): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const message: Record<string, unknown> = {
        to: params.to.replace(/[^0-9]/g, ""),
        from: process.env.SOLAPI_SENDER_NUMBER || "",
        kakaoOptions: {
          pfId: this.config.pfId,
        },
        text: params.text,
      };

      if (params.imageUrl) {
        (message.kakaoOptions as Record<string, unknown>).imageUrl = params.imageUrl;
      }

      if (params.buttons) {
        (message.kakaoOptions as Record<string, unknown>).buttons = params.buttons;
      }

      const response = await fetch(`${this.baseUrl}/messages/v4/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.generateAuthHeader(),
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.errorMessage || "친구톡 발송에 실패했습니다",
        };
      }

      return {
        success: true,
        messageId: data.groupId,
      };
    } catch (error) {
      console.error("친구톡 발송 실패:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "친구톡 발송 실패",
      };
    }
  }

  /**
   * MMS 발송 (카카오 실패 시 대체)
   */
  async sendMMS(params: {
    to: string;
    text: string;
    imageUrl?: string;
    subject?: string;
  }): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const message: Record<string, unknown> = {
        to: params.to.replace(/[^0-9]/g, ""),
        from: process.env.SOLAPI_SENDER_NUMBER || "",
        text: params.text,
        type: params.imageUrl ? "MMS" : "LMS",
      };

      if (params.subject) {
        message.subject = params.subject;
      }

      if (params.imageUrl) {
        message.imageId = params.imageUrl; // Solapi 이미지 ID 필요
      }

      const response = await fetch(`${this.baseUrl}/messages/v4/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.generateAuthHeader(),
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.errorMessage || "MMS 발송에 실패했습니다",
        };
      }

      return {
        success: true,
        messageId: data.groupId,
      };
    } catch (error) {
      console.error("MMS 발송 실패:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "MMS 발송 실패",
      };
    }
  }

  /**
   * 이미지 업로드 (Solapi 스토리지)
   */
  async uploadImage(imageBuffer: Buffer, fileName: string): Promise<{
    success: boolean;
    imageId?: string;
    imageUrl?: string;
    error?: string;
  }> {
    try {
      const base64Image = imageBuffer.toString("base64");

      const response = await fetch(`${this.baseUrl}/storage/v1/files`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.generateAuthHeader(),
        },
        body: JSON.stringify({
          file: base64Image,
          name: fileName,
          type: "MMS",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.errorMessage || "이미지 업로드에 실패했습니다",
        };
      }

      return {
        success: true,
        imageId: data.fileId,
        imageUrl: data.url,
      };
    } catch (error) {
      console.error("이미지 업로드 실패:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "이미지 업로드 실패",
      };
    }
  }
}

// 카카오 서비스 인스턴스 생성 헬퍼
export function createKakaoService(): KakaoService | null {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const pfId = process.env.SOLAPI_PFID;

  if (!apiKey || !apiSecret || !pfId) {
    console.warn("Solapi(카카오) API 설정이 없습니다");
    return null;
  }

  return new KakaoService({
    apiKey,
    apiSecret,
    pfId,
  });
}

// 알림톡 템플릿 ID 상수
export const KAKAO_TEMPLATE_IDS = {
  // 견적서 발송
  QUOTATION_SEND: "quotation_send",
  // 세금계산서 발행
  TAX_INVOICE_ISSUED: "tax_invoice_issued",
  // 거래명세서 발송
  STATEMENT_SEND: "statement_send",
  // 발주 접수 알림
  PURCHASE_ORDER_RECEIVED: "po_received",
  // 입금 요청
  PAYMENT_REQUEST: "payment_request",
  // 입금 확인
  PAYMENT_CONFIRMED: "payment_confirmed",
} as const;

// 문서 유형별 메시지 템플릿
export function generateDocumentMessage(
  type: "quotation" | "tax-invoice" | "statement",
  data: {
    customerName: string;
    documentNo: string;
    totalAmount: number;
    issueDate: string;
    viewUrl?: string;
  }
): string {
  const templates = {
    quotation: `[42먼트] 견적서 발송 안내

안녕하세요, ${data.customerName}님.
요청하신 견적서를 보내드립니다.

■ 견적번호: ${data.documentNo}
■ 견적금액: ${data.totalAmount.toLocaleString()}원
■ 작성일: ${data.issueDate}

${data.viewUrl ? `견적서 확인: ${data.viewUrl}` : ""}

문의사항이 있으시면 언제든 연락 주세요.
감사합니다.`,

    "tax-invoice": `[42먼트] 세금계산서 발행 안내

안녕하세요, ${data.customerName}님.
세금계산서가 발행되었습니다.

■ 승인번호: ${data.documentNo}
■ 공급가액: ${data.totalAmount.toLocaleString()}원
■ 발행일: ${data.issueDate}

${data.viewUrl ? `세금계산서 확인: ${data.viewUrl}` : ""}

문의사항이 있으시면 연락 주세요.
감사합니다.`,

    statement: `[42먼트] 거래명세서 발송 안내

안녕하세요, ${data.customerName}님.
거래명세서를 보내드립니다.

■ 명세서번호: ${data.documentNo}
■ 합계금액: ${data.totalAmount.toLocaleString()}원
■ 발행일: ${data.issueDate}

${data.viewUrl ? `명세서 확인: ${data.viewUrl}` : ""}

문의사항이 있으시면 연락 주세요.
감사합니다.`,
  };

  return templates[type];
}
