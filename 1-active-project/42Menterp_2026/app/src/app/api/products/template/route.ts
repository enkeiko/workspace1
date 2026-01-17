import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from "xlsx";

/**
 * 상품 엑셀 양식 다운로드 API
 *
 * GET /api/products/template
 */

const templateData = [
  {
    상품코드: "TRAFFIC-01",
    상품명: "트래픽 기본",
    상품유형: "TRAFFIC",
    판매단가: 1000,
    매입단가: 500,
    설명: "네이버 플레이스 방문 트래픽 상품",
    활성상태: "Y",
  },
  {
    상품코드: "REVIEW-01",
    상품명: "리뷰 기본",
    상품유형: "REVIEW",
    판매단가: 5000,
    매입단가: 3000,
    설명: "리뷰 작성 마케팅 상품",
    활성상태: "Y",
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
      { wch: 15 }, // 상품코드
      { wch: 20 }, // 상품명
      { wch: 12 }, // 상품유형
      { wch: 12 }, // 판매단가
      { wch: 12 }, // 매입단가
      { wch: 40 }, // 설명
      { wch: 10 }, // 활성상태
    ];

    // 시트 추가
    XLSX.utils.book_append_sheet(workbook, dataSheet, "상품목록");

    // 필드 설명 시트
    const fieldDescriptions = [
      { 필드명: "상품코드", 필수여부: "필수", 설명: "상품 고유 코드 (중복 불가)", 예시: "TRAFFIC-01" },
      { 필드명: "상품명", 필수여부: "필수", 설명: "상품 이름", 예시: "트래픽 기본" },
      { 필드명: "상품유형", 필수여부: "필수", 설명: "TRAFFIC, DIRECTION, REVIEW, BLOG, SAVE, RECEIPT 중 선택", 예시: "TRAFFIC" },
      { 필드명: "판매단가", 필수여부: "선택", 설명: "고객에게 판매하는 가격 (숫자)", 예시: "1000" },
      { 필드명: "매입단가", 필수여부: "선택", 설명: "채널에 지불하는 비용 (숫자)", 예시: "500" },
      { 필드명: "설명", 필수여부: "선택", 설명: "상품 설명", 예시: "네이버 플레이스 방문 트래픽 상품" },
      { 필드명: "활성상태", 필수여부: "선택", 설명: "Y(활성) 또는 N(비활성), 기본값: Y", 예시: "Y" },
    ];

    const descSheet = XLSX.utils.json_to_sheet(fieldDescriptions);
    descSheet["!cols"] = [
      { wch: 12 }, // 필드명
      { wch: 8 },  // 필수여부
      { wch: 50 }, // 설명
      { wch: 20 }, // 예시
    ];
    XLSX.utils.book_append_sheet(workbook, descSheet, "필드설명");

    // 상품유형 참조 시트
    const typeRef = [
      { 코드: "TRAFFIC", 설명: "트래픽 - 네이버 플레이스 방문 트래픽" },
      { 코드: "DIRECTION", 설명: "길찾기 - 네이버 지도 길찾기 요청" },
      { 코드: "REVIEW", 설명: "리뷰 - 리뷰 작성 마케팅" },
      { 코드: "BLOG", 설명: "블로그 - 블로그 포스팅 마케팅" },
      { 코드: "SAVE", 설명: "저장 - 플레이스 저장 마케팅" },
      { 코드: "RECEIPT", 설명: "영수증 - 영수증 리뷰 마케팅" },
    ];
    const typeSheet = XLSX.utils.json_to_sheet(typeRef);
    typeSheet["!cols"] = [
      { wch: 12 },
      { wch: 40 },
    ];
    XLSX.utils.book_append_sheet(workbook, typeSheet, "상품유형코드");

    // Excel 파일 생성
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // 파일명 생성
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const filename = `상품_엑셀_양식_${dateStr}.xlsx`;

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
