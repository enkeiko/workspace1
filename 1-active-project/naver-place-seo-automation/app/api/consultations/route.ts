import { NextRequest, NextResponse } from "next/server";
import { consultationService } from "@/lib/services/consultation.service";
import { handleError, handleZodError } from "@/lib/utils/error-handler";
import { z } from "zod";

const createConsultationSchema = z.object({
  customerId: z.number().int().positive("고객 ID는 필수입니다."),
  storeId: z.number().int().positive().optional(),
  consultationChannel: z.enum(["kakao", "phone", "email", "face_to_face", "other"], {
    errorMap: () => ({ message: "유효한 상담 채널을 선택하세요." }),
  }),
  consultationDate: z.string().or(z.date()),
  consultationTopic: z.string().optional(),
  consultationContent: z.string().optional(),
  actionItems: z.string().optional(),
  consultationResult: z.enum(["success", "pending", "cancelled"]).optional(),
  relatedOrderId: z.number().int().positive().optional(),
  relatedQuotationId: z.number().int().positive().optional(),
  attachments: z.any().optional(),
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
    const channel = searchParams.get("channel") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const search = searchParams.get("search") || undefined;

    const result = await consultationService.getConsultations({
      customerId,
      storeId,
      channel,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
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
    const validatedData = createConsultationSchema.parse(body);

    const consultation = await consultationService.createConsultation(validatedData);

    return NextResponse.json(
      {
        success: true,
        data: consultation,
        message: "상담이 생성되었습니다.",
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

