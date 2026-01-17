import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { distributionService } from "@/services/distribution.service";

/**
 * Bulk Assign API
 *
 * 선택된 항목들을 채널에 일괄 할당하고 발주를 생성합니다.
 *
 * POST /api/distribution/bulk-assign
 * Body: {
 *   distribution: Record<channelId, OrderItem[]>
 * }
 */

interface OrderItem {
  id: string;
  keyword: string;
  storeName: string;
  storeId: string;
  dailyQty: number;
  workDays: number;
  totalQty: number;
  productType: string;
}

interface BulkAssignRequest {
  distribution: Record<string, OrderItem[]>;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 요청 본문 파싱
    const body: BulkAssignRequest = await request.json();
    const { distribution } = body;

    if (!distribution || Object.keys(distribution).length === 0) {
      return NextResponse.json(
        { error: "distribution 데이터가 필요합니다" },
        { status: 400 }
      );
    }

    // Map으로 변환
    const distributionMap = new Map<string, OrderItem[]>(
      Object.entries(distribution)
    );

    // 발주 생성
    const result = await distributionService.createOrdersFromDistribution(
      distributionMap,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Bulk assign error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "분배 실패" },
      { status: 500 }
    );
  }
}

/**
 * 채널별 용량 및 자동 분배 결과 조회
 *
 * GET /api/distribution/bulk-assign?mode=auto|balanced
 * Body: { items: OrderItem[] }
 */
export async function PUT(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "auto";

    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "items 배열이 필요합니다" },
        { status: 400 }
      );
    }

    // 분배 실행
    const result = mode === "balanced"
      ? await distributionService.balancedDistribute(items)
      : await distributionService.autoDistribute(items);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Auto distribute error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "자동 분배 실패" },
      { status: 500 }
    );
  }
}

/**
 * 채널 용량 조회
 *
 * GET /api/distribution/bulk-assign
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const capacities = await distributionService.getChannelCapacities();

    return NextResponse.json({ channels: capacities });
  } catch (error) {
    console.error("Get capacities error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "조회 실패" },
      { status: 500 }
    );
  }
}
