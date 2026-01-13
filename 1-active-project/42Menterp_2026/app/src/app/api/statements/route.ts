import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const statementItemSchema = z.object({
  salesOrderItemId: z.string().optional().nullable(),
  description: z.string(),
  qty: z.number().min(1),
  unitPrice: z.number().min(0),
  amount: z.number().min(0),
});

const statementSchema = z.object({
  salesOrderId: z.string(),
  issueDate: z.string(),
  note: z.string().optional().nullable(),
  items: z.array(statementItemSchema).min(1, "최소 1개 이상의 항목이 필요합니다"),
});

function generateStatementNo(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `ST${year}${month}${day}-${random}`;
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
    const salesOrderId = searchParams.get("salesOrderId");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (salesOrderId) {
      where.salesOrderId = salesOrderId;
    }

    if (search) {
      where.statementNo = { contains: search, mode: "insensitive" };
    }

    const [statements, total] = await Promise.all([
      prisma.statement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          salesOrder: {
            select: {
              id: true,
              salesOrderNo: true,
              customer: {
                select: { id: true, name: true, businessName: true },
              },
            },
          },
          createdBy: {
            select: { name: true },
          },
          _count: {
            select: { items: true },
          },
        },
      }),
      prisma.statement.count({ where }),
    ]);

    return NextResponse.json({
      statements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch statements:", error);
    return NextResponse.json(
      { error: "거래명세서 목록을 불러오는데 실패했습니다" },
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
    const validatedData = statementSchema.parse(body);

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id: validatedData.salesOrderId },
      include: {
        customer: true,
      },
    });

    if (!salesOrder) {
      return NextResponse.json(
        { error: "수주를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const totalAmount = validatedData.items.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const taxAmount = Math.round(totalAmount * 0.1);

    const statement = await prisma.statement.create({
      data: {
        statementNo: generateStatementNo(),
        salesOrderId: validatedData.salesOrderId,
        issueDate: new Date(validatedData.issueDate),
        totalAmount,
        taxAmount,
        note: validatedData.note,
        createdById: session.user.id,
        items: {
          create: validatedData.items.map((item) => ({
            salesOrderItemId: item.salesOrderItemId,
            description: item.description,
            qty: item.qty,
            unitPrice: item.unitPrice,
            amount: item.amount,
          })),
        },
      },
      include: {
        salesOrder: {
          include: {
            customer: true,
          },
        },
        items: true,
      },
    });

    return NextResponse.json(statement, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create statement:", error);
    return NextResponse.json(
      { error: "거래명세서 등록에 실패했습니다" },
      { status: 500 }
    );
  }
}
