import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const taxInvoiceItemSchema = z.object({
  seq: z.number().optional(),
  itemName: z.string().min(1, "품명을 입력하세요"),
  itemSpec: z.string().optional(),
  quantity: z.number().min(1, "수량을 입력하세요"),
  unitPrice: z.number().min(0, "단가를 입력하세요"),
  supplyAmount: z.number().min(0, "공급가액을 입력하세요"),
  taxAmount: z.number().min(0, "세액을 입력하세요"),
  note: z.string().optional(),
});

const taxInvoiceSchema = z.object({
  type: z.enum(["SALES", "PURCHASE"]),
  taxType: z.enum(["TAX", "ZERO", "FREE"]).optional().default("TAX"),
  purposeType: z.enum(["CHARGE", "PROOF"]).optional().default("CHARGE"),
  issueDate: z.string().min(1, "발행일을 입력하세요"),
  // 공급자
  supplierBusinessNo: z.string().min(1, "공급자 사업자번호를 입력하세요"),
  supplierName: z.string().min(1, "공급자 상호를 입력하세요"),
  supplierCeoName: z.string().optional(),
  supplierAddr: z.string().optional(),
  supplierBizType: z.string().optional(),
  supplierBizClass: z.string().optional(),
  supplierEmail: z.string().optional(),
  // 공급받는자
  receiverBusinessNo: z.string().min(1, "공급받는자 사업자번호를 입력하세요"),
  receiverName: z.string().min(1, "공급받는자 상호를 입력하세요"),
  receiverCeoName: z.string().optional(),
  receiverAddr: z.string().optional(),
  receiverBizType: z.string().optional(),
  receiverBizClass: z.string().optional(),
  receiverEmail: z.string().optional(),
  // 금액
  supplyAmount: z.number().min(0, "공급가액을 입력하세요"),
  taxAmount: z.number().min(0, "세액을 입력하세요"),
  totalAmount: z.number().optional(),
  // 기타
  remark: z.string().optional(),
  // 품목
  items: z.array(taxInvoiceItemSchema).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.issueDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (search) {
      where.OR = [
        { supplierName: { contains: search, mode: "insensitive" } },
        { receiverName: { contains: search, mode: "insensitive" } },
        { supplierBusinessNo: { contains: search } },
        { receiverBusinessNo: { contains: search } },
        { ntsConfirmNo: { contains: search } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.taxInvoice.findMany({
        where,
        orderBy: { issueDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          items: {
            orderBy: { seq: "asc" },
          },
          settlements: {
            select: {
              id: true,
              settlementMonth: true,
              amount: true,
            },
          },
        },
      }),
      prisma.taxInvoice.count({ where }),
    ]);

    // 통계
    const stats = await prisma.taxInvoice.groupBy({
      by: ["type", "status"],
      _sum: { totalAmount: true },
      _count: true,
    });

    return NextResponse.json({
      invoices,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch tax invoices:", error);
    return NextResponse.json(
      { error: "세금계산서 목록을 불러오는데 실패했습니다" },
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
    const validatedData = taxInvoiceSchema.parse(body);

    const totalAmount =
      validatedData.totalAmount ||
      validatedData.supplyAmount + validatedData.taxAmount;

    const invoice = await prisma.taxInvoice.create({
      data: {
        type: validatedData.type,
        taxType: validatedData.taxType || "TAX",
        purposeType: validatedData.purposeType || "CHARGE",
        issueDate: new Date(validatedData.issueDate),
        // 공급자
        supplierBusinessNo: validatedData.supplierBusinessNo.replace(/-/g, ""),
        supplierName: validatedData.supplierName,
        supplierCeoName: validatedData.supplierCeoName || null,
        supplierAddr: validatedData.supplierAddr || null,
        supplierBizType: validatedData.supplierBizType || null,
        supplierBizClass: validatedData.supplierBizClass || null,
        supplierEmail: validatedData.supplierEmail || null,
        // 공급받는자
        receiverBusinessNo: validatedData.receiverBusinessNo.replace(/-/g, ""),
        receiverName: validatedData.receiverName,
        receiverCeoName: validatedData.receiverCeoName || null,
        receiverAddr: validatedData.receiverAddr || null,
        receiverBizType: validatedData.receiverBizType || null,
        receiverBizClass: validatedData.receiverBizClass || null,
        receiverEmail: validatedData.receiverEmail || null,
        // 금액
        supplyAmount: validatedData.supplyAmount,
        taxAmount: validatedData.taxAmount,
        totalAmount,
        // 기타
        remark: validatedData.remark || null,
        status: "DRAFT",
        createdById: session.user.id,
        // 품목
        items: validatedData.items
          ? {
              create: validatedData.items.map((item, index) => ({
                seq: item.seq || index + 1,
                itemName: item.itemName,
                itemSpec: item.itemSpec || null,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                supplyAmount: item.supplyAmount,
                taxAmount: item.taxAmount,
                note: item.note || null,
              })),
            }
          : undefined,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create tax invoice:", error);
    return NextResponse.json(
      { error: "세금계산서 등록에 실패했습니다" },
      { status: 500 }
    );
  }
}
