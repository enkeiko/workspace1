import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

/**
 * SheetImportLog API
 * Expert Review: "Google Sheet Trap" 해결을 위한 Staging Table 패턴
 *
 * Sheet -> Staging (Raw) -> Validation -> Core DB
 */

const importLogSchema = z.object({
  channelSheetId: z.string(),
  rawData: z.record(z.string(), z.unknown()),
  rowNumber: z.number().optional(),
});

/**
 * GET: 시트 임포트 로그 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelSheetId = searchParams.get("channelSheetId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {};
    if (channelSheetId) where.channelSheetId = channelSheetId;
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      prisma.sheetImportLog.findMany({
        where,
        include: {
          channelSheet: {
            include: { channel: { select: { name: true } } },
          },
          matchedPurchaseOrder: {
            select: { purchaseOrderNo: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.sheetImportLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: { total, limit, offset },
    });
  } catch (error) {
    console.error("Failed to fetch sheet import logs:", error);
    return NextResponse.json(
      { error: "시트 임포트 로그 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * POST: 새로운 시트 임포트 로그 생성 (Raw 데이터 저장)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { channelSheetId, rawData, rowNumber } = importLogSchema.parse(body);

    // 채널 시트 확인
    const channelSheet = await prisma.channelSheet.findUnique({
      where: { id: channelSheetId },
      include: { channel: true },
    });

    if (!channelSheet) {
      return NextResponse.json(
        { error: "채널 시트를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // Staging 테이블에 저장 (PENDING 상태)
    const log = await prisma.sheetImportLog.create({
      data: {
        channelSheetId,
        rawData: rawData as object,
        rowNumber,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      message: "임포트 로그가 생성되었습니다",
      log,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create sheet import log:", error);
    return NextResponse.json(
      { error: "시트 임포트 로그 생성에 실패했습니다" },
      { status: 500 }
    );
  }
}
