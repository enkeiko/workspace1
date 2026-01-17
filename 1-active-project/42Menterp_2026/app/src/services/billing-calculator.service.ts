/**
 * BillingCalculatorService
 *
 * 성과 기반 정산 계산 서비스
 * - 순위 보장형: 목표 순위 달성 일수 기반 환불 계산
 * - 완료 기반: 완료율 기반 정산 계산
 */

import { prisma } from "@/lib/prisma";
import { GoalType, BillingRuleType, RefundType, PurchaseOrderItemStatus } from "@prisma/client";

interface PerformanceResult {
  itemId: string;
  keyword: string;
  storeName: string;
  totalDays: number;
  achievedDays: number;
  failedDays: number;
  targetRank: number | null;
  originalAmount: number;
  deductionAmount: number;
  billableAmount: number;
  refundRate: number;
  details: DailyRankDetail[];
}

interface DailyRankDetail {
  date: string;
  rank: number | null;
  achieved: boolean;
}

interface MonthlySettlementResult {
  month: string;
  totalItems: number;
  processedItems: number;
  totalOriginalAmount: number;
  totalDeduction: number;
  totalBillableAmount: number;
  items: PerformanceResult[];
}

export class BillingCalculatorService {
  /**
   * 단일 발주 항목의 성과 기반 정산 계산
   */
  async calculatePerformanceBilling(
    itemId: string,
    month?: string
  ): Promise<PerformanceResult | null> {
    // 발주 항목 조회
    const item = await prisma.purchaseOrderItem.findUnique({
      where: { id: itemId },
      include: {
        store: {
          include: {
            keywords: {
              where: { isActive: true },
              include: {
                rankings: {
                  orderBy: { checkDate: "desc" },
                  take: 60, // 최근 60일
                },
              },
            },
          },
        },
        product: {
          include: {
            billingRules: {
              where: { isActive: true },
              orderBy: { effectiveFrom: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!item) return null;

    // 해당 키워드의 StoreKeyword 찾기
    const storeKeyword = item.store.keywords.find(
      (k) => k.keyword.toLowerCase() === item.keyword.toLowerCase()
    );

    // 정산 규칙 결정 (상품 규칙 또는 기본값)
    const billingRule = item.product?.billingRules[0];
    const targetRank = item.targetRank || billingRule?.targetRank || 5;
    const refundRate = billingRule?.refundRate || 1.0;
    const refundType = billingRule?.refundType || RefundType.DAILY_PRORATED;
    const guaranteeDays = item.guaranteeDays || 25;

    // 작업 기간 계산
    const startDate = item.startDate;
    const endDate = item.endDate;
    const totalDays = item.workDays || Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // 순위 데이터 분석
    const dailyDetails: DailyRankDetail[] = [];
    let achievedDays = 0;
    let failedDays = 0;

    if (storeKeyword?.rankings) {
      // 작업 기간 내 순위 데이터 필터링
      const periodRankings = storeKeyword.rankings.filter((r) => {
        const checkDate = new Date(r.checkDate);
        return checkDate >= startDate && checkDate <= endDate;
      });

      // 일자별 순위 체크
      for (const ranking of periodRankings) {
        const rank = ranking.ranking;
        const achieved = rank !== null && rank <= targetRank;

        dailyDetails.push({
          date: ranking.checkDate.toISOString().split("T")[0],
          rank,
          achieved,
        });

        if (achieved) {
          achievedDays++;
        } else {
          failedDays++;
        }
      }
    }

    // 환불 금액 계산
    const dailyRate = item.amount / totalDays;
    let deductionAmount = 0;

    switch (refundType) {
      case RefundType.DAILY_PRORATED:
        // 실패 일수 * 일일 금액 * 환불률
        deductionAmount = Math.round(dailyRate * failedDays * refundRate);
        break;
      case RefundType.FULL_REFUND:
        // 보장 일수 미달 시 전액 환불
        if (achievedDays < guaranteeDays) {
          deductionAmount = Math.round(item.amount * refundRate);
        }
        break;
      case RefundType.NO_REFUND:
        deductionAmount = 0;
        break;
    }

    const billableAmount = item.amount - deductionAmount;

    return {
      itemId: item.id,
      keyword: item.keyword,
      storeName: item.store.name,
      totalDays,
      achievedDays,
      failedDays,
      targetRank,
      originalAmount: item.amount,
      deductionAmount,
      billableAmount,
      refundRate,
      details: dailyDetails,
    };
  }

  /**
   * 월별 정산 실행
   */
  async executeMonthlySettlement(month: string): Promise<MonthlySettlementResult> {
    // 해당 월에 종료된 발주 항목 조회
    const [year, monthNum] = month.split("-").map(Number);
    const monthStart = new Date(year, monthNum - 1, 1);
    const monthEnd = new Date(year, monthNum, 0, 23, 59, 59);

    const items = await prisma.purchaseOrderItem.findMany({
      where: {
        endDate: {
          gte: monthStart,
          lte: monthEnd,
        },
        status: PurchaseOrderItemStatus.COMPLETED,
        goalType: GoalType.RANKING, // 순위 보장형만
      },
      include: {
        store: true,
        purchaseOrder: {
          include: { channel: true },
        },
      },
    });

    const results: PerformanceResult[] = [];
    let totalOriginalAmount = 0;
    let totalDeduction = 0;
    let totalBillableAmount = 0;
    let processedItems = 0;

    for (const item of items) {
      const result = await this.calculatePerformanceBilling(item.id, month);
      if (result) {
        results.push(result);
        totalOriginalAmount += result.originalAmount;
        totalDeduction += result.deductionAmount;
        totalBillableAmount += result.billableAmount;
        processedItems++;

        // PurchaseOrderItem 업데이트
        await prisma.purchaseOrderItem.update({
          where: { id: item.id },
          data: {
            successDays: result.achievedDays,
            failDays: result.failedDays,
            refundPerDay: Math.round(result.originalAmount / result.totalDays),
          },
        });
      }
    }

    return {
      month,
      totalItems: items.length,
      processedItems,
      totalOriginalAmount,
      totalDeduction,
      totalBillableAmount,
      items: results,
    };
  }

  /**
   * 수익성 분석 데이터 조회
   */
  async getProfitabilityAnalysis(
    startDate: Date,
    endDate: Date,
    groupBy: "product" | "channel" | "customer" = "product"
  ) {
    // 매출 (수주 기준)
    const salesOrders = await prisma.salesOrder.findMany({
      where: {
        orderDate: { gte: startDate, lte: endDate },
        status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
      },
      include: {
        items: {
          include: { product: true },
        },
        customer: true,
      },
    });

    // 매입 (발주 기준)
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        orderDate: { gte: startDate, lte: endDate },
        status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
      },
      include: {
        items: {
          include: { product: true },
        },
        channel: true,
      },
    });

    // 집계
    let totalRevenue = 0;
    let totalCost = 0;
    let totalRefund = 0;
    const breakdown: Map<string, {
      name: string;
      revenue: number;
      cost: number;
      refund: number;
      margin: number;
    }> = new Map();

    // 매출 집계
    for (const order of salesOrders) {
      for (const item of order.items) {
        const revenue = item.supplyAmount;
        totalRevenue += revenue;

        let key = "";
        let name = "";
        switch (groupBy) {
          case "product":
            key = item.productId || "unknown";
            name = item.product?.name || "기타";
            break;
          case "customer":
            key = order.customerId || "unknown";
            name = order.customer?.name || "기타";
            break;
          case "channel":
            continue; // 수주는 채널 없음
        }

        const existing = breakdown.get(key) || { name, revenue: 0, cost: 0, refund: 0, margin: 0 };
        existing.revenue += revenue;
        breakdown.set(key, existing);
      }
    }

    // 매입/환불 집계
    for (const order of purchaseOrders) {
      for (const item of order.items) {
        const cost = item.amount;
        const refund = item.refundPerDay ? item.refundPerDay * item.failDays : 0;
        totalCost += cost;
        totalRefund += refund;

        let key = "";
        let name = "";
        switch (groupBy) {
          case "product":
            key = item.productId || "unknown";
            name = item.product?.name || "기타";
            break;
          case "channel":
            key = order.channelId;
            name = order.channel.name;
            break;
          case "customer":
            continue; // 발주는 고객 없음
        }

        const existing = breakdown.get(key) || { name, revenue: 0, cost: 0, refund: 0, margin: 0 };
        existing.cost += cost;
        existing.refund += refund;
        breakdown.set(key, existing);
      }
    }

    // 마진 계산
    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit + totalRefund;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // breakdown 마진 계산
    for (const [key, value] of breakdown) {
      value.margin = value.revenue > 0
        ? ((value.revenue - value.cost + value.refund) / value.revenue) * 100
        : 0;
    }

    return {
      summary: {
        totalRevenue,
        totalCost,
        totalRefund,
        grossProfit,
        netProfit,
        grossMargin: Math.round(grossMargin * 100) / 100,
        netMargin: Math.round(netMargin * 100) / 100,
      },
      breakdown: Array.from(breakdown.values()).sort((a, b) => b.revenue - a.revenue),
    };
  }
}

// 싱글톤 인스턴스
export const billingCalculator = new BillingCalculatorService();
