/**
 * Naver Clova OCR API 연동
 * 사업자등록증 특화 템플릿 사용
 */

interface ClovaOcrResult {
  businessNumber?: string;
  companyName?: string;
  representativeName?: string;
  address?: string;
  businessType?: string;
  businessItem?: string;
  openDate?: string;
  phone?: string;
}

interface ClovaApiResponse {
  images: Array<{
    inferResult: string;
    message: string;
    fields?: Array<{
      name: string;
      inferText: string;
      inferConfidence: number;
    }>;
    bizLicense?: {
      result: {
        corpName?: Array<{ text: string }>;
        repName?: Array<{ text: string }>;
        registerNumber?: Array<{ text: string }>;
        corpLocation?: Array<{ text: string }>;
        bizType?: Array<{ text: string }>;
        bizItem?: Array<{ text: string }>;
        openDate?: Array<{ text: string }>;
      };
    };
  }>;
}

/**
 * 이미지 파일을 Base64로 변환
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // data:image/jpeg;base64, 부분 제거
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Clova OCR API 호출 (클라이언트에서 직접 호출 시 CORS 문제로 서버 API 경유 필요)
 */
export async function callClovaOcr(file: File): Promise<ClovaOcrResult> {
  const base64Image = await fileToBase64(file);
  
  // 서버 API를 통해 Clova OCR 호출
  const response = await fetch("/api/ocr/clova", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image: base64Image,
      filename: file.name,
      format: file.type.split("/")[1] || "jpg",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "OCR 처리 실패");
  }

  const result = await response.json();
  return result.data;
}

/**
 * Clova OCR 응답 파싱
 */
export function parseClovaResponse(response: ClovaApiResponse): ClovaOcrResult {
  const result: ClovaOcrResult = {};
  
  const image = response.images?.[0];
  if (!image || image.inferResult !== "SUCCESS") {
    console.error("OCR 실패:", image?.message);
    return result;
  }

  // 사업자등록증 템플릿 결과 파싱
  const bizLicense = image.bizLicense?.result;
  if (bizLicense) {
    result.companyName = bizLicense.corpName?.[0]?.text;
    result.representativeName = bizLicense.repName?.[0]?.text;
    result.businessNumber = formatBusinessNumber(bizLicense.registerNumber?.[0]?.text);
    result.address = bizLicense.corpLocation?.[0]?.text;
    result.businessType = bizLicense.bizType?.[0]?.text;
    result.businessItem = bizLicense.bizItem?.[0]?.text;
    result.openDate = bizLicense.openDate?.[0]?.text;
  }

  // 일반 필드에서 추가 정보 추출
  if (image.fields) {
    for (const field of image.fields) {
      // 전화번호 패턴 찾기
      const phoneMatch = field.inferText.match(/(0\d{1,2}[-)\s]?\d{3,4}[-\s]?\d{4})/);
      if (phoneMatch && !result.phone) {
        result.phone = formatPhoneNumber(phoneMatch[1]);
      }
    }
  }

  return result;
}

/**
 * 사업자번호 포맷팅 (000-00-00000)
 */
function formatBusinessNumber(value?: string): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }
  return value;
}

/**
 * 전화번호 포맷팅
 */
function formatPhoneNumber(value?: string): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  
  if (digits.startsWith("02")) {
    // 서울 지역번호
    if (digits.length === 9) {
      return `02-${digits.slice(2, 5)}-${digits.slice(5)}`;
    } else if (digits.length === 10) {
      return `02-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
  } else if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  
  return value;
}


