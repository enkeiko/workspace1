import { NextRequest, NextResponse } from "next/server";
import { consultationService } from "@/lib/services/consultation.service";
import { handleError, handleZodError } from "@/lib/utils/error-handler";
import { parseAndValidateId } from "@/lib/utils/api-helpers";
import { z } from "zod";

const updateConsultationSchema = z.object({
  customerId: z.number().int().positive().optional(),
  storeId: z.number().int().positive().optional().nullable(),
  consultationChannel: z.enum(["kakao", "phone", "email", "face_to_face", "other"]).optional(),
  consultationDate: z.string().or(z.date()).optional(),
  consultationTopic: z.string().optional(),
  consultationContent: z.string().optional(),
  actionItems: z.string().optional(),
  consultationResult: z.enum(["success", "pending", "cancelled"]).optional(),
  relatedOrderId: z.number().int().positive().optional().nullable(),
  relatedQuotationId: z.number().int().positive().optional().nullable(),
  attachments: z.any().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseAndValidateId(params);
    const consultation = await consultationService.getConsultationById(id);

    return NextResponse.json({
      success: true,
      data: consultation,
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
    const validatedData = updateConsultationSchema.parse(body);

    const consultation = await consultationService.updateConsultation(id, validatedData);

    return NextResponse.json({
      success: true,
      data: consultation,
      message: "상담이 수정되었습니다.",
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
    await consultationService.deleteConsultation(id);

    return NextResponse.json({
      success: true,
      message: "상담이 삭제되었습니다.",
    });
  } catch (error) {
    return handleError(error);
  }
}

