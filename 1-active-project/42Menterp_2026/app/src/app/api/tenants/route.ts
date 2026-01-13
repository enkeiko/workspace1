import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const tenantSchema = z.object({
  name: z.string().min(1, "파트너사명을 입력하세요"),
  code: z.string().min(1, "코드를 입력하세요"),
  businessNo: z.string().optional().nullable(),
  representative: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  commissionType: z.enum(["FIXED", "RATE"]).default("RATE"),
  defaultCommissionRate: z.number().min(0).max(1).optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),
  bankHolder: z.string().optional().nullable(),
  contractStart: z.string().optional().nullable(),
  contractEnd: z.string().optional().nullable(),
  memo: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // SUPER_ADMIN만 접근 가능
    if (session.user?.role !== "SUPER_ADMIN" && session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { businessNo: { contains: search } },
      ];
    }

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              users: true,
              stores: true,
              orders: true,
            },
          },
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    return NextResponse.json({
      tenants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch tenants:", error);
    return NextResponse.json(
      { error: "파트너사 목록을 불러오는데 실패했습니다" },
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

    // SUPER_ADMIN만 생성 가능
    if (session.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = tenantSchema.parse(body);

    // 코드 중복 확인
    const existingCode = await prisma.tenant.findUnique({
      where: { code: validatedData.code },
    });
    if (existingCode) {
      return NextResponse.json(
        { error: "이미 사용 중인 코드입니다" },
        { status: 400 }
      );
    }

    // 사업자번호 중복 확인
    if (validatedData.businessNo) {
      const existingBusiness = await prisma.tenant.findUnique({
        where: { businessNo: validatedData.businessNo },
      });
      if (existingBusiness) {
        return NextResponse.json(
          { error: "이미 등록된 사업자번호입니다" },
          { status: 400 }
        );
      }
    }

    const tenant = await prisma.tenant.create({
      data: {
        ...validatedData,
        contractStart: validatedData.contractStart
          ? new Date(validatedData.contractStart)
          : null,
        contractEnd: validatedData.contractEnd
          ? new Date(validatedData.contractEnd)
          : null,
      },
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create tenant:", error);
    return NextResponse.json(
      { error: "파트너사 등록에 실패했습니다" },
      { status: 500 }
    );
  }
}
