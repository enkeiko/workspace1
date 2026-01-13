import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek, addDays, format } from "date-fns";

/**
 * 주간 발주 그리드 데이터 로드 API
 *
 * GET /api/purchase-orders/grid-load?weekKey=2026-W02
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekKey = searchParams.get("weekKey");

    if (!weekKey) {
      return NextResponse.json(
        { error: "weekKey 파라미터가 필요합니다" },
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

    // 주간 시작/종료일 계산
    const jan1 = new Date(year, 0, 1);
    const weekStart = addDays(startOfWeek(jan1, { weekStartsOn: 1 }), (week - 1) * 7);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    // 해당 주의 발주 조회
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        orderWeek: weekKey,
        status: { not: "CANCELLED" },
      },
      include: {
        items: {
          include: {
            store: {
              select: {
                id: true,
                name: true,
                mid: true,
                customerId: true,
                customer: {
                  select: { name: true },
                },
              },
            },
            product: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
          },
        },
        channel: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // 상품 목록 조회
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        saleUnitPrice: true,
        costUnitPrice: true,
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    // 매장별 데이터 그룹핑
    const storeMap = new Map<string, {
      storeId: string;
      storeName: string;
      storeMid: string;
      customerId?: string;
      customerName?: string;
      cells: Record<string, {
        qty: number;
        startDate: string;
        endDate: string;
        isManualOverride: boolean;
        status: string;
        linkedPurchaseOrderItemId: string;
      }>;
    }>();

    for (const po of purchaseOrders) {
      for (const item of po.items) {
        if (!item.store || !item.product) continue;

        if (!storeMap.has(item.store.id)) {
          storeMap.set(item.store.id, {
            storeId: item.store.id,
            storeName: item.store.name,
            storeMid: item.store.mid,
            customerId: item.store.customerId || undefined,
            customerName: item.store.customer?.name,
            cells: {},
          });
        }

        const storeData = storeMap.get(item.store.id)!;
        storeData.cells[item.product.code] = {
          qty: item.totalQty,
          startDate: format(item.startDate, "yyyy-MM-dd"),
          endDate: format(item.endDate, "yyyy-MM-dd"),
          isManualOverride: item.isManualOverride,
          status: item.status,
          linkedPurchaseOrderItemId: item.id,
        };
      }
    }

    // 발주가 없는 활성 매장도 포함
    const allStores = await prisma.store.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        mid: true,
        customerId: true,
        customer: {
          select: { name: true },
        },
      },
      orderBy: { name: "asc" },
    });

    for (const store of allStores) {
      if (!storeMap.has(store.id)) {
        storeMap.set(store.id, {
          storeId: store.id,
          storeName: store.name,
          storeMid: store.mid,
          customerId: store.customerId || undefined,
          customerName: store.customer?.name,
          cells: {},
        });
      }
    }

    return NextResponse.json({
      weekKey,
      startDate: format(weekStart, "yyyy-MM-dd"),
      endDate: format(weekEnd, "yyyy-MM-dd"),
      stores: Array.from(storeMap.values()).map((store) => ({
        ...store,
        rowStatus: Object.keys(store.cells).length > 0 ? "UNCHANGED" : "NEW",
      })),
      products: products.map((p) => ({
        productId: p.id,
        productCode: p.code,
        productName: p.name,
        productType: p.type,
        saleUnitPrice: p.saleUnitPrice,
        costUnitPrice: p.costUnitPrice,
      })),
    });
  } catch (error) {
    console.error("Grid load error:", error);
    return NextResponse.json(
      { error: "그리드 데이터 로드 실패" },
      { status: 500 }
    );
  }
}
