import { NextRequest, NextResponse } from "next/server";
import { customerService } from "@/lib/services/customer.service";
import { handleError } from "@/lib/utils/error-handler";
import { z } from "zod";

function parseAndValidateId(id: string): number {
  const parsed = Number(id);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error("유효하지 않은 ID입니다.");
  }
  return parsed;
}

const updateCustomerSchema = z.object({
  name: z.string().min(1, "고객명은 필수입니다.").optional(),
  businessNumber: z.string().optional(),
  businessRegistrationFile: z.string().optional(),
  contactPerson: z.string().optional(),
  email: z.string().email("유효한 이메일 주소를 입력하세요.").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseAndValidateId(params.id);
    const customer = await customerService.getCustomerById(id);

    return NextResponse.json({
      success: true,
      data: customer,
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
    const validatedData = updateCustomerSchema.parse(body);

    const customer = await customerService.updateCustomer(id, validatedData);

    return NextResponse.json({
      success: true,
      data: customer,
      message: "고객이 수정되었습니다.",
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
    await customerService.deleteCustomer(id);

    return NextResponse.json({
      success: true,
      message: "고객이 삭제되었습니다.",
    });
  } catch (error) {
    return handleError(error);
  }
}

