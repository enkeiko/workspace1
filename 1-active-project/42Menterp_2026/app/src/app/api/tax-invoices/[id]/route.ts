import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const taxInvoice = await prisma.taxInvoice.findUnique({
      where: { id },
      include: {
        issuedBy: {
          select: { name: true, email: true },
        },
        items: true,
      },
    });

    if (!taxInvoice) {
      return NextResponse.json(
        { error: "세금계산서를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(taxInvoice);
  } catch (error) {
    console.error("Tax invoice fetch error:", error);
    return NextResponse.json(
      { error: "세금계산서 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}
