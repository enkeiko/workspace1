import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek, addDays, format, differenceInDays, parseISO } from "date-fns";

/**
 * 주간 발주 그리드 저장 API
 *
 * POST /api/purchase-orders/grid-save
 *
 * 기능:
 * 1. 그리드 데이터를 SalesOrder/PurchaseOrder로 변환
 * 2. Manual Override 항목 보호
 * 3. 기존 항목 업데이트/신규 생성
 */

interface GridSaveRow {
  storeId: string;
  cells: {
    productCode: string;
    qty: number;
    startDate: string;
    endDate: string;
  }[];
}

interface GridSaveRequest {
  weekKey: string;
  rows: GridSaveRow[];
  createSalesOrder?: boolean;
  createPurchaseOrder?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: GridSaveRequest = await request.json();
    const {
      weekKey,
      rows,
      createSalesOrder = true,
      createPurchaseOrder = true,
    } = body;

    if (!weekKey || !rows) {
      return NextResponse.json(
        { error: "weekKey와 rows가 필요합니다" },
        { status: 400 }
      );
    }

    // weekKey 파싱 (YYYY-WXX)
    const [yearStr, weekStr] = weekKey.split("-W");
    const year = parseInt(yearStr);
    const week = parseInt(weekStr);

    if (isNaN(year) || isNaN(week)) {
      return NextResponse.json(
        { error: "유효하지 않은 weekKey 형식" },
        { status: 400 }
      );
    }

    // 주간 시작일 계산
    const jan1 = new Date(year, 0, 1);
    const weekStart = addDays(startOfWeek(jan1, { weekStartsOn: 1 }), (week - 1) * 7);

    const summary = {
      salesOrdersCreated: 0,
      purchaseOrdersCreated: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
    };
    const errors: { storeId: string; productCode: string; error: string }[] = [];

    // 상품 코드 -> ID 매핑
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, code: true, type: true, channelId: true },
    });
    const productMap = new Map(products.map((p) => [p.code, p]));

    // 채널별 그룹핑 (발주는 채널별로 생성)
    const channelGroups = new Map<string, {
      channelId: string;
      items: {
        storeId: string;
        productId: string;
        productType: string;
        qty: number;
        startDate: string;
        endDate: string;
      }[];
    }>();

    for (const row of rows) {
      for (const cell of row.cells) {
        if (cell.qty <= 0) continue;

        const product = productMap.get(cell.productCode);
        if (!product) {
          errors.push({
            storeId: row.storeId,
            productCode: cell.productCode,
            error: "상품을 찾을 수 없음",
          });
          continue;
        }

        // 채널 ID가 없으면 기본값 사용 또는 스킵
        const channelId = product.channelId || "DEFAULT";

        if (!channelGroups.has(channelId)) {
          channelGroups.set(channelId, {
            channelId,
            items: [],
          });
        }

        channelGroups.get(channelId)!.items.push({
          storeId: row.storeId,
          productId: product.id,
          productType: product.type,
          qty: cell.qty,
          startDate: cell.startDate,
          endDate: cell.endDate,
        });
      }
    }

    // 채널별 발주 생성
    for (const [channelId, group] of channelGroups) {
      if (group.items.length === 0) continue;

      // 기존 발주 확인
      let purchaseOrder = await prisma.purchaseOrder.findFirst({
        where: {
          orderWeek: weekKey,
          channelId: channelId === "DEFAULT" ? undefined : channelId,
          status: { not: "CANCELLED" },
        },
        include: { items: true },
      });

      // 새 발주 생성 또는 기존 발주 사용
      if (!purchaseOrder && createPurchaseOrder && channelId !== "DEFAULT") {
        // 발주 번호 생성
        const dateStr = format(new Date(), "yyMMdd");
        const count = await prisma.purchaseOrder.count({
          where: {
            purchaseOrderNo: { startsWith: `PO${dateStr}` },
          },
        });
        const purchaseOrderNo = `PO${dateStr}-${String(count + 1).padStart(4, "0")}`;

        purchaseOrder = await prisma.purchaseOrder.create({
          data: {
            purchaseOrderNo,
            orderWeek: weekKey,
            orderDate: weekStart,
            channelId,
            status: "DRAFT",
            createdById: session.user.id,
          },
          include: { items: true },
        });
        summary.purchaseOrdersCreated++;
      }

      // 각 항목 처리
      for (const item of group.items) {
        const startDate = parseISO(item.startDate);
        const endDate = parseISO(item.endDate);
        const workDays = differenceInDays(endDate, startDate) + 1;
        const dailyQty = Math.ceil(item.qty / workDays);

        // 기존 항목 확인
        const existingItem = purchaseOrder?.items.find(
          (i) => i.storeId === item.storeId && i.productId === item.productId
        );

        if (existingItem) {
          // Manual Override 보호
          if (existingItem.isManualOverride) {
            summary.itemsSkipped++;
            continue;
          }

          // 기존 항목 업데이트
          await prisma.purchaseOrderItem.update({
            where: { id: existingItem.id },
            data: {
              totalQty: item.qty,
              dailyQty,
              startDate,
              endDate,
              workDays,
              amount: item.qty * 35, // TODO: 실제 단가 적용
            },
          });
          summary.itemsUpdated++;
        } else if (purchaseOrder) {
          // 새 항목 생성
          await prisma.purchaseOrderItem.create({
            data: {
              purchaseOrderId: purchaseOrder.id,
              storeId: item.storeId,
              productId: item.productId,
              productType: item.productType as "TRAFFIC" | "DIRECTION" | "REVIEW" | "SAVE" | "BLOG" | "RECEIPT",
              keyword: "",
              totalQty: item.qty,
              dailyQty,
              startDate,
              endDate,
              workDays,
              unitPrice: 35, // TODO: 실제 단가 적용
              amount: item.qty * 35,
              status: "PENDING",
            },
          });
          summary.itemsCreated++;
        }
      }

      // 발주 합계 업데이트
      if (purchaseOrder) {
        const totals = await prisma.purchaseOrderItem.aggregate({
          where: { purchaseOrderId: purchaseOrder.id },
          _sum: {
            totalQty: true,
            amount: true,
          },
        });

        await prisma.purchaseOrder.update({
          where: { id: purchaseOrder.id },
          data: {
            totalQty: totals._sum.totalQty || 0,
            totalAmount: totals._sum.amount || 0,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Grid save error:", error);
    return NextResponse.json(
      { error: "그리드 저장 실패" },
      { status: 500 }
    );
  }
}
