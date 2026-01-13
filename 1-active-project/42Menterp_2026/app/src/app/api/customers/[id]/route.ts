import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const customerUpdateSchema = z.object({
  name: z.string().min(1, "고객명은 필수입니다").optional(),
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

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        stores: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "고객을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Failed to fetch customer:", error);
    return NextResponse.json(
      { error: "고객 정보를 불러오는데 실패했습니다" },
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

    const { id } = await params;
    const body = await request.json();
    const validatedData = customerUpdateSchema.parse(body);

    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { error: "고객을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (validatedData.businessNo && validatedData.businessNo !== existingCustomer.businessNo) {
      const duplicateCustomer = await prisma.customer.findUnique({
        where: { businessNo: validatedData.businessNo },
      });

      if (duplicateCustomer) {
        return NextResponse.json(
          { error: "이미 등록된 사업자번호입니다" },
          { status: 400 }
        );
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
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

    return NextResponse.json(customer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to update customer:", error);
    return NextResponse.json(
      { error: "고객 수정에 실패했습니다" },
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

    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { stores: true },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "고객을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (customer._count.stores > 0) {
      return NextResponse.json(
        { error: "연결된 매장이 있어 삭제할 수 없습니다" },
        { status: 400 }
      );
    }

    await prisma.customer.delete({
      where: { id },
    });

    return NextResponse.json({ message: "고객이 삭제되었습니다" });
  } catch (error) {
    console.error("Failed to delete customer:", error);
    return NextResponse.json(
      { error: "고객 삭제에 실패했습니다" },
      { status: 500 }
    );
  }
}
