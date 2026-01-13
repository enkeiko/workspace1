import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const storeUpdateSchema = z.object({
  name: z.string().min(1, "매장명은 필수입니다").optional(),
  mid: z.string().min(1, "MID는 필수입니다").optional(),
  placeUrl: z.string().url().optional().nullable(),
  businessNo: z.string().optional().nullable(),
  representative: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "PAUSED", "TERMINATED"]).optional(),
  memo: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
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
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        keywords: true,
        customer: {
          select: {
            id: true,
            name: true,
            businessNo: true,
          },
        },
        orderItems: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            order: {
              select: {
                orderNo: true,
                channel: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: "매장을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(store);
  } catch (error) {
    console.error("Failed to fetch store:", error);
    return NextResponse.json(
      { error: "매장 정보를 불러오는데 실패했습니다" },
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
    const validatedData = storeUpdateSchema.parse(body);

    const existingStore = await prisma.store.findUnique({
      where: { id },
    });

    if (!existingStore) {
      return NextResponse.json(
        { error: "매장을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (validatedData.mid && validatedData.mid !== existingStore.mid) {
      const duplicateMid = await prisma.store.findUnique({
        where: { mid: validatedData.mid },
      });
      if (duplicateMid) {
        return NextResponse.json(
          { error: "이미 등록된 MID입니다" },
          { status: 400 }
        );
      }
    }

    const store = await prisma.store.update({
      where: { id },
      data: validatedData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            businessNo: true,
          },
        },
      },
    });

    return NextResponse.json(store);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to update store:", error);
    return NextResponse.json(
      { error: "매장 수정에 실패했습니다" },
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
    const existingStore = await prisma.store.findUnique({
      where: { id },
    });

    if (!existingStore) {
      return NextResponse.json(
        { error: "매장을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    await prisma.store.delete({
      where: { id },
    });

    return NextResponse.json({ message: "매장이 삭제되었습니다" });
  } catch (error) {
    console.error("Failed to delete store:", error);
    return NextResponse.json(
      { error: "매장 삭제에 실패했습니다" },
      { status: 500 }
    );
  }
}
