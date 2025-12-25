import { NextRequest, NextResponse } from "next/server";
import { customerService } from "@/lib/services/customer.service";
import { handleError } from "@/lib/utils/error-handler";
import { z } from "zod";

const createCustomerSchema = z.object({
  name: z.string().min(1, "고객명은 필수입니다."),
  businessNumber: z.string().optional(),
  businessRegistrationFile: z.string().optional(),
  contactPerson: z.string().optional(),
  email: z.string().email("유효한 이메일 주소를 입력하세요.").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const search = searchParams.get("search") || undefined;

    const result = await customerService.getCustomers({
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
    const validatedData = createCustomerSchema.parse(body);

    const customer = await customerService.createCustomer(validatedData);

    return NextResponse.json(
      {
        success: true,
        data: customer,
        message: "고객이 생성되었습니다.",
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

