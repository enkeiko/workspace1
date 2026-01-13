import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const salesOrderItemSchema = z.object({
  storeId: z.string().optional().nullable(),
  productId: z.string().optional().nullable(),
  productType: z.enum(["REVIEW", "SAVE", "DIRECTION", "TRAFFIC"]),
  keyword: z.string().optional().nullable(),
  dailyQty: z.number().min(0).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  workDays: z.number().min(0).optional(),
  totalQty: z.number().min(1),
  unitPrice: z.number().min(0),
  supplyAmount: z.number().min(0),
  taxAmount: z.number().min(0).optional(),
  note: z.string().optional().nullable(),
});

const salesOrderSchema = z.object({
  customerId: z.string(),
  sourceQuotationId: z.string().optional().nullable(),
  orderDate: z.string(),
  memo: z.string().optional().nullable(),
  items: z.array(salesOrderItemSchema).min(1, "최소 1개 이상의 항목이 필요합니다"),
});

function generateSalesOrderNo(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `SO${year}${month}${day}-${random}`;
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
    const customerId = searchParams.get("customerId");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (search) {
      where.salesOrderNo = { contains: search, mode: "insensitive" };
    }

    const [salesOrders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: {
            select: { id: true, name: true },
          },
          sourceQuotation: {
            select: { id: true, quotationNo: true },
          },
          createdBy: {
            select: { name: true },
          },
          _count: {
            select: { items: true, purchaseOrders: true },
          },
        },
      }),
      prisma.salesOrder.count({ where }),
    ]);

    return NextResponse.json({
      salesOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch sales orders:", error);
    return NextResponse.json(
      { error: "수주 목록을 불러오는데 실패했습니다" },
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
    const validatedData = salesOrderSchema.parse(body);

    const customer = await prisma.customer.findUnique({
      where: { id: validatedData.customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "고객을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const supplyAmount = validatedData.items.reduce(
      (sum, item) => sum + item.supplyAmount,
      0
    );
    const taxAmount = validatedData.items.reduce(
      (sum, item) => sum + (item.taxAmount || Math.round(item.supplyAmount * 0.1)),
      0
    );
    const totalAmount = supplyAmount + taxAmount;

    const salesOrder = await prisma.salesOrder.create({
      data: {
        salesOrderNo: generateSalesOrderNo(),
        customerId: validatedData.customerId,
        sourceQuotationId: validatedData.sourceQuotationId,
        orderDate: new Date(validatedData.orderDate),
        supplyAmount,
        taxAmount,
        totalAmount,
        memo: validatedData.memo,
        createdById: session.user.id,
        items: {
          create: validatedData.items.map((item, index) => ({
            seq: index + 1,
            storeId: item.storeId,
            productId: item.productId,
            productType: item.productType,
            keyword: item.keyword,
            dailyQty: item.dailyQty || 0,
            startDate: item.startDate ? new Date(item.startDate) : null,
            endDate: item.endDate ? new Date(item.endDate) : null,
            workDays: item.workDays || 0,
            totalQty: item.totalQty,
            unitPrice: item.unitPrice,
            supplyAmount: item.supplyAmount,
            taxAmount: item.taxAmount || Math.round(item.supplyAmount * 0.1),
            note: item.note,
          })),
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            store: true,
            product: true,
          },
          orderBy: { seq: "asc" },
        },
      },
    });

    // WorkLog 자동 생성 (수주 등록 시)
    const storeIds = [...new Set(
      validatedData.items
        .filter((item) => item.storeId)
        .map((item) => item.storeId as string)
    )];

    for (const storeId of storeIds) {
      await prisma.workLog.create({
        data: {
          storeId,
          workType: "SALES_ORDER_CREATED",
          workDate: new Date(),
          description: `수주 등록 - ${salesOrder.salesOrderNo}`,
          createdById: session.user.id,
        },
      });
    }

    return NextResponse.json(salesOrder, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create sales order:", error);
    return NextResponse.json(
      { error: "수주 등록에 실패했습니다" },
      { status: 500 }
    );
  }
}
