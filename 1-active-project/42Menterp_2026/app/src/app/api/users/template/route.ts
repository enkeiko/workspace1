import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from "xlsx";

/**
 * 관리자 엑셀 양식 다운로드 API
 *
 * GET /api/users/template
 */

const templateData = [
  {
    이메일: "admin@example.com",
    이름: "홍길동",
    전화번호: "010-1234-5678",
    역할: "ADMIN",
    파트너사코드: "",
    상태: "ACTIVE",
  },
  {
    이메일: "partner@example.com",
    이름: "김파트너",
    전화번호: "010-9876-5432",
    역할: "PARTNER_ADMIN",
    파트너사코드: "PT001",
    상태: "ACTIVE",
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
      { wch: 25 }, // 이메일
      { wch: 15 }, // 이름
      { wch: 15 }, // 전화번호
      { wch: 15 }, // 역할
      { wch: 15 }, // 파트너사코드
      { wch: 12 }, // 상태
    ];

    // 시트 추가
    XLSX.utils.book_append_sheet(workbook, dataSheet, "관리자목록");

    // 필드 설명 시트
    const fieldDescriptions = [
      { 필드명: "이메일", 필수여부: "필수", 설명: "로그인용 이메일 (고유값)", 예시: "admin@example.com" },
      { 필드명: "이름", 필수여부: "필수", 설명: "관리자 이름", 예시: "홍길동" },
      { 필드명: "전화번호", 필수여부: "선택", 설명: "연락처", 예시: "010-1234-5678" },
      { 필드명: "역할", 필수여부: "필수", 설명: "SUPER_ADMIN, ADMIN, PARTNER_ADMIN, OPERATOR, VIEWER", 예시: "ADMIN" },
      { 필드명: "파트너사코드", 필수여부: "선택", 설명: "소속 파트너사 코드 (PARTNER_ADMIN인 경우 필수)", 예시: "PT001" },
      { 필드명: "상태", 필수여부: "선택", 설명: "ACTIVE(활성), INACTIVE(비활성), SUSPENDED(정지)", 예시: "ACTIVE" },
    ];

    const descSheet = XLSX.utils.json_to_sheet(fieldDescriptions);
    descSheet["!cols"] = [
      { wch: 15 },
      { wch: 10 },
      { wch: 50 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(workbook, descSheet, "필드설명");

    // 역할 코드 시트
    const roleCodes = [
      { 역할코드: "SUPER_ADMIN", 설명: "슈퍼관리자 - 시스템 전체 권한" },
      { 역할코드: "ADMIN", 설명: "관리자 - 일반 관리 권한" },
      { 역할코드: "PARTNER_ADMIN", 설명: "파트너관리자 - 해당 파트너사 관리 권한" },
      { 역할코드: "OPERATOR", 설명: "운영자 - 운영 업무 권한" },
      { 역할코드: "VIEWER", 설명: "열람자 - 조회 전용" },
    ];

    const roleSheet = XLSX.utils.json_to_sheet(roleCodes);
    roleSheet["!cols"] = [
      { wch: 15 },
      { wch: 40 },
    ];
    XLSX.utils.book_append_sheet(workbook, roleSheet, "역할코드");

    // Excel 파일 생성
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // 파일명 생성
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const filename = `관리자_엑셀_양식_${dateStr}.xlsx`;

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
