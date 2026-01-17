import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

/**
 * 상품 데이터 내보내기 API (Excel 파일 다운로드)
 *
 * GET /api/products/export
 *
 * Query Parameters:
 * - ids: 선택된 상품 ID 목록 (comma separated)
 * - type: 상품 유형 필터
 * - format: 응답 형식 (json | xlsx, 기본값: xlsx)
 */

const typeLabelMap: Record<string, string> = {
  TRAFFIC: "트래픽",
  DIRECTION: "길찾기",
  REVIEW: "리뷰",
  BLOG: "블로그",
  SAVE: "저장",
  RECEIPT: "영수증",
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    const type = searchParams.get("type");
    const format = searchParams.get("format") || "xlsx";

    const where: Record<string, unknown> = {};

    // 선택된 ID 필터
    if (idsParam) {
      const ids = idsParam.split(",").filter(Boolean);
      if (ids.length > 0) {
        where.id = { in: ids };
      }
    }

    // 유형 필터
    if (type) {
      where.type = type;
    }

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        description: true,
        saleUnitPrice: true,
        costUnitPrice: true,
        isActive: true,
        channel: {
          select: { name: true, code: true },
        },
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    // JSON 형식 요청 시
    if (format === "json") {
      return NextResponse.json({
        data: products,
        total: products.length,
      });
    }

    // Excel 파일 생성
    const excelData = products.map((product) => ({
      상품코드: product.code,
      상품명: product.name,
      상품유형: product.type,
      상품유형명: typeLabelMap[product.type] || product.type,
      판매단가: product.saleUnitPrice,
      매입단가: product.costUnitPrice,
      마진: product.saleUnitPrice - product.costUnitPrice,
      채널: product.channel ? `${product.channel.name} (${product.channel.code})` : "",
      설명: product.description || "",
      활성상태: product.isActive ? "Y" : "N",
    }));

    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    const dataSheet = XLSX.utils.json_to_sheet(excelData);

    // 컬럼 너비 설정
    dataSheet["!cols"] = [
      { wch: 15 }, // 상품코드
      { wch: 20 }, // 상품명
      { wch: 12 }, // 상품유형
      { wch: 10 }, // 상품유형명
      { wch: 12 }, // 판매단가
      { wch: 12 }, // 매입단가
      { wch: 12 }, // 마진
      { wch: 20 }, // 채널
      { wch: 40 }, // 설명
      { wch: 10 }, // 활성상태
    ];

    XLSX.utils.book_append_sheet(workbook, dataSheet, "상품목록");

    // Excel 파일 생성
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // 파일명 생성
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const filename = `상품_내보내기_${dateStr}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error("Failed to export products:", error);
    return NextResponse.json(
      { error: "상품 데이터 내보내기에 실패했습니다" },
      { status: 500 }
    );
  }
}
