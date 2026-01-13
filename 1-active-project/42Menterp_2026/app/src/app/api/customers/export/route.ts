import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ExcelFieldDef } from "@/components/common/excel";

/**
 * 고객 데이터 내보내기 API (Excel Export 컴포넌트용)
 *
 * Query Parameters:
 * - ids: 선택된 고객 ID 목록 (comma separated)
 * - status: 상태 필터
 */

// 고객 Excel 필드 정의
const customerFields: ExcelFieldDef[] = [
  {
    key: "name",
    header: "고객명",
    type: "string",
    required: true,
    description: "거래처/회사명",
    example: "(주)샘플회사",
  },
  {
    key: "businessNo",
    header: "사업자번호",
    type: "string",
    required: false,
    description: "10자리 숫자",
    example: "1234567890",
  },
  {
    key: "representative",
    header: "대표자명",
    type: "string",
    required: false,
    example: "홍길동",
  },
  {
    key: "contactName",
    header: "담당자명",
    type: "string",
    required: false,
    example: "김담당",
  },
  {
    key: "contactPhone",
    header: "연락처",
    type: "string",
    required: false,
    example: "010-1234-5678",
  },
  {
    key: "contactEmail",
    header: "이메일",
    type: "string",
    required: false,
    pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
    example: "contact@example.com",
  },
  {
    key: "address",
    header: "주소",
    type: "string",
    required: false,
    example: "서울특별시 강남구 테헤란로 123",
  },
  {
    key: "status",
    header: "상태",
    type: "string",
    required: false,
    enum: ["ACTIVE", "PAUSED", "TERMINATED"],
    example: "ACTIVE",
  },
  {
    key: "memo",
    header: "비고",
    type: "string",
    required: false,
    example: "메모 내용",
  },
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};

    // 선택된 ID 필터
    if (idsParam) {
      const ids = idsParam.split(",").filter(Boolean);
      if (ids.length > 0) {
        where.id = { in: ids };
      }
    }

    // 상태 필터
    if (status) {
      where.status = status;
    }

    const customers = await prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        businessNo: true,
        representative: true,
        contactName: true,
        contactPhone: true,
        contactEmail: true,
        address: true,
        status: true,
        memo: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      data: customers,
      fields: customerFields,
    });
  } catch (error) {
    console.error("Failed to export customers:", error);
    return NextResponse.json(
      { error: "고객 데이터 내보내기에 실패했습니다" },
      { status: 500 }
    );
  }
}
