import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  appendRows,
  formatOrderDataForSheet,
  OrderExportData,
} from "@/lib/google-sheets";
import { z } from "zod";
import { format } from "date-fns";

const exportSchema = z.object({
  purchaseOrderId: z.string(),
  channelSheetId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { purchaseOrderId, channelSheetId } = exportSchema.parse(body);

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        channel: true,
        items: {
          include: {
            store: true,
          },
        },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "발주를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const channelSheet = await prisma.channelSheet.findUnique({
      where: { id: channelSheetId },
    });

    if (!channelSheet) {
      return NextResponse.json(
        { error: "시트 설정을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (channelSheet.channelId !== purchaseOrder.channelId) {
      return NextResponse.json(
        { error: "채널과 시트가 일치하지 않습니다" },
        { status: 400 }
      );
    }

    const exportData: OrderExportData[] = purchaseOrder.items.map((item) => ({
      storeName: item.store.name,
      mid: item.store.mid,
      placeUrl: item.store.placeUrl || "",
      keyword: item.keyword,
      dailyQty: item.dailyQty,
      startDate: format(new Date(item.startDate), "yyyy-MM-dd"),
      endDate: format(new Date(item.endDate), "yyyy-MM-dd"),
      workDays: item.workDays,
      totalQty: item.totalQty,
      unitPrice: item.unitPrice,
      amount: item.amount,
      note: item.note || "",
    }));

    const rows = formatOrderDataForSheet(exportData, purchaseOrder.channel.code);

    try {
      await appendRows(
        channelSheet.spreadsheetId,
        channelSheet.sheetTabName,
        rows
      );
    } catch (sheetError) {
      console.error("Google Sheets API error:", sheetError);

      await prisma.purchaseOrderExport.create({
        data: {
          purchaseOrderId,
          channelSheetId,
          spreadsheetUrl: channelSheet.spreadsheetUrl,
          sheetTabName: channelSheet.sheetTabName,
          status: "FAILED",
          errorMessage:
            sheetError instanceof Error
              ? sheetError.message
              : "Google Sheets API 오류",
          exportedById: session.user.id,
        },
      });

      return NextResponse.json(
        {
          error:
            "Google Sheets에 데이터를 쓰는데 실패했습니다. 시트 권한을 확인하세요.",
        },
        { status: 500 }
      );
    }

    const exportRecord = await prisma.purchaseOrderExport.create({
      data: {
        purchaseOrderId,
        channelSheetId,
        spreadsheetUrl: channelSheet.spreadsheetUrl,
        sheetTabName: channelSheet.sheetTabName,
        rowRange: `${rows.length} rows`,
        status: "SUCCESS",
        exportedById: session.user.id,
      },
    });

    if (purchaseOrder.status === "PENDING") {
      await prisma.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: "CONFIRMED" },
      });
    }

    return NextResponse.json({
      success: true,
      exportId: exportRecord.id,
      spreadsheetUrl: channelSheet.spreadsheetUrl,
      rowCount: rows.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to export purchase order:", error);
    return NextResponse.json(
      { error: "발주서 출력에 실패했습니다" },
      { status: 500 }
    );
  }
}
