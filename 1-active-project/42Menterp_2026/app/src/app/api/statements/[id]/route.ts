import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const statement = await prisma.statement.findUnique({
      where: { id },
      include: {
        salesOrder: {
          include: {
            customer: true,
          },
        },
        createdBy: {
          select: { name: true, email: true },
        },
        items: {
          include: {
            product: true,
          },
          orderBy: { seq: "asc" },
        },
      },
    });

    if (!statement) {
      return NextResponse.json(
        { error: "거래명세서를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(statement);
  } catch (error) {
    console.error("Failed to fetch statement:", error);
    return NextResponse.json(
      { error: "거래명세서 정보를 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}

const updateStatementSchema = z.object({
  note: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "ISSUED", "SENT"]).optional(),
});

export async function PUT(
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
    const validatedData = updateStatementSchema.parse(body);

    const existingStatement = await prisma.statement.findUnique({
      where: { id },
    });

    if (!existingStatement) {
      return NextResponse.json(
        { error: "거래명세서를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const statement = await prisma.statement.update({
      where: { id },
      data: {
        ...(validatedData.note !== undefined && { note: validatedData.note }),
        ...(validatedData.status && { status: validatedData.status }),
      },
    });

    return NextResponse.json(statement);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to update statement:", error);
    return NextResponse.json(
      { error: "거래명세서 수정에 실패했습니다" },
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

    const { id } = await params;
    const existingStatement = await prisma.statement.findUnique({
      where: { id },
    });

    if (!existingStatement) {
      return NextResponse.json(
        { error: "거래명세서를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (existingStatement.status !== "DRAFT") {
      return NextResponse.json(
        { error: "초안 상태의 거래명세서만 삭제할 수 있습니다" },
        { status: 400 }
      );
    }

    await prisma.statement.delete({
      where: { id },
    });

    return NextResponse.json({ message: "거래명세서가 삭제되었습니다" });
  } catch (error) {
    console.error("Failed to delete statement:", error);
    return NextResponse.json(
      { error: "거래명세서 삭제에 실패했습니다" },
      { status: 500 }
    );
  }
}
