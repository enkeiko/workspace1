import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from "xlsx";

/**
 * 파트너사 엑셀 양식 다운로드 API
 *
 * GET /api/tenants/template
 */

const templateData = [
  {
    파트너사명: "테스트파트너",
    코드: "PT001",
    사업자번호: "123-45-67890",
    대표자: "홍길동",
    담당자명: "김담당",
    담당자연락처: "010-1234-5678",
    담당자이메일: "contact@partner.com",
    주소: "서울시 강남구 역삼동",
    수수료유형: "RATE",
    기본수수료율: "0.1",
    은행명: "국민은행",
    계좌번호: "123456-78-901234",
    예금주: "테스트파트너",
    계약시작일: "2026-01-01",
    계약종료일: "2026-12-31",
    상태: "ACTIVE",
    메모: "샘플 파트너사",
  },
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // SUPER_ADMIN만 접근 가능
    if (session.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    // 워크북 생성
    const workbook = XLSX.utils.book_new();

    // 데이터 시트
    const dataSheet = XLSX.utils.json_to_sheet(templateData);

    // 컬럼 너비 설정
    dataSheet["!cols"] = [
      { wch: 20 }, // 파트너사명
      { wch: 12 }, // 코드
      { wch: 15 }, // 사업자번호
      { wch: 12 }, // 대표자
      { wch: 12 }, // 담당자명
      { wch: 15 }, // 담당자연락처
      { wch: 25 }, // 담당자이메일
      { wch: 30 }, // 주소
      { wch: 12 }, // 수수료유형
      { wch: 12 }, // 기본수수료율
      { wch: 12 }, // 은행명
      { wch: 18 }, // 계좌번호
      { wch: 15 }, // 예금주
      { wch: 12 }, // 계약시작일
      { wch: 12 }, // 계약종료일
      { wch: 10 }, // 상태
      { wch: 25 }, // 메모
    ];

    // 시트 추가
    XLSX.utils.book_append_sheet(workbook, dataSheet, "파트너사목록");

    // 필드 설명 시트
    const fieldDescriptions = [
      { 필드명: "파트너사명", 필수여부: "필수", 설명: "파트너사 이름", 예시: "테스트파트너" },
      { 필드명: "코드", 필수여부: "필수", 설명: "파트너사 코드 (고유값)", 예시: "PT001" },
      { 필드명: "사업자번호", 필수여부: "선택", 설명: "사업자등록번호 (고유값)", 예시: "123-45-67890" },
      { 필드명: "대표자", 필수여부: "선택", 설명: "대표자명", 예시: "홍길동" },
      { 필드명: "담당자명", 필수여부: "선택", 설명: "담당자 이름", 예시: "김담당" },
      { 필드명: "담당자연락처", 필수여부: "선택", 설명: "담당자 전화번호", 예시: "010-1234-5678" },
      { 필드명: "담당자이메일", 필수여부: "선택", 설명: "담당자 이메일", 예시: "contact@partner.com" },
      { 필드명: "주소", 필수여부: "선택", 설명: "사업장 주소", 예시: "서울시 강남구 역삼동" },
      { 필드명: "수수료유형", 필수여부: "선택", 설명: "FIXED(고정금액) 또는 RATE(비율)", 예시: "RATE" },
      { 필드명: "기본수수료율", 필수여부: "선택", 설명: "수수료율 (0~1 사이 소수, 10%=0.1)", 예시: "0.1" },
      { 필드명: "은행명", 필수여부: "선택", 설명: "정산 은행명", 예시: "국민은행" },
      { 필드명: "계좌번호", 필수여부: "선택", 설명: "정산 계좌번호", 예시: "123456-78-901234" },
      { 필드명: "예금주", 필수여부: "선택", 설명: "정산 예금주", 예시: "테스트파트너" },
      { 필드명: "계약시작일", 필수여부: "선택", 설명: "계약 시작일 (YYYY-MM-DD)", 예시: "2026-01-01" },
      { 필드명: "계약종료일", 필수여부: "선택", 설명: "계약 종료일 (YYYY-MM-DD)", 예시: "2026-12-31" },
      { 필드명: "상태", 필수여부: "선택", 설명: "ACTIVE(활성), INACTIVE(비활성), SUSPENDED(정지)", 예시: "ACTIVE" },
      { 필드명: "메모", 필수여부: "선택", 설명: "추가 메모 사항", 예시: "샘플 파트너사" },
    ];

    const descSheet = XLSX.utils.json_to_sheet(fieldDescriptions);
    descSheet["!cols"] = [
      { wch: 15 },
      { wch: 10 },
      { wch: 45 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(workbook, descSheet, "필드설명");

    // Excel 파일 생성
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // 파일명 생성
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const filename = `파트너사_엑셀_양식_${dateStr}.xlsx`;

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
