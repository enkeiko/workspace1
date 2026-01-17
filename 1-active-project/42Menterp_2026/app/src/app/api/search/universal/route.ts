import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Universal Search API
 *
 * 키워드로 캠페인, 매장, 키워드, 주문을 통합 검색합니다.
 *
 * GET /api/search/universal?q=강남&limit=20
 */

interface CampaignResult {
  keyword: string;
  stores: Array<{
    storeId: string;
    storeName: string;
    mid: string;
  }>;
  totalOrders: number;
  activeCount: number;
  completedCount: number;
  currentRank?: number;
}

interface SearchResponse {
  results: {
    campaigns: CampaignResult[];
    stores: Array<{
      id: string;
      name: string;
      mid: string;
      category: string | null;
      customerName: string | null;
      keywords: string[];
    }>;
    keywords: Array<{
      id: string;
      keyword: string;
      storeId: string;
      storeName: string;
      latestRank: number | null;
      rankChange: number | null;
    }>;
    orders: Array<{
      id: string;
      purchaseOrderNo: string;
      orderWeek: string;
      channelName: string;
      totalQty: number;
      totalAmount: number;
      status: string;
      itemCount: number;
    }>;
  };
  meta: {
    totalCount: number;
    query: string;
    searchTime: number;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<SearchResponse | { error: string }>> {
  const startTime = performance.now();

  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 검색어 추출
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "검색어는 2자 이상 입력해주세요" },
        { status: 400 }
      );
    }

    // 병렬 검색 실행
    const [campaignItems, stores, storeKeywords, purchaseOrders] = await Promise.all([
      // 1. 캠페인 (PurchaseOrderItem) 검색
      prisma.purchaseOrderItem.findMany({
        where: {
          OR: [
            { keyword: { contains: query, mode: "insensitive" } },
            { store: { name: { contains: query, mode: "insensitive" } } },
          ],
        },
        include: {
          store: true,
          purchaseOrder: {
            include: { channel: true },
          },
        },
        take: limit * 5, // 그룹핑을 위해 더 많이 가져옴
        orderBy: { createdAt: "desc" },
      }),

      // 2. 매장 (Store) 검색
      prisma.store.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { mid: { contains: query, mode: "insensitive" } },
            { category: { contains: query, mode: "insensitive" } },
          ],
        },
        include: {
          customer: true,
          keywords: {
            where: { isActive: true },
            take: 5,
          },
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),

      // 3. 키워드 (StoreKeyword) 검색
      prisma.storeKeyword.findMany({
        where: {
          keyword: { contains: query, mode: "insensitive" },
          isActive: true,
        },
        include: {
          store: true,
          rankings: {
            take: 1,
            orderBy: { checkDate: "desc" },
          },
        },
        take: limit,
        orderBy: { createdAt: "desc" },
      }),

      // 4. 주문 (PurchaseOrder) 검색
      prisma.purchaseOrder.findMany({
        where: {
          OR: [
            { purchaseOrderNo: { contains: query, mode: "insensitive" } },
            { memo: { contains: query, mode: "insensitive" } },
            { items: { some: { keyword: { contains: query, mode: "insensitive" } } } },
          ],
        },
        include: {
          channel: true,
          _count: { select: { items: true } },
        },
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // 캠페인 결과 키워드별 그룹핑
    const campaignMap = new Map<string, CampaignResult>();

    for (const item of campaignItems) {
      const existing = campaignMap.get(item.keyword);

      if (existing) {
        // 매장 추가 (중복 제거)
        if (!existing.stores.find((s) => s.storeId === item.storeId)) {
          existing.stores.push({
            storeId: item.storeId,
            storeName: item.store.name,
            mid: item.store.mid,
          });
        }
        existing.totalOrders++;
        if (item.status === "IN_PROGRESS" || item.status === "PENDING") {
          existing.activeCount++;
        }
        if (item.status === "COMPLETED") {
          existing.completedCount++;
        }
      } else {
        campaignMap.set(item.keyword, {
          keyword: item.keyword,
          stores: [
            {
              storeId: item.storeId,
              storeName: item.store.name,
              mid: item.store.mid,
            },
          ],
          totalOrders: 1,
          activeCount: item.status === "IN_PROGRESS" || item.status === "PENDING" ? 1 : 0,
          completedCount: item.status === "COMPLETED" ? 1 : 0,
        });
      }
    }

    // 결과 포맷팅
    const results: SearchResponse["results"] = {
      campaigns: Array.from(campaignMap.values()).slice(0, limit),

      stores: stores.map((store) => ({
        id: store.id,
        name: store.name,
        mid: store.mid,
        category: store.category,
        customerName: store.customer?.name || null,
        keywords: store.keywords.map((k) => k.keyword),
      })),

      keywords: storeKeywords.map((kw) => ({
        id: kw.id,
        keyword: kw.keyword,
        storeId: kw.storeId,
        storeName: kw.store.name,
        latestRank: kw.rankings[0]?.ranking || null,
        rankChange: kw.rankings[0]?.rankChange || null,
      })),

      orders: purchaseOrders.map((order) => ({
        id: order.id,
        purchaseOrderNo: order.purchaseOrderNo,
        orderWeek: order.orderWeek,
        channelName: order.channel.name,
        totalQty: order.totalQty,
        totalAmount: order.totalAmount,
        status: order.status,
        itemCount: order._count.items,
      })),
    };

    const endTime = performance.now();

    return NextResponse.json({
      results,
      meta: {
        totalCount:
          results.campaigns.length +
          results.stores.length +
          results.keywords.length +
          results.orders.length,
        query,
        searchTime: Math.round(endTime - startTime),
      },
    });
  } catch (error) {
    console.error("Universal search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "검색 실패" },
      { status: 500 }
    );
  }
}
