import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from "xlsx";

/**
 * 매장 엑셀 양식 다운로드 API
 *
 * GET /api/stores/template
 */

const templateData = [
  {
    매장명: "샘플카페 강남점",
    MID: "1234567890",
    "Place URL": "https://place.map.naver.com/place/1234567890",
    사업자번호: "1234567890",
    대표자: "홍길동",
    담당자: "김담당",
    연락처: "010-1234-5678",
    이메일: "sample@example.com",
    주소: "서울특별시 강남구 테헤란로 123",
    업종: "카페/음식점",
    상태: "ACTIVE",
    비고: "샘플 데이터",
  },
  {
    매장명: "테스트식당 역삼점",
    MID: "9876543210",
    "Place URL": "https://place.map.naver.com/place/9876543210",
    사업자번호: "9876543210",
    대표자: "이대표",
    담당자: "박담당",
    연락처: "010-9876-5432",
    이메일: "test@example.com",
    주소: "서울특별시 강남구 역삼로 456",
    업종: "한식",
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
      { wch: 20 }, // 매장명
      { wch: 15 }, // MID
      { wch: 45 }, // Place URL
      { wch: 15 }, // 사업자번호
      { wch: 10 }, // 대표자
      { wch: 10 }, // 담당자
      { wch: 15 }, // 연락처
      { wch: 25 }, // 이메일
      { wch: 40 }, // 주소
      { wch: 15 }, // 업종
      { wch: 10 }, // 상태
      { wch: 20 }, // 비고
    ];

    // 시트 추가
    XLSX.utils.book_append_sheet(workbook, dataSheet, "매장목록");

    // 필드 설명 시트 (두 번째 시트)
    const fieldDescriptions = [
      { 필드명: "매장명", 필수여부: "필수", 설명: "네이버 플레이스 매장명", 예시: "샘플카페 강남점" },
      { 필드명: "MID", 필수여부: "필수", 설명: "네이버 플레이스 MID (고유번호)", 예시: "1234567890" },
      { 필드명: "Place URL", 필수여부: "선택", 설명: "네이버 플레이스 URL", 예시: "https://place.map.naver.com/place/1234567890" },
      { 필드명: "사업자번호", 필수여부: "선택", 설명: "10자리 숫자 (하이픈 제외)", 예시: "1234567890" },
      { 필드명: "대표자", 필수여부: "선택", 설명: "매장 대표자 이름", 예시: "홍길동" },
      { 필드명: "담당자", 필수여부: "선택", 설명: "담당자 이름", 예시: "김담당" },
      { 필드명: "연락처", 필수여부: "선택", 설명: "전화번호", 예시: "010-1234-5678" },
      { 필드명: "이메일", 필수여부: "선택", 설명: "이메일 주소", 예시: "sample@example.com" },
      { 필드명: "주소", 필수여부: "선택", 설명: "매장 주소", 예시: "서울특별시 강남구 테헤란로 123" },
      { 필드명: "업종", 필수여부: "선택", 설명: "매장 업종/카테고리", 예시: "카페/음식점" },
      { 필드명: "상태", 필수여부: "선택", 설명: "ACTIVE(활성), PAUSED(일시정지), TERMINATED(종료)", 예시: "ACTIVE" },
      { 필드명: "비고", 필수여부: "선택", 설명: "추가 메모", 예시: "" },
    ];

    const descSheet = XLSX.utils.json_to_sheet(fieldDescriptions);
    descSheet["!cols"] = [
      { wch: 12 }, // 필드명
      { wch: 8 },  // 필수여부
      { wch: 40 }, // 설명
      { wch: 45 }, // 예시
    ];
    XLSX.utils.book_append_sheet(workbook, descSheet, "필드설명");

    // Excel 파일 생성
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // 파일명 생성
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const filename = `매장_엑셀_양식_${dateStr}.xlsx`;

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
