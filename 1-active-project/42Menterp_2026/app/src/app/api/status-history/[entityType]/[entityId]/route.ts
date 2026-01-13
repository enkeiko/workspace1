import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStatusHistory, getEntityDetails } from "@/lib/status-history";
import { EntityType } from "@prisma/client";

/**
 * GET: 특정 엔티티의 상태 이력 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entityType, entityId } = await params;

    // EntityType 유효성 검사
    const validTypes: EntityType[] = [
      "QUOTATION",
      "SALES_ORDER",
      "PURCHASE_ORDER",
      "WORK_STATEMENT",
      "SETTLEMENT",
      "TAX_INVOICE",
    ];

    if (!validTypes.includes(entityType as EntityType)) {
      return NextResponse.json(
        { error: "유효하지 않은 엔티티 타입입니다" },
        { status: 400 }
      );
    }

    // 상태 이력 조회
    const history = await getStatusHistory(entityType as EntityType, entityId);

    // 엔티티 상세 정보
    const entityDetails = await getEntityDetails(entityType as EntityType, entityId);

    if (!entityDetails) {
      return NextResponse.json(
        { error: "엔티티를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 타임라인 형태로 변환
    const timeline = history.map((h, index) => ({
      ...h,
      duration: index < history.length - 1
        ? new Date(history[index + 1].changedAt).getTime() - new Date(h.changedAt).getTime()
        : null,
    }));

    return NextResponse.json({
      entityType,
      entityId,
      entityDetails,
      currentStatus: entityDetails.status,
      timeline,
      totalChanges: history.length,
    });
  } catch (error) {
    console.error("Failed to fetch entity status history:", error);
    return NextResponse.json(
      { error: "상태 이력 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}
