import { NextRequest, NextResponse } from "next/server";
import { quotationService } from "@/lib/services/quotation.service";
import { handleError } from "@/lib/utils/error-handler";
import { parseAndValidateId } from "@/lib/utils/api-helpers";
import { z } from "zod";

const convertSchema = z.object({
  orderDate: z.string().or(z.date()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseAndValidateId(params);
    const body = await request.json().catch(() => ({}));
    const validatedData = convertSchema.parse(body);

    const order = await quotationService.convertToOrder(id, validatedData.orderDate);

    return NextResponse.json({
      success: true,
      data: order,
      message: "견적서가 주문으로 전환되었습니다.",
    });
  } catch (error) {
    return handleError(error);
  }
}


