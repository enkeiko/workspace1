import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const priceSchema = z.object({
  channelId: z.string().min(1, "채널을 선택하세요"),
  unitPrice: z.number().min(0, "단가는 0 이상이어야 합니다"),
  effectiveFrom: z.string().min(1, "적용 시작일을 입력하세요"),
  effectiveTo: z.string().optional().nullable(),
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

    const prices = await prisma.partnerPrice.findMany({
      where: { tenantId: id },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
            baseUnitPrice: true,
          },
        },
      },
      orderBy: [{ channelId: "asc" }, { effectiveFrom: "desc" }],
    });

    return NextResponse.json({ prices });
  } catch (error) {
    console.error("Failed to fetch partner prices:", error);
    return NextResponse.json(
      { error: "단가 목록을 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = priceSchema.parse(body);

    // 파트너사 존재 확인
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return NextResponse.json(
        { error: "파트너사를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 채널 존재 확인
    const channel = await prisma.channel.findUnique({
      where: { id: validatedData.channelId },
    });
    if (!channel) {
      return NextResponse.json(
        { error: "채널을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 같은 시작일에 같은 채널 단가가 있는지 확인
    const existingPrice = await prisma.partnerPrice.findFirst({
      where: {
        tenantId: id,
        channelId: validatedData.channelId,
        effectiveFrom: new Date(validatedData.effectiveFrom),
      },
    });
    if (existingPrice) {
      return NextResponse.json(
        { error: "해당 날짜에 이미 단가가 설정되어 있습니다" },
        { status: 400 }
      );
    }

    const price = await prisma.partnerPrice.create({
      data: {
        tenantId: id,
        channelId: validatedData.channelId,
        unitPrice: validatedData.unitPrice,
        effectiveFrom: new Date(validatedData.effectiveFrom),
        effectiveTo: validatedData.effectiveTo
          ? new Date(validatedData.effectiveTo)
          : null,
      },
      include: {
        channel: {
          select: { name: true, code: true },
        },
      },
    });

    return NextResponse.json(price, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create partner price:", error);
    return NextResponse.json(
      { error: "단가 등록에 실패했습니다" },
      { status: 500 }
    );
  }
}
