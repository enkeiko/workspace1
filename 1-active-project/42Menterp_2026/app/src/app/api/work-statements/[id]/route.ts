import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateWorkStatementSchema = z.object({
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  note: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        purchaseOrderItemId: z.string(),
        completedQty: z.number().min(0),
        unitPriceSnapshot: z.number().min(0),
        amount: z.number().min(0),
        note: z.string().optional().nullable(),
      })
    )
    .optional(),
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

    const workStatement = await prisma.workStatement.findUnique({
      where: { id },
      include: {
        purchaseOrder: {
          include: {
            channel: true,
            salesOrder: {
              include: { customer: true },
            },
          },
        },
        items: {
          include: {
            purchaseOrderItem: {
              include: {
                store: true,
                product: true,
              },
            },
          },
          orderBy: { seq: "asc" },
        },
        settlementLines: {
          include: {
            settlement: true,
          },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        confirmedBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!workStatement) {
      return NextResponse.json(
        { error: "작업 명세를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(workStatement);
  } catch (error) {
    console.error("Failed to fetch work statement:", error);
    return NextResponse.json(
      { error: "작업 명세를 불러오는데 실패했습니다" },
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateWorkStatementSchema.parse(body);

    // 기존 명세 확인
    const existing = await prisma.workStatement.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "작업 명세를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // DRAFT 상태만 수정 가능
    if (existing.status !== "DRAFT") {
      return NextResponse.json(
        { error: "확정된 명세는 수정할 수 없습니다" },
        { status: 400 }
      );
    }

    // 금액 재계산
    let supplyAmount = existing.supplyAmount;
    let taxAmount = existing.taxAmount;
    let totalAmount = existing.totalAmount;

    if (validatedData.items) {
      supplyAmount = validatedData.items.reduce(
        (sum, item) => sum + item.amount,
        0
      );
      taxAmount = Math.round(supplyAmount * 0.1);
      totalAmount = supplyAmount + taxAmount;
    }

    const workStatement = await prisma.$transaction(async (tx) => {
      // 기존 항목 삭제 후 재생성 (items가 있는 경우)
      if (validatedData.items) {
        await tx.workStatementItem.deleteMany({
          where: { workStatementId: id },
        });
      }

      return tx.workStatement.update({
        where: { id },
        data: {
          periodStart: validatedData.periodStart
            ? new Date(validatedData.periodStart)
            : undefined,
          periodEnd: validatedData.periodEnd
            ? new Date(validatedData.periodEnd)
            : undefined,
          note: validatedData.note,
          supplyAmount,
          taxAmount,
          totalAmount,
          items: validatedData.items
            ? {
                create: validatedData.items.map((item, index) => ({
                  seq: index + 1,
                  purchaseOrderItemId: item.purchaseOrderItemId,
                  completedQty: item.completedQty,
                  unitPriceSnapshot: item.unitPriceSnapshot,
                  amount: item.amount,
                  note: item.note,
                })),
              }
            : undefined,
        },
        include: {
          purchaseOrder: {
            include: { channel: true },
          },
          items: {
            include: {
              purchaseOrderItem: {
                include: { store: true },
              },
            },
            orderBy: { seq: "asc" },
          },
        },
      });
    });

    return NextResponse.json(workStatement);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to update work statement:", error);
    return NextResponse.json(
      { error: "작업 명세 수정에 실패했습니다" },
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

    const existing = await prisma.workStatement.findUnique({
      where: { id },
      include: { settlementLines: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "작업 명세를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // DRAFT 상태만 삭제 가능
    if (existing.status !== "DRAFT") {
      return NextResponse.json(
        { error: "확정된 명세는 삭제할 수 없습니다" },
        { status: 400 }
      );
    }

    // 정산 라인이 있으면 삭제 불가
    if (existing.settlementLines.length > 0) {
      return NextResponse.json(
        { error: "정산과 연결된 명세는 삭제할 수 없습니다" },
        { status: 400 }
      );
    }

    await prisma.workStatement.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete work statement:", error);
    return NextResponse.json(
      { error: "작업 명세 삭제에 실패했습니다" },
      { status: 500 }
    );
  }
}
