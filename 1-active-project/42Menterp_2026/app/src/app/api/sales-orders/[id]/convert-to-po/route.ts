import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const convertSchema = z.object({
  channelId: z.string(),
  orderDate: z.string(),
  orderWeek: z.string().optional(),
});

function generatePurchaseOrderNo(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `PO${year}${month}${day}-${random}`;
}

function getWeekNumber(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  );
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}W${weekNumber.toString().padStart(2, "0")}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { channelId, orderDate, orderWeek } = convertSchema.parse(body);

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
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

    if (!salesOrder) {
      return NextResponse.json(
        { error: "수주를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (salesOrder.status !== "CONFIRMED" && salesOrder.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "확정 또는 진행중 상태의 수주만 발주로 전환할 수 있습니다" },
        { status: 400 }
      );
    }

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "채널을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const parsedOrderDate = new Date(orderDate);
    const totalAmount = salesOrder.items.reduce((sum, item) => sum + item.amount, 0);
    const totalQty = salesOrder.items.reduce((sum, item) => sum + item.qty, 0);

    // Create Purchase Order from Sales Order
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        purchaseOrderNo: generatePurchaseOrderNo(),
        salesOrderId: salesOrder.id,
        channelId,
        orderDate: parsedOrderDate,
        orderWeek: orderWeek || getWeekNumber(parsedOrderDate),
        totalQty,
        totalAmount,
        createdById: session.user.id,
        items: {
          create: salesOrder.items
            .filter((item) => item.storeId)
            .map((item) => ({
              storeId: item.storeId!,
              productId: item.productId,
              productType: channel.type || "TRAFFIC",
              keyword: item.description,
              dailyQty: Math.ceil(item.qty / 7),
              startDate: parsedOrderDate,
              endDate: new Date(parsedOrderDate.getTime() + 6 * 24 * 60 * 60 * 1000),
              workDays: 7,
              totalQty: item.qty,
              unitPrice: item.unitPrice,
              amount: item.amount,
            })),
        },
      },
      include: {
        channel: true,
        items: true,
      },
    });

    // Update Sales Order status if CONFIRMED
    if (salesOrder.status === "CONFIRMED") {
      await prisma.salesOrder.update({
        where: { id },
        data: { status: "IN_PROGRESS" },
      });
    }

    return NextResponse.json({
      success: true,
      purchaseOrder,
      message: "발주가 생성되었습니다",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to convert sales order to purchase order:", error);
    return NextResponse.json(
      { error: "발주 전환에 실패했습니다" },
      { status: 500 }
    );
  }
}
