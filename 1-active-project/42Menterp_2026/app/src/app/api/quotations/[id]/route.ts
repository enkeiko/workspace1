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
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: {
          select: { name: true, email: true },
        },
        items: {
          include: {
            product: true,
          },
          orderBy: { seq: "asc" },
        },
        convertedToSalesOrder: {
          select: { id: true, salesOrderNo: true },
        },
      },
    });

    if (!quotation) {
      return NextResponse.json(
        { error: "견적서를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(quotation);
  } catch (error) {
    console.error("Failed to fetch quotation:", error);
    return NextResponse.json(
      { error: "견적서 정보를 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}

const updateQuotationSchema = z.object({
  validUntil: z.string().optional(),
  note: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]).optional(),
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
    const validatedData = updateQuotationSchema.parse(body);

    const existingQuotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!existingQuotation) {
      return NextResponse.json(
        { error: "견적서를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (existingQuotation.status !== "DRAFT" && existingQuotation.status !== "SENT") {
      return NextResponse.json(
        { error: "수정할 수 없는 상태입니다" },
        { status: 400 }
      );
    }

    const quotation = await prisma.quotation.update({
      where: { id },
      data: {
        ...(validatedData.validUntil && { validUntil: new Date(validatedData.validUntil) }),
        ...(validatedData.note !== undefined && { note: validatedData.note }),
        ...(validatedData.status && { status: validatedData.status }),
      },
    });

    return NextResponse.json(quotation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to update quotation:", error);
    return NextResponse.json(
      { error: "견적서 수정에 실패했습니다" },
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
    const existingQuotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!existingQuotation) {
      return NextResponse.json(
        { error: "견적서를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (existingQuotation.status !== "DRAFT") {
      return NextResponse.json(
        { error: "초안 상태의 견적서만 삭제할 수 있습니다" },
        { status: 400 }
      );
    }

    await prisma.quotation.delete({
      where: { id },
    });

    return NextResponse.json({ message: "견적서가 삭제되었습니다" });
  } catch (error) {
    console.error("Failed to delete quotation:", error);
    return NextResponse.json(
      { error: "견적서 삭제에 실패했습니다" },
      { status: 500 }
    );
  }
}
