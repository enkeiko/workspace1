import { prisma } from "@/lib/prisma/client";
import { NotFoundError, ValidationError } from "@/lib/errors/app-error";
import type { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export interface QuotationItemInput {
  productId?: number;
  productName?: string;
  productDescription?: string;
  quantity: number;
  unitPrice: number;
  description?: string;
  // 광고 상품 특성: 진행일자 기반
  startDate?: Date | string;
  endDate?: Date | string;
  dailyCount?: number; // 일일 건수/유입타수
  totalDays?: number; // 총 진행일수 (자동 계산)
}

export interface CreateQuotationData {
  customerId: number;
  storeId: number;
  quotationDate: Date | string;
  validUntil?: Date | string;
  items: QuotationItemInput[];
  notes?: string;
}

export interface UpdateQuotationData {
  customerId?: number;
  storeId?: number;
  quotationDate?: Date | string;
  validUntil?: Date | string;
  items?: QuotationItemInput[];
  notes?: string;
}

export interface GetQuotationsOptions {
  customerId?: number;
  storeId?: number;
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export const quotationService = {
  async getQuotations(options: GetQuotationsOptions = {}) {
    const { customerId, storeId, status, page, limit = 20, search } = options;

    const where: Prisma.QuotationWhereInput = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (storeId) {
      where.storeId = storeId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { quotationNumber: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        skip: page ? (page - 1) * limit : undefined,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
      }),
      prisma.quotation.count({ where }),
    ]);

    return {
      quotations,
      pagination: {
        page: page || 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getQuotationById(id: number) {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            businessNumber: true,
            contactPerson: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: true,
                unit: true,
              },
            },
          },
          orderBy: {
            id: "asc",
          },
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            orderDate: true,
            status: true,
            totalAmount: true,
            paidAmount: true,
            unpaidAmount: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundError("견적서를 찾을 수 없습니다.");
    }

    return quotation;
  },

  /**
   * 견적서 번호 생성 (트랜잭션 내부에서 호출하여 동시성 제어)
   */
  async generateQuotationNumber(tx?: any): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");

    const prismaClient = tx || prisma;

    // 같은 년월의 마지막 견적서 번호 찾기 (트랜잭션 내부에서 락 보장)
    const lastQuotation = await prismaClient.quotation.findFirst({
      where: {
        quotationNumber: {
          startsWith: `QT-${year}${month}`,
        },
      },
      orderBy: {
        quotationNumber: "desc",
      },
    });

    let sequence = 1;
    if (lastQuotation) {
      const lastSeq = parseInt(lastQuotation.quotationNumber.slice(-4));
      sequence = lastSeq + 1;
    }

    const quotationNumber = `QT-${year}${month}-${String(sequence).padStart(4, "0")}`;

    // UNIQUE 제약조건으로 중복 방지 (DB 레벨)
    return quotationNumber;
  },

  async createQuotation(data: CreateQuotationData) {
    // 고객 및 매장 존재 확인
    const [customer, store] = await Promise.all([
      prisma.customer.findUnique({ where: { id: data.customerId } }),
      prisma.store.findUnique({ where: { id: data.storeId } }),
    ]);

    if (!customer) {
      throw new NotFoundError("고객을 찾을 수 없습니다.");
    }

    if (!store) {
      throw new NotFoundError("매장을 찾을 수 없습니다.");
    }

    // 항목 검증
    if (!data.items || data.items.length === 0) {
      throw new ValidationError("견적서 항목이 최소 1개 이상 필요합니다.");
    }

    // 총 금액 계산
    const totalAmount = data.items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0
    );

    // 트랜잭션으로 견적서 및 항목 생성 (동시성 제어)
    return await prisma.$transaction(async (tx) => {
      // 트랜잭션 내부에서 견적서 번호 생성 (동시성 제어)
      const quotationNumber = await this.generateQuotationNumber(tx);

      const quotation = await tx.quotation.create({
        data: {
          customerId: data.customerId,
          storeId: data.storeId,
          quotationNumber,
          quotationDate: new Date(data.quotationDate),
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
          totalAmount,
          notes: data.notes,
          status: "draft",
        },
      });

      // 견적서 항목 생성
      await tx.quotationItem.createMany({
        data: data.items.map((item) => {
          // 광고 상품인 경우 진행일수 자동 계산
          let calculatedQuantity = item.quantity;
          let calculatedTotalDays = item.totalDays;
          
          if (item.startDate && item.endDate) {
            const start = new Date(item.startDate);
            const end = new Date(item.endDate);
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            calculatedTotalDays = days;
            
            // 일일 건수가 있으면 수량 자동 계산
            if (item.dailyCount) {
              calculatedQuantity = days * item.dailyCount;
            }
          }
          
          return {
            quotationId: quotation.id,
            productId: item.productId || null,
            productName: item.productName || null,
            productDescription: item.productDescription || null,
            quantity: calculatedQuantity,
            unitPrice: item.unitPrice,
            totalPrice: Number(item.unitPrice) * calculatedQuantity,
            description: item.description || null,
            // 광고 상품 특성
            startDate: item.startDate ? new Date(item.startDate) : null,
            endDate: item.endDate ? new Date(item.endDate) : null,
            dailyCount: item.dailyCount || null,
            totalDays: calculatedTotalDays || null,
          };
        }),
      });

      // 트랜잭션 내부에서 직접 조회 (외부 메서드 호출 방지)
      const createdQuotation = await tx.quotation.findUnique({
        where: { id: quotation.id },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              businessNumber: true,
              contactPerson: true,
              email: true,
              phone: true,
              address: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  unit: true,
                },
              },
            },
            orderBy: {
              id: "asc",
            },
          },
        },
      });

      if (!createdQuotation) {
        throw new NotFoundError("생성된 견적서를 찾을 수 없습니다.");
      }

      return createdQuotation;
    });
  },

  async updateQuotation(id: number, data: UpdateQuotationData) {
    // 존재 여부 확인
    const existing = await this.getQuotationById(id);

    // 상태 확인 (수정 가능한 상태인지)
    if (existing.status === "accepted" || existing.status === "expired") {
      throw new ValidationError("이미 확정되거나 만료된 견적서는 수정할 수 없습니다.");
    }

    // 고객/매장 존재 확인 (변경하는 경우)
    if (data.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId },
      });
      if (!customer) {
        throw new NotFoundError("고객을 찾을 수 없습니다.");
      }
    }

    if (data.storeId) {
      const store = await prisma.store.findUnique({
        where: { id: data.storeId },
      });
      if (!store) {
        throw new NotFoundError("매장을 찾을 수 없습니다.");
      }
    }

    // 총 금액 계산 (항목이 있는 경우)
    let totalAmount = existing.totalAmount;
    if (data.items && data.items.length > 0) {
      const calculatedTotal = data.items.reduce(
        (sum, item) => sum + Number(item.unitPrice) * item.quantity,
        0
      );
      totalAmount = new Decimal(calculatedTotal);
    }

    // 트랜잭션으로 업데이트
    return await prisma.$transaction(async (tx) => {
      // 견적서 업데이트
      await tx.quotation.update({
        where: { id },
        data: {
          customerId: data.customerId,
          storeId: data.storeId,
          quotationDate: data.quotationDate ? new Date(data.quotationDate) : undefined,
          validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
          totalAmount,
          notes: data.notes,
        },
      });

      // 항목이 있으면 기존 항목 삭제 후 재생성
      if (data.items && data.items.length > 0) {
        await tx.quotationItem.deleteMany({
          where: { quotationId: id },
        });

        await tx.quotationItem.createMany({
          data: data.items.map((item) => {
            // 광고 상품인 경우 진행일수 자동 계산
            let calculatedQuantity = item.quantity;
            let calculatedTotalDays = item.totalDays;
            
            if (item.startDate && item.endDate) {
              const start = new Date(item.startDate);
              const end = new Date(item.endDate);
              const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              calculatedTotalDays = days;
              
              // 일일 건수가 있으면 수량 자동 계산
              if (item.dailyCount) {
                calculatedQuantity = days * item.dailyCount;
              }
            }
            
            return {
              quotationId: id,
              productId: item.productId || null,
              productName: item.productName || null,
              productDescription: item.productDescription || null,
              quantity: calculatedQuantity,
              unitPrice: item.unitPrice,
              totalPrice: Number(item.unitPrice) * calculatedQuantity,
              description: item.description || null,
              // 광고 상품 특성
              startDate: item.startDate ? new Date(item.startDate) : null,
              endDate: item.endDate ? new Date(item.endDate) : null,
              dailyCount: item.dailyCount || null,
              totalDays: calculatedTotalDays || null,
            };
          }),
        });
      }

      return await this.getQuotationById(id);
    });
  },

  async updateQuotationStatus(id: number, status: string) {
    const quotation = await this.getQuotationById(id);

    // 상태 전환 검증
    const validStatuses = ["draft", "sent", "accepted", "rejected", "expired"];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`유효하지 않은 상태입니다: ${status}`);
    }

    // 상태 전환 규칙 검증
    if (quotation.status === "accepted" && status !== "accepted") {
      throw new ValidationError("이미 수락된 견적서는 상태를 변경할 수 없습니다.");
    }

    return await prisma.quotation.update({
      where: { id },
      data: { status },
    });
  },

  async deleteQuotation(id: number) {
    // 존재 여부 확인
    await this.getQuotationById(id);

    // 트랜잭션으로 삭제 (항목도 함께 삭제됨 - CASCADE)
    return await prisma.quotation.delete({
      where: { id },
    });
  },

  /**
   * 견적서를 주문으로 전환
   * 한 견적서에서 여러 주문을 생성할 수 있음 (1:N 관계)
   */
  async convertToOrder(quotationId: number, orderDate?: Date | string) {
    const quotation = await this.getQuotationById(quotationId);

    // 상태 확인 (선택적 - 필요시 주석 해제)
    // if (quotation.status !== "accepted") {
    //   throw new ValidationError("수락된 견적서만 주문으로 전환할 수 있습니다.");
    // }

    // 주문 번호 생성
    const orderNumber = `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(Date.now()).slice(-6)}`;

    // 트랜잭션으로 주문 생성
    return await prisma.$transaction(async (tx) => {
      // 주문 생성
      const order = await tx.order.create({
        data: {
          customerId: quotation.customerId,
          storeId: quotation.storeId,
          quotationId: quotation.id,
          orderNumber,
          orderDate: orderDate ? new Date(orderDate) : new Date(),
          totalAmount: quotation.totalAmount,
          status: "pending",
        },
      });

      // 주문 항목 생성
      await tx.orderItem.createMany({
        data: quotation.items.map((item) => ({
          orderId: order.id,
          productId: item.productId || null,
          productName: item.productName || null,
          productDescription: item.productDescription || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          notes: item.description || null,
          // 광고 상품 특성
          startDate: item.startDate || null,
          endDate: item.endDate || null,
          dailyCount: item.dailyCount || null,
          totalDays: item.totalDays || null,
        })),
      });

      return order;
    });
  },
};


