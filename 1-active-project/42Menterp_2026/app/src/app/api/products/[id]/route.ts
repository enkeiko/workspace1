import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 상품 상세 조회 API
 *
 * GET /api/products/{id}
 */
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

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        channel: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "상품을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return NextResponse.json(
      { error: "상품 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * 상품 수정 API
 *
 * PUT /api/products/{id}
 */
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
    const { code, name, type, description, saleUnitPrice, costUnitPrice, channelId, isActive } = body;

    // 기존 상품 확인
    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "상품을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 코드 중복 확인 (다른 상품이 동일한 코드를 사용하는지)
    if (code && code !== existing.code) {
      const codeExists = await prisma.product.findUnique({
        where: { code },
      });
      if (codeExists) {
        return NextResponse.json(
          { error: "이미 존재하는 상품 코드입니다" },
          { status: 400 }
        );
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        code: code ?? existing.code,
        name: name ?? existing.name,
        type: type ?? existing.type,
        description: description !== undefined ? description : existing.description,
        saleUnitPrice: saleUnitPrice !== undefined ? saleUnitPrice : existing.saleUnitPrice,
        costUnitPrice: costUnitPrice !== undefined ? costUnitPrice : existing.costUnitPrice,
        channelId: channelId !== undefined ? channelId : existing.channelId,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
      include: {
        channel: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json(
      { error: "상품 수정에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * 상품 삭제 API
 *
 * DELETE /api/products/{id}
 */
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

    // 기존 상품 확인
    const existing = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            quotationItems: true,
            salesOrderItems: true,
            purchaseOrderItems: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "상품을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 연결된 데이터 확인
    const totalRelated =
      existing._count.quotationItems +
      existing._count.salesOrderItems +
      existing._count.purchaseOrderItems;

    if (totalRelated > 0) {
      return NextResponse.json(
        {
          error: `이 상품은 ${totalRelated}건의 견적/주문/발주에 연결되어 있어 삭제할 수 없습니다.`,
        },
        { status: 400 }
      );
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json(
      { error: "상품 삭제에 실패했습니다" },
      { status: 500 }
    );
  }
}
