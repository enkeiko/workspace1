import { NextRequest, NextResponse } from "next/server";
import { storeService } from "@/lib/services/store.service";
import { handleError } from "@/lib/utils/error-handler";
import { z } from "zod";

function parseAndValidateId(id: string): number {
  const parsed = Number(id);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error("유효하지 않은 ID입니다.");
  }
  return parsed;
}

const updateStoreSchema = z.object({
  customerId: z.number().int().positive().optional(),
  name: z.string().min(1, "매장명은 필수입니다.").optional(),
  type: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url("유효한 URL을 입력하세요.").optional().or(z.literal("")),
  description: z.string().optional(),
  metadata: z.any().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseAndValidateId(params.id);
    const store = await storeService.getStoreById(id);

    return NextResponse.json({
      success: true,
      data: store,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseAndValidateId(params.id);
    const body = await request.json();
    const validatedData = updateStoreSchema.parse(body);

    const store = await storeService.updateStore(id, validatedData);

    return NextResponse.json({
      success: true,
      data: store,
      message: "매장이 수정되었습니다.",
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseAndValidateId(params.id);
    await storeService.deleteStore(id);

    return NextResponse.json({
      success: true,
      message: "매장이 삭제되었습니다.",
    });
  } catch (error) {
    return handleError(error);
  }
}

