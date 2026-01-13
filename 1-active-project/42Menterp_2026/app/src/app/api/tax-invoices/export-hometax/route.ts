import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { format } from "date-fns";

/**
 * 홈택스 세금계산서 양식 Export API
 *
 * GET /api/tax-invoices/export-hometax
 *
 * Query Parameters:
 * - year: 연도 (필수)
 * - month: 월 (필수)
 * - customerIds: 특정 고객만 (선택, comma separated)
 * - minAmount: 최소 금액 (선택)
 * - includeZeroAmount: 0원 포함 (선택, 기본 false)
 * - itemName: 품목명 (선택, 기본 "{month}월 마케팅 대행료")
 * - format: 출력 형식 (XLS | CSV, 기본 XLS)
 */

// 공급자 정보 (42ment 회사 정보)
const SUPPLIER_INFO = {
  businessNo: "1234567890", // TODO: 실제 사업자번호로 교체
  name: "(주)42멘트",
  ceoName: "대표자명", // TODO: 실제 대표자명으로 교체
  address: "서울특별시", // TODO: 실제 주소로 교체
  bizType: "서비스업",
  bizClass: "마케팅대행",
  email: "tax@42ment.com", // TODO: 실제 이메일로 교체
};

interface SkippedCustomer {
  customerId: string;
  customerName: string;
  reason: "NO_EMAIL" | "NO_BUSINESS_NO" | "ZERO_AMOUNT";
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
    const minAmount = parseInt(searchParams.get("minAmount") || "0");
    const includeZeroAmount = searchParams.get("includeZeroAmount") === "true";
    const itemName = searchParams.get("itemName") || `${month}월 마케팅 대행료`;
    const outputFormat = searchParams.get("format") || "XLS";

    if (!year || !month) {
      return NextResponse.json(
        { error: "year와 month 파라미터가 필요합니다" },
        { status: 400 }
      );
    }

    // 정산월 형식: YYYY-MM
    const settlementMonth = `${year}-${String(month).padStart(2, "0")}`;

    // 정산 데이터 조회 (CONFIRMED 상태만)
    const where: Record<string, unknown> = {
      settlementMonth,
      status: "CONFIRMED",
    };

    // 정산 조회
    const settlements = await prisma.settlement.findMany({
      where,
      include: {
        store: {
          include: {
            customer: true,
          },
        },
      },
    });

