import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { format } from "date-fns";

/**
 * 관리자 데이터 내보내기 API (Excel 파일 다운로드)
 *
 * GET /api/users/export
 *
 * Query Parameters:
 * - ids: 선택된 관리자 ID 목록 (comma separated)
 * - status: 상태 필터
 * - role: 역할 필터
 */

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "슈퍼관리자",
  ADMIN: "관리자",
  PARTNER_ADMIN: "파트너관리자",
  OPERATOR: "운영자",
  VIEWER: "열람자",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "활성",
  INACTIVE: "비활성",
  SUSPENDED: "정지",
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // SUPER_ADMIN 또는 ADMIN만 접근 가능
    if (session.user?.role !== "SUPER_ADMIN" && session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    const status = searchParams.get("status");
    const role = searchParams.get("role");

    const where: Record<string, unknown> = {};

    // 선택된 ID 필터
    if (idsParam) {
      const ids = idsParam.split(",").filter(Boolean);
      if (ids.length > 0) {
        where.id = { in: ids };
      }
    }

    // 상태 필터
    if (status) {
      where.status = status;
    }

    // 역할 필터
    if (role) {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        tenant: {
          select: {
            code: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Excel 데이터 변환
    const excelData = users.map((user) => ({
      이메일: user.email,
      이름: user.name,
      전화번호: user.phone || "",
      역할: user.role,
      역할명: roleLabels[user.role] || user.role,
      파트너사코드: user.tenant?.code || "",
      파트너사명: user.tenant?.name || "본사",
      상태: user.status,
      상태명: statusLabels[user.status] || user.status,
      마지막로그인: user.lastLoginAt
        ? format(new Date(user.lastLoginAt), "yyyy-MM-dd HH:mm")
        : "",
      등록일: format(new Date(user.createdAt), "yyyy-MM-dd HH:mm"),
    }));

    // 워크북 생성
    const workbook = XLSX.utils.book_new();

    // 데이터 시트
    const dataSheet = XLSX.utils.json_to_sheet(excelData);
    dataSheet["!cols"] = [
      { wch: 25 }, // 이메일
      { wch: 15 }, // 이름
      { wch: 15 }, // 전화번호
      { wch: 15 }, // 역할
      { wch: 12 }, // 역할명
      { wch: 12 }, // 파트너사코드
      { wch: 15 }, // 파트너사명
      { wch: 10 }, // 상태
      { wch: 10 }, // 상태명
      { wch: 18 }, // 마지막로그인
      { wch: 18 }, // 등록일
    ];
    XLSX.utils.book_append_sheet(workbook, dataSheet, "관리자목록");

    // Excel 파일 생성
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // 파일명 생성
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const filename = `관리자_내보내기_${dateStr}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error("Failed to export users:", error);
    return NextResponse.json(
      { error: "관리자 데이터 내보내기에 실패했습니다" },
      { status: 500 }
    );
  }
}
