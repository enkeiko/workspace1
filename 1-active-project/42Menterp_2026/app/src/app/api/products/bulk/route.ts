import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

interface ExcelRow {
  상품코드?: string;
  상품명?: string;
  상품유형?: string;
  판매단가?: number | string;
  매입단가?: number | string;
  설명?: string;
  활성상태?: string;
}

const validTypes = ["TRAFFIC", "DIRECTION", "REVIEW", "BLOG", "SAVE", "RECEIPT"];

/**
 * 상품 일괄 수정/삭제 API
 *
 * PATCH /api/products/bulk
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ids, action, data } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "대상 ID가 필요합니다" },
        { status: 400 }
      );
    }

    if (!action || !["update", "delete"].includes(action)) {
      return NextResponse.json(
        { error: "유효한 action이 필요합니다 (update | delete)" },
        { status: 400 }
      );
    }

    const summary = {
      updated: 0,
      deleted: 0,
      failed: 0,
    };
    const errors: { id: string; error: string }[] = [];

    if (action === "update") {
      if (!data || typeof data !== "object") {
        return NextResponse.json(
          { error: "수정할 데이터가 필요합니다" },
          { status: 400 }
        );
      }

      for (const id of ids) {
        try {
          await prisma.product.update({
            where: { id },
            data,
          });
          summary.updated++;
        } catch (error) {
          summary.failed++;
          errors.push({ id, error: (error as Error).message });
        }
      }
    } else if (action === "delete") {
      for (const id of ids) {
        try {
          // 연결된 주문 항목이 있으면 삭제 불가
          const product = await prisma.product.findUnique({
            where: { id },
            select: {
              _count: {
                select: {
                  quotationItems: true,
                  salesOrderItems: true,
                  purchaseOrderItems: true,
                },
              },
            },
          });

          if (
            product &&
            (product._count.quotationItems > 0 ||
              product._count.salesOrderItems > 0 ||
              product._count.purchaseOrderItems > 0)
          ) {
            summary.failed++;
            errors.push({
              id,
              error: "연결된 견적/수주/발주 데이터가 있어 삭제할 수 없습니다",
            });
            continue;
          }

          await prisma.product.delete({
            where: { id },
          });
          summary.deleted++;
        } catch (error) {
          summary.failed++;
          errors.push({ id, error: (error as Error).message });
        }
      }
    }

    return NextResponse.json({
      message: `처리 완료: ${action === "update" ? `수정 ${summary.updated}건` : `삭제 ${summary.deleted}건`}${summary.failed > 0 ? `, 실패 ${summary.failed}건` : ""}`,
      summary,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Failed to bulk update products:", error);
    return NextResponse.json(
      { error: "일괄 처리에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * 상품 엑셀 일괄 등록 API
 *
 * POST /api/products/bulk
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 필요합니다" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return NextResponse.json(
        { error: "엑셀 파일에 데이터가 없습니다" },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const row of jsonData) {
      const code = row["상품코드"];
      const name = row["상품명"];
      const type = row["상품유형"];

      if (!code || !name || !type) {
        results.failed++;
        results.errors.push(`상품코드, 상품명, 상품유형은 필수입니다`);
        continue;
      }

      if (!validTypes.includes(type)) {
        results.failed++;
        results.errors.push(`유효하지 않은 상품유형: ${type}`);
        continue;
      }

      try {
        const existingProduct = await prisma.product.findUnique({
          where: { code: String(code) },
        });

        if (existingProduct) {
          results.skipped++;
          continue;
        }

        await prisma.product.create({
          data: {
            code: String(code),
            name: String(name),
            type: type as "TRAFFIC" | "DIRECTION" | "REVIEW" | "BLOG" | "SAVE" | "RECEIPT",
            saleUnitPrice: row["판매단가"] ? parseInt(String(row["판매단가"])) : 0,
            costUnitPrice: row["매입단가"] ? parseInt(String(row["매입단가"])) : 0,
            description: row["설명"] || null,
            isActive: row["활성상태"] !== "N",
          },
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`상품코드 ${code}: ${(error as Error).message}`);
      }
    }

    return NextResponse.json({
      message: `처리 완료: 성공 ${results.success}건, 실패 ${results.failed}건, 중복 스킵 ${results.skipped}건`,
      results,
    });
  } catch (error) {
    console.error("Failed to bulk import products:", error);
    return NextResponse.json(
      { error: "엑셀 업로드에 실패했습니다" },
      { status: 500 }
    );
  }
}
