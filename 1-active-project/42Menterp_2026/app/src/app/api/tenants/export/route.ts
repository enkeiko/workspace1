import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { format } from "date-fns";

/**
 * 파트너사 데이터 내보내기 API (Excel 파일 다운로드)
 *
 * GET /api/tenants/export
 *
 * Query Parameters:
 * - ids: 선택된 파트너사 ID 목록 (comma separated)
 * - status: 상태 필터
 */

const statusLabels: Record<string, string> = {
  ACTIVE: "활성",
  INACTIVE: "비활성",
  SUSPENDED: "정지",
};

const commissionTypeLabels: Record<string, string> = {
  FIXED: "고정금액",
  RATE: "비율",
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

    const tenants = await prisma.tenant.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            stores: true,
            purchaseOrders: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Excel 데이터 변환
    const excelData = tenants.map((tenant) => ({
      파트너사명: tenant.name,
      코드: tenant.code,
      사업자번호: tenant.businessNo || "",
      대표자: tenant.representative || "",
      담당자명: tenant.contactName || "",
      담당자연락처: tenant.contactPhone || "",
      담당자이메일: tenant.contactEmail || "",
      주소: tenant.address || "",
      수수료유형: tenant.commissionType || "RATE",
      수수료유형명: commissionTypeLabels[tenant.commissionType || "RATE"] || "",
      기본수수료율: tenant.defaultCommissionRate != null
        ? String(tenant.defaultCommissionRate)
        : "",
      수수료율표시: tenant.defaultCommissionRate != null
        ? `${(tenant.defaultCommissionRate * 100).toFixed(0)}%`
        : "",
      은행명: tenant.bankName || "",
      계좌번호: tenant.bankAccount || "",
      예금주: tenant.bankHolder || "",
      계약시작일: tenant.contractStart
        ? format(new Date(tenant.contractStart), "yyyy-MM-dd")
        : "",
      계약종료일: tenant.contractEnd
        ? format(new Date(tenant.contractEnd), "yyyy-MM-dd")
        : "",
      상태: tenant.status,
      상태명: statusLabels[tenant.status] || tenant.status,
      담당자수: tenant._count.users,
      매장수: tenant._count.stores,
      발주수: tenant._count.purchaseOrders,
      메모: tenant.memo || "",
      등록일: format(new Date(tenant.createdAt), "yyyy-MM-dd HH:mm"),
    }));

    // 워크북 생성
    const workbook = XLSX.utils.book_new();

    // 데이터 시트
    const dataSheet = XLSX.utils.json_to_sheet(excelData);
    dataSheet["!cols"] = [
      { wch: 20 }, // 파트너사명
      { wch: 12 }, // 코드
      { wch: 15 }, // 사업자번호
      { wch: 12 }, // 대표자
      { wch: 12 }, // 담당자명
      { wch: 15 }, // 담당자연락처
      { wch: 25 }, // 담당자이메일
      { wch: 30 }, // 주소
      { wch: 10 }, // 수수료유형
      { wch: 10 }, // 수수료유형명
      { wch: 10 }, // 기본수수료율
      { wch: 10 }, // 수수료율표시
      { wch: 12 }, // 은행명
      { wch: 18 }, // 계좌번호
      { wch: 15 }, // 예금주
      { wch: 12 }, // 계약시작일
      { wch: 12 }, // 계약종료일
      { wch: 10 }, // 상태
      { wch: 10 }, // 상태명
      { wch: 8 },  // 담당자수
      { wch: 8 },  // 매장수
      { wch: 8 },  // 발주수
      { wch: 25 }, // 메모
      { wch: 18 }, // 등록일
    ];
    XLSX.utils.book_append_sheet(workbook, dataSheet, "파트너사목록");

    // Excel 파일 생성
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // 파일명 생성
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const filename = `파트너사_내보내기_${dateStr}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error("Failed to export tenants:", error);
    return NextResponse.json(
      { error: "파트너사 데이터 내보내기에 실패했습니다" },
      { status: 500 }
    );
  }
}
