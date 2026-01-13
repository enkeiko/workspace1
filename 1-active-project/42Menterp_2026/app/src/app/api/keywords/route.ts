import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get("storeId");
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {};
    if (storeId) where.storeId = storeId;
    if (isActive !== null) where.isActive = isActive === "true";

    const keywords = await prisma.storeKeyword.findMany({
      where,
      include: {
        store: { select: { id: true, name: true, mid: true } },
        rankings: {
          orderBy: { checkDate: "desc" },
          take: 7, // 최근 7개 기록
        },
      },
      orderBy: [{ store: { name: "asc" } }, { keyword: "asc" }],
    });

    // 키워드별 최근 순위 및 변동 정보 추가
    const keywordsWithStats = keywords.map((kw) => {
      const latestRanking = kw.rankings[0];
      const previousRanking = kw.rankings[1];

      return {
        ...kw,
        currentRank: latestRanking?.ranking || null,
        previousRank: previousRanking?.ranking || null,
        rankChange: latestRanking?.rankChange || 0,
        lastChecked: latestRanking?.checkDate || null,
        recentRankings: kw.rankings.map((r) => ({
          date: r.checkDate,
          ranking: r.ranking,
        })).reverse(),
      };
    });

    return NextResponse.json({ keywords: keywordsWithStats });
  } catch (error) {
    console.error("Failed to fetch keywords:", error);
    return NextResponse.json(
      { error: "키워드 목록을 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}
