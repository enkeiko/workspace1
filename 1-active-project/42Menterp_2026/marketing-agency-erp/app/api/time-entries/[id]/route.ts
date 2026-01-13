import { NextRequest, NextResponse } from "next/server";
import { taskService } from "@/lib/services/task.service";
import { handleError, handleZodError } from "@/lib/utils/error-handler";
import { parseAndValidateId } from "@/lib/utils/api-helpers";
import { z } from "zod";

const updateTimeEntrySchema = z.object({
  entryDate: z.string().or(z.date()).optional(),
  startTime: z.string().or(z.date()).optional(),
  endTime: z.string().or(z.date()).optional().nullable(),
  durationMinutes: z.number().int().positive().optional(),
  description: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseAndValidateId(params);
    const body = await request.json();
    const validatedData = updateTimeEntrySchema.parse(body);

    const timeEntry = await taskService.updateTimeEntry(id, validatedData);

    return NextResponse.json({
      success: true,
      data: timeEntry,
      message: "시간 기록이 수정되었습니다.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleError(handleZodError(error));
    }
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseAndValidateId(params);
    await taskService.deleteTimeEntry(id);

    return NextResponse.json({
      success: true,
      message: "시간 기록이 삭제되었습니다.",
    });
  } catch (error) {
    return handleError(error);
  }
}

