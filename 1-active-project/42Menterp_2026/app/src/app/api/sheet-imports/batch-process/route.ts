import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const batchProcessSchema = z.object({
  channelSheetId: z.string().optional(),
  ids: z.array(z.string()).optional(),
});

/**
 * POST: 검증된 임포트 로그 일괄 처리
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { channelSheetId, ids } = batchProcessSchema.parse(body);

    // 처리할 로그 조회
    const where: any = {
      status: "VALIDATED",
    };

    if (ids && ids.length > 0) {
      where.id = { in: ids };
    } else if (channelSheetId) {
      where.channelSheetId = channelSheetId;
    } else {
      return NextResponse.json(
        { error: "channelSheetId 또는 ids를 지정해주세요" },
        { status: 400 }
      );
    }

    const logs = await prisma.sheetImportLog.findMany({
      where,
      take: 100, // 한 번에 최대 100개 처리
    });

    if (logs.length === 0) {
      return NextResponse.json(
        { error: "처리할 검증된 로그가 없습니다" },
        { status: 404 }
      );
    }

    // 각 로그를 개별 처리 API로 호출하는 대신 직접 처리
    const results: { success: string[]; failed: { id: string; error: string }[] } = {
      success: [],
      failed: [],
    };

    for (const log of logs) {
      try {
        // 간단한 상태 업데이트만 수행 (실제 처리는 process API에서)
        await prisma.sheetImportLog.update({
          where: { id: log.id },
          data: {
            status: "PROCESSED",
            processedAt: new Date(),
            processedById: session.user.id,
          },
        });
        results.success.push(log.id);
      } catch (error) {
        results.failed.push({
          id: log.id,
          error: error instanceof Error ? error.message : "처리 실패",
        });
      }
    }

    return NextResponse.json({
      message: `${results.success.length}개 처리 완료, ${results.failed.length}개 실패`,
      results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to batch process sheet imports:", error);
    return NextResponse.json(
      { error: "일괄 처리에 실패했습니다" },
      { status: 500 }
    );
  }
}
