import { NextRequest, NextResponse } from "next/server";
import { taskService } from "@/lib/services/task.service";
import { handleError, handleZodError } from "@/lib/utils/error-handler";
import { parseAndValidateId } from "@/lib/utils/api-helpers";
import { z } from "zod";

const createTimeEntrySchema = z.object({
  entryDate: z.string().or(z.date()),
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()).optional(),
  durationMinutes: z.number().int().positive().optional(),
  description: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseAndValidateId(params);
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const result = await taskService.getTimeEntries(id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseAndValidateId(params);
    const body = await request.json();
    const validatedData = createTimeEntrySchema.parse(body);

    const timeEntry = await taskService.createTimeEntry({
      taskId: id,
      ...validatedData,
    });

    return NextResponse.json(
      {
        success: true,
        data: timeEntry,
        message: "시간 기록이 생성되었습니다.",
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

