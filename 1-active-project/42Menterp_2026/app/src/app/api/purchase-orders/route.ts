import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const purchaseOrderItemSchema = z.object({
  storeId: z.string(),
  productId: z.string().optional().nullable(),
  productType: z.enum(["TRAFFIC", "SAVE", "REVIEW", "DIRECTION"]),
  keyword: z.string(),
  dailyQty: z.number().min(1),
  startDate: z.string(),
  endDate: z.string(),
  workDays: z.number().min(1),
  totalQty: z.number().min(1),
  unitPrice: z.number().min(0),
  amount: z.number().min(0),
  note: z.string().optional().nullable(),
});

const purchaseOrderSchema = z.object({
  salesOrderId: z.string().optional().nullable(),
  channelId: z.string(),
  orderDate: z.string(),
  orderWeek: z.string().optional(),
  memo: z.string().optional().nullable(),
  items: z.array(purchaseOrderItemSchema).min(1, "최소 1개 이상의 발주 항목이 필요합니다"),
});

function generatePurchaseOrderNo(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `PO${year}${month}${day}-${random}`;
}

function getWeekNumber(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  );
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}W${weekNumber.toString().padStart(2, "0")}`;
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
    const channelId = searchParams.get("channelId");
    const salesOrderId = searchParams.get("salesOrderId");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (channelId) {
      where.channelId = channelId;
    }

    if (salesOrderId) {
      where.salesOrderId = salesOrderId;
    }

    if (search) {
      where.purchaseOrderNo = { contains: search, mode: "insensitive" };
    }

    const [purchaseOrders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          channel: {
            select: { name: true, code: true },
          },
          salesOrder: {
            select: { salesOrderNo: true },
          },
          createdBy: {
            select: { name: true },
          },
          _count: {
            select: { items: true },
          },
        },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return NextResponse.json({
      purchaseOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch purchase orders:", error);
    return NextResponse.json(
      { error: "발주 목록을 불러오는데 실패했습니다" },
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
    const validatedData = purchaseOrderSchema.parse(body);

    const channel = await prisma.channel.findUnique({
      where: { id: validatedData.channelId },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "채널을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const orderDate = new Date(validatedData.orderDate);
    const totalQty = validatedData.items.reduce(
      (sum, item) => sum + item.totalQty,
      0
    );
    const totalAmount = validatedData.items.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        purchaseOrderNo: generatePurchaseOrderNo(),
        salesOrderId: validatedData.salesOrderId,
        channelId: validatedData.channelId,
        orderWeek: validatedData.orderWeek || getWeekNumber(orderDate),
        orderDate,
        totalQty,
        totalAmount,
        memo: validatedData.memo,
        createdById: session.user.id,
        items: {
          create: validatedData.items.map((item) => ({
            storeId: item.storeId,
            productId: item.productId,
            productType: item.productType,
            keyword: item.keyword,
            dailyQty: item.dailyQty,
            startDate: new Date(item.startDate),
            endDate: new Date(item.endDate),
            workDays: item.workDays,
            totalQty: item.totalQty,
            unitPrice: item.unitPrice,
            amount: item.amount,
            note: item.note,
          })),
        },
      },
      include: {
        channel: true,
        salesOrder: true,
        items: {
          include: {
            store: true,
            product: true,
          },
        },
      },
    });

    // 발주 생성 시 WorkLog 자동 생성
    const storeIds = [...new Set(validatedData.items.map((item) => item.storeId))];
    for (const storeId of storeIds) {
      const storeItems = validatedData.items.filter((item) => item.storeId === storeId);
      const storeTotalQty = storeItems.reduce((sum, item) => sum + item.totalQty, 0);

      await prisma.workLog.create({
        data: {
          storeId,
          purchaseOrderId: purchaseOrder.id,
          workType: "PURCHASE_ORDER_CREATED",
          workDate: new Date(),
          description: `${channel.name} 발주 생성 - ${purchaseOrder.purchaseOrderNo}`,
          qty: storeTotalQty,
          createdById: session.user.id,
        },
      });
    }

    return NextResponse.json(purchaseOrder, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create purchase order:", error);
    return NextResponse.json(
      { error: "발주 등록에 실패했습니다" },
      { status: 500 }
    );
  }
}
