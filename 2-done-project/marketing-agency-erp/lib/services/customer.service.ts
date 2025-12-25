import { prisma } from "@/lib/prisma/client";
import { NotFoundError, ValidationError } from "@/lib/errors/app-error";
import type { Prisma } from "@prisma/client";

export interface CreateCustomerData {
  name: string;
  businessNumber?: string;
  businessRegistrationFile?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateCustomerData {
  name?: string;
  businessNumber?: string;
  businessRegistrationFile?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  tags?: string[];
}

export interface GetCustomersOptions {
  page?: number;
  limit?: number;
  search?: string;
}

export const customerService = {
  /**
   * 고객 목록 조회
   */
  async getCustomers(options: GetCustomersOptions = {}) {
    const { page, limit = 20, search } = options;

    const where: Prisma.CustomerWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { businessNumber: { contains: search } },
        { contactPerson: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: page ? (page - 1) * limit : undefined,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.customer.count({ where }),
    ]);

    // tags 필드 정규화
    const normalizedCustomers = customers.map(customer => ({
      ...customer,
      tags: customer.tags ? (typeof customer.tags === 'string' ? JSON.parse(customer.tags) : customer.tags) : [],
    }));

    return {
      customers: normalizedCustomers,
      pagination: {
        page: page || 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * 고객 상세 조회
   */
  async getCustomerById(id: number) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        stores: {
          select: {
            id: true,
            name: true,
            type: true,
            address: true,
            phone: true,
          },
        },
        _count: {
          select: {
            orders: true,
            stores: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundError("고객을 찾을 수 없습니다.");
    }

    // tags 필드 정규화 (JSON 문자열 -> 배열)
    return {
      ...customer,
      tags: customer.tags ? (typeof customer.tags === 'string' ? JSON.parse(customer.tags) : customer.tags) : [],
    };
  },

  /**
   * 고객 생성
   */
  async createCustomer(data: CreateCustomerData) {
    // 사업자번호 중복 확인
    if (data.businessNumber) {
      const existing = await prisma.customer.findUnique({
        where: { businessNumber: data.businessNumber },
      });
      if (existing) {
        throw new ValidationError("이미 등록된 사업자번호입니다.");
      }
    }

    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        businessNumber: data.businessNumber || null,
        businessRegistrationFile: data.businessRegistrationFile || null,
        contactPerson: data.contactPerson || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        notes: data.notes || null,
        tags: data.tags ? JSON.stringify(data.tags) : null,
      },
      include: {
        stores: {
          select: {
            id: true,
            name: true,
            type: true,
            address: true,
            phone: true,
          },
        },
        _count: {
          select: {
            orders: true,
            stores: true,
          },
        },
      },
    });

    // tags 필드 정규화
    return {
      ...customer,
      tags: customer.tags ? (typeof customer.tags === 'string' ? JSON.parse(customer.tags) : customer.tags) : [],
    };
  },

  /**
   * 고객 수정
   */
  async updateCustomer(id: number, data: UpdateCustomerData) {
    // 존재 여부 확인 및 사업자번호 중복 검사를 위한 조회
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, businessNumber: true },
    });

    if (!existingCustomer) {
      throw new NotFoundError("고객을 찾을 수 없습니다.");
    }

    // 사업자번호 중복 확인 (변경하는 경우)
    if (data.businessNumber && data.businessNumber !== existingCustomer.businessNumber) {
      const existing = await prisma.customer.findUnique({
        where: { businessNumber: data.businessNumber },
      });
      if (existing) {
        throw new ValidationError("이미 등록된 사업자번호입니다.");
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        businessNumber: data.businessNumber !== undefined ? data.businessNumber : undefined,
        businessRegistrationFile: data.businessRegistrationFile,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        address: data.address,
        notes: data.notes,
        tags: data.tags ? JSON.stringify(data.tags) : undefined,
      },
      include: {
        stores: {
          select: {
            id: true,
            name: true,
            type: true,
            address: true,
            phone: true,
          },
        },
        _count: {
          select: {
            orders: true,
            stores: true,
          },
        },
      },
    });

    // tags 필드 정규화
    return {
      ...customer,
      tags: customer.tags ? (typeof customer.tags === 'string' ? JSON.parse(customer.tags) : customer.tags) : [],
    };
  },

  /**
   * 고객 삭제
   */
  async deleteCustomer(id: number) {
    // 고객 존재 여부 및 관련 데이터 확인을 한 번에
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
            stores: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundError("고객을 찾을 수 없습니다.");
    }

    if (customer._count.orders > 0 || customer._count.stores > 0) {
      throw new ValidationError(
        "주문이나 매장이 연결된 고객은 삭제할 수 없습니다. 먼저 관련 데이터를 삭제하세요."
      );
    }

    await prisma.customer.delete({
      where: { id },
    });
  },
};

