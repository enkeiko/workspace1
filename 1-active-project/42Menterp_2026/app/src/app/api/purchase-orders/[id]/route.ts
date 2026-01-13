import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        channel: {
          include: {
            sheets: true,
          },
        },
        salesOrder: {
          select: { salesOrderNo: true, customerId: true },
        },
        createdBy: {
          select: { name: true, email: true },
        },
        items: {
          include: {
            store: {
              select: { id: true, name: true, mid: true, placeUrl: true },
            },
            product: true,
          },
          orderBy: { createdAt: "asc" },
        },
        exports: {
          include: {
            channelSheet: true,
            exportedBy: {
              select: { name: true },
            },
          },
          orderBy: { exportedAt: "desc" },
        },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "발주를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(purchaseOrder);
  } catch (error) {
    console.error("Failed to fetch purchase order:", error);
    return NextResponse.json(
      { error: "발주 정보를 불러오는데 실패했습니다" },
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

    const existingOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: "발주를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (
      existingOrder.status !== "DRAFT" &&
      existingOrder.status !== "PENDING"
    ) {
      return NextResponse.json(
        { error: "수정할 수 없는 상태입니다" },
        { status: 400 }
      );
    }

    const { status, memo } = body;

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(memo !== undefined && { memo }),
      },
    });

    return NextResponse.json(purchaseOrder);
  } catch (error) {
    console.error("Failed to update purchase order:", error);
    return NextResponse.json(
      { error: "발주 수정에 실패했습니다" },
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
    const existingOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: "발주를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (existingOrder.status !== "DRAFT") {
      return NextResponse.json(
        { error: "초안 상태의 발주만 삭제할 수 있습니다" },
        { status: 400 }
      );
    }

    await prisma.purchaseOrder.delete({
      where: { id },
    });

    return NextResponse.json({ message: "발주가 삭제되었습니다" });
  } catch (error) {
    console.error("Failed to delete purchase order:", error);
    return NextResponse.json(
      { error: "발주 삭제에 실패했습니다" },
      { status: 500 }
    );
  }
}