    // 고객별 그룹핑 및 금액 합산
    const customerAmounts = new Map<
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
        supplyAmount: number;
        settlementIds: string[];
      }
    >();

    for (const settlement of settlements) {
      const customer = settlement.store?.customer;
      if (!customer) continue;

      // 특정 고객 필터
      if (customerIdsParam) {
        const customerIds = customerIdsParam.split(",").filter(Boolean);
        if (customerIds.length > 0 && !customerIds.includes(customer.id)) {
          continue;
        }
      }

      const existing = customerAmounts.get(customer.id);
      if (existing) {
        existing.supplyAmount += settlement.amount;
        existing.settlementIds.push(settlement.id);
      } else {
        customerAmounts.set(customer.id, {
          customer: {
            id: customer.id,
            name: customer.name,
            businessNo: customer.businessNo,
            representative: customer.representative,
            address: customer.address,
            contactEmail: customer.contactEmail,
          },
          supplyAmount: settlement.amount,
          settlementIds: [settlement.id],
        });
      }
    }

    // 필터링 및 데이터 변환
    const exportData: Record<string, unknown>[] = [];
    const skipped: SkippedCustomer[] = [];
    let totalSupplyAmount = 0;
    let totalTaxAmount = 0;

    for (const [customerId, data] of customerAmounts) {
      const { customer, supplyAmount } = data;

      // 0원 필터
      if (!includeZeroAmount && supplyAmount <= 0) {
        skipped.push({
          customerId,
          customerName: customer.name,
          reason: "ZERO_AMOUNT",
        });
        continue;
      }

      // 최소 금액 필터
      if (supplyAmount < minAmount) {
        continue;
      }

      // 사업자번호 필수
      if (!customer.businessNo) {
        skipped.push({
          customerId,
          customerName: customer.name,
          reason: "NO_BUSINESS_NO",
        });
        continue;
      }

      // 이메일 필수 (홈택스 전자발행용)
      if (!customer.contactEmail) {
        skipped.push({
          customerId,
          customerName: customer.name,
          reason: "NO_EMAIL",
        });
        continue;
      }

      const taxAmount = Math.round(supplyAmount * 0.1);
      totalSupplyAmount += supplyAmount;
      totalTaxAmount += taxAmount;

      // 홈택스 양식 데이터
      exportData.push({
        // 작성일자 (YYYYMMDD)
        작성일자: format(new Date(year, month - 1, new Date().getDate()), "yyyyMMdd"),
        // 세금계산서 종류 (01: 세금계산서)
        종류: "01",
        // 공급자 정보
        공급자등록번호: SUPPLIER_INFO.businessNo,
        공급자상호: SUPPLIER_INFO.name,
        공급자대표자명: SUPPLIER_INFO.ceoName,
        공급자사업장주소: SUPPLIER_INFO.address,
        공급자업태: SUPPLIER_INFO.bizType,
        공급자종목: SUPPLIER_INFO.bizClass,
        공급자이메일: SUPPLIER_INFO.email,
        // 공급받는자 정보
        공급받는자등록번호: customer.businessNo.replace(/-/g, ""),
        공급받는자상호: customer.name,
        공급받는자대표자명: customer.representative || "",
        공급받는자사업장주소: customer.address || "",
        공급받는자이메일: customer.contactEmail,
        // 금액
        공급가액: supplyAmount,
        세액: taxAmount,
        합계금액: supplyAmount + taxAmount,
        // 품목
        품목: itemName,
        비고: `${settlementMonth} 정산`,
      });
    }

    // 스킵된 이유별 그룹핑
    const skipReasons: Record<string, { count: number; customers: string[] }> = {};
    for (const s of skipped) {
      if (!skipReasons[s.reason]) {
        skipReasons[s.reason] = { count: 0, customers: [] };
      }
      skipReasons[s.reason].count++;
      skipReasons[s.reason].customers.push(s.customerName);
    }

    // 엑셀 파일 생성
    const workbook = XLSX.utils.book_new();
    const dataSheet = XLSX.utils.json_to_sheet(exportData);

    // 컬럼 너비 설정
    dataSheet["!cols"] = [
      { wch: 10 }, // 작성일자
      { wch: 5 },  // 종류
      { wch: 12 }, // 공급자등록번호
      { wch: 20 }, // 공급자상호
      { wch: 10 }, // 공급자대표자명
      { wch: 30 }, // 공급자사업장주소
      { wch: 10 }, // 공급자업태
      { wch: 15 }, // 공급자종목
      { wch: 25 }, // 공급자이메일
      { wch: 12 }, // 공급받는자등록번호
      { wch: 20 }, // 공급받는자상호
      { wch: 10 }, // 공급받는자대표자명
      { wch: 30 }, // 공급받는자사업장주소
      { wch: 25 }, // 공급받는자이메일
      { wch: 12 }, // 공급가액
      { wch: 12 }, // 세액
      { wch: 12 }, // 합계금액
      { wch: 25 }, // 품목
      { wch: 15 }, // 비고
    ];

    XLSX.utils.book_append_sheet(workbook, dataSheet, "세금계산서");

    // 요약 시트 추가
    const summaryData = [
      { 항목: "정산월", 값: settlementMonth },
      { 항목: "총 고객수", 값: exportData.length },
      { 항목: "총 공급가액", 값: totalSupplyAmount.toLocaleString() + "원" },
      { 항목: "총 세액", 값: totalTaxAmount.toLocaleString() + "원" },
      { 항목: "총 합계금액", 값: (totalSupplyAmount + totalTaxAmount).toLocaleString() + "원" },
      { 항목: "스킵된 건수", 값: skipped.length },
    ];

    // 스킵 사유 추가
    if (skipReasons["NO_EMAIL"]) {
      summaryData.push({
        항목: "이메일 미등록",
        값: `${skipReasons["NO_EMAIL"].count}건 (${skipReasons["NO_EMAIL"].customers.join(", ")})`,
      });
    }
    if (skipReasons["NO_BUSINESS_NO"]) {
      summaryData.push({
        항목: "사업자번호 미등록",
        값: `${skipReasons["NO_BUSINESS_NO"].count}건 (${skipReasons["NO_BUSINESS_NO"].customers.join(", ")})`,
      });
    }
    if (skipReasons["ZERO_AMOUNT"]) {
      summaryData.push({
        항목: "0원 정산",
        값: `${skipReasons["ZERO_AMOUNT"].count}건`,
      });
    }

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet["!cols"] = [{ wch: 20 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, "요약");

    // 파일 생성
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: outputFormat === "CSV" ? "csv" : "xlsx",
    });

    // 파일명 생성
    const filename = `세금계산서_${year}년${String(month).padStart(2, "0")}월_${exportData.length}건.${outputFormat === "CSV" ? "csv" : "xlsx"}`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          outputFormat === "CSV"
            ? "text/csv"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        // 요약 정보를 헤더로 전달 (선택적)
        "X-Total-Customers": String(exportData.length),
        "X-Total-Supply-Amount": String(totalSupplyAmount),
        "X-Total-Tax-Amount": String(totalTaxAmount),
        "X-Skipped-Count": String(skipped.length),
      },
    });
  } catch (error) {
    console.error("Failed to export hometax:", error);
    return NextResponse.json(
      { error: "홈택스 양식 내보내기에 실패했습니다" },
      { status: 500 }
    );
  }
}
