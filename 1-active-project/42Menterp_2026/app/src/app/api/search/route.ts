import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Universal Search API
 *
 * 통합 검색: 고객사, 매장, 견적, 수주, 발주, 정산 등을 한 번에 검색
 */

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  url: string;
}

/**
 * GET: 통합 검색
 * Query params:
 * - q: 검색어 (필수)
 * - types: 검색 대상 타입 (comma separated, 선택)
 * - limit: 타입별 최대 결과 수 (기본 5)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const typesParam = searchParams.get("types");
    const limit = parseInt(searchParams.get("limit") || "5");

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "검색어는 2글자 이상이어야 합니다" },
        { status: 400 }
      );
    }

    const searchTypes = typesParam
      ? typesParam.split(",")
      : ["tenant", "store", "quotation", "salesOrder", "purchaseOrder", "settlement"];

    const results: SearchResult[] = [];

    // 병렬 검색 실행
    const searchPromises: Promise<void>[] = [];

    // 고객사 검색
    if (searchTypes.includes("tenant")) {
      searchPromises.push(
        (async () => {
          const tenants = await prisma.tenant.findMany({
            where: {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { businessNo: { contains: query } },
                { contactEmail: { contains: query, mode: "insensitive" } },
              ],
            },
            take: limit,
          });

          tenants.forEach((t) => {
            results.push({
              type: "tenant",
              id: t.id,
              title: t.name,
              subtitle: t.businessNo || undefined,
              url: `/tenants/${t.id}`,
            });
          });
        })()
      );
    }

    // 매장 검색
    if (searchTypes.includes("store")) {
      searchPromises.push(
        (async () => {
          const stores = await prisma.store.findMany({
            where: {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { mid: { contains: query } },
                { contactName: { contains: query, mode: "insensitive" } },
                { address: { contains: query, mode: "insensitive" } },
              ],
            },
            include: {
              tenant: { select: { name: true } },
            },
            take: limit,
          });

          stores.forEach((s) => {
            results.push({
              type: "store",
              id: s.id,
              title: s.name,
              subtitle: `${s.tenant?.name || "고객사 없음"} | ${s.mid || "MID 없음"}`,
              status: s.status,
              url: `/stores/${s.id}`,
            });
          });
        })()
      );
    }

    // 견적 검색
    if (searchTypes.includes("quotation")) {
      searchPromises.push(
        (async () => {
          const quotations = await prisma.quotation.findMany({
            where: {
              OR: [
                { quotationNo: { contains: query, mode: "insensitive" } },
                { customer: { name: { contains: query, mode: "insensitive" } } },
              ],
            },
            include: {
              customer: { select: { name: true } },
            },
            take: limit,
          });

          quotations.forEach((q) => {
            results.push({
              type: "quotation",
              id: q.id,
              title: q.quotationNo,
              subtitle: `${q.customer?.name || "고객 없음"} | ${q.totalAmount.toLocaleString()}원`,
              status: q.status,
              url: `/quotations/${q.id}`,
            });
          });
        })()
      );
    }

    // 수주 검색
    if (searchTypes.includes("salesOrder")) {
      searchPromises.push(
        (async () => {
          const salesOrders = await prisma.salesOrder.findMany({
            where: {
              OR: [
                { salesOrderNo: { contains: query, mode: "insensitive" } },
                { customer: { name: { contains: query, mode: "insensitive" } } },
              ],
            },
            include: {
              customer: { select: { name: true } },
            },
            take: limit,
          });

          salesOrders.forEach((so) => {
            results.push({
              type: "salesOrder",
              id: so.id,
              title: so.salesOrderNo,
              subtitle: `${so.customer?.name || "고객 없음"} | ${so.totalAmount.toLocaleString()}원`,
              status: so.status,
              url: `/sales-orders/${so.id}`,
            });
          });
        })()
      );
    }

    // 발주 검색
    if (searchTypes.includes("purchaseOrder")) {
      searchPromises.push(
        (async () => {
          const purchaseOrders = await prisma.purchaseOrder.findMany({
            where: {
              OR: [
                { purchaseOrderNo: { contains: query, mode: "insensitive" } },
                { channel: { name: { contains: query, mode: "insensitive" } } },
              ],
            },
            include: {
              channel: { select: { name: true } },
              tenant: { select: { name: true } },
            },
            take: limit,
          });

          purchaseOrders.forEach((po) => {
            results.push({
              type: "purchaseOrder",
              id: po.id,
              title: po.purchaseOrderNo,
              subtitle: `${po.channel.name} | ${po.tenant?.name || "고객사 없음"}`,
              status: po.status,
              url: `/purchase-orders/${po.id}`,
            });
          });
        })()
      );
    }

    // 정산 검색
    if (searchTypes.includes("settlement")) {
      searchPromises.push(
        (async () => {
          const settlements = await prisma.settlement.findMany({
            where: {
              OR: [
                { settlementMonth: { contains: query } },
                { store: { name: { contains: query, mode: "insensitive" } } },
                { channel: { name: { contains: query, mode: "insensitive" } } },
              ],
            },
            include: {
              store: { select: { name: true } },
              channel: { select: { name: true } },
            },
            take: limit,
          });

          settlements.forEach((s) => {
            results.push({
              type: "settlement",
              id: s.id,
              title: `${s.settlementMonth} ${s.type}`,
              subtitle: `${s.store.name} | ${s.channel?.name || "채널 없음"} | ${s.amount.toLocaleString()}원`,
              status: s.status,
              url: `/settlements?id=${s.id}`,
            });
          });
        })()
      );
    }

    await Promise.all(searchPromises);

    // 타입별 그룹화
    const groupedResults = results.reduce((acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    }, {} as Record<string, SearchResult[]>);

    return NextResponse.json({
      query,
      totalResults: results.length,
      results: groupedResults,
    });
  } catch (error) {
    console.error("Failed to search:", error);
    return NextResponse.json(
      { error: "검색에 실패했습니다" },
      { status: 500 }
    );
  }
}
