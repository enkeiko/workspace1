import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { format } from "date-fns";

/**
 * 발주 데이터 내보내기 API (Excel 파일 다운로드)
 *
 * GET /api/purchase-orders/export
 *
 * Query Parameters:
 * - ids: 선택된 발주 ID 목록 (comma separated)
 * - status: 상태 필터
 * - format: 응답 형식 (json | xlsx, 기본값: xlsx)
 */

const statusLabelMap: Record<string, string> = {
  DRAFT: "초안",
  PENDING: "대기",
  CONFIRMED: "확정",
  IN_PROGRESS: "진행중",
  COMPLETED: "완료",
  CANCELLED: "취소",
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
    const exportFormat = searchParams.get("format") || "xlsx";

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

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      select: {
        id: true,
        purchaseOrderNo: true,
        orderDate: true,
        orderWeek: true,
        status: true,
        totalQty: true,
        totalAmount: true,
        memo: true,
        channel: {
          select: { name: true, code: true },
        },
        salesOrder: {
          select: { salesOrderNo: true },
        },
        createdBy: {
          select: { name: true },
        },
        items: {
          select: {
            id: true,
            totalQty: true,
            dailyQty: true,
            unitPrice: true,
            amount: true,
            startDate: true,
            endDate: true,
            keyword: true,
            store: {
              select: { mid: true, name: true },
            },
            product: {
              select: { code: true, name: true },
            },
          },
        },
      },
      orderBy: { orderDate: "desc" },
    });

    // JSON 형식 요청 시
    if (exportFormat === "json") {
      return NextResponse.json({
        data: purchaseOrders,
        total: purchaseOrders.length,
      });
    }

    // Excel 파일 생성 - 발주 요약
    const summaryData = purchaseOrders.map((order) => ({
      발주번호: order.purchaseOrderNo,
      수주번호: order.salesOrder?.salesOrderNo || "",
      채널명: order.channel.name,
      채널코드: order.channel.code,
      발주일: format(new Date(order.orderDate), "yyyy-MM-dd"),
      발주주차: order.orderWeek,
      상태: statusLabelMap[order.status] || order.status,
      총수량: order.totalQty,
      총금액: order.totalAmount,
      담당자: order.createdBy.name,
      비고: order.memo || "",
    }));

    // 발주 상세 항목
    const detailData: Record<string, unknown>[] = [];
    for (const order of purchaseOrders) {
      for (const item of order.items) {
        detailData.push({
          발주번호: order.purchaseOrderNo,
          채널코드: order.channel.code,
          매장MID: item.store?.mid || "",
          매장명: item.store?.name || "",
          키워드: item.keyword || "",
          상품코드: item.product?.code || "",
          상품명: item.product?.name || "",
          수량: item.totalQty,
          단가: item.unitPrice,
          금액: item.amount,
          시작일: item.startDate ? format(new Date(item.startDate), "yyyy-MM-dd") : "",
          종료일: item.endDate ? format(new Date(item.endDate), "yyyy-MM-dd") : "",
        });
      }
    }

    // 워크북 생성
    const workbook = XLSX.utils.book_new();

    // 요약 시트
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet["!cols"] = [
      { wch: 18 }, // 발주번호
      { wch: 18 }, // 수주번호
      { wch: 15 }, // 채널명
      { wch: 10 }, // 채널코드
      { wch: 12 }, // 발주일
      { wch: 12 }, // 발주주차
      { wch: 10 }, // 상태
      { wch: 10 }, // 총수량
      { wch: 12 }, // 총금액
      { wch: 10 }, // 담당자
      { wch: 20 }, // 비고
    ];
    XLSX.utils.book_append_sheet(workbook, summarySheet, "발주요약");

    // 상세 시트
    const detailSheet = XLSX.utils.json_to_sheet(detailData);
    detailSheet["!cols"] = [
      { wch: 18 }, // 발주번호
      { wch: 10 }, // 채널코드
      { wch: 15 }, // 매장MID
      { wch: 20 }, // 매장명
      { wch: 15 }, // 키워드
      { wch: 15 }, // 상품코드
      { wch: 15 }, // 상품명
      { wch: 10 }, // 수량
      { wch: 12 }, // 단가
      { wch: 12 }, // 금액
      { wch: 12 }, // 시작일
      { wch: 12 }, // 종료일
    ];
    XLSX.utils.book_append_sheet(workbook, detailSheet, "발주상세");

    // Excel 파일 생성
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // 파일명 생성
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const filename = `발주_내보내기_${dateStr}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error("Failed to export purchase orders:", error);
    return NextResponse.json(
      { error: "발주 데이터 내보내기에 실패했습니다" },
      { status: 500 }
    );
  }
}
