import { NextRequest, NextResponse } from "next/server";
import { taskService } from "@/lib/services/task.service";
import { handleError, handleZodError } from "@/lib/utils/error-handler";
import { parseAndValidateId } from "@/lib/utils/api-helpers";
import { z } from "zod";

const updateTaskSchema = z.object({
  customerId: z.number().int().positive().optional(),
  storeId: z.number().int().positive().optional().nullable(),
  orderId: z.number().int().positive().optional().nullable(),
  taskName: z.string().min(1).optional(),
  taskType: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().or(z.date()).optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseAndValidateId(params);
    const task = await taskService.getTaskById(id);

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseAndValidateId(params);
    const body = await request.json();
    const validatedData = updateTaskSchema.parse(body);

    // null 처리를 위해 변환
    const updateData: any = { ...validatedData };
    if (validatedData.storeId === null) {
      updateData.storeId = null;
    }
    if (validatedData.orderId === null) {
      updateData.orderId = null;
    }
    if (validatedData.dueDate === null) {
      updateData.dueDate = null;
    }

    const task = await taskService.updateTask(id, updateData);

    return NextResponse.json({
      success: true,
      data: task,
      message: "작업이 수정되었습니다.",
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
    await taskService.deleteTask(id);

    return NextResponse.json({
      success: true,
      message: "작업이 삭제되었습니다.",
    });
  } catch (error) {
    return handleError(error);
  }
}

