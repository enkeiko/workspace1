import { prisma } from "@/lib/prisma/client";
import { ValidationError } from "@/lib/errors/app-error";
import type { Prisma } from "@prisma/client";

export interface GetDashboardOptions {
  startDate?: Date | string;
  endDate?: Date | string;
  period?: "day" | "week" | "month" | "quarter" | "year";
}

export interface GetRevenueOptions {
  startDate: Date | string;
  endDate: Date | string;
  groupBy?: "day" | "week" | "month";
  customerId?: number;
  storeId?: number;
}

export interface GetCostsOptions {
  startDate: Date | string;
  endDate: Date | string;
  groupBy?: "day" | "week" | "month";
}

function validateDateRange(
  startDate: Date | string | undefined | null,
  endDate: Date | string | undefined | null
): void {
  if (!startDate || !endDate) {
    return; // 둘 다 없으면 검증 스킵
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ValidationError("유효하지 않은 날짜 형식입니다.");
  }

  if (start > end) {
    throw new ValidationError("시작일은 종료일보다 이전이어야 합니다.");
  }
}

function getDateRange(period?: "day" | "week" | "month" | "quarter" | "year"): {
  startDate: Date;
  endDate: Date;
} {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  let startDate = new Date();

  switch (period) {
    case "day":
      startDate.setHours(0, 0, 0, 0);
      break;
    case "week":
      startDate.setDate(endDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "month":
      startDate.setMonth(endDate.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "quarter":
      startDate.setMonth(endDate.getMonth() - 3);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "year":
      startDate.setFullYear(endDate.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      // 전체 기간
      startDate = new Date(0);
      break;
  }

  return { startDate, endDate };
}

function formatPeriod(date: Date, groupBy: "day" | "week" | "month"): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  switch (groupBy) {
    case "day":
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    case "week":
      const week = Math.ceil(date.getDate() / 7);
      return `${year}-${month}-W${week}`;
    case "month":
      return `${year}-${month}`;
    default:
      return `${year}-${month}`;
  }
}

export const settlementService = {
  /**
   * 정산 대시보드 데이터 조회
   */
  async getDashboard(options: GetDashboardOptions = {}) {
    const { startDate, endDate, period } = options;

    let dateRange: { startDate: Date; endDate: Date };

    if (startDate && endDate) {
      // 날짜 범위 검증
      validateDateRange(startDate, endDate);
      dateRange = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      };
    } else if (period) {
      dateRange = getDateRange(period);
    } else {
      // 전체 기간
      dateRange = getDateRange();
    }

    // 공통 WHERE 조건
    const commonWhere = {
      orderDate: {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      },
      status: {
        not: "cancelled" as const,
      },
    };

    // 병렬 처리: 통계 집계 쿼리들을 동시에 실행
    const [
      revenueResult,
      unpaidResult,
      prepaidResult,
      orders,
      revenueByCustomerResult,
      revenueByStoreResult,
    ] = await Promise.all([
      // 매출: 주문 총액 합계
      prisma.order.aggregate({
        where: commonWhere,
        _sum: {
          totalAmount: true,
        },
      }),
      // 미수금: 주문 총액 - 지불 금액
      prisma.order.aggregate({
        where: commonWhere,
        _sum: {
          totalAmount: true,
          paidAmount: true,
        },
      }),
      // 선금: 주문의 결제액 합계
      prisma.order.aggregate({
        where: commonWhere,
        _sum: {
          paidAmount: true,
        },
      }),
      // 기간별 매출/비용 집계용 주문 목록
      prisma.order.findMany({
        where: commonWhere,
        select: {
          orderDate: true,
          totalAmount: true,
        },
      }),
      // 고객별 매출 집계
      prisma.order.groupBy({
        by: ["customerId"],
        where: commonWhere,
        _sum: {
          totalAmount: true,
        },
      }),
      // 매장별 매출 집계
      prisma.order.groupBy({
        by: ["storeId"],
        where: {
          ...commonWhere,
          storeId: {
            not: null,
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    const totalRevenue = Number(revenueResult._sum.totalAmount || 0);
    const totalPaid = Number(unpaidResult._sum.paidAmount || 0);
    const unpaidAmount = totalRevenue - totalPaid;
    const prepaidAmount = Number(prepaidResult._sum.paidAmount || 0);

    // 비용: 구매 총액 합계 (Purchase 모듈 구현 후 활성화)
    // TODO: Purchase 모듈 구현 후 활성화
    const totalCost = 0;
    // const costResult = await prisma.purchase.aggregate({
    //   where: {
    //     purchaseDate: {
    //       gte: dateRange.startDate,
    //       lte: dateRange.endDate,
    //     },
    //   },
    //   _sum: {
    //     totalAmount: true,
    //   },
    // });
    // const totalCost = Number(costResult._sum.totalAmount || 0);

    const totalProfit = totalRevenue - totalCost;

    // 월별 집계
    const revenueByPeriodMap = new Map<string, { revenue: number; cost: number }>();

    orders.forEach((order) => {
      const period = formatPeriod(new Date(order.orderDate), "month");
      const revenue = Number(order.totalAmount);

      const existing = revenueByPeriodMap.get(period) || { revenue: 0, cost: 0 };
      revenueByPeriodMap.set(period, {
        revenue: existing.revenue + revenue,
        cost: existing.cost, // Purchase 모듈 구현 후 업데이트
      });
    });

    const revenueByPeriod = Array.from(revenueByPeriodMap.entries())
      .map(([period, data]) => ({
        period,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.revenue - data.cost,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // 고객별 및 매장별 매출 집계는 이미 Promise.all에서 조회됨
    // 병렬 처리: 고객 및 매장 정보 조회
    const customerIds = revenueByCustomerResult.map((r) => r.customerId);
    const storeIds = revenueByStoreResult
      .map((r) => r.storeId)
      .filter((id): id is number => id !== null);

    const [customers, stores] = await Promise.all([
      prisma.customer.findMany({
        where: {
          id: {
            in: customerIds,
          },
        },
        select: {
          id: true,
          name: true,
        },
      }),
      prisma.store.findMany({
        where: {
          id: {
            in: storeIds,
          },
        },
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    const customerMap = new Map(customers.map((c) => [c.id, c.name]));
    const storeMap = new Map(stores.map((s) => [s.id, s.name]));

    const revenueByCustomer = revenueByCustomerResult
      .map((r) => ({
        customerId: r.customerId,
        customerName: customerMap.get(r.customerId) || "알 수 없음",
        revenue: Number(r._sum.totalAmount || 0),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const revenueByStore = revenueByStoreResult
      .map((r) => ({
        storeId: r.storeId!,
        storeName: storeMap.get(r.storeId!) || "알 수 없음",
        revenue: Number(r._sum.totalAmount || 0),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      summary: {
        totalRevenue,
        totalCost,
        totalProfit,
        unpaidAmount,
        prepaidAmount,
      },
      revenueByPeriod,
      revenueByCustomer,
      revenueByStore,
    };
  },

  /**
   * 기간별 매출 조회
   */
  async getRevenue(options: GetRevenueOptions) {
    const { startDate, endDate, groupBy = "month", customerId, storeId } = options;

    // 날짜 범위 검증
    validateDateRange(startDate, endDate);

    const where: Prisma.OrderWhereInput = {
      orderDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      status: {
        not: "cancelled",
      },
    };

    if (customerId) {
      where.customerId = customerId;
    }

    if (storeId) {
      where.storeId = storeId;
    }

    const orders = await prisma.order.findMany({
      where,
      select: {
        orderDate: true,
        totalAmount: true,
      },
      orderBy: {
        orderDate: "asc",
      },
    });

    // 그룹별 집계
    const revenueMap = new Map<string, number>();

    orders.forEach((order) => {
      const period = formatPeriod(new Date(order.orderDate), groupBy);
      const amount = Number(order.totalAmount);

      const existing = revenueMap.get(period) || 0;
      revenueMap.set(period, existing + amount);
    });

    return Array.from(revenueMap.entries())
      .map(([period, revenue]) => ({
        period,
        revenue,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  },

  /**
   * 기간별 비용 조회
   */
  async getCosts(options: GetCostsOptions) {
    const { startDate, endDate, groupBy = "month" } = options;

    // 날짜 범위 검증
    validateDateRange(startDate, endDate);

    // TODO: Purchase 모듈 구현 후 활성화
    // const purchases = await prisma.purchase.findMany({
    //   where: {
    //     purchaseDate: {
    //       gte: new Date(startDate),
    //       lte: new Date(endDate),
    //     },
    //   },
    //   select: {
    //     purchaseDate: true,
    //     totalAmount: true,
    //   },
    //   orderBy: {
    //     purchaseDate: "asc",
    //   },
    // });

    // const costMap = new Map<string, number>();

    // purchases.forEach((purchase) => {
    //   const period = formatPeriod(new Date(purchase.purchaseDate), groupBy);
    //   const amount = Number(purchase.totalAmount);

    //   const existing = costMap.get(period) || 0;
    //   costMap.set(period, existing + amount);
    // });

    // return Array.from(costMap.entries())
    //   .map(([period, cost]) => ({
    //     period,
    //     cost,
    //   }))
    //   .sort((a, b) => a.period.localeCompare(b.period));

    // 임시: 빈 배열 반환
    return [];
  },
};

