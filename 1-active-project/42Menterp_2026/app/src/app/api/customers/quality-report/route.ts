import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 고객 데이터 품질 보고서 API
 *
 * 반환값:
 * - total: 전체 고객 수
 * - taxInvoiceReady: 세금계산서 발행 가능 고객 수
 * - missingFields: 필드별 누락 건수
 * - recommendations: 정보 보완이 필요한 고객 목록
 */

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customers = await prisma.customer.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        businessNo: true,
        representative: true,
        contactEmail: true,
        contactPhone: true,
        address: true,
      },
    });

    const total = customers.length;

    // 필드별 누락 통계
    const missingFields = {
      businessNo: 0,
      representative: 0,
      email: 0,
      phone: 0,
      address: 0,
    };

    // 세금계산서 발행 가능 고객
    let taxInvoiceReady = 0;

    // 정보 보완 필요 고객
    const recommendations: {
      customerId: string;
      customerName: string;
      missingFields: string[];
      taxInvoiceReady: boolean;
    }[] = [];

    for (const customer of customers) {
      const missing: string[] = [];

      if (!customer.businessNo) {
        missingFields.businessNo++;
        missing.push("사업자번호");
      }
      if (!customer.representative) {
        missingFields.representative++;
        missing.push("대표자명");
      }
      if (!customer.contactEmail) {
        missingFields.email++;
        missing.push("이메일");
      }
      if (!customer.contactPhone) {
        missingFields.phone++;
        missing.push("연락처");
      }
      if (!customer.address) {
        missingFields.address++;
        missing.push("주소");
      }

      // 세금계산서 발행 가능 여부
      const isTaxReady = Boolean(
        customer.businessNo && customer.name && customer.contactEmail
      );

      if (isTaxReady) {
        taxInvoiceReady++;
      }

      // 누락 필드가 있는 경우 권장사항에 추가
      if (missing.length > 0) {
        recommendations.push({
          customerId: customer.id,
          customerName: customer.name,
          missingFields: missing,
          taxInvoiceReady: isTaxReady,
        });
      }
    }

    // 중요도 순으로 정렬 (세금계산서 발행 불가 + 누락 필드 많은 순)
    recommendations.sort((a, b) => {
      if (a.taxInvoiceReady !== b.taxInvoiceReady) {
        return a.taxInvoiceReady ? 1 : -1;
      }
      return b.missingFields.length - a.missingFields.length;
    });

    return NextResponse.json({
      total,
      taxInvoiceReady,
      taxInvoiceNotReady: total - taxInvoiceReady,
      completionRate: {
        businessNo: Math.round(((total - missingFields.businessNo) / total) * 100),
        representative: Math.round(((total - missingFields.representative) / total) * 100),
        email: Math.round(((total - missingFields.email) / total) * 100),
        phone: Math.round(((total - missingFields.phone) / total) * 100),
        address: Math.round(((total - missingFields.address) / total) * 100),
      },
      missingFields,
      recommendations: recommendations.slice(0, 20), // 상위 20건만 반환
    });
  } catch (error) {
    console.error("Failed to generate quality report:", error);
    return NextResponse.json(
      { error: "품질 보고서 생성에 실패했습니다" },
      { status: 500 }
    );
  }
}
