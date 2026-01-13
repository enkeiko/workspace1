import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateSalesOrderNo(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `SO${year}${month}${day}-${random}`;
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

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
          orderBy: { seq: "asc" },
        },
      },
    });

    if (!quotation) {
      return NextResponse.json(
        { error: "견적서를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (quotation.status !== "ACCEPTED" && quotation.status !== "SENT") {
      return NextResponse.json(
        { error: "발송됨 또는 승인된 견적서만 수주로 전환할 수 있습니다" },
        { status: 400 }
      );
    }

    if (quotation.convertedToSalesOrderId) {
      return NextResponse.json(
        { error: "이미 수주로 전환된 견적서입니다" },
        { status: 400 }
      );
    }

    // Create Sales Order from Quotation
    const salesOrder = await prisma.salesOrder.create({
      data: {
        salesOrderNo: generateSalesOrderNo(),
        customerId: quotation.customerId,
        sourceQuotationId: quotation.id,
        orderDate: new Date(),
        totalAmount: quotation.totalAmount,
        taxAmount: quotation.taxAmount,
        memo: quotation.note,
        createdById: session.user.id,
        items: {
          create: quotation.items.map((item, index) => ({
            seq: index + 1,
            productId: item.productId,
            productType: item.product?.type || "SAVE",
            keyword: item.itemName,
            totalQty: item.quantity,
            unitPrice: item.unitPrice,
            supplyAmount: item.supplyAmount,
            taxAmount: item.taxAmount,
            note: item.itemSpec || item.note,
          })),
        },
      },
      include: {
        customer: true,
        items: true,
      },
    });

    // Update Quotation status and link
    await prisma.quotation.update({
      where: { id },
      data: {
        status: "ACCEPTED",
        convertedToSalesOrderId: salesOrder.id,
      },
    });

    return NextResponse.json({
      success: true,
      salesOrder,
      message: "견적서가 수주로 전환되었습니다",
    });
  } catch (error) {
    console.error("Failed to convert quotation to sales order:", error);
    return NextResponse.json(
      { error: "수주 전환에 실패했습니다" },
      { status: 500 }
    );
  }
}
