import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const quotationItemSchema = z.object({
  storeId: z.string().optional().nullable(),
  productId: z.string().optional().nullable(),
  description: z.string(),
  qty: z.number().min(1),
  unitPrice: z.number().min(0),
  amount: z.number().min(0),
});

const quotationSchema = z.object({
  customerId: z.string(),
  validUntil: z.string(),
  subject: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  items: z.array(quotationItemSchema).min(1, "최소 1개 이상의 항목이 필요합니다"),
});

function generateQuotationNo(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `QT${year}${month}${day}-${random}`;
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
      where.OR = [
        { quotationNo: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
      ];
    }

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: {
            select: { id: true, name: true, businessName: true },
          },
          createdBy: {
            select: { name: true },
          },
          _count: {
            select: { items: true },
          },
        },
      }),
      prisma.quotation.count({ where }),
    ]);

    return NextResponse.json({
      quotations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch quotations:", error);
    return NextResponse.json(
      { error: "견적서 목록을 불러오는데 실패했습니다" },
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
    const validatedData = quotationSchema.parse(body);

    const customer = await prisma.customer.findUnique({
      where: { id: validatedData.customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "고객을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const totalAmount = validatedData.items.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const taxAmount = Math.round(totalAmount * 0.1);

    const quotation = await prisma.quotation.create({
      data: {
        quotationNo: generateQuotationNo(),
        customerId: validatedData.customerId,
        validUntil: new Date(validatedData.validUntil),
        subject: validatedData.subject,
        totalAmount,
        taxAmount,
        note: validatedData.note,
        createdById: session.user.id,
        items: {
          create: validatedData.items.map((item) => ({
            storeId: item.storeId,
            productId: item.productId,
            description: item.description,
            qty: item.qty,
            unitPrice: item.unitPrice,
            amount: item.amount,
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
        },
      },
    });

    return NextResponse.json(quotation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create quotation:", error);
    return NextResponse.json(
      { error: "견적서 등록에 실패했습니다" },
      { status: 500 }
    );
  }
}
