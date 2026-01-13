/**
 * OCR 텍스트 파싱 유틸리티
 * Tesseract.js에서 추출된 원본 텍스트를 분석하여 구조화된 데이터로 변환합니다.
 */

interface ParsedBusinessData {
  businessNumber?: string;
  name?: string; // 상호
  contactPerson?: string; // 대표자
  address?: string;
  phone?: string;
  email?: string;
}

export function parseBusinessLicense(text: string): ParsedBusinessData {
  // OCR 결과 정제: 불필요한 공백, 특수문자 정리
  const cleanedText = text
    .replace(/[©®™]/g, "") // 특수 기호 제거
    .replace(/\s+/g, " ") // 다중 공백을 단일 공백으로
    .replace(/[oO0]\s*[oO0]/g, "00") // OCR 오인식 보정 (oo -> 00)
    .replace(/[lI1|]/g, "1") // l, I, | -> 1 보정
    .replace(/[Ss](?=\d)/g, "5") // S -> 5 보정 (숫자 앞)
    .replace(/[Bb](?=\d)/g, "8"); // B -> 8 보정 (숫자 앞)
  
  const lines = cleanedText.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const data: ParsedBusinessData = {};

  // 정규식 패턴 (더 유연하게)
  // 사업자번호: 3자리-2자리-5자리 (공백, 점, 하이픈 등 다양한 구분자 허용)
  const businessNumberRegex = /(\d{3})\s*[-.\s:]\s*(\d{2})\s*[-.\s:]\s*(\d{5})/;
  // 전화번호: 다양한 형식 허용
  const phoneRegex = /(0\d{1,2})\s*[-.)]\s*(\d{3,4})\s*[-.)]\s*(\d{4})/;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

  // 1. 사업자등록번호 찾기 (전체 텍스트에서)
  const bNumMatch = cleanedText.match(businessNumberRegex);
  if (bNumMatch) {
    data.businessNumber = `${bNumMatch[1]}-${bNumMatch[2]}-${bNumMatch[3]}`;
  }

  // 2. 전화번호 찾기 (팩스 제외)
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes("fax") || line.includes("팩스") || lowerLine.includes("f ax")) continue;
    
    const phoneMatch = line.match(phoneRegex);
    if (phoneMatch) {
      data.phone = `${phoneMatch[1]}-${phoneMatch[2]}-${phoneMatch[3]}`;
      break;
    }
  }

  // 3. 이메일 찾기
  const emailMatch = cleanedText.match(emailRegex);
  if (emailMatch) {
    data.email = emailMatch[0];
  }

  // 4. 상호(법인명), 대표자, 주소 찾기 (키워드 기반, 더 유연하게)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || "";

    // 상호/명칭 (다양한 OCR 오류 패턴 대응)
    if (/상\s*호|명\s*칭|법\s*인\s*명/i.test(line)) {
      let content = line.replace(/상\s*호|명\s*칭|법\s*인\s*명|[:\s©]/gi, "").trim();
      if (!content && nextLine) content = nextLine.trim();
      // 괄호 안 내용 추출 (예: 파인애드(4640) -> 파인애드)
      const nameMatch = content.match(/([가-힣a-zA-Z]+)/);
      if (nameMatch && !data.name) {
        data.name = cleanText(nameMatch[0]);
      }
    }

    // 성명/대표자
    if (/성\s*명|대\s*표\s*자/i.test(line)) {
      let content = line.replace(/성\s*명|대\s*표\s*자|[:\s]/gi, "").trim();
      // 생년월일 부분 제거
      content = content.replace(/생\s*년\s*월\s*일.*$/i, "").trim();
      if (!content && nextLine) {
        content = nextLine.replace(/생\s*년\s*월\s*일.*$/i, "").trim();
      }
      // 한글 이름만 추출 (2~4글자)
      const nameMatch = content.match(/[가-힣]{2,4}/);
      if (nameMatch && !data.contactPerson) {
        data.contactPerson = nameMatch[0];
      }
    }

    // 주소 (사업장 소재지)
    if (/주\s*소|소\s*재\s*지|사\s*업\s*장/i.test(line)) {
      let content = line.replace(/주\s*소|사\s*업\s*장|소\s*재\s*지|[:\s]/gi, "").trim();
      if (!content && nextLine) content = nextLine.trim();
      if (content && !data.address) data.address = content;
    }
  }

  return data;
}

function cleanText(text: string): string {
  // 불필요한 특수문자 제거 (괄호는 (주), (유) 등 법인형태 표기에 사용되므로 유지)
  return text.replace(/[\[\]{}<>©®™]/g, "").trim();
}

/**
 * 이미지 전처리를 위한 Canvas 기반 함수
 * 그레이스케일 변환 및 대비 향상
 */
export async function preprocessImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // 원본 이미지 그리기
        ctx.drawImage(img, 0, 0);
        
        // 이미지 데이터 가져오기
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // 그레이스케일 변환 및 대비 향상
        for (let i = 0; i < data.length; i += 4) {
          // 그레이스케일 변환
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          
          // 대비 향상 (임계값 기반 이진화)
          const threshold = 128;
          const value = gray > threshold ? 255 : 0;
          
          data[i] = value;     // R
          data[i + 1] = value; // G
          data[i + 2] = value; // B
          // Alpha는 그대로 유지
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Base64 데이터 URL 반환
        resolve(canvas.toDataURL("image/png"));
      };
      
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}







