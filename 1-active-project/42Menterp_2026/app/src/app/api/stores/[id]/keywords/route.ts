import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const keywordSchema = z.object({
  keyword: z.string().min(1, "키워드를 입력하세요"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { keyword } = keywordSchema.parse(body);

    const store = await prisma.store.findUnique({
      where: { id },
    });

    if (!store) {
      return NextResponse.json(
        { error: "매장을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const existingKeyword = await prisma.storeKeyword.findFirst({
      where: {
        storeId: id,
        keyword: keyword.trim(),
      },
    });

    if (existingKeyword) {
      return NextResponse.json(
        { error: "이미 등록된 키워드입니다" },
        { status: 400 }
      );
    }

    const storeKeyword = await prisma.storeKeyword.create({
      data: {
        storeId: id,
        keyword: keyword.trim(),
      },
    });

    return NextResponse.json(storeKeyword, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create keyword:", error);
    return NextResponse.json(
      { error: "키워드 등록에 실패했습니다" },
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
    const keywordId = searchParams.get("keywordId");

    if (!keywordId) {
      return NextResponse.json(
        { error: "키워드 ID가 필요합니다" },
        { status: 400 }
      );
    }

    const { id } = await params;
    const keyword = await prisma.storeKeyword.findFirst({
      where: {
        id: keywordId,
        storeId: id,
      },
    });

    if (!keyword) {
      return NextResponse.json(
        { error: "키워드를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    await prisma.storeKeyword.delete({
      where: { id: keywordId },
    });

    return NextResponse.json({ message: "키워드가 삭제되었습니다" });
  } catch (error) {
    console.error("Failed to delete keyword:", error);
    return NextResponse.json(
      { error: "키워드 삭제에 실패했습니다" },
      { status: 500 }
    );
  }
}
