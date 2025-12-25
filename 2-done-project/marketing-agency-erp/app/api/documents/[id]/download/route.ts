import { NextRequest, NextResponse } from "next/server";
import { documentService } from "@/lib/services/document.service";
import { handleError } from "@/lib/utils/error-handler";
import { parseAndValidateId } from "@/lib/utils/api-helpers";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseAndValidateId(params);
    const filePath = await documentService.getDocumentDownloadPath(id);
    const document = await documentService.getDocumentById(id);

    // 파일 읽기
    const fileBuffer = await readFile(filePath);

    // Content-Type 설정
    const contentType = document.mimeType || "application/octet-stream";

    // 파일명 인코딩 (한글 파일명 지원)
    const encodedFileName = encodeURIComponent(document.fileName);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

