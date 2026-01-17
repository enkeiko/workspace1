import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

interface ExcelRow {
  매장명?: string;
  MID?: string;
  mid?: string;
  "Place URL"?: string;
  placeUrl?: string;
  플레이스url?: string;
  사업자번호?: string;
  대표자?: string;
  담당자?: string;
  연락처?: string;
  이메일?: string;
  주소?: string;
  업종?: string;
  메모?: string;
  비고?: string;
}

/**
 * 매장 일괄 수정/삭제 API
 *
 * PATCH /api/stores/bulk
 *
 * Body:
 * - ids: 대상 매장 ID 배열
 * - action: "update" | "delete"
 * - data: 수정할 데이터 (action이 "update"인 경우)
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
          await prisma.store.update({
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
          // 연결된 발주/정산 등이 있으면 삭제 불가
          const store = await prisma.store.findUnique({
            where: { id },
            select: {
              _count: {
                select: {
                  purchaseOrderItems: true,
                  settlements: true,
                  salesOrderItems: true,
                },
              },
            },
          });

          if (
            store &&
            (store._count.purchaseOrderItems > 0 ||
              store._count.settlements > 0 ||
              store._count.salesOrderItems > 0)
          ) {
            summary.failed++;
            errors.push({
              id,
              error: "연결된 발주/정산/수주 데이터가 있어 삭제할 수 없습니다",
            });
            continue;
          }

          await prisma.store.delete({
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
    console.error("Failed to bulk update stores:", error);
    return NextResponse.json(
      { error: "일괄 처리에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * 매장 엑셀 일괄 등록 API
 *
 * POST /api/stores/bulk
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

    // First, read raw data to find header row
    const rawData: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Find header row (row containing 'mid' or 'MID' and '매장명')
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(rawData.length, 10); i++) {
      const row = rawData[i];
      if (row && Array.isArray(row)) {
        const rowStr = row.map(cell => String(cell || '').toLowerCase());
        if (rowStr.includes('mid') && row.some(cell => String(cell || '').includes('매장명'))) {
          headerRowIndex = i;
          break;
        }
      }
    }

    // Re-read with correct header row
    const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex });

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
      const mid = row.MID || row.mid;
      const name = row["매장명"];

      if (!mid || !name) {
        results.failed++;
        results.errors.push(`MID 또는 매장명이 없는 행이 있습니다`);
        continue;
      }

      try {
        const existingStore = await prisma.store.findUnique({
          where: { mid: String(mid) },
        });

        if (existingStore) {
          results.skipped++;
          continue;
        }

        await prisma.store.create({
          data: {
            name: String(name),
            mid: String(mid),
            placeUrl: row["Place URL"] || row.placeUrl || row["플레이스url"] || null,
            businessNo: row["사업자번호"] || null,
            representative: row["대표자"] || null,
            contactName: row["담당자"] || null,
            contactPhone: row["연락처"] || null,
            contactEmail: row["이메일"] || null,
            address: row["주소"] || null,
            category: row["업종"] || null,
            memo: row["메모"] || row["비고"] || null,
          },
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`MID ${mid}: ${(error as Error).message}`);
      }
    }

    return NextResponse.json({
      message: `처리 완료: 성공 ${results.success}건, 실패 ${results.failed}건, 중복 스킵 ${results.skipped}건`,
      results,
    });
  } catch (error) {
    console.error("Failed to bulk import stores:", error);
    return NextResponse.json(
      { error: "엑셀 업로드에 실패했습니다" },
      { status: 500 }
    );
  }
}
