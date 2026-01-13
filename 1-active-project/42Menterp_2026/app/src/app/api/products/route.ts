import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 상품 목록 조회 API
 *
 * GET /api/products
 *
 * Query Parameters:
 * - type: 상품 유형 필터 (TRAFFIC, SAVE, REVIEW, DIRECTION, BLOG, RECEIPT)
 * - isActive: 활성 상태 필터 (true/false)
 * - grouped: true면 유형별 그룹화된 데이터 반환
 * - search: 검색어 (이름, 코드)
 * - page: 페이지 번호 (기본 1)
 * - limit: 페이지당 항목 수 (기본 20)
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const isActive = searchParams.get("isActive");
    const grouped = searchParams.get("grouped") === "true";
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};

    if (type) {
      where.type = type;
    }

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    // 그룹화된 데이터 요청
    if (grouped) {
      const products = await prisma.product.findMany({
        where,
        include: {
          channel: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      });

      // 유형별 그룹화
      const typeGroups: Record<string, typeof products> = {};
      for (const product of products) {
        if (!typeGroups[product.type]) {
          typeGroups[product.type] = [];
        }
        typeGroups[product.type].push(product);
      }

      // 유형 순서 정의
      const typeOrder = ["TRAFFIC", "DIRECTION", "REVIEW", "BLOG", "SAVE", "RECEIPT"];
      const sortedGroups = typeOrder
        .filter((t) => typeGroups[t])
        .map((t) => ({
          type: t,
          products: typeGroups[t],
          count: typeGroups[t].length,
        }));

      return NextResponse.json({
        groups: sortedGroups,
        total: products.length,
      });
    }

    // 일반 페이지네이션 조회
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          channel: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: [{ type: "asc" }, { name: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json(
      { error: "상품 목록 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * 상품 생성 API
 *
 * POST /api/products
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code, name, type, description, saleUnitPrice, costUnitPrice, channelId } = body;

    if (!code || !name || !type) {
      return NextResponse.json(
        { error: "코드, 이름, 유형은 필수입니다" },
        { status: 400 }
      );
    }

    // 중복 코드 확인
    const existing = await prisma.product.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 존재하는 상품 코드입니다" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        code,
        name,
        type,
        description,
        saleUnitPrice: saleUnitPrice || 0,
        costUnitPrice: costUnitPrice || 0,
        channelId,
      },
      include: {
        channel: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Failed to create product:", error);
    return NextResponse.json(
      { error: "상품 생성에 실패했습니다" },
      { status: 500 }
    );
  }
}
