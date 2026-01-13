import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const channelSchema = z.object({
  name: z.string().min(1, "채널명은 필수입니다"),
  code: z.string().min(1, "채널 코드는 필수입니다"),
  type: z.enum(["REVIEW", "SAVE", "DIRECTION", "TRAFFIC"]),
  baseUnitPrice: z.number().min(0, "단가는 0 이상이어야 합니다"),
  minQty: z.number().optional().nullable(),
  minDays: z.number().optional().nullable(),
  maxDays: z.number().optional().nullable(),
  sameDayDeadline: z.string().optional().nullable(),
  nextDayDeadline: z.string().optional().nullable(),
  weekendAvailable: z.boolean().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeSheets = searchParams.get("includeSheets") === "true";

    const channels = await prisma.channel.findMany({
      orderBy: { name: "asc" },
      include: includeSheets
        ? {
            sheets: {
              orderBy: { sheetType: "asc" },
            },
          }
        : undefined,
    });

    return NextResponse.json({
      channels,
      pagination: {
        total: channels.length,
      },
    });
  } catch (error) {
    console.error("Failed to fetch channels:", error);
    return NextResponse.json(
      { error: "채널 목록을 불러오는데 실패했습니다" },
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
    const validatedData = channelSchema.parse(body);

    const existingChannel = await prisma.channel.findUnique({
      where: { code: validatedData.code },
    });

    if (existingChannel) {
      return NextResponse.json(
        { error: "이미 등록된 채널 코드입니다" },
        { status: 400 }
      );
    }

    const channel = await prisma.channel.create({
      data: validatedData,
    });

    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create channel:", error);
    return NextResponse.json(
      { error: "채널 등록에 실패했습니다" },
      { status: 500 }
    );
  }
}
