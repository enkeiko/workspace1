import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const channelUpdateSchema = z.object({
  name: z.string().min(1, "채널명은 필수입니다").optional(),
  code: z.string().min(1, "채널 코드는 필수입니다").optional(),
  type: z.enum(["REVIEW", "SAVE", "DIRECTION", "TRAFFIC"]).optional(),
  baseUnitPrice: z.number().min(0, "단가는 0 이상이어야 합니다").optional(),
  minQty: z.number().optional().nullable(),
  minDays: z.number().optional().nullable(),
  maxDays: z.number().optional().nullable(),
  sameDayDeadline: z.string().optional().nullable(),
  nextDayDeadline: z.string().optional().nullable(),
  weekendAvailable: z.boolean().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const channel = await prisma.channel.findUnique({
      where: { id },
      include: {
        sheets: {
          orderBy: { sheetType: "asc" },
        },
      },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "채널을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(channel);
  } catch (error) {
    console.error("Failed to fetch channel:", error);
    return NextResponse.json(
      { error: "채널 정보를 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = channelUpdateSchema.parse(body);

    const existingChannel = await prisma.channel.findUnique({
      where: { id },
    });

    if (!existingChannel) {
      return NextResponse.json(
        { error: "채널을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (validatedData.code && validatedData.code !== existingChannel.code) {
      const duplicateCode = await prisma.channel.findUnique({
        where: { code: validatedData.code },
      });
      if (duplicateCode) {
        return NextResponse.json(
          { error: "이미 등록된 채널 코드입니다" },
          { status: 400 }
        );
      }
    }

    const channel = await prisma.channel.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(channel);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to update channel:", error);
    return NextResponse.json(
      { error: "채널 수정에 실패했습니다" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existingChannel = await prisma.channel.findUnique({
      where: { id },
      include: { orders: { take: 1 } },
    });

    if (!existingChannel) {
      return NextResponse.json(
        { error: "채널을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (existingChannel.orders.length > 0) {
      return NextResponse.json(
        { error: "발주 내역이 있는 채널은 삭제할 수 없습니다" },
        { status: 400 }
      );
    }

    await prisma.channelSheet.deleteMany({
      where: { channelId: id },
    });

    await prisma.channel.delete({
      where: { id },
    });

    return NextResponse.json({ message: "채널이 삭제되었습니다" });
  } catch (error) {
    console.error("Failed to delete channel:", error);
    return NextResponse.json(
      { error: "채널 삭제에 실패했습니다" },
      { status: 500 }
    );
  }
}
