import { NextRequest, NextResponse } from "next/server";
import { quotationService } from "@/lib/services/quotation.service";
import { handleError, handleZodError } from "@/lib/utils/error-handler";
import { parseAndValidateId } from "@/lib/utils/api-helpers";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseAndValidateId(params);
    const body = await request.json();
    const validatedData = updateStatusSchema.parse(body);

    const quotation = await quotationService.updateQuotationStatus(id, validatedData.status);

    return NextResponse.json({
      success: true,
      data: quotation,
      message: "견적서 상태가 변경되었습니다.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleError(handleZodError(error));
    }
    return handleError(error);
  }
}


