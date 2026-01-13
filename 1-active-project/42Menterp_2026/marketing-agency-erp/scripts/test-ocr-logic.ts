
// 테스트를 위해 모듈을 가져옵니다. (tsconfig-paths 등을 사용하지 않고 상대 경로로 import하거나,
// 간단한 테스트를 위해 코드를 복사해서 실행 가능한 형태로 만듭니다.)

// --- lib/utils/validation.ts 내용 ---
function validateBusinessNumber(value: string): boolean {
  const formatRegex = /^\d{3}-\d{2}-\d{5}$/;
  if (!formatRegex.test(value)) return false;
  return true;
}

function validatePhoneNumber(value: string): boolean {
  const regex = /^(010|02|0[3-9]{1}[0-9]{1})-?(\d{3,4})-?(\d{4})$/;
  return regex.test(value);
}

// --- lib/utils/ocr-parser.ts 내용 ---
interface ParsedBusinessData {
  businessNumber?: string;
  name?: string;
  contactPerson?: string;
  address?: string;
  phone?: string;
  email?: string;
}

function cleanText(text: string): string {
  // 불필요한 특수문자 제거 (괄호는 (주), (유) 등 법인형태 표기에 사용되므로 유지)
  return text.replace(/[\[\]{}<>]/g, "").trim();
}

function parseBusinessLicense(text: string): ParsedBusinessData {
  const lines = text.split(/\n+/).map((line) => line.trim());
  const data: ParsedBusinessData = {};

  const businessNumberRegex = /(\d{3})\s*[-.]?\s*(\d{2})\s*[-.]?\s*(\d{5})/;
  const phoneRegex = /(010|02|0[3-9]{1}[0-9]{1})\s*[-.]?\s*(\d{3,4})\s*[-.]?\s*(\d{4})/;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

  const bNumMatch = text.match(businessNumberRegex);
  if (bNumMatch) {
    data.businessNumber = `${bNumMatch[1]}-${bNumMatch[2]}-${bNumMatch[3]}`;
  }

  for (const line of lines) {
    if (line.toLowerCase().includes("fax") || line.includes("팩스")) continue;
    
    const phoneMatch = line.match(phoneRegex);
    if (phoneMatch) {
      data.phone = `${phoneMatch[1]}-${phoneMatch[2]}-${phoneMatch[3]}`;
      break; 
    }
  }

  const emailMatch = text.match(emailRegex);
  if (emailMatch) {
    data.email = emailMatch[0];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || "";

    if (line.includes("상호") || line.includes("명칭") || line.includes("법인명")) {
      let content = line.replace(/상호|명칭|법인명|:/g, "").trim();
      if (!content && nextLine) content = nextLine.trim();
      if (content && !data.name) data.name = cleanText(content);
    }

    if (line.includes("성명") || line.includes("대표자")) {
      let content = line.replace(/성명|대표자|:/g, "").trim();
      if (!content && nextLine) content = nextLine.trim();
      content = content.replace(/\(.*\)/g, "").trim();
      if (content && !data.contactPerson) data.contactPerson = cleanText(content);
    }

    if (line.includes("주소") || line.includes("소재지")) {
      let content = line.replace(/주소|사업장|소재지|:/g, "").trim();
      if (!content && nextLine) content = nextLine.trim();
      if (content && !data.address) data.address = content;
    }
  }

  return data;
}

// --- 테스트 실행 ---

console.log("=== [테스트 시작] ===");

// 1. 유효성 검사 테스트
console.log("\n1. 유효성 검사 테스트");

const validBizNum = "123-45-67890";
const invalidBizNum = "1234567890"; // 하이픈 없음
console.log(`사업자번호 검증 (${validBizNum}):`, validateBusinessNumber(validBizNum) ? "PASS" : "FAIL");
console.log(`사업자번호 검증 (${invalidBizNum}):`, !validateBusinessNumber(invalidBizNum) ? "PASS" : "FAIL");

const validPhone = "010-1234-5678";
const validPhoneSeoul = "02-123-4567";
const invalidPhone = "01-1234-5678"; // 잘못된 식별번호
console.log(`전화번호 검증 (${validPhone}):`, validatePhoneNumber(validPhone) ? "PASS" : "FAIL");
console.log(`전화번호 검증 (${validPhoneSeoul}):`, validatePhoneNumber(validPhoneSeoul) ? "PASS" : "FAIL");
console.log(`전화번호 검증 (${invalidPhone}):`, !validatePhoneNumber(invalidPhone) ? "PASS" : "FAIL");


// 2. OCR 파싱 테스트
console.log("\n2. OCR 파싱 테스트");

const sampleOcrText = `
사업자등록증
등록번호 : 123-45-67890
상호 : (주)테스트컴퍼니
성명 : 홍길동
개업연월일 : 2023년 01월 01일
사업장 소재지 : 서울특별시 강남구 테헤란로 123
사업의 종류 : 업태 서비스업 종목 소프트웨어개발
이메일 : test@example.com
전화번호 : 02-1234-5678
`;

console.log("입력 텍스트:");
console.log(sampleOcrText.trim());
console.log("-------------------");

const parsed = parseBusinessLicense(sampleOcrText);
console.log("파싱 결과:", parsed);

// 결과 검증
const isParsedCorrectly = 
  parsed.businessNumber === "123-45-67890" &&
  parsed.name === "(주)테스트컴퍼니" &&
  parsed.contactPerson === "홍길동" &&
  parsed.address === "서울특별시 강남구 테헤란로 123" &&
  parsed.phone === "02-1234-5678" &&
  parsed.email === "test@example.com";

console.log("파싱 정확도 검증:", isParsedCorrectly ? "PASS" : "FAIL");

console.log("\n=== [테스트 종료] ===");



