import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { startOfDay, endOfDay } from "date-fns";

const rankingCreateSchema = z.object({
  storeKeywordId: z.string().min(1, "키워드를 선택해주세요"),
  ranking: z.number().min(1).max(1000).nullable(),
  checkDate: z.string().optional(),
  checkTime: z.string().optional(),
});

const bulkRankingSchema = z.object({
  rankings: z.array(z.object({
    storeKeywordId: z.string(),
    ranking: z.number().min(1).max(1000).nullable(),
  })),
  checkDate: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const storeKeywordId = searchParams.get("storeKeywordId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "30");

    const where: Record<string, unknown> = {};
    if (storeKeywordId) where.storeKeywordId = storeKeywordId;
    if (startDate && endDate) {
      where.checkDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const rankings = await prisma.keywordRanking.findMany({
      where,
      include: {
        storeKeyword: {
          include: {
            store: { select: { id: true, name: true, mid: true } },
          },
        },
      },
      orderBy: { checkDate: "desc" },
      take: limit,
    });

    return NextResponse.json({ rankings });
  } catch (error) {
    console.error("Failed to fetch rankings:", error);
    return NextResponse.json(
      { error: "순위 기록을 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // 단건 또는 벌크 처리 판별
    if (body.rankings && Array.isArray(body.rankings)) {
      // 벌크 처리
      const validatedData = bulkRankingSchema.parse(body);
      const checkDate = validatedData.checkDate
        ? new Date(validatedData.checkDate)
        : new Date();
      const checkTime = checkDate.toTimeString().substring(0, 5);

      const results = await Promise.all(
        validatedData.rankings.map(async (item) => {
          // 이전 순위 조회
          const previousRanking = await prisma.keywordRanking.findFirst({
            where: { storeKeywordId: item.storeKeywordId },
            orderBy: { checkDate: "desc" },
          });

          const rankChange = previousRanking?.ranking && item.ranking
            ? previousRanking.ranking - item.ranking // 순위 하락이면 음수, 상승이면 양수
            : 0;

          return prisma.keywordRanking.create({
            data: {
              storeKeywordId: item.storeKeywordId,
              ranking: item.ranking,
              checkDate,
              checkTime,
              previousRank: previousRanking?.ranking || null,
              rankChange,
            },
          });
        })
      );

      return NextResponse.json({ rankings: results }, { status: 201 });
    } else {
      // 단건 처리
      const validatedData = rankingCreateSchema.parse(body);
      const checkDate = validatedData.checkDate
        ? new Date(validatedData.checkDate)
        : new Date();
      const checkTime = validatedData.checkTime || checkDate.toTimeString().substring(0, 5);

      // 이전 순위 조회
      const previousRanking = await prisma.keywordRanking.findFirst({
        where: { storeKeywordId: validatedData.storeKeywordId },
        orderBy: { checkDate: "desc" },
      });

      const rankChange = previousRanking?.ranking && validatedData.ranking
        ? previousRanking.ranking - validatedData.ranking
        : 0;

      const ranking = await prisma.keywordRanking.create({
        data: {
          storeKeywordId: validatedData.storeKeywordId,
          ranking: validatedData.ranking,
          checkDate,
          checkTime,
          previousRank: previousRanking?.ranking || null,
          rankChange,
        },
        include: {
          storeKeyword: {
            include: {
              store: { select: { id: true, name: true } },
            },
          },
        },
      });

      return NextResponse.json(ranking, { status: 201 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create ranking:", error);
    return NextResponse.json(
      { error: "순위 기록 등록에 실패했습니다" },
      { status: 500 }
    );
  }
}
