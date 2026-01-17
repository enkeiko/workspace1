import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from "xlsx";

/**
 * 정산 엑셀 양식 다운로드 API
 *
 * GET /api/settlements/template
 */

const templateData = [
  {
    매장MID: "1234567890",
    매장명: "샘플카페 강남점",
    채널코드: "CH001",
    정산월: "2026-01",
    유형: "REVENUE",
    금액: 1000000,
    설명: "1월 매출",
    상태: "PENDING",
  },
  {
    매장MID: "9876543210",
    매장명: "테스트식당 역삼점",
    채널코드: "CH001",
    정산월: "2026-01",
    유형: "COST",
    금액: 500000,
    설명: "1월 비용",
    상태: "PENDING",
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
      { wch: 15 }, // 매장MID
      { wch: 20 }, // 매장명
      { wch: 12 }, // 채널코드
      { wch: 12 }, // 정산월
      { wch: 10 }, // 유형
      { wch: 12 }, // 금액
      { wch: 30 }, // 설명
      { wch: 12 }, // 상태
    ];

    // 시트 추가
    XLSX.utils.book_append_sheet(workbook, dataSheet, "정산목록");

    // 필드 설명 시트
    const fieldDescriptions = [
      { 필드명: "매장MID", 필수여부: "필수", 설명: "네이버 플레이스 MID", 예시: "1234567890" },
      { 필드명: "매장명", 필수여부: "선택", 설명: "매장명 (참고용)", 예시: "샘플카페 강남점" },
      { 필드명: "채널코드", 필수여부: "선택", 설명: "채널 코드", 예시: "CH001" },
      { 필드명: "정산월", 필수여부: "필수", 설명: "정산 월 (YYYY-MM)", 예시: "2026-01" },
      { 필드명: "유형", 필수여부: "필수", 설명: "REVENUE(매출) 또는 COST(비용)", 예시: "REVENUE" },
      { 필드명: "금액", 필수여부: "필수", 설명: "정산 금액 (숫자)", 예시: "1000000" },
      { 필드명: "설명", 필수여부: "선택", 설명: "정산 내용 설명", 예시: "1월 매출" },
      { 필드명: "상태", 필수여부: "선택", 설명: "PENDING(대기), CONFIRMED(확정), PAID(입금완료)", 예시: "PENDING" },
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
    const filename = `정산_엑셀_양식_${dateStr}.xlsx`;

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
