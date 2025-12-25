import { NextRequest, NextResponse } from "next/server";
import { documentService } from "@/lib/services/document.service";
import { handleError, handleZodError } from "@/lib/utils/error-handler";
import { ValidationError } from "@/lib/errors/app-error";
import { validateFile } from "@/lib/utils/file-validator";
import { z } from "zod";

const createDocumentSchema = z.object({
  customerId: z.number().int().positive().optional(),
  storeId: z.number().int().positive().optional(),
  orderId: z.number().int().positive().optional(),
  documentType: z.string().min(1, "문서 유형은 필수입니다"),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
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
    const documentType = searchParams.get("documentType") || undefined;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const search = searchParams.get("search") || undefined;
    const tags = searchParams.get("tags") ? searchParams.get("tags")!.split(",") : undefined;

    const result = await documentService.getDocuments({
      customerId,
      storeId,
      orderId,
      documentType,
      page,
      limit,
      search,
      tags,
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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const metadata = formData.get("metadata");

    if (!file) {
      return handleError(
        new ValidationError("??��????��??��??")
      );
    }

    // ??�� ��??
    const validation = await validateFile(file);
    if (!validation.valid) {
      return handleError(
        new ValidationError(validation.error || "??�� ������ ??��??��??��.")
      );
    }

    // ��????��????��
    let documentData: any = {};
    if (metadata) {
      try {
        documentData = JSON.parse(metadata as string);
      } catch {
        // JSON ??�� ??�� ??�⺻????��
      }
    }

    // ??Ű??��??
    const validatedData = createDocumentSchema.parse(documentData);

    // ���� ??��
    const document = await documentService.createDocument(
      {
        ...validatedData,
        mimeType: file.type,
      },
      file
    );

    return NextResponse.json(
      {
        success: true,
        data: document,
        message: "������ ??��??��??��??��.",
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

