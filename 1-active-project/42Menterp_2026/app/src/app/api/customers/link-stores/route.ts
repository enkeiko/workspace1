import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 고객-매장 연결 API
 *
 * GET: 연결 가능한 매장 후보 조회
 * POST: 매장을 고객에 연결
 * DELETE: 매장과 고객 연결 해제
 */

// GET: 연결 가능한 매장 후보 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const mode = searchParams.get("mode") || "candidates"; // candidates | linked | all

    if (mode === "candidates" && !customerId) {
      return NextResponse.json(
        { error: "customerId가 필요합니다" },
        { status: 400 }
      );
    }

    // 모드별 조회
    if (mode === "linked" && customerId) {
      // 해당 고객에 연결된 매장만
      const stores = await prisma.store.findMany({
        where: { customerId },
        select: {
          id: true,
          name: true,
          mid: true,
          businessNo: true,
          status: true,
        },
        orderBy: { name: "asc" },
      });

      return NextResponse.json({ stores });
    }

    if (mode === "candidates" && customerId) {
      // 연결 후보 매장 조회 (미연결 + 사업자번호 매칭 가능)
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "고객을 찾을 수 없습니다" },
          { status: 404 }
        );
      }

      // 미연결 매장 조회
      const unlinkedStores = await prisma.store.findMany({
        where: {
          customerId: null,
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          mid: true,
          businessNo: true,
          address: true,
        },
        orderBy: { name: "asc" },
      });

      // 사업자번호로 매칭 가능 여부 계산
      const candidates = unlinkedStores.map((store) => {
        let matchScore = 0;
        const matchReasons: string[] = [];

        // 사업자번호 일치
        if (customer.businessNo && store.businessNo) {
          if (customer.businessNo === store.businessNo) {
            matchScore += 100;
            matchReasons.push("사업자번호 일치");
          }
        }

        // 상호명 유사도 (간단한 포함 검사)
        if (customer.name && store.name) {
          const customerName = customer.name.toLowerCase();
          const storeName = store.name.toLowerCase();
          if (storeName.includes(customerName) || customerName.includes(storeName)) {
            matchScore += 50;
            matchReasons.push("상호명 유사");
          }
        }

        return {
          ...store,
          matchScore,
          matchReasons,
        };
      });

      // 매칭 점수 순으로 정렬
      candidates.sort((a, b) => b.matchScore - a.matchScore);

      return NextResponse.json({ candidates });
    }

    // mode === "all": 연결 현황 전체
    const summary = await prisma.$transaction([
      prisma.customer.count({ where: { status: "ACTIVE" } }),
      prisma.store.count({ where: { status: "ACTIVE" } }),
      prisma.store.count({ where: { customerId: { not: null }, status: "ACTIVE" } }),
      prisma.store.count({ where: { customerId: null, status: "ACTIVE" } }),
    ]);

    // 미연결 매장 목록
    const unlinkedStores = await prisma.store.findMany({
      where: { customerId: null, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        mid: true,
        businessNo: true,
      },
      take: 50,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      summary: {
        totalCustomers: summary[0],
        totalStores: summary[1],
        linkedStores: summary[2],
        unlinkedStores: summary[3],
        linkRate: summary[1] > 0 ? Math.round((summary[2] / summary[1]) * 100) : 0,
      },
      unlinkedStores,
    });
  } catch (error) {
    console.error("Failed to get link candidates:", error);
    return NextResponse.json(
      { error: "매장 후보 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}

// POST: 매장을 고객에 연결
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { customerId, storeIds } = await request.json();

    if (!customerId || !storeIds || !Array.isArray(storeIds)) {
      return NextResponse.json(
        { error: "customerId와 storeIds가 필요합니다" },
        { status: 400 }
      );
    }

    // 고객 존재 확인
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "고객을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 매장 연결
    const result = await prisma.store.updateMany({
      where: {
        id: { in: storeIds },
        customerId: null, // 미연결 매장만
      },
      data: {
        customerId,
      },
    });

    return NextResponse.json({
      success: true,
      linkedCount: result.count,
      message: `${result.count}개 매장이 연결되었습니다`,
    });
  } catch (error) {
    console.error("Failed to link stores:", error);
    return NextResponse.json(
      { error: "매장 연결에 실패했습니다" },
      { status: 500 }
    );
  }
}

// DELETE: 매장과 고객 연결 해제
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storeIds } = await request.json();

    if (!storeIds || !Array.isArray(storeIds)) {
      return NextResponse.json(
        { error: "storeIds가 필요합니다" },
        { status: 400 }
      );
    }

    const result = await prisma.store.updateMany({
      where: {
        id: { in: storeIds },
      },
      data: {
        customerId: null,
      },
    });

    return NextResponse.json({
      success: true,
      unlinkedCount: result.count,
      message: `${result.count}개 매장 연결이 해제되었습니다`,
    });
  } catch (error) {
    console.error("Failed to unlink stores:", error);
    return NextResponse.json(
      { error: "매장 연결 해제에 실패했습니다" },
      { status: 500 }
    );
  }
}
