import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from "xlsx";

/**
 * 발주 엑셀 양식 다운로드 API
 *
 * GET /api/purchase-orders/template
 */

const templateData = [
  {
    채널코드: "CH001",
    매장MID: "1234567890",
    매장명: "샘플카페 강남점",
    상품코드: "TRAFFIC-01",
    상품명: "트래픽 기본",
    수량: 100,
    단가: 1000,
    금액: 100000,
    시작일: "2026-01-20",
    종료일: "2026-01-26",
    비고: "",
  },
  {
    채널코드: "CH001",
    매장MID: "9876543210",
    매장명: "테스트식당 역삼점",
    상품코드: "REVIEW-01",
    상품명: "리뷰 기본",
    수량: 10,
    단가: 5000,
    금액: 50000,
    시작일: "2026-01-20",
    종료일: "2026-01-26",
    비고: "샘플 데이터",
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
      { wch: 12 }, // 채널코드
      { wch: 15 }, // 매장MID
      { wch: 20 }, // 매장명
      { wch: 15 }, // 상품코드
      { wch: 15 }, // 상품명
      { wch: 10 }, // 수량
      { wch: 12 }, // 단가
      { wch: 12 }, // 금액
      { wch: 12 }, // 시작일
      { wch: 12 }, // 종료일
      { wch: 20 }, // 비고
    ];

    // 시트 추가
    XLSX.utils.book_append_sheet(workbook, dataSheet, "발주목록");

    // 필드 설명 시트
    const fieldDescriptions = [
      { 필드명: "채널코드", 필수여부: "필수", 설명: "발주할 채널의 코드", 예시: "CH001" },
      { 필드명: "매장MID", 필수여부: "필수", 설명: "네이버 플레이스 MID", 예시: "1234567890" },
      { 필드명: "매장명", 필수여부: "선택", 설명: "매장명 (참고용)", 예시: "샘플카페 강남점" },
      { 필드명: "상품코드", 필수여부: "필수", 설명: "발주할 상품 코드", 예시: "TRAFFIC-01" },
      { 필드명: "상품명", 필수여부: "선택", 설명: "상품명 (참고용)", 예시: "트래픽 기본" },
      { 필드명: "수량", 필수여부: "필수", 설명: "발주 수량 (숫자)", 예시: "100" },
      { 필드명: "단가", 필수여부: "선택", 설명: "단가 (자동 계산 가능)", 예시: "1000" },
      { 필드명: "금액", 필수여부: "선택", 설명: "총 금액 (자동 계산 가능)", 예시: "100000" },
      { 필드명: "시작일", 필수여부: "선택", 설명: "발주 시작일 (YYYY-MM-DD)", 예시: "2026-01-20" },
      { 필드명: "종료일", 필수여부: "선택", 설명: "발주 종료일 (YYYY-MM-DD)", 예시: "2026-01-26" },
      { 필드명: "비고", 필수여부: "선택", 설명: "추가 메모", 예시: "" },
    ];

    const descSheet = XLSX.utils.json_to_sheet(fieldDescriptions);
    descSheet["!cols"] = [
      { wch: 12 },
      { wch: 8 },
      { wch: 40 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(workbook, descSheet, "필드설명");

    // Excel 파일 생성
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // 파일명 생성
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const filename = `발주_엑셀_양식_${dateStr}.xlsx`;

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
