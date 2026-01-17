/**
 * Distribution Service
 *
 * 작업 분배 자동화 서비스
 * - 채널별 용량 관리
 * - 최저가 채널 우선 분배
 * - 부하 균형 분배
 */

import { prisma } from "@/lib/prisma";
import { ChannelStatus, PurchaseOrderStatus } from "@prisma/client";

interface OrderItem {
  id: string;
  keyword: string;
  storeName: string;
  storeId: string;
  dailyQty: number;
  workDays: number;
  totalQty: number;
  productType: string;
}

interface ChannelCapacity {
  channelId: string;
  channelName: string;
  channelCode: string;
  baseUnitPrice: number;
  maxMonthlyQty: number;
  currentLoad: number;
  availableCapacity: number;
  assignedItems: OrderItem[];
}

interface DistributionResult {
  success: boolean;
  channels: ChannelCapacity[];
  unassigned: OrderItem[];
  totalAssigned: number;
  totalUnassigned: number;
  estimatedCost: number;
}

export class DistributionService {
  /**
   * 채널별 현재 부하 조회
   */
  async getChannelCapacities(): Promise<ChannelCapacity[]> {
    // 활성 채널 조회
    const channels = await prisma.channel.findMany({
      where: { status: ChannelStatus.ACTIVE },
      orderBy: { baseUnitPrice: "asc" },
    });

    // 이번 달의 각 채널별 부하 계산
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const capacities: ChannelCapacity[] = [];

    for (const channel of channels) {
      // 현재 부하 (이번 달 확정/진행중 발주 수량)
      const currentOrders = await prisma.purchaseOrder.findMany({
        where: {
          channelId: channel.id,
          orderDate: { gte: monthStart, lte: monthEnd },
          status: { in: [PurchaseOrderStatus.CONFIRMED, PurchaseOrderStatus.IN_PROGRESS] },
        },
        include: { items: true },
      });

      const currentLoad = currentOrders.reduce(
        (sum, order) => sum + order.items.reduce((s, item) => s + item.totalQty, 0),
        0
      );

      // 월별 최대 용량 (가정: 채널별 maxDays * 1000 또는 기본값)
      const maxMonthlyQty = (channel.maxDays || 30) * 1000;

      capacities.push({
        channelId: channel.id,
        channelName: channel.name,
        channelCode: channel.code,
        baseUnitPrice: channel.baseUnitPrice,
        maxMonthlyQty,
        currentLoad,
        availableCapacity: Math.max(0, maxMonthlyQty - currentLoad),
        assignedItems: [],
      });
    }

    return capacities;
  }

  /**
   * 자동 분배 알고리즘
   *
   * 최소 비용 우선 + 용량 제약
   */
  async autoDistribute(items: OrderItem[]): Promise<DistributionResult> {
    const capacities = await this.getChannelCapacities();
    const unassigned: OrderItem[] = [];
    let totalAssigned = 0;
    let estimatedCost = 0;

    // 아이템을 수량 기준 내림차순 정렬 (큰 주문 먼저)
    const sortedItems = [...items].sort((a, b) => b.totalQty - a.totalQty);

    for (const item of sortedItems) {
      // 용량이 있는 가장 저렴한 채널 찾기
      const availableChannel = capacities.find(
        (c) => c.availableCapacity >= item.totalQty
      );

      if (availableChannel) {
        // 채널에 할당
        availableChannel.assignedItems.push(item);
        availableChannel.availableCapacity -= item.totalQty;
        totalAssigned++;
        estimatedCost += item.totalQty * availableChannel.baseUnitPrice;
      } else {
        // 할당 불가
        unassigned.push(item);
      }
    }

    return {
      success: unassigned.length === 0,
      channels: capacities.filter((c) => c.assignedItems.length > 0),
      unassigned,
      totalAssigned,
      totalUnassigned: unassigned.length,
      estimatedCost,
    };
  }

