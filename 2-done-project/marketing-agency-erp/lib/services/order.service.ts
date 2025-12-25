import { prisma } from "@/lib/prisma/client";
import { NotFoundError, ValidationError } from "@/lib/errors/app-error";
import type { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export interface OrderItemInput {
  productId?: number;
  productName?: string;
  productDescription?: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  // 광고 상품 특성: 진행일자 기반
  startDate?: Date | string;
  endDate?: Date | string;
  dailyCount?: number; // 일일 건수/유입타수
  totalDays?: number; // 총 진행일수 (자동 계산)
}

export interface CreateOrderData {
  customerId: number;
  storeId: number;
  quotationId?: number;
  orderDate: Date | string;
  dueDate?: Date | string;
  items: OrderItemInput[];
  paidAmount?: number;
  notes?: string;
}

export interface UpdateOrderData {
  customerId?: number;
  storeId?: number;
  orderDate?: Date | string;
  dueDate?: Date | string;
  items?: OrderItemInput[];
  paidAmount?: number;
  notes?: string;
}

export interface GetOrdersOptions {
  customerId?: number;
  storeId?: number;
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export const orderService = {
  async getOrders(options: GetOrdersOptions = {}) {
    const { customerId, storeId, status, page, limit = 20, search } = options;

    const where: Prisma.OrderWhereInput = {};

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
        { orderNumber: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
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
          quotation: {
            select: {
              id: true,
              quotationNumber: true,
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    // DB에 저장된 unpaidAmount 값 사용 (데이터 무결성 보장)
    return {
      orders: orders.map((order) => ({
        ...order,
        unpaidAmount: Number(order.unpaidAmount),
      })),
      pagination: {
        page: page || 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getOrderById(id: number) {
    const order = await prisma.order.findUnique({
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
        quotation: {
          select: {
            id: true,
            quotationNumber: true,
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
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            invoiceDate: true,
            amount: true,
            isPaid: true,
            paidDate: true,
          },
          orderBy: {
            invoiceDate: "desc",
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError("주문을 찾을 수 없습니다.");
    }

    // DB에 저장된 unpaidAmount 값 사용 (데이터 무결성 보장)
    return {
      ...order,
      unpaidAmount: Number(order.unpaidAmount),
    };
  },

  /**
   * 주문 번호 생성 (트랜잭션 내부에서 호출하여 동시성 제어)
   */
  async generateOrderNumber(tx?: any): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");

    const prismaClient = tx || prisma;

    // 같은 년월의 마지막 주문 번호 찾기 (트랜잭션 내부에서 락 보장)
    const lastOrder = await prismaClient.order.findFirst({
      where: {
        orderNumber: {
          startsWith: `ORD-${year}${month}`,
        },
      },
      orderBy: {
        orderNumber: "desc",
      },
      // Prisma는 직접 SELECT FOR UPDATE를 지원하지 않지만,
      // 트랜잭션 내부에서 실행하면 동시성 제어가 보장됨
    });

    let sequence = 1;
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.orderNumber.slice(-6));
      sequence = lastSeq + 1;
    }

    const orderNumber = `ORD-${year}${month}-${String(sequence).padStart(6, "0")}`;

    // UNIQUE 제약조건으로 중복 방지 (DB 레벨)
    return orderNumber;
  },

  async createOrder(data: CreateOrderData) {
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

    // 견적서 존재 확인 (있는 경우)
    if (data.quotationId) {
      const quotation = await prisma.quotation.findUnique({
        where: { id: data.quotationId },
      });
      if (!quotation) {
        throw new NotFoundError("견적서를 찾을 수 없습니다.");
      }
    }

    // 항목 검증
    if (!data.items || data.items.length === 0) {
      throw new ValidationError("주문 항목이 최소 1개 이상 필요합니다.");
    }

    // 총 금액 계산
    const totalAmount = data.items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0
    );

    // 미지불 금액 계산 (총액 - 결제액)
    const paidAmount = data.paidAmount || 0;
    const unpaidAmount = totalAmount - paidAmount;

    // 트랜잭션으로 주문 및 항목 생성 (동시성 제어)
    return await prisma.$transaction(async (tx) => {
      // 트랜잭션 내부에서 주문 번호 생성 (동시성 제어)
      const orderNumber = await this.generateOrderNumber(tx);

      const order = await tx.order.create({
        data: {
          customerId: data.customerId,
          storeId: data.storeId,
          quotationId: data.quotationId || null,
          orderNumber,
          orderDate: new Date(data.orderDate),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          totalAmount,
          paidAmount,
          unpaidAmount, // DB에 정확한 값 저장
          status: "pending",
          notes: data.notes,
        },
      });

      // 주문 항목 생성
      await tx.orderItem.createMany({
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
            orderId: order.id,
            productId: item.productId || null,
            productName: item.productName || null,
            productDescription: item.productDescription || null,
            quantity: calculatedQuantity,
            unitPrice: item.unitPrice,
            totalPrice: Number(item.unitPrice) * calculatedQuantity,
            notes: item.notes || null,
            // 광고 상품 특성
            startDate: item.startDate ? new Date(item.startDate) : null,
            endDate: item.endDate ? new Date(item.endDate) : null,
            dailyCount: item.dailyCount || null,
            totalDays: calculatedTotalDays || null,
          };
        }),
      });

      // 트랜잭션 내부에서 직접 조회 (외부 메서드 호출 방지)
      const createdOrder = await tx.order.findUnique({
        where: { id: order.id },
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
          quotation: {
            select: {
              id: true,
              quotationNumber: true,
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
          invoices: {
            select: {
              id: true,
              invoiceNumber: true,
              invoiceDate: true,
              amount: true,
              isPaid: true,
              paidDate: true,
            },
            orderBy: {
              invoiceDate: "desc",
            },
          },
        },
      });

      if (!createdOrder) {
        throw new NotFoundError("생성된 주문을 찾을 수 없습니다.");
      }

      // DB에 저장된 unpaidAmount 값 사용 (데이터 무결성 보장)
      return {
        ...createdOrder,
        unpaidAmount: Number(createdOrder.unpaidAmount),
      };
    });
  },

  async updateOrder(id: number, data: UpdateOrderData) {
    // 존재 여부 확인
    const existing = await this.getOrderById(id);

    // 상태 확인 (수정 가능한 상태인지)
    if (existing.status === "completed" || existing.status === "cancelled") {
      throw new ValidationError("완료되거나 취소된 주문은 수정할 수 없습니다.");
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

    // 미지불 금액 계산 (총액 - 결제액)
    const paidAmount = data.paidAmount !== undefined ? data.paidAmount : Number(existing.paidAmount);
    const unpaidAmount = Number(totalAmount) - paidAmount;

    // 트랜잭션으로 업데이트
    return await prisma.$transaction(async (tx) => {
      // 주문 업데이트
      await tx.order.update({
        where: { id },
        data: {
          customerId: data.customerId,
          storeId: data.storeId,
          orderDate: data.orderDate ? new Date(data.orderDate) : undefined,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          totalAmount,
          paidAmount: data.paidAmount !== undefined ? data.paidAmount : undefined,
          unpaidAmount, // DB에 정확한 값 저장
          notes: data.notes,
        },
      });

      // 항목이 있으면 기존 항목 삭제 후 재생성
      if (data.items && data.items.length > 0) {
        await tx.orderItem.deleteMany({
          where: { orderId: id },
        });

        await tx.orderItem.createMany({
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
              orderId: id,
              productId: item.productId || null,
              productName: item.productName || null,
              productDescription: item.productDescription || null,
              quantity: calculatedQuantity,
              unitPrice: item.unitPrice,
              totalPrice: Number(item.unitPrice) * calculatedQuantity,
              notes: item.notes || null,
              // 광고 상품 특성
              startDate: item.startDate ? new Date(item.startDate) : null,
              endDate: item.endDate ? new Date(item.endDate) : null,
              dailyCount: item.dailyCount || null,
              totalDays: calculatedTotalDays || null,
            };
          }),
        });
      }

      // 트랜잭션 내부에서 업데이트된 주문 조회
      const updatedOrder = await tx.order.findUnique({
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
          quotation: {
            select: {
              id: true,
              quotationNumber: true,
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
          invoices: {
            select: {
              id: true,
              invoiceNumber: true,
              invoiceDate: true,
              amount: true,
              isPaid: true,
              paidDate: true,
            },
            orderBy: {
              invoiceDate: "desc",
            },
          },
        },
      });

      if (!updatedOrder) {
        throw new NotFoundError("업데이트된 주문을 찾을 수 없습니다.");
      }

      // DB에 저장된 unpaidAmount 값 사용 (데이터 무결성 보장)
      return {
        ...updatedOrder,
        unpaidAmount: Number(updatedOrder.unpaidAmount),
      };
    });
  },

  async updateOrderStatus(id: number, status: string) {
    const order = await this.getOrderById(id);

    // 상태 전환 검증
    const validStatuses = ["pending", "in_progress", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`유효하지 않은 상태입니다: ${status}`);
    }

    // 상태 전환 규칙 검증
    if (order.status === "completed" && status !== "completed") {
      throw new ValidationError("완료된 주문은 상태를 변경할 수 없습니다.");
    }

    if (order.status === "cancelled" && status !== "cancelled") {
      throw new ValidationError("취소된 주문은 상태를 변경할 수 없습니다.");
    }

    return await prisma.order.update({
      where: { id },
      data: { status },
    });
  },

  async processPayment(
    id: number,
    amount: number,
    paymentDate?: Date | string
  ) {
    // 결제 금액 검증
    if (amount <= 0) {
      throw new ValidationError("결제 금액은 0보다 커야 합니다.");
    }

    // 트랜잭션으로 결제 처리 (동시성 제어)
    return await prisma.$transaction(async (tx) => {
      // 트랜잭션 내부에서 주문 조회 (동시성 제어)
      const order = await tx.order.findUnique({
        where: { id },
        select: {
          id: true,
          totalAmount: true,
          paidAmount: true,
          status: true,
        },
      });

      if (!order) {
        throw new NotFoundError("주문을 찾을 수 없습니다.");
      }

      const currentPaidAmount = Number(order.paidAmount);
      const totalAmount = Number(order.totalAmount);
      const newPaidAmount = currentPaidAmount + amount;

      if (newPaidAmount > totalAmount) {
        throw new ValidationError("결제 금액이 주문 총액을 초과할 수 없습니다.");
      }

      // 미지불 금액 계산 (총액 - 새로운 결제액)
      const newUnpaidAmount = totalAmount - newPaidAmount;

      // 주문 업데이트
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          unpaidAmount: newUnpaidAmount, // DB에 정확한 값 저장
        },
      });

      // 세금계산서 생성 (선택적, 향후 구현)
      // 현재는 주문만 업데이트

      return updatedOrder;
    });
  },

  async deleteOrder(id: number) {
    // 존재 여부 확인
    await this.getOrderById(id);

    // 상태 확인 (삭제 가능한 상태인지)
    const order = await prisma.order.findUnique({
      where: { id },
      select: { status: true },
    });

    if (order?.status === "completed") {
      throw new ValidationError("완료된 주문은 삭제할 수 없습니다.");
    }

    // 트랜잭션으로 삭제 (항목도 함께 삭제됨 - CASCADE)
    return await prisma.order.delete({
      where: { id },
    });
  },

  /**
   * 주문을 견적서로 변환
   * 이미 견적서가 연결되어 있으면 기존 견적서에 연결하거나 새 견적서 생성 가능
   * 여러 주문을 하나의 견적서에 연결할 수 있음
   */
  async convertToQuotation(orderId: number, quotationDate?: Date | string, linkToExistingQuotation?: number) {
    const order = await this.getOrderById(orderId);

    // 기존 견적서에 연결하는 경우
    if (linkToExistingQuotation) {
      const quotation = await prisma.quotation.findUnique({
        where: { id: linkToExistingQuotation },
      });

      if (!quotation) {
        throw new NotFoundError("견적서를 찾을 수 없습니다.");
      }

      // 주문에 견적서 ID 연결
      return await prisma.order.update({
        where: { id: orderId },
        data: { quotationId: quotation.id },
        include: {
          quotation: true,
        },
      });
    }

    // 이미 견적서가 연결되어 있으면 기존 견적서 반환
    if (order.quotationId) {
      const existingQuotation = await prisma.quotation.findUnique({
        where: { id: order.quotationId },
      });
      if (existingQuotation) {
        return existingQuotation;
      }
    }

    // 새 견적서 생성
    const quotationNumber = `QT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(Date.now()).slice(-6)}`;

    // 트랜잭션으로 견적서 생성
    return await prisma.$transaction(async (tx) => {
      // 견적서 생성
      const quotation = await tx.quotation.create({
        data: {
          customerId: order.customerId,
          storeId: order.storeId || null,
          quotationNumber,
          quotationDate: quotationDate ? new Date(quotationDate) : new Date(),
          totalAmount: order.totalAmount,
          status: "draft",
          notes: order.notes || null,
        },
      });

      // 견적서 항목 생성
      await tx.quotationItem.createMany({
        data: order.items.map((item) => ({
          quotationId: quotation.id,
          productId: item.productId || null,
          productName: item.productName || null,
          productDescription: item.productDescription || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          description: item.notes || null,
          // 광고 상품 특성
          startDate: item.startDate || null,
          endDate: item.endDate || null,
          dailyCount: item.dailyCount || null,
          totalDays: item.totalDays || null,
        })),
      });

      // 주문에 견적서 ID 연결
      await tx.order.update({
        where: { id: orderId },
        data: { quotationId: quotation.id },
      });

      return quotation;
    });
  },
};


