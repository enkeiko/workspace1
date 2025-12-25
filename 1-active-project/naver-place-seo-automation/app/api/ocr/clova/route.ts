import { NextRequest, NextResponse } from "next/server";

/**
 * Naver Clova OCR API 프록시
 * 클라이언트에서 직접 호출 시 CORS 문제가 있어 서버를 경유합니다.
 */

interface ClovaRequestBody {
  image: string; // Base64 encoded image
  filename: string;
  format: string; // jpg, png, etc.
}

export async function POST(request: NextRequest) {
  try {
    const body: ClovaRequestBody = await request.json();
    const { image, filename, format } = body;

    // 환경 변수에서 Clova OCR 설정 가져오기
    const CLOVA_OCR_API_URL = process.env.CLOVA_OCR_API_URL;
    const CLOVA_OCR_SECRET_KEY = process.env.CLOVA_OCR_SECRET_KEY;

    if (!CLOVA_OCR_API_URL || !CLOVA_OCR_SECRET_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Clova OCR API 설정이 필요합니다. 환경 변수를 확인해주세요.",
            code: "CONFIG_ERROR",
          },
        },
        { status: 500 }
      );
    }

    // Clova OCR API 요청 본문 구성
    const clovaRequestBody = {
      version: "V2",
      requestId: `ocr-${Date.now()}`,
      timestamp: Date.now(),
      lang: "ko",
      images: [
        {
          format: format,
          name: filename,
          data: image,
        },
      ],
    };

    // Clova OCR API 호출
    const clovaResponse = await fetch(CLOVA_OCR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-OCR-SECRET": CLOVA_OCR_SECRET_KEY,
      },
      body: JSON.stringify(clovaRequestBody),
    });

    if (!clovaResponse.ok) {
      const errorText = await clovaResponse.text();
      console.error("Clova OCR API 오류:", errorText);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Clova OCR API 호출 실패",
            details: errorText,
          },
        },
        { status: clovaResponse.status }
      );
    }

    const clovaResult = await clovaResponse.json();
    
    // 결과 파싱
    const parsedData = parseOcrResult(clovaResult);

    return NextResponse.json({
      success: true,
      data: parsedData,
      raw: clovaResult, // 디버깅용 원본 응답
    });
  } catch (error) {
    console.error("OCR 처리 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "OCR 처리 중 오류 발생",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Clova OCR 응답 파싱
 */
function parseOcrResult(response: any) {
  const result: {
    businessNumber?: string;
    companyName?: string;
    representativeName?: string;
    address?: string;
    businessType?: string;
    businessItem?: string;
    openDate?: string;
    phone?: string;
  } = {};

  const image = response.images?.[0];
  if (!image || image.inferResult !== "SUCCESS") {
    console.error("OCR 인식 실패:", image?.message);
    return result;
  }

  // 사업자등록증 템플릿 결과 (bizLicense)
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

  // 일반 텍스트 필드에서 추가 정보 추출
  if (image.fields) {
    const allText = image.fields.map((f: any) => f.inferText).join(" ");
    
    // 사업자번호가 없으면 텍스트에서 찾기
    if (!result.businessNumber) {
      const bizNumMatch = allText.match(/(\d{3})[-\s]?(\d{2})[-\s]?(\d{5})/);
      if (bizNumMatch) {
        result.businessNumber = `${bizNumMatch[1]}-${bizNumMatch[2]}-${bizNumMatch[3]}`;
      }
    }

    // 전화번호 찾기
    const phoneMatch = allText.match(/(0\d{1,2})[-)\s]?(\d{3,4})[-\s]?(\d{4})/);
    if (phoneMatch) {
      result.phone = `${phoneMatch[1]}-${phoneMatch[2]}-${phoneMatch[3]}`;
    }
  }

  return result;
}

/**
 * 사업자번호 포맷팅
 */
function formatBusinessNumber(value?: string): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }
  return value;
}


