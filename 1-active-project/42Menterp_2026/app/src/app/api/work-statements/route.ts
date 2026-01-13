import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const workStatementItemSchema = z.object({
  purchaseOrderItemId: z.string(),
  completedQty: z.number().min(0),
  unitPriceSnapshot: z.number().min(0),
  amount: z.number().min(0),
  note: z.string().optional().nullable(),
});

const workStatementSchema = z.object({
  purchaseOrderId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  note: z.string().optional().nullable(),
  items: z.array(workStatementItemSchema).min(1, "최소 1개 이상의 항목이 필요합니다"),
});

function generateStatementNo(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `WS${year}${month}${day}-${random}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const purchaseOrderId = searchParams.get("purchaseOrderId");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (purchaseOrderId) {
      where.purchaseOrderId = purchaseOrderId;
    }

    if (search) {
      where.statementNo = { contains: search, mode: "insensitive" };
    }

    const [workStatements, total] = await Promise.all([
      prisma.workStatement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          purchaseOrder: {
            select: {
              purchaseOrderNo: true,
              channel: { select: { name: true } },
            },
          },
          createdBy: {
            select: { name: true },
          },
          confirmedBy: {
            select: { name: true },
          },
          _count: {
            select: { items: true, settlementLines: true },
          },
        },
      }),
      prisma.workStatement.count({ where }),
    ]);

    return NextResponse.json({
      workStatements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch work statements:", error);
    return NextResponse.json(
      { error: "작업 명세 목록을 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = workStatementSchema.parse(body);

    // 발주 존재 확인
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: validatedData.purchaseOrderId },
      include: { channel: true },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "발주를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 금액 계산
    const supplyAmount = validatedData.items.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const taxAmount = Math.round(supplyAmount * 0.1);
    const totalAmount = supplyAmount + taxAmount;

    const workStatement = await prisma.workStatement.create({
      data: {
        statementNo: generateStatementNo(),
        purchaseOrderId: validatedData.purchaseOrderId,
        periodStart: new Date(validatedData.periodStart),
        periodEnd: new Date(validatedData.periodEnd),
        supplyAmount,
        taxAmount,
        totalAmount,
        note: validatedData.note,
        createdById: session.user.id,
        items: {
          create: validatedData.items.map((item, index) => ({
            seq: index + 1,
            purchaseOrderItemId: item.purchaseOrderItemId,
            completedQty: item.completedQty,
            unitPriceSnapshot: item.unitPriceSnapshot,
            amount: item.amount,
            note: item.note,
          })),
        },
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

    return NextResponse.json(workStatement, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create work statement:", error);
    return NextResponse.json(
      { error: "작업 명세 등록에 실패했습니다" },
      { status: 500 }
    );
  }
}
