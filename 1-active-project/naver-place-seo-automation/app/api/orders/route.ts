import { NextRequest, NextResponse } from "next/server";
import { orderService } from "@/lib/services/order.service";
import { handleError, handleZodError } from "@/lib/utils/error-handler";

import { z } from "zod";

const orderItemSchema = z.object({
  productId: z.number().int().positive().optional(),
  productName: z.string().optional(),
  productDescription: z.string().optional(),
  quantity: z.number().int().positive("수량은 1 이상이어야 합니다"),
  unitPrice: z.number().positive("단가는 0보다 커야 합니다"),
  notes: z.string().optional(),
});

const createOrderSchema = z.object({
  customerId: z.number().int().positive("고객 ID는 필수입니다"),
  storeId: z.number().int().positive("매장 ID는 필수입니다"),
  quotationId: z.number().int().positive().optional(),
  orderDate: z.string().or(z.date()),
  dueDate: z.string().or(z.date()).optional(),
  items: z.array(orderItemSchema).min(1, "주문 항목은 최소 1개 이상 필요합니다"),
  paidAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get("customerId")
      ? Number(searchParams.get("customerId"))
      : undefined;
    const storeId = searchParams.get("storeId")
      ? Number(searchParams.get("storeId"))
      : undefined;
    const status = searchParams.get("status") || undefined;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const search = searchParams.get("search") || undefined;

    const result = await orderService.getOrders({
      customerId,
      storeId,
      status,
      page,
      limit,
      search,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createOrderSchema.parse(body);

    const order = await orderService.createOrder(validatedData);

    return NextResponse.json(
      {
        success: true,
        data: order,
        message: "�ֹ�????��??��??��??",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleError(handleZodError(error));
    }
    return handleError(error);
  }
}


