import { NextRequest, NextResponse } from "next/server";
import { settlementService } from "@/lib/services/settlement.service";
import { handleError } from "@/lib/utils/error-handler";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const period = searchParams.get("period") as
      | "day"
      | "week"
      | "month"
      | "quarter"
      | "year"
      | undefined;

    const dashboard = await settlementService.getDashboard({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      period,
    });

    return NextResponse.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    return handleError(error);
  }
}

