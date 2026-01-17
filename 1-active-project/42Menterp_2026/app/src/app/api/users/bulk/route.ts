import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 사용자 일괄 수정 API
 *
 * PATCH /api/users/bulk
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ids, action, data } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "수정할 사용자를 선택해주세요" },
        { status: 400 }
      );
    }

    let updated = 0;

    if (action === "update" && data) {
      const updateData: Record<string, unknown> = {};

      if (data.status !== undefined) {
        updateData.status = data.status;
      }
      if (data.role !== undefined) {
        updateData.role = data.role;
      }
      if (data.tenantId !== undefined) {
        updateData.tenantId = data.tenantId || null;
      }

      if (Object.keys(updateData).length > 0) {
        const result = await prisma.user.updateMany({
          where: { id: { in: ids } },
          data: updateData,
        });
        updated = result.count;
      }
    }

    return NextResponse.json({
      success: true,
      summary: { updated },
    });
  } catch (error) {
    console.error("Failed to bulk update users:", error);
    return NextResponse.json(
      { error: "일괄 수정에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * 사용자 일괄 삭제 API
 *
 * DELETE /api/users/bulk
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids")?.split(",").filter(Boolean);

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { error: "삭제할 사용자를 선택해주세요" },
        { status: 400 }
      );
    }

    // 현재 로그인한 사용자 제외
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user?.email || "" },
    });

    const idsToDelete = ids.filter((id) => id !== currentUser?.id);

    if (idsToDelete.length === 0) {
      return NextResponse.json(
        { error: "삭제할 수 있는 사용자가 없습니다" },
        { status: 400 }
      );
    }

    const result = await prisma.user.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    return NextResponse.json({
      success: true,
      summary: {
        deleted: result.count,
        skipped: ids.length - idsToDelete.length,
      },
    });
  } catch (error) {
    console.error("Failed to bulk delete users:", error);
    return NextResponse.json(
      { error: "일괄 삭제에 실패했습니다" },
      { status: 500 }
    );
  }
}
