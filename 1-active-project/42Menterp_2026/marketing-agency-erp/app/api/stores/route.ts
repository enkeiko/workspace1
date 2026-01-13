import { NextRequest, NextResponse } from "next/server";
import { storeService } from "@/lib/services/store.service";
import { handleError } from "@/lib/utils/error-handler";
import { z } from "zod";

const createStoreSchema = z.object({
  customerId: z.number().int().positive("고객 ID는 필수입니다."),
  name: z.string().min(1, "매장명은 필수입니다."),
  type: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url("유효한 URL을 입력하세요.").optional().or(z.literal("")),
  description: z.string().optional(),
  metadata: z.any().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get("customerId")
      ? Number(searchParams.get("customerId"))
      : undefined;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const search = searchParams.get("search") || undefined;

    const result = await storeService.getStores({
      customerId,
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
    const validatedData = createStoreSchema.parse(body);

    const store = await storeService.createStore(validatedData);

    return NextResponse.json(
      {
        success: true,
        data: store,
        message: "매장이 생성되었습니다.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleError(
        new Error("입력 데이터가 유효하지 않습니다.")
      );
    }
    return handleError(error);
  }
}

