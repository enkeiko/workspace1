import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const settlementUpdateSchema = z.object({
  amount: z.number().min(0).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["PENDING", "CONFIRMED", "PAID"]).optional(),
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
    const settlement = await prisma.settlement.findUnique({
      where: { id },
      include: {
        store: { select: { id: true, name: true, mid: true } },
        channel: { select: { id: true, name: true } },
        confirmedBy: { select: { id: true, name: true } },
      },
    });

    if (!settlement) {
      return NextResponse.json(
        { error: "정산 정보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(settlement);
  } catch (error) {
    console.error("Failed to fetch settlement:", error);
    return NextResponse.json(
      { error: "정산 정보를 불러오는데 실패했습니다" },
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
    const validatedData = settlementUpdateSchema.parse(body);

    const existing = await prisma.settlement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "정산 정보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = { ...validatedData };

    // 상태가 CONFIRMED 또는 PAID로 변경되면 확정자 정보 기록
    if (validatedData.status && validatedData.status !== "PENDING" && existing.status === "PENDING") {
      updateData.confirmedAt = new Date();
      updateData.confirmedById = session.user.id;
    }

    const settlement = await prisma.settlement.update({
      where: { id },
      data: updateData,
      include: {
        store: { select: { id: true, name: true, mid: true } },
        channel: { select: { id: true, name: true } },
        confirmedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(settlement);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to update settlement:", error);
    return NextResponse.json(
      { error: "정산 수정에 실패했습니다" },
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
    const existing = await prisma.settlement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "정산 정보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    await prisma.settlement.delete({ where: { id } });

    return NextResponse.json({ message: "정산이 삭제되었습니다" });
  } catch (error) {
    console.error("Failed to delete settlement:", error);
    return NextResponse.json(
      { error: "정산 삭제에 실패했습니다" },
      { status: 500 }
    );
  }
}
