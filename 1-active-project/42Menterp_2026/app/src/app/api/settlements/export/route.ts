import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { format, startOfMonth, endOfMonth } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || format(new Date(), "yyyy-MM");
    const exportFormat = searchParams.get("format") || "xlsx";

    const [year, monthNum] = month.split("-").map(Number);
    const monthStart = startOfMonth(new Date(year, monthNum - 1));
    const monthEnd = endOfMonth(new Date(year, monthNum - 1));

    // 정산 데이터 조회
    const settlements = await prisma.settlement.findMany({
      where: {
        settlementMonth: month,
      },
      include: {
        store: {
          select: { name: true, mid: true },
        },
        channel: {
          select: { name: true },
        },
        confirmedBy: {
          select: { name: true },
        },
      },
      orderBy: [{ type: "asc" }, { store: { name: "asc" } }],
    });

    // 매장별 집계
    const storeStats = await prisma.settlement.groupBy({
      by: ["storeId"],
      where: { settlementMonth: month },
      _sum: { amount: true },
    });

    const storeStatsWithDetails = await Promise.all(
      storeStats.map(async (stat) => {
        const store = await prisma.store.findUnique({
          where: { id: stat.storeId },
          select: { name: true, mid: true },
        });

        const revenue = await prisma.settlement.aggregate({
          where: { storeId: stat.storeId, settlementMonth: month, type: "REVENUE" },
          _sum: { amount: true },
        });

        const cost = await prisma.settlement.aggregate({
          where: { storeId: stat.storeId, settlementMonth: month, type: "COST" },
          _sum: { amount: true },
        });

        return {
          storeName: store?.name || "Unknown",
          storeMid: store?.mid || "",
          revenue: revenue._sum.amount || 0,
          cost: cost._sum.amount || 0,
          profit: (revenue._sum.amount || 0) - (cost._sum.amount || 0),
        };
      })
    );

    // 전체 요약
    const totalRevenue = settlements
      .filter((s) => s.type === "REVENUE")
      .reduce((sum, s) => sum + s.amount, 0);
    const totalCost = settlements
      .filter((s) => s.type === "COST")
      .reduce((sum, s) => sum + s.amount, 0);

    // Excel 워크북 생성
    const workbook = XLSX.utils.book_new();

    // 시트 1: 요약
    const summaryData = [
      ["42ment ERP 정산 보고서"],
      [`정산월: ${month}`],
      [`생성일: ${format(new Date(), "yyyy-MM-dd HH:mm")}`],
      [],
      ["구분", "금액"],
      ["총 매출", totalRevenue],
      ["총 비용", totalCost],
      ["순이익", totalRevenue - totalCost],
      ["이익률", totalRevenue > 0 ? `${(((totalRevenue - totalCost) / totalRevenue) * 100).toFixed(1)}%` : "0%"],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet["!cols"] = [{ wch: 15 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, "요약");

    // 시트 2: 매장별 현황
    const storeSheetData = [
      ["매장명", "MID", "매출", "비용", "순이익", "이익률"],
      ...storeStatsWithDetails.map((s) => [
        s.storeName,
        s.storeMid,
        s.revenue,
        s.cost,
        s.profit,
        s.revenue > 0 ? `${((s.profit / s.revenue) * 100).toFixed(1)}%` : "0%",
      ]),
    ];
    const storeSheet = XLSX.utils.aoa_to_sheet(storeSheetData);
    storeSheet["!cols"] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(workbook, storeSheet, "매장별");

    // 시트 3: 상세 내역
    const detailSheetData = [
      ["매장명", "MID", "채널", "유형", "금액", "설명", "상태", "확정자", "등록일"],
      ...settlements.map((s) => [
        s.store.name,
        s.store.mid,
        s.channel?.name || "-",
        s.type === "REVENUE" ? "매출" : "비용",
        s.amount,
        s.description || "",
        s.status === "PENDING" ? "대기" : s.status === "CONFIRMED" ? "확정" : "입금완료",
        s.confirmedBy?.name || "-",
        format(new Date(s.createdAt), "yyyy-MM-dd"),
      ]),
    ];
    const detailSheet = XLSX.utils.aoa_to_sheet(detailSheetData);
    detailSheet["!cols"] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
      { wch: 8 },
      { wch: 15 },
      { wch: 30 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(workbook, detailSheet, "상세내역");

    // 파일 생성
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const filename = `정산보고서_${month}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error("Failed to export settlements:", error);
    return NextResponse.json(
      { error: "정산 보고서 생성에 실패했습니다" },
      { status: 500 }
    );
  }
}
