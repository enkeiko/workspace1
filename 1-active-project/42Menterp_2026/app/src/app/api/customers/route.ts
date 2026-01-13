import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1, "고객명은 필수입니다"),
  businessNo: z.string().optional().nullable(),
  representative: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  contractStart: z.string().optional().nullable(),
  contractEnd: z.string().optional().nullable(),
  monthlyBudget: z.number().optional().nullable(),
  status: z.enum(["ACTIVE", "PAUSED", "TERMINATED"]).optional(),
  memo: z.string().optional().nullable(),
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
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { businessNo: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: { stores: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    return NextResponse.json(
      { error: "고객 목록을 불러오는데 실패했습니다" },
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
    const validatedData = customerSchema.parse(body);

    if (validatedData.businessNo) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { businessNo: validatedData.businessNo },
      });

      if (existingCustomer) {
        return NextResponse.json(
          { error: "이미 등록된 사업자번호입니다" },
          { status: 400 }
        );
      }
    }

    const customer = await prisma.customer.create({
      data: {
        ...validatedData,
        contractStart: validatedData.contractStart
          ? new Date(validatedData.contractStart)
          : null,
        contractEnd: validatedData.contractEnd
          ? new Date(validatedData.contractEnd)
          : null,
        contactEmail: validatedData.contactEmail || null,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create customer:", error);
    return NextResponse.json(
      { error: "고객 등록에 실패했습니다" },
      { status: 500 }
    );
  }
}
