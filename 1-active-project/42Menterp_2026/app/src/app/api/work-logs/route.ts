import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const workLogCreateSchema = z.object({
  storeId: z.string().min(1, "매장을 선택해주세요"),
  purchaseOrderId: z.string().optional().nullable(),
  workType: z.enum([
    "SALES_ORDER_CREATED",
    "SALES_ORDER_CONFIRMED",
    "PURCHASE_ORDER_CREATED",
    "PURCHASE_ORDER_CONFIRMED",
    "PURCHASE_ORDER_COMPLETED",
    "MANUAL_WORK",
    "KEYWORD_CHECK",
  ]),
  workDate: z.string(),
  description: z.string().min(1, "작업 내용을 입력해주세요"),
  qty: z.number().optional().nullable(),
  result: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get("storeId");
    const workType = searchParams.get("workType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {};
    if (storeId) where.storeId = storeId;
    if (workType) where.workType = workType;
    if (startDate && endDate) {
      where.workDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [workLogs, total] = await Promise.all([
      prisma.workLog.findMany({
        where,
        include: {
          store: { select: { id: true, name: true, mid: true } },
          purchaseOrder: { select: { id: true, purchaseOrderNo: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { workDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.workLog.count({ where }),
    ]);

    return NextResponse.json({
      workLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch work logs:", error);
    return NextResponse.json(
      { error: "작업 로그를 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = workLogCreateSchema.parse(body);

    const workLog = await prisma.workLog.create({
      data: {
        storeId: validatedData.storeId,
        purchaseOrderId: validatedData.purchaseOrderId || null,
        workType: validatedData.workType,
        workDate: new Date(validatedData.workDate),
        description: validatedData.description,
        qty: validatedData.qty || null,
        result: validatedData.result || null,
        createdById: session.user.id,
      },
      include: {
        store: { select: { id: true, name: true, mid: true } },
        purchaseOrder: { select: { id: true, purchaseOrderNo: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(workLog, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create work log:", error);
    return NextResponse.json(
      { error: "작업 로그 등록에 실패했습니다" },
      { status: 500 }
    );
  }
}
