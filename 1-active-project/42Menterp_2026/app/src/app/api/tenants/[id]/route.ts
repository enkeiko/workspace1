import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const tenantUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  businessNo: z.string().optional().nullable(),
  representative: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  commissionType: z.enum(["FIXED", "RATE"]).optional(),
  defaultCommissionRate: z.number().min(0).max(1).optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),
  bankHolder: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  contractStart: z.string().optional().nullable(),
  contractEnd: z.string().optional().nullable(),
  memo: z.string().optional().nullable(),
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

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
          },
        },
        partnerPrices: {
          include: {
            channel: {
              select: { id: true, name: true, code: true, baseUnitPrice: true },
            },
          },
          orderBy: { effectiveFrom: "desc" },
        },
        _count: {
          select: {
            stores: true,
            purchaseOrders: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "파트너사를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("Failed to fetch tenant:", error);
    return NextResponse.json(
      { error: "파트너사 정보를 불러오는데 실패했습니다" },
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = tenantUpdateSchema.parse(body);

    // 코드 중복 확인
    if (validatedData.code) {
      const existingCode = await prisma.tenant.findFirst({
        where: { code: validatedData.code, id: { not: id } },
      });
      if (existingCode) {
        return NextResponse.json(
          { error: "이미 사용 중인 코드입니다" },
          { status: 400 }
        );
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...validatedData,
        contractStart: validatedData.contractStart
          ? new Date(validatedData.contractStart)
          : undefined,
        contractEnd: validatedData.contractEnd
          ? new Date(validatedData.contractEnd)
          : undefined,
      },
    });

    return NextResponse.json(tenant);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to update tenant:", error);
    return NextResponse.json(
      { error: "파트너사 수정에 실패했습니다" },
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

    if (session.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const { id } = await params;

    // 연결된 데이터 확인
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { stores: true, purchaseOrders: true, users: true },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "파트너사를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (tenant._count.stores > 0 || tenant._count.purchaseOrders > 0) {
      return NextResponse.json(
        { error: "연결된 매장이나 발주가 있어 삭제할 수 없습니다. 비활성화를 사용하세요." },
        { status: 400 }
      );
    }

    await prisma.tenant.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete tenant:", error);
    return NextResponse.json(
      { error: "파트너사 삭제에 실패했습니다" },
      { status: 500 }
    );
  }
}