  /**
   * 부하 균형 분배 알고리즘
   *
   * 각 채널의 부하율을 균등하게 맞추는 분배
   */
  async balancedDistribute(items: OrderItem[]): Promise<DistributionResult> {
    const capacities = await this.getChannelCapacities();
    const unassigned: OrderItem[] = [];
    let totalAssigned = 0;
    let estimatedCost = 0;

    // 부하율 기준 정렬 (부하가 적은 채널 먼저)
    const sortByLoadRate = () => {
      capacities.sort((a, b) => {
        const rateA = (a.currentLoad + a.assignedItems.reduce((s, i) => s + i.totalQty, 0)) / a.maxMonthlyQty;
        const rateB = (b.currentLoad + b.assignedItems.reduce((s, i) => s + i.totalQty, 0)) / b.maxMonthlyQty;
        return rateA - rateB;
      });
    };

    for (const item of items) {
      sortByLoadRate();

      // 용량이 있는 가장 여유로운 채널 찾기
      const availableChannel = capacities.find(
        (c) => c.availableCapacity >= item.totalQty
      );

      if (availableChannel) {
        availableChannel.assignedItems.push(item);
        availableChannel.availableCapacity -= item.totalQty;
        totalAssigned++;
        estimatedCost += item.totalQty * availableChannel.baseUnitPrice;
      } else {
        unassigned.push(item);
      }
    }

    return {
      success: unassigned.length === 0,
      channels: capacities.filter((c) => c.assignedItems.length > 0),
      unassigned,
      totalAssigned,
      totalUnassigned: unassigned.length,
      estimatedCost,
    };
  }

  /**
   * 수동 분배 결과로 발주 생성
   */
  async createOrdersFromDistribution(
    distribution: Map<string, OrderItem[]>,
    createdById: string,
    tenantId?: string
  ): Promise<{ created: number; orderIds: string[] }> {
    const orderIds: string[] = [];
    const today = new Date();
    const datePrefix = `PO${today.getFullYear().toString().slice(-2)}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

    // 오늘 마지막 발주번호 조회
    const lastOrder = await prisma.purchaseOrder.findFirst({
      where: { purchaseOrderNo: { startsWith: datePrefix } },
      orderBy: { purchaseOrderNo: "desc" },
    });

    let seq = lastOrder ? parseInt(lastOrder.purchaseOrderNo.slice(-4)) + 1 : 1;

    for (const [channelId, items] of distribution.entries()) {
      if (items.length === 0) continue;

      const channel = await prisma.channel.findUnique({ where: { id: channelId } });
      if (!channel) continue;

      const orderNo = `${datePrefix}-${String(seq).padStart(4, "0")}`;
      seq++;

      // 총 수량/금액 계산
      const totalQty = items.reduce((sum, item) => sum + item.totalQty, 0);
      const totalAmount = items.reduce(
        (sum, item) => sum + item.totalQty * channel.baseUnitPrice,
        0
      );

      // 발주 생성
      const order = await prisma.purchaseOrder.create({
        data: {
          purchaseOrderNo: orderNo,
          tenantId,
          channelId,
          orderWeek: getOrderWeek(today),
          orderDate: today,
          totalQty,
          totalAmount,
          status: PurchaseOrderStatus.DRAFT,
          createdById,
          items: {
            create: items.map((item) => ({
              storeId: item.storeId,
              productType: item.productType as "TRAFFIC" | "SAVE" | "REVIEW" | "DIRECTION" | "BLOG" | "RECEIPT",
              keyword: item.keyword,
              dailyQty: item.dailyQty,
              startDate: today,
              endDate: new Date(today.getTime() + item.workDays * 24 * 60 * 60 * 1000),
              workDays: item.workDays,
              totalQty: item.totalQty,
              unitPrice: channel.baseUnitPrice,
              amount: item.totalQty * channel.baseUnitPrice,
            })),
          },
        },
      });

      orderIds.push(order.id);
    }

    return {
      created: orderIds.length,
      orderIds,
    };
  }
}

function getOrderWeek(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const weekNum = Math.ceil(date.getDate() / 7);
  return `${year}-${month}-W${weekNum}`;
}

// 싱글톤 인스턴스
export const distributionService = new DistributionService();
