import { prisma } from "@/lib/prisma/client";
import { NotFoundError, ValidationError } from "@/lib/errors/app-error";
import type { Prisma } from "@prisma/client";

export interface CreateStoreData {
  customerId: number;
  name: string;
  type?: string;
  address?: string;
  phone?: string;
  website?: string;
  description?: string;
  metadata?: any;
}

export interface UpdateStoreData {
  customerId?: number;
  name?: string;
  type?: string;
  address?: string;
  phone?: string;
  website?: string;
  description?: string;
  metadata?: any;
}

export interface GetStoresOptions {
  customerId?: number;
  page?: number;
  limit?: number;
  search?: string;
}

export const storeService = {
  /**
   * 매장 목록 조회
   */
  async getStores(options: GetStoresOptions = {}) {
    const { customerId, page, limit = 20, search } = options;

    const where: Prisma.StoreWhereInput = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { address: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
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
        },
      }),
      prisma.store.count({ where }),
    ]);

    // metadata 필드 정규화
    const normalizedStores = stores.map(store => ({
      ...store,
      metadata: store.metadata ? (typeof store.metadata === 'string' ? JSON.parse(store.metadata) : store.metadata) : null,
    }));

    return {
      stores: normalizedStores,
      pagination: {
        page: page || 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * 매장 상세 조회
   */
  async getStoreById(id: number) {
    const store = await prisma.store.findUnique({
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
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundError("매장을 찾을 수 없습니다.");
    }

    // metadata 필드 정규화 (JSON 문자열 -> 객체)
    return {
      ...store,
      metadata: store.metadata ? (typeof store.metadata === 'string' ? JSON.parse(store.metadata) : store.metadata) : null,
    };
  },

  /**
   * 매장 생성
   */
  async createStore(data: CreateStoreData) {
    // 고객 존재 확인
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) {
      throw new NotFoundError("고객을 찾을 수 없습니다.");
    }

    const store = await prisma.store.create({
      data: {
        customerId: data.customerId,
        name: data.name,
        type: data.type || null,
        address: data.address || null,
        phone: data.phone || null,
        website: data.website || null,
        description: data.description || null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            businessNumber: true,
            contactPerson: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    // metadata 필드 정규화
    return {
      ...store,
      metadata: store.metadata ? (typeof store.metadata === 'string' ? JSON.parse(store.metadata) : store.metadata) : null,
    };
  },

  /**
   * 매장 수정
   */
  async updateStore(id: number, data: UpdateStoreData) {
    // 존재 여부 확인
    const existingStore = await prisma.store.findUnique({
      where: { id },
      select: { id: true, customerId: true },
    });

    if (!existingStore) {
      throw new NotFoundError("매장을 찾을 수 없습니다.");
    }

    // 고객 존재 확인 (변경하는 경우)
    if (data.customerId && data.customerId !== existingStore.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId },
      });
      if (!customer) {
        throw new NotFoundError("고객을 찾을 수 없습니다.");
      }
    }

    const store = await prisma.store.update({
      where: { id },
      data: {
        customerId: data.customerId,
        name: data.name,
        type: data.type,
        address: data.address,
        phone: data.phone,
        website: data.website,
        description: data.description,
        metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            businessNumber: true,
            contactPerson: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    // metadata 필드 정규화
    return {
      ...store,
      metadata: store.metadata ? (typeof store.metadata === 'string' ? JSON.parse(store.metadata) : store.metadata) : null,
    };
  },

  /**
   * 매장 삭제
   */
  async deleteStore(id: number) {
    // 매장 존재 여부 및 관련 주문 확인을 한 번에
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundError("매장을 찾을 수 없습니다.");
    }

    if (store._count.orders > 0) {
      throw new ValidationError(
        "주문이 연결된 매장은 삭제할 수 없습니다. 먼저 관련 주문을 삭제하세요."
      );
    }

    await prisma.store.delete({
      where: { id },
    });
  },
};

