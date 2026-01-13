import { NextRequest, NextResponse } from "next/server";
import { orderService } from "@/lib/services/order.service";
import { handleError, handleZodError } from "@/lib/utils/error-handler";
import { parseAndValidateId, createInvalidIdResponse } from "@/lib/utils/api-helpers";
import { z } from "zod";

const orderItemSchema = z.object({
  productId: z.number().int().positive().optional(),
  productName: z.string().optional(),
  productDescription: z.string().optional(),
  quantity: z.number().int().positive("수량은 1 이상이어야 합니다."),
  unitPrice: z.number().positive("단가는 0보다 커야 합니다."),
  notes: z.string().optional(),
});

const updateOrderSchema = z.object({
  customerId: z.number().int().positive().optional(),
  storeId: z.number().int().positive().optional(),
  orderDate: z.string().or(z.date()).optional(),
  dueDate: z.string().or(z.date()).optional(),
  items: z.array(orderItemSchema).min(1, "주문 항목이 최소 1개 이상 필요합니다.").optional(),
  paidAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseAndValidateId(params);
    const order = await orderService.getOrderById(id);

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseAndValidateId(params);
    const body = await request.json();
    const validatedData = updateOrderSchema.parse(body);

    const order = await orderService.updateOrder(id, validatedData);

    return NextResponse.json({
      success: true,
      data: order,
      message: "주문 정보가 수정되었습니다.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleError(handleZodError(error));
    }
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseAndValidateId(params);
    await orderService.deleteOrder(id);

    return NextResponse.json({
      success: true,
      message: "주문이 삭제되었습니다.",
    });
  } catch (error) {
    return handleError(error);
  }
}


