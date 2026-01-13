import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 고객-매장 자동 연결 API
 *
 * POST: 사업자번호 기반 자동 연결 실행
 *
 * 매칭 규칙:
 * 1. 사업자번호 완전 일치
 * 2. 미연결 매장만 대상
 */

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 사업자번호가 있는 고객 조회
    const customers = await prisma.customer.findMany({
      where: {
        businessNo: { not: null },
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        businessNo: true,
      },
    });

    // 미연결 매장 중 사업자번호가 있는 매장 조회
    const unlinkedStores = await prisma.store.findMany({
      where: {
        customerId: null,
        businessNo: { not: null },
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        businessNo: true,
      },
    });

    // 사업자번호 기준 매칭
    const matchResults: {
      customerId: string;
      customerName: string;
      storeId: string;
      storeName: string;
      businessNo: string;
    }[] = [];

    // 고객 사업자번호 맵 생성
    const customerByBusinessNo = new Map(
      customers.map((c) => [c.businessNo!, c])
    );

    for (const store of unlinkedStores) {
      const customer = customerByBusinessNo.get(store.businessNo!);
      if (customer) {
        matchResults.push({
          customerId: customer.id,
          customerName: customer.name,
          storeId: store.id,
          storeName: store.name,
          businessNo: store.businessNo!,
        });
      }
    }

    // 매칭된 매장들 연결
    let linkedCount = 0;
    for (const match of matchResults) {
      await prisma.store.update({
        where: { id: match.storeId },
        data: { customerId: match.customerId },
      });
      linkedCount++;
    }

    return NextResponse.json({
      success: true,
      summary: {
        scannedCustomers: customers.length,
        scannedStores: unlinkedStores.length,
        linkedCount,
      },
      matches: matchResults,
      message: `${linkedCount}개 매장이 자동 연결되었습니다`,
    });
  } catch (error) {
    console.error("Failed to auto-link stores:", error);
    return NextResponse.json(
      { error: "자동 연결에 실패했습니다" },
      { status: 500 }
    );
  }
}
