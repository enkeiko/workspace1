import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        sourceQuotation: {
          select: { id: true, quotationNo: true },
        },
        createdBy: {
          select: { name: true, email: true },
        },
        items: {
          include: {
            store: {
              select: { id: true, name: true, mid: true },
            },
            product: true,
          },
          orderBy: { createdAt: "asc" },
        },
        purchaseOrders: {
          select: { id: true, purchaseOrderNo: true, status: true, totalAmount: true },
          orderBy: { createdAt: "desc" },
        },
        statements: {
          select: { id: true, statementNo: true, status: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!salesOrder) {
      return NextResponse.json(
        { error: "수주를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(salesOrder);
  } catch (error) {
    console.error("Failed to fetch sales order:", error);
    return NextResponse.json(
      { error: "수주 정보를 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}

const updateSalesOrderSchema = z.object({
  note: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
});

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
    const validatedData = updateSalesOrderSchema.parse(body);

    const existingSalesOrder = await prisma.salesOrder.findUnique({
      where: { id },
    });

    if (!existingSalesOrder) {
      return NextResponse.json(
        { error: "수주를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (existingSalesOrder.status !== "DRAFT" && existingSalesOrder.status !== "CONFIRMED") {
      if (validatedData.note === undefined) {
        return NextResponse.json(
          { error: "수정할 수 없는 상태입니다" },
          { status: 400 }
        );
      }
    }

    const salesOrder = await prisma.salesOrder.update({
      where: { id },
      data: {
        ...(validatedData.note !== undefined && { note: validatedData.note }),
        ...(validatedData.status && { status: validatedData.status }),
      },
    });

    return NextResponse.json(salesOrder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to update sales order:", error);
    return NextResponse.json(
      { error: "수주 수정에 실패했습니다" },
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
    const existingSalesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        _count: {
          select: { purchaseOrders: true, statements: true },
        },
      },
    });

    if (!existingSalesOrder) {
      return NextResponse.json(
        { error: "수주를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (existingSalesOrder.status !== "DRAFT") {
      return NextResponse.json(
        { error: "초안 상태의 수주만 삭제할 수 있습니다" },
        { status: 400 }
      );
    }

    if (existingSalesOrder._count.purchaseOrders > 0 || existingSalesOrder._count.statements > 0) {
      return NextResponse.json(
        { error: "연결된 발주 또는 거래명세서가 있어 삭제할 수 없습니다" },
        { status: 400 }
      );
    }

    await prisma.salesOrder.delete({
      where: { id },
    });

    return NextResponse.json({ message: "수주가 삭제되었습니다" });
  } catch (error) {
    console.error("Failed to delete sales order:", error);
    return NextResponse.json(
      { error: "수주 삭제에 실패했습니다" },
      { status: 500 }
    );
  }
}
