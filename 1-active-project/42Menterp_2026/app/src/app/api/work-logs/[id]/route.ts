import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const workLogUpdateSchema = z.object({
  description: z.string().optional(),
  qty: z.number().optional().nullable(),
  result: z.string().optional().nullable(),
});

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
    const workLog = await prisma.workLog.findUnique({
      where: { id },
      include: {
        store: { select: { id: true, name: true, mid: true } },
        purchaseOrder: { select: { id: true, purchaseOrderNo: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!workLog) {
      return NextResponse.json(
        { error: "작업 로그를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(workLog);
  } catch (error) {
    console.error("Failed to fetch work log:", error);
    return NextResponse.json(
      { error: "작업 로그를 불러오는데 실패했습니다" },
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

    const { id } = await params;
    const body = await request.json();
    const validatedData = workLogUpdateSchema.parse(body);

    const existing = await prisma.workLog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "작업 로그를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const workLog = await prisma.workLog.update({
      where: { id },
      data: validatedData,
      include: {
        store: { select: { id: true, name: true, mid: true } },
        purchaseOrder: { select: { id: true, purchaseOrderNo: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(workLog);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to update work log:", error);
    return NextResponse.json(
      { error: "작업 로그 수정에 실패했습니다" },
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
    const existing = await prisma.workLog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "작업 로그를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    await prisma.workLog.delete({ where: { id } });

    return NextResponse.json({ message: "작업 로그가 삭제되었습니다" });
  } catch (error) {
    console.error("Failed to delete work log:", error);
    return NextResponse.json(
      { error: "작업 로그 삭제에 실패했습니다" },
      { status: 500 }
    );
  }
}
