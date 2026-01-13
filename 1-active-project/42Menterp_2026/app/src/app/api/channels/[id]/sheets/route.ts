import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const sheetSchema = z.object({
  sheetType: z.enum(["ORDER", "RECEIPT"]),
  sheetName: z.string().min(1, "시트 이름은 필수입니다"),
  spreadsheetId: z.string().min(1, "스프레드시트 ID는 필수입니다"),
  spreadsheetUrl: z.string().url("유효한 URL을 입력하세요"),
  sheetTabName: z.string().optional().nullable(),
  columnMapping: z.record(z.string(), z.string()).optional().nullable(),
  headerRow: z.number().optional(),
  dataStartRow: z.number().optional(),
  isActive: z.boolean().optional(),
});

function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: channelId } = await params;
    const body = await request.json();

    const spreadsheetId =
      body.spreadsheetId || extractSpreadsheetId(body.spreadsheetUrl);

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "스프레드시트 ID를 추출할 수 없습니다" },
        { status: 400 }
      );
    }

    const validatedData = sheetSchema.parse({
      ...body,
      spreadsheetId,
    });

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "채널을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const existingSheet = await prisma.channelSheet.findFirst({
      where: {
        channelId,
        sheetType: validatedData.sheetType,
      },
    });

    if (existingSheet) {
      return NextResponse.json(
        { error: `이미 ${validatedData.sheetType === "ORDER" ? "발주" : "수주"} 시트가 등록되어 있습니다` },
        { status: 400 }
      );
    }

    const { columnMapping, ...rest } = validatedData;
    const sheet = await prisma.channelSheet.create({
      data: {
        ...rest,
        channelId,
        columnMapping: columnMapping ? (columnMapping as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });

    return NextResponse.json(sheet, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create sheet:", error);
    return NextResponse.json(
      { error: "시트 등록에 실패했습니다" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sheetId, ...updateData } = body;

    if (!sheetId) {
      return NextResponse.json(
        { error: "시트 ID가 필요합니다" },
        { status: 400 }
      );
    }

    if (updateData.spreadsheetUrl && !updateData.spreadsheetId) {
      updateData.spreadsheetId = extractSpreadsheetId(updateData.spreadsheetUrl);
    }

    const sheet = await prisma.channelSheet.update({
      where: { id: sheetId },
      data: updateData,
    });

    return NextResponse.json(sheet);
  } catch (error) {
    console.error("Failed to update sheet:", error);
    return NextResponse.json(
      { error: "시트 수정에 실패했습니다" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sheetId = searchParams.get("sheetId");

    if (!sheetId) {
      return NextResponse.json(
        { error: "시트 ID가 필요합니다" },
        { status: 400 }
      );
    }

    await prisma.channelSheet.delete({
      where: { id: sheetId },
    });

    return NextResponse.json({ message: "시트가 삭제되었습니다" });
  } catch (error) {
    console.error("Failed to delete sheet:", error);
    return NextResponse.json(
      { error: "시트 삭제에 실패했습니다" },
      { status: 500 }
    );
  }
}
