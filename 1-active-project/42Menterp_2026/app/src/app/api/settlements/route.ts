import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const settlementCreateSchema = z.object({
  storeId: z.string().min(1, "매장을 선택해주세요"),
  channelId: z.string().optional().nullable(),
  settlementMonth: z.string().regex(/^\d{4}-\d{2}$/, "올바른 월 형식이 아닙니다"),
  type: z.enum(["REVENUE", "COST"]),
  amount: z.number().min(0, "금액은 0 이상이어야 합니다"),
  description: z.string().optional().nullable(),
  status: z.enum(["PENDING", "CONFIRMED", "PAID"]).default("PENDING"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get("month");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const storeId = searchParams.get("storeId");

    const where: Record<string, unknown> = {};
    if (month) where.settlementMonth = month;
    if (type) where.type = type;
    if (status) where.status = status;
    if (storeId) where.storeId = storeId;

    const settlements = await prisma.settlement.findMany({
      where,
      include: {
        store: { select: { id: true, name: true, mid: true } },
        channel: { select: { id: true, name: true } },
        confirmedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ settlementMonth: "desc" }, { createdAt: "desc" }],
    });

    // 월별 합계 계산
    const summary = await prisma.settlement.groupBy({
      by: ["settlementMonth", "type"],
      _sum: { amount: true },
      where,
    });

    return NextResponse.json({ settlements, summary });
  } catch (error) {
    console.error("Failed to fetch settlements:", error);
    return NextResponse.json(
      { error: "정산 목록을 불러오는데 실패했습니다" },
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
    const validatedData = settlementCreateSchema.parse(body);

    const settlement = await prisma.settlement.create({
      data: {
        storeId: validatedData.storeId,
        channelId: validatedData.channelId || null,
        settlementMonth: validatedData.settlementMonth,
        type: validatedData.type,
        amount: validatedData.amount,
        description: validatedData.description || null,
        status: validatedData.status,
      },
      include: {
        store: { select: { id: true, name: true, mid: true } },
        channel: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(settlement, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create settlement:", error);
    return NextResponse.json(
      { error: "정산 등록에 실패했습니다" },
      { status: 500 }
    );
  }
}
