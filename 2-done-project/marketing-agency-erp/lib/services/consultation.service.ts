import { prisma } from "@/lib/prisma/client";
import { NotFoundError, ValidationError } from "@/lib/errors/app-error";
import type { Prisma } from "@prisma/client";

export interface CreateConsultationData {
  customerId: number;
  storeId?: number;
  consultationChannel: string;
  consultationDate: Date | string;
  consultationTopic?: string;
  consultationContent?: string;
  actionItems?: string;
  consultationResult?: string;
  relatedOrderId?: number;
  relatedQuotationId?: number;
  attachments?: any;
}

export interface UpdateConsultationData {
  customerId?: number;
  storeId?: number | null;
  consultationChannel?: string;
  consultationDate?: Date | string;
  consultationTopic?: string;
  consultationContent?: string;
  actionItems?: string;
  consultationResult?: string;
  relatedOrderId?: number | null;
  relatedQuotationId?: number | null;
  attachments?: any;
}

export interface GetConsultationsOptions {
  customerId?: number;
  storeId?: number;
  channel?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  page?: number;
  limit?: number;
  search?: string;
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

const validChannels = ["kakao", "phone", "email", "face_to_face", "other"];
const validResults = ["success", "pending", "cancelled"];

export const consultationService = {
  async getConsultations(options: GetConsultationsOptions = {}) {
    const {
      customerId,
      storeId,
      channel,
      startDate,
      endDate,
      page,
      limit = 20,
      search,
    } = options;

    const where: Prisma.ConsultationWhereInput = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (storeId) {
      where.storeId = storeId;
    }

    if (channel) {
      where.consultationChannel = channel;
    }

    if (startDate || endDate) {
      // 날짜 범위 검증
      validateDateRange(startDate, endDate);

      where.consultationDate = {};
      if (startDate) {
        where.consultationDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.consultationDate.lte = new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        { consultationTopic: { contains: search } },
        { consultationContent: { contains: search } },
        { actionItems: { contains: search } },
      ];
    }

    const [consultations, total] = await Promise.all([
      prisma.consultation.findMany({
        where,
        skip: page ? (page - 1) * limit : undefined,
        take: limit,
        orderBy: { consultationDate: "desc" },
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
          relatedOrder: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
          relatedQuotation: {
            select: {
              id: true,
              quotationNumber: true,
            },
          },
        },
      }),
      prisma.consultation.count({ where }),
    ]);

    return {
      consultations,
      pagination: {
        page: page || 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getConsultationById(id: number) {
    const consultation = await prisma.consultation.findUnique({
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
        relatedOrder: {
          select: {
            id: true,
            orderNumber: true,
            orderDate: true,
            status: true,
          },
        },
        relatedQuotation: {
          select: {
            id: true,
            quotationNumber: true,
            quotationDate: true,
            status: true,
          },
        },
      },
    });

    if (!consultation) {
      throw new NotFoundError("상담을 찾을 수 없습니다.");
    }

    return consultation;
  },

  async createConsultation(data: CreateConsultationData) {
    // 고객 존재 확인
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      throw new NotFoundError("고객을 찾을 수 없습니다.");
    }

    // 매장 존재 확인 (있는 경우)
    if (data.storeId) {
      const store = await prisma.store.findUnique({
        where: { id: data.storeId },
      });
      if (!store) {
        throw new NotFoundError("매장을 찾을 수 없습니다.");
      }
    }

    // 채널 검증
    if (!validChannels.includes(data.consultationChannel)) {
      throw new ValidationError(
        `유효하지 않은 상담 채널입니다: ${data.consultationChannel}`
      );
    }

    // 결과 검증 (있는 경우)
    if (data.consultationResult && !validResults.includes(data.consultationResult)) {
      throw new ValidationError(
        `유효하지 않은 상담 결과입니다: ${data.consultationResult}`
      );
    }

    // 관련 주문 존재 확인 (있는 경우)
    if (data.relatedOrderId) {
      const order = await prisma.order.findUnique({
        where: { id: data.relatedOrderId },
      });
      if (!order) {
        throw new NotFoundError("주문을 찾을 수 없습니다.");
      }
    }

    // 관련 견적서 존재 확인 (있는 경우)
    if (data.relatedQuotationId) {
      const quotation = await prisma.quotation.findUnique({
        where: { id: data.relatedQuotationId },
      });
      if (!quotation) {
        throw new NotFoundError("견적서를 찾을 수 없습니다.");
      }
    }

    const consultation = await prisma.consultation.create({
      data: {
        customerId: data.customerId,
        storeId: data.storeId || null,
        consultationChannel: data.consultationChannel,
        consultationDate: new Date(data.consultationDate),
        consultationTopic: data.consultationTopic || null,
        consultationContent: data.consultationContent || null,
        actionItems: data.actionItems || null,
        consultationResult: data.consultationResult || null,
        relatedOrderId: data.relatedOrderId || null,
        relatedQuotationId: data.relatedQuotationId || null,
        attachments: data.attachments || null,
      },
    });

    return await this.getConsultationById(consultation.id);
  },

  async updateConsultation(id: number, data: UpdateConsultationData) {
    // 존재 여부 확인
    await this.getConsultationById(id);

    // 고객 존재 확인 (변경하는 경우)
    if (data.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId },
      });
      if (!customer) {
        throw new NotFoundError("고객을 찾을 수 없습니다.");
      }
    }

    // 매장 존재 확인 (변경하는 경우)
    if (data.storeId) {
      const store = await prisma.store.findUnique({
        where: { id: data.storeId },
      });
      if (!store) {
        throw new NotFoundError("매장을 찾을 수 없습니다.");
      }
    }

    // 채널 검증 (변경하는 경우)
    if (data.consultationChannel && !validChannels.includes(data.consultationChannel)) {
      throw new ValidationError(
        `유효하지 않은 상담 채널입니다: ${data.consultationChannel}`
      );
    }

    // 결과 검증 (변경하는 경우)
    if (data.consultationResult && !validResults.includes(data.consultationResult)) {
      throw new ValidationError(
        `유효하지 않은 상담 결과입니다: ${data.consultationResult}`
      );
    }

    // 관련 주문 존재 확인 (변경하는 경우)
    if (data.relatedOrderId) {
      const order = await prisma.order.findUnique({
        where: { id: data.relatedOrderId },
      });
      if (!order) {
        throw new NotFoundError("주문을 찾을 수 없습니다.");
      }
    }

    // 관련 견적서 존재 확인 (변경하는 경우)
    if (data.relatedQuotationId) {
      const quotation = await prisma.quotation.findUnique({
        where: { id: data.relatedQuotationId },
      });
      if (!quotation) {
        throw new NotFoundError("견적서를 찾을 수 없습니다.");
      }
    }

    const consultation = await prisma.consultation.update({
      where: { id },
      data: {
        customerId: data.customerId,
        storeId: data.storeId !== undefined ? data.storeId : undefined,
        consultationChannel: data.consultationChannel,
        consultationDate: data.consultationDate
          ? new Date(data.consultationDate)
          : undefined,
        consultationTopic: data.consultationTopic,
        consultationContent: data.consultationContent,
        actionItems: data.actionItems,
        consultationResult: data.consultationResult,
        relatedOrderId: data.relatedOrderId !== undefined ? data.relatedOrderId : undefined,
        relatedQuotationId:
          data.relatedQuotationId !== undefined ? data.relatedQuotationId : undefined,
        attachments: data.attachments,
      },
    });

    return await this.getConsultationById(consultation.id);
  },

  async deleteConsultation(id: number) {
    // 존재 여부 확인
    await this.getConsultationById(id);

    return await prisma.consultation.delete({
      where: { id },
    });
  },
};

