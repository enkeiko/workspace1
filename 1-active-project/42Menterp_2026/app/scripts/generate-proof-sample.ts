/**
 * 증빙 일괄 업로드 테스트용 샘플 엑셀 파일 생성
 *
 * 실행:
 *   npx ts-node scripts/generate-proof-sample.ts
 */

import * as XLSX from "xlsx";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 샘플 데이터
const sampleData = [
  {
    발주번호: "PO260115-0001",
    키워드: "강남역맛집",
    매장명: "강남식당",
    작업URL: "https://blog.naver.com/example/123456789",
    완료일: "2026-01-15",
  },
  {
    발주번호: "PO260115-0001",
    키워드: "역삼역카페",
    매장명: "역삼카페",
    작업URL: "https://blog.naver.com/example/987654321",
    완료일: "2026-01-15",
  },
  {
    발주번호: "PO260115-0002",
    키워드: "홍대맛집",
    매장명: "홍대식당",
    작업URL: "https://m.blog.naver.com/example/111222333",
    완료일: "2026-01-16",
  },
  {
    발주번호: "PO260115-0002",
    키워드: "합정역카페",
    매장명: "합정카페",
    작업URL: "https://blog.naver.com/example/444555666",
    완료일: "2026-01-16",
  },
  {
    발주번호: "PO260115-0003",
    키워드: "판교맛집",
    매장명: "판교식당",
    작업URL: "https://blog.naver.com/example/777888999",
    완료일: "2026-01-17",
  },
];

// 워크북 생성
const workbook = XLSX.utils.book_new();

// 시트 생성
const worksheet = XLSX.utils.json_to_sheet(sampleData);

// 열 너비 설정
worksheet["!cols"] = [
  { wch: 18 }, // 발주번호
  { wch: 15 }, // 키워드
  { wch: 15 }, // 매장명
  { wch: 50 }, // 작업URL
  { wch: 12 }, // 완료일
];

// 시트를 워크북에 추가
XLSX.utils.book_append_sheet(workbook, worksheet, "증빙데이터");

// 파일 저장
const outputPath = path.join(__dirname, "samples", "증빙_일괄업로드_샘플.xlsx");
XLSX.writeFile(workbook, outputPath);

console.log(`✅ 샘플 파일 생성 완료: ${outputPath}`);
console.log(`   - 총 ${sampleData.length}건의 샘플 데이터`);
console.log("\n📋 파일 포맷:");
console.log("   | 발주번호 | 키워드 | 매장명 | 작업URL | 완료일 |");
