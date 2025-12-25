import { NextRequest, NextResponse } from "next/server";
import { quotationService } from "@/lib/services/quotation.service";
import { handleError, handleZodError } from "@/lib/utils/error-handler";
import { parseAndValidateId } from "@/lib/utils/api-helpers";
import { z } from "zod";

const quotationItemSchema = z.object({
  productId: z.number().int().positive().optional(),
  productName: z.string().optional(),
  productDescription: z.string().optional(),
  quantity: z.number().int().positive("수량은 1 이상이어야 합니다."),
  unitPrice: z.number().positive("단가는 0보다 커야 합니다."),
  description: z.string().optional(),
});

const updateQuotationSchema = z.object({
  customerId: z.number().int().positive().optional(),
  storeId: z.number().int().positive().optional(),
  quotationDate: z.string().or(z.date()).optional(),
  validUntil: z.string().or(z.date()).optional(),
  items: z.array(quotationItemSchema).min(1, "견적서 항목이 최소 1개 이상 필요합니다.").optional(),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseAndValidateId(params);
    const quotation = await quotationService.getQuotationById(id);

    return NextResponse.json({
      success: true,
      data: quotation,
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
    const validatedData = updateQuotationSchema.parse(body);

    const quotation = await quotationService.updateQuotation(id, validatedData);

    return NextResponse.json({
      success: true,
      data: quotation,
      message: "견적서 정보가 수정되었습니다.",
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
    await quotationService.deleteQuotation(id);

    return NextResponse.json({
      success: true,
      message: "견적서가 삭제되었습니다.",
    });
  } catch (error) {
    return handleError(error);
  }
}


