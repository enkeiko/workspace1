import { NextRequest, NextResponse } from "next/server";
import { settlementService } from "@/lib/services/settlement.service";
import { handleError } from "@/lib/utils/error-handler";
import { ValidationError } from "@/lib/errors/app-error";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const groupBy = searchParams.get("groupBy") as "day" | "week" | "month" | undefined;
    const customerId = searchParams.get("customerId")
      ? Number(searchParams.get("customerId"))
      : undefined;
    const storeId = searchParams.get("storeId")
      ? Number(searchParams.get("storeId"))
      : undefined;

    if (!startDate || !endDate) {
      throw new ValidationError("startDate와 endDate는 필수입니다.");
    }

    const revenue = await settlementService.getRevenue({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      groupBy: groupBy || "month",
      customerId,
      storeId,
    });

    return NextResponse.json({
      success: true,
      data: revenue,
    });
  } catch (error) {
    return handleError(error);
  }
}

