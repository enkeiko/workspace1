import { NextRequest, NextResponse } from "next/server";
import { orderService } from "@/lib/services/order.service";
import { handleError, handleZodError } from "@/lib/utils/error-handler";
import { parseAndValidateId } from "@/lib/utils/api-helpers";
import { z } from "zod";

const paymentSchema = z.object({
  amount: z.number().positive("결제 금액은 0보다 커야 합니다."),
  paymentDate: z.string().or(z.date()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseAndValidateId(params);
    const body = await request.json();
    const validatedData = paymentSchema.parse(body);

    const order = await orderService.processPayment(id, validatedData.amount, validatedData.paymentDate);

    return NextResponse.json({
      success: true,
      data: order,
      message: "결제가 처리되었습니다.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleError(handleZodError(error));
    }
    return handleError(error);
  }
}


