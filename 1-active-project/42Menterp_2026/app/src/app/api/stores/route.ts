import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const storeSchema = z.object({
  name: z.string().min(1, "매장명은 필수입니다"),
  mid: z.string().min(1, "MID는 필수입니다"),
  placeUrl: z.string().url().optional().nullable(),
  businessNo: z.string().optional().nullable(),
  representative: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "PAUSED", "TERMINATED"]).optional(),
  memo: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const includeKeywords = searchParams.get("includeKeywords") === "true";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { mid: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          keywords: includeKeywords ? { where: { isActive: true } } : false,
          customer: { select: { name: true } },
        },
      }),
      prisma.store.count({ where }),
    ]);

    return NextResponse.json({
      stores,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch stores:", error);
    return NextResponse.json(
      { error: "매장 목록을 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = storeSchema.parse(body);

    const existingStore = await prisma.store.findUnique({
      where: { mid: validatedData.mid },
    });

    if (existingStore) {
      return NextResponse.json(
        { error: "이미 등록된 MID입니다" },
        { status: 400 }
      );
    }

    const store = await prisma.store.create({
      data: validatedData,
    });

    return NextResponse.json(store, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create store:", error);
    return NextResponse.json(
      { error: "매장 등록에 실패했습니다" },
      { status: 500 }
    );
  }
}
