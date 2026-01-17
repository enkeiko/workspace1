import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Report Creation API
 *
 * 고객에게 공유할 비밀 링크를 생성합니다.
 *
 * POST /api/reports/create
 * Body: {
 *   salesOrderId: string,
 *   title: string,
 *   description?: string,
 *   showPricing?: boolean,
 *   expiresInDays?: number
 * }
 */

interface CreateReportRequest {
  salesOrderId: string;
  title: string;
  description?: string;
  showPricing?: boolean;
  expiresInDays?: number;
}

interface CreateReportResponse {
  success: boolean;
  reportId: string;
  secretToken: string;
  shareUrl: string;
  expiresAt: string | null;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateReportResponse | { error: string }>> {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 요청 본문 파싱
    const body: CreateReportRequest = await request.json();
    const { salesOrderId, title, description, showPricing, expiresInDays } = body;

    if (!salesOrderId || !title) {
      return NextResponse.json(
        { error: "salesOrderId와 title이 필요합니다" },
        { status: 400 }
      );
    }

    // 수주 존재 확인
    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
    });

    if (!salesOrder) {
      return NextResponse.json(
        { error: "수주를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 만료일 계산
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // ClientReport 생성
    const report = await prisma.clientReport.create({
      data: {
        salesOrderId,
        title,
        description,
        showPricing: showPricing || false,
        expiresAt,
      },
    });

    // 공유 URL 생성
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    const shareUrl = `${baseUrl}/reports/${report.secretToken}`;

    return NextResponse.json({
      success: true,
      reportId: report.id,
      secretToken: report.secretToken,
      shareUrl,
      expiresAt: expiresAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Report creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "리포트 생성 실패" },
      { status: 500 }
    );
  }
}

/**
 * 리포트 목록 조회
 *
 * GET /api/reports/create?salesOrderId=xxx
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const salesOrderId = searchParams.get("salesOrderId");

    const reports = await prisma.clientReport.findMany({
      where: salesOrderId ? { salesOrderId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        salesOrder: {
          include: { customer: true },
        },
      },
    });

    return NextResponse.json({
      reports: reports.map((r) => ({
        id: r.id,
        secretToken: r.secretToken,
        title: r.title,
        description: r.description,
        salesOrderNo: r.salesOrder.salesOrderNo,
        customerName: r.salesOrder.customer?.name,
        showPricing: r.showPricing,
        expiresAt: r.expiresAt?.toISOString(),
        viewCount: r.viewCount,
        lastViewedAt: r.lastViewedAt?.toISOString(),
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Report list error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "조회 실패" },
      { status: 500 }
    );
  }
}
