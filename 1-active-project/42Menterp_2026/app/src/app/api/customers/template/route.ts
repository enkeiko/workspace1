import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from "xlsx";

/**
 * 고객 엑셀 양식 다운로드 API
 *
 * GET /api/customers/template
 */

const templateData = [
  // 헤더 행 (첫 번째 행은 필드명으로 사용)
  {
    고객명: "(주)샘플회사",
    사업자번호: "1234567890",
    대표자명: "홍길동",
    담당자명: "김담당",
    연락처: "010-1234-5678",
    이메일: "contact@example.com",
    주소: "서울특별시 강남구 테헤란로 123",
    상태: "ACTIVE",
    비고: "샘플 데이터",
  },
  {
    고객명: "테스트회사",
    사업자번호: "9876543210",
    대표자명: "이대표",
    담당자명: "박담당",
    연락처: "010-9876-5432",
    이메일: "test@example.com",
    주소: "서울특별시 서초구 서초대로 456",
    상태: "ACTIVE",
    비고: "",
  },
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 워크북 생성
    const workbook = XLSX.utils.book_new();

    // 데이터 시트
    const dataSheet = XLSX.utils.json_to_sheet(templateData);

    // 컬럼 너비 설정
    dataSheet["!cols"] = [
      { wch: 20 }, // 고객명
      { wch: 15 }, // 사업자번호
      { wch: 10 }, // 대표자명
      { wch: 10 }, // 담당자명
      { wch: 15 }, // 연락처
      { wch: 25 }, // 이메일
      { wch: 40 }, // 주소
      { wch: 10 }, // 상태
      { wch: 20 }, // 비고
    ];

    // 시트 추가
    XLSX.utils.book_append_sheet(workbook, dataSheet, "고객목록");

    // 필드 설명 시트 (두 번째 시트)
    const fieldDescriptions = [
      { 필드명: "고객명", 필수여부: "필수", 설명: "거래처/회사명", 예시: "(주)샘플회사" },
      { 필드명: "사업자번호", 필수여부: "선택", 설명: "10자리 숫자 (하이픈 제외)", 예시: "1234567890" },
      { 필드명: "대표자명", 필수여부: "선택", 설명: "대표자 이름", 예시: "홍길동" },
      { 필드명: "담당자명", 필수여부: "선택", 설명: "담당자 이름", 예시: "김담당" },
      { 필드명: "연락처", 필수여부: "선택", 설명: "전화번호", 예시: "010-1234-5678" },
      { 필드명: "이메일", 필수여부: "선택", 설명: "이메일 주소 (세금계산서 발송용)", 예시: "contact@example.com" },
      { 필드명: "주소", 필수여부: "선택", 설명: "사업장 주소", 예시: "서울특별시 강남구 테헤란로 123" },
      { 필드명: "상태", 필수여부: "선택", 설명: "ACTIVE(활성), PAUSED(일시정지), TERMINATED(종료)", 예시: "ACTIVE" },
      { 필드명: "비고", 필수여부: "선택", 설명: "추가 메모", 예시: "" },
    ];

    const descSheet = XLSX.utils.json_to_sheet(fieldDescriptions);
    descSheet["!cols"] = [
      { wch: 12 }, // 필드명
      { wch: 8 },  // 필수여부
      { wch: 40 }, // 설명
      { wch: 30 }, // 예시
    ];
    XLSX.utils.book_append_sheet(workbook, descSheet, "필드설명");

    // Excel 파일 생성
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // 파일명 생성
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const filename = `고객_엑셀_양식_${dateStr}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error("Failed to generate template:", error);
    return NextResponse.json(
      { error: "양식 생성에 실패했습니다" },
      { status: 500 }
    );
  }
}
