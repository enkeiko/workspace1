import { prisma } from "@/lib/prisma/client";
import { NotFoundError, ValidationError } from "@/lib/errors/app-error";
import type { Prisma } from "@prisma/client";

export interface CreateProductData {
  name: string;
  category?: string;
  description?: string;
  unitPrice: number;
  unit?: string;
  isActive?: boolean;
}

export interface UpdateProductData {
  name?: string;
  category?: string;
  description?: string;
  unitPrice?: number;
  unit?: string;
  isActive?: boolean;
}

export interface GetProductsOptions {
  category?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}

export const productService = {
  /**
   * 상품 목록 조회
   */
  async getProducts(options: GetProductsOptions = {}) {
    const { category, isActive, page, limit = 20, search } = options;

    const where: Prisma.ProductWhereInput = {};

    if (category) {
      where.category = category;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { category: { contains: search } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: page ? (page - 1) * limit : undefined,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page: page || 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * 상품 상세 조회
   */
  async getProductById(id: number) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orderItems: true,
            quotationItems: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundError("상품을 찾을 수 없습니다.");
    }

    return product;
  },

  /**
   * 상품 생성
   */
  async createProduct(data: CreateProductData) {
    if (data.unitPrice < 0) {
      throw new ValidationError("단가는 0 이상이어야 합니다.");
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        category: data.category || null,
        description: data.description || null,
        unitPrice: data.unitPrice,
        unit: data.unit || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      include: {
        _count: {
          select: {
            orderItems: true,
            quotationItems: true,
          },
        },
      },
    });

    return product;
  },

  /**
   * 상품 수정
   */
  async updateProduct(id: number, data: UpdateProductData) {
    // 존재 여부 확인
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingProduct) {
      throw new NotFoundError("상품을 찾을 수 없습니다.");
    }

    if (data.unitPrice !== undefined && data.unitPrice < 0) {
      throw new ValidationError("단가는 0 이상이어야 합니다.");
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category,
        description: data.description,
        unitPrice: data.unitPrice,
        unit: data.unit,
        isActive: data.isActive,
      },
      include: {
        _count: {
          select: {
            orderItems: true,
            quotationItems: true,
          },
        },
      },
    });

    return product;
  },

  /**
   * 고유한 카테고리 또는 단위 목록 조회
   */
  async getDistinctValues(type: "categories" | "units"): Promise<string[]> {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        category: type === "categories",
        unit: type === "units",
      },
    });

    const values = new Set<string>();
    products.forEach((product) => {
      const value = type === "categories" ? product.category : product.unit;
      if (value) {
        values.add(value);
      }
    });

    return Array.from(values).sort();
  },

  /**
   * 상품 삭제 (Smart Delete)
   */
  async deleteProduct(id: number) {
    // 상품 존재 여부 및 관련 항목 확인을 한 번에
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orderItems: true,
            quotationItems: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundError("상품을 찾을 수 없습니다.");
    }

    if (product._count.orderItems > 0 || product._count.quotationItems > 0) {
      // 관련 데이터가 있으면 비활성화만 수행
      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      return { deleted: false, message: "관련 주문/견적서가 있어 비활성화 처리되었습니다." };
    } else {
      // 관련 데이터가 없으면 삭제
      await prisma.product.delete({
        where: { id },
      });
      return { deleted: true, message: "상품이 삭제되었습니다." };
    }
  },
};

