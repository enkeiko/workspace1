import { NextRequest, NextResponse } from "next/server";
import { taskService } from "@/lib/services/task.service";
import { handleError, handleZodError } from "@/lib/utils/error-handler";

import { z } from "zod";

const createTaskSchema = z.object({
  customerId: z.number().int().positive("고객 ID는 필수입니다"),
  storeId: z.number().int().positive().optional(),
  orderId: z.number().int().positive().optional(),
  taskName: z.string().min(1, "작업명은 필수입니다"),
  taskType: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().or(z.date()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get("customerId")
      ? Number(searchParams.get("customerId"))
      : undefined;
    const storeId = searchParams.get("storeId")
      ? Number(searchParams.get("storeId"))
      : undefined;
    const orderId = searchParams.get("orderId")
      ? Number(searchParams.get("orderId"))
      : undefined;
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const dueDate = searchParams.get("dueDate") || undefined;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const search = searchParams.get("search") || undefined;

    const result = await taskService.getTasks({
      customerId,
      storeId,
      orderId,
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
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
    const validatedData = createTaskSchema.parse(body);

    const task = await taskService.createTask(validatedData);

    return NextResponse.json(
      {
        success: true,
        data: task,
        message: "??��????��??��??��??",
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

