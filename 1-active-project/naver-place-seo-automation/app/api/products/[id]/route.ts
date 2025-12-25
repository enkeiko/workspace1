import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/lib/services/product.service";
import { handleError } from "@/lib/utils/error-handler";
import { z } from "zod";

function parseAndValidateId(id: string): number {
  const parsed = Number(id);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error("유효하지 않은 ID입니다.");
  }
  return parsed;
}

const updateProductSchema = z.object({
  name: z.string().min(1, "상품명은 필수입니다.").optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  unitPrice: z.number().min(0, "단가는 0 이상이어야 합니다.").optional(),
  unit: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseAndValidateId(params.id);
    const product = await productService.getProductById(id);

    return NextResponse.json({
      success: true,
      data: product,
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
    const validatedData = updateProductSchema.parse(body);

    const product = await productService.updateProduct(id, validatedData);

    return NextResponse.json({
      success: true,
      data: product,
      message: "상품이 수정되었습니다.",
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
    const result = await productService.deleteProduct(id);

    return NextResponse.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error) {
    return handleError(error);
  }
}

