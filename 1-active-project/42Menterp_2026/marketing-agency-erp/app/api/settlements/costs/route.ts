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

    if (!startDate || !endDate) {
      throw new ValidationError("startDate와 endDate는 필수입니다.");
    }

    const costs = await settlementService.getCosts({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      groupBy: groupBy || "month",
    });

    return NextResponse.json({
      success: true,
      data: costs,
    });
  } catch (error) {
    return handleError(error);
  }
}

