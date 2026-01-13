import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 세금계산서 발행 전 검증 API
 *
 * GET /api/tax-invoices/pre-export-check
 *
 * Query Parameters:
 * - year: 연도 (필수)
 * - month: 월 (필수)
 * - customerIds: 특정 고객만 (선택, comma separated)
 *
 * Returns:
 * - customers: 고객별 검증 결과
 * - summary: 전체 요약
 */

interface CustomerCheck {
  customerId: string;
  customerName: string;
  checks: {
    hasBusinessNo: boolean;
    hasName: boolean;
    hasEmail: boolean;
    hasRepresentative: boolean;
    hasAddress: boolean;
    hasSettlement: boolean;
    settlementAmount: number;
  };
  canExport: boolean;
  blockers: string[];
  warnings: string[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || "");
    const month = parseInt(searchParams.get("month") || "");
    const customerIdsParam = searchParams.get("customerIds");

    if (!year || !month) {
      return NextResponse.json(
        { error: "year와 month 파라미터가 필요합니다" },
        { status: 400 }
      );
    }

    // 정산월 형식: YYYY-MM
    const settlementMonth = `${year}-${String(month).padStart(2, "0")}`;

    // 특정 고객 필터
    const customerIds = customerIdsParam?.split(",").filter(Boolean);

    // 해당 월의 확정된 정산이 있는 고객 조회
    const settlements = await prisma.settlement.findMany({
      where: {
        settlementMonth,
        status: "CONFIRMED",
        store: customerIds?.length
          ? { customerId: { in: customerIds } }
          : { customerId: { not: null } },
      },
      include: {
        store: {
          include: {
            customer: true,
          },
        },
      },
    });

    // 고객별 그룹핑
    const customerMap = new Map<
      string,
      {
        customer: {
          id: string;
          name: string;
          businessNo: string | null;
          representative: string | null;
          address: string | null;
          contactEmail: string | null;
        };
        totalAmount: number;
        settlementCount: number;
      }
    >();

    for (const settlement of settlements) {
      const customer = settlement.store?.customer;
      if (!customer) continue;

      const existing = customerMap.get(customer.id);
      if (existing) {
        existing.totalAmount += settlement.amount;
        existing.settlementCount++;
      } else {
        customerMap.set(customer.id, {
          customer: {
            id: customer.id,
            name: customer.name,
            businessNo: customer.businessNo,
            representative: customer.representative,
            address: customer.address,
            contactEmail: customer.contactEmail,
          },
          totalAmount: settlement.amount,
          settlementCount: 1,
        });
      }
    }

    // 검증 결과 생성
    const customerChecks: CustomerCheck[] = [];
    let totalCanExport = 0;
    let totalBlocked = 0;
    let totalWarnings = 0;

    for (const [_, data] of customerMap) {
      const { customer, totalAmount } = data;

      const checks = {
        hasBusinessNo: !!customer.businessNo,
        hasName: !!customer.name,
        hasEmail: !!customer.contactEmail,
        hasRepresentative: !!customer.representative,
        hasAddress: !!customer.address,
        hasSettlement: totalAmount > 0,
        settlementAmount: totalAmount,
      };

      const blockers: string[] = [];
      const warnings: string[] = [];

      // 필수 검증
      if (!checks.hasBusinessNo) {
        blockers.push("사업자번호 미등록");
      }
      if (!checks.hasName) {
        blockers.push("상호명 미등록");
      }
      if (!checks.hasEmail) {
        blockers.push("이메일 미등록 (홈택스 전자발행 불가)");
      }
      if (!checks.hasSettlement) {
        blockers.push("정산 금액 없음");
      }

      // 권장 검증
      if (!checks.hasRepresentative) {
        warnings.push("대표자명 미등록");
      }
      if (!checks.hasAddress) {
        warnings.push("사업장 주소 미등록");
      }

      const canExport = blockers.length === 0;

      if (canExport) {
        totalCanExport++;
      } else {
        totalBlocked++;
      }

      if (warnings.length > 0) {
        totalWarnings++;
      }

      customerChecks.push({
        customerId: customer.id,
        customerName: customer.name,
        checks,
        canExport,
        blockers,
        warnings,
      });
    }

    // 정렬: 발행 불가 -> 경고 있음 -> 정상 순
    customerChecks.sort((a, b) => {
      if (a.canExport !== b.canExport) {
        return a.canExport ? 1 : -1;
      }
      if (a.warnings.length !== b.warnings.length) {
        return b.warnings.length - a.warnings.length;
      }
      return b.checks.settlementAmount - a.checks.settlementAmount;
    });

    // 총 금액 계산
    const totalSupplyAmount = customerChecks
      .filter((c) => c.canExport)
      .reduce((sum, c) => sum + c.checks.settlementAmount, 0);

    return NextResponse.json({
      settlementMonth,
      customers: customerChecks,
      summary: {
        totalCustomers: customerChecks.length,
        canExport: totalCanExport,
        blocked: totalBlocked,
        withWarnings: totalWarnings,
        totalSupplyAmount,
        totalTaxAmount: Math.round(totalSupplyAmount * 0.1),
        totalAmount: totalSupplyAmount + Math.round(totalSupplyAmount * 0.1),
      },
      blockerStats: {
        noBusinessNo: customerChecks.filter((c) =>
          c.blockers.includes("사업자번호 미등록")
        ).length,
        noEmail: customerChecks.filter((c) =>
          c.blockers.some((b) => b.includes("이메일"))
        ).length,
        noSettlement: customerChecks.filter((c) =>
          c.blockers.includes("정산 금액 없음")
        ).length,
      },
      warningStats: {
        noRepresentative: customerChecks.filter((c) =>
          c.warnings.includes("대표자명 미등록")
        ).length,
        noAddress: customerChecks.filter((c) =>
          c.warnings.includes("사업장 주소 미등록")
        ).length,
      },
    });
  } catch (error) {
    console.error("Failed to check pre-export:", error);
    return NextResponse.json(
      { error: "발행 전 검증에 실패했습니다" },
      { status: 500 }
    );
  }
}
