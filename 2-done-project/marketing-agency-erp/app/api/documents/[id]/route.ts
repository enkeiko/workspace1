import { NextRequest, NextResponse } from "next/server";
import { documentService } from "@/lib/services/document.service";
import { handleError, handleZodError } from "@/lib/utils/error-handler";
import { parseAndValidateId } from "@/lib/utils/api-helpers";
import { z } from "zod";
import { readFile } from "fs/promises";
import path from "path";

const updateDocumentSchema = z.object({
  customerId: z.number().int().positive().optional().nullable(),
  storeId: z.number().int().positive().optional().nullable(),
  orderId: z.number().int().positive().optional().nullable(),
  documentType: z.string().min(1).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseAndValidateId(params);
    const document = await documentService.getDocumentById(id);

    return NextResponse.json({
      success: true,
      data: document,
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
    const validatedData = updateDocumentSchema.parse(body);

    // null 처리를 위해 변환
    const updateData: any = { ...validatedData };
    if (validatedData.customerId === null) {
      updateData.customerId = null;
    }
    if (validatedData.storeId === null) {
      updateData.storeId = null;
    }
    if (validatedData.orderId === null) {
      updateData.orderId = null;
    }

    const document = await documentService.updateDocument(id, updateData);

    return NextResponse.json({
      success: true,
      data: document,
      message: "문서가 수정되었습니다.",
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
    await documentService.deleteDocument(id);

    return NextResponse.json({
      success: true,
      message: "문서가 삭제되었습니다.",
    });
  } catch (error) {
    return handleError(error);
  }
}

