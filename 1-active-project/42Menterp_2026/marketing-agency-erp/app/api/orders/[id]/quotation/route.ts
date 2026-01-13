import { NextRequest, NextResponse } from "next/server";
import { orderService } from "@/lib/services/order.service";
import { handleError } from "@/lib/utils/error-handler";
import { z } from "zod";

function parseAndValidateId(id: string): number {
  const parsed = Number(id);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error("유효하지 않은 ID입니다.");
  }
  return parsed;
}

const convertToQuotationSchema = z.object({
  quotationDate: z.string().or(z.date()).optional(),
  linkToExistingQuotation: z.number().int().positive().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseAndValidateId(params.id);
    const body = await request.json().catch(() => ({}));
    const validatedData = convertToQuotationSchema.parse(body);

    const quotation = await orderService.convertToQuotation(
      id,
      validatedData.quotationDate,
      validatedData.linkToExistingQuotation
    );

    return NextResponse.json({
      success: true,
      data: quotation,
      message: "주문이 견적서로 변환되었습니다.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleError(
        new Error("입력 데이터가 유효하지 않습니다.")
      );
    }
    return handleError(error);
  }
}

