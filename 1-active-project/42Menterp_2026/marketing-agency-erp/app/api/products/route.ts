import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/lib/services/product.service";
import { handleError } from "@/lib/utils/error-handler";
import { z } from "zod";

const createProductSchema = z.object({
  name: z.string().min(1, "상품명은 필수입니다."),
  category: z.string().optional(),
  description: z.string().optional(),
  unitPrice: z.number().min(0, "단가는 0 이상이어야 합니다."),
  unit: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const listType = searchParams.get("listType"); // "categories" 또는 "units"

    // 카테고리 또는 단위 목록만 요청하는 경우
    if (listType === "categories" || listType === "units") {
      const result = await productService.getDistinctValues(listType);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    const category = searchParams.get("category") || undefined;
    const isActive = searchParams.get("isActive")
      ? searchParams.get("isActive") === "true"
      : undefined;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const search = searchParams.get("search") || undefined;

    const result = await productService.getProducts({
      category,
      isActive,
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
    const validatedData = createProductSchema.parse(body);

    const product = await productService.createProduct(validatedData);

    return NextResponse.json(
      {
        success: true,
        data: product,
        message: "상품이 생성되었습니다.",
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

