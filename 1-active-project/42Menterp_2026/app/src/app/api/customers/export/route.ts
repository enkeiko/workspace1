import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

/**
 * 고객 데이터 내보내기 API (Excel 파일 다운로드)
 *
 * GET /api/customers/export
 *
 * Query Parameters:
 * - ids: 선택된 고객 ID 목록 (comma separated)
 * - status: 상태 필터
 * - format: 응답 형식 (json | xlsx, 기본값: xlsx)
 */

const statusLabelMap: Record<string, string> = {
  ACTIVE: "활성",
  PAUSED: "일시정지",
  TERMINATED: "종료",
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    const status = searchParams.get("status");
    const format = searchParams.get("format") || "xlsx";

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

    const customers = await prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        businessNo: true,
        representative: true,
        contactName: true,
        contactPhone: true,
        contactEmail: true,
        address: true,
        status: true,
        memo: true,
        contractStart: true,
        contractEnd: true,
        _count: {
          select: { stores: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // JSON 형식 요청 시
    if (format === "json") {
      return NextResponse.json({
        data: customers,
        total: customers.length,
      });
    }

    // Excel 파일 생성
    const excelData = customers.map((customer) => ({
      고객명: customer.name,
      사업자번호: customer.businessNo || "",
      대표자명: customer.representative || "",
      담당자명: customer.contactName || "",
      연락처: customer.contactPhone || "",
      이메일: customer.contactEmail || "",
      주소: customer.address || "",
      상태: statusLabelMap[customer.status] || customer.status,
      매장수: customer._count.stores,
      계약시작: customer.contractStart
        ? new Date(customer.contractStart).toLocaleDateString("ko-KR")
        : "",
      계약종료: customer.contractEnd
        ? new Date(customer.contractEnd).toLocaleDateString("ko-KR")
        : "",
      비고: customer.memo || "",
    }));

    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    const dataSheet = XLSX.utils.json_to_sheet(excelData);

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
      { wch: 8 },  // 매장수
      { wch: 12 }, // 계약시작
      { wch: 12 }, // 계약종료
      { wch: 20 }, // 비고
    ];

    XLSX.utils.book_append_sheet(workbook, dataSheet, "고객목록");

    // Excel 파일 생성
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // 파일명 생성
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const filename = `고객_내보내기_${dateStr}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error("Failed to export customers:", error);
    return NextResponse.json(
      { error: "고객 데이터 내보내기에 실패했습니다" },
      { status: 500 }
    );
  }
}
