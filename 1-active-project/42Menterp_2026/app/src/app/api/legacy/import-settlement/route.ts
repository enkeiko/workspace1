import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettlementType, SettlementStatus } from "@prisma/client";
import * as XLSX from "xlsx";

/**
 * Legacy Import Settlement API
 *
 * 과거 정산 데이터를 엑셀에서 임포트합니다.
 *
 * POST /api/legacy/import-settlement
 * Body: FormData with file and month
 */

interface ImportRow {
  매장명: string;
  키워드?: string;
  작업유형: string;
  수량: number;
  단가: number;
  금액: number;
  성공여부?: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
  settlementIds: string[];
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ImportResult | { error: string }>> {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // FormData 파싱
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const month = formData.get("month") as string;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 필요합니다" },
        { status: 400 }
      );
    }

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "month 파라미터가 필요합니다 (형식: YYYY-MM)" },
        { status: 400 }
      );
    }

    // 엑셀 파싱
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<ImportRow>(worksheet);

    const result: ImportResult = {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [],
      settlementIds: [],
    };

    // 매장별로 그룹화
    const storeSettlements = new Map<
      string,
      { storeName: string; amount: number; details: ImportRow[] }
    >();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 헤더 제외

      // 필수 필드 검증
      if (!row.매장명 || row.금액 === undefined) {
        result.errors.push({
          row: rowNum,
          message: "매장명 또는 금액이 누락되었습니다",
        });
        result.skipped++;
        continue;
      }

      const existing = storeSettlements.get(row.매장명);
      if (existing) {
        existing.amount += row.금액;
        existing.details.push(row);
      } else {
        storeSettlements.set(row.매장명, {
          storeName: row.매장명,
          amount: row.금액,
          details: [row],
        });
      }
    }

    // 정산 레코드 생성
    for (const [storeName, data] of storeSettlements) {
      try {
        // 매장 찾기 또는 생성
        let store = await prisma.store.findFirst({
          where: { name: storeName },
        });

        if (!store) {
          // 자동 생성
          store = await prisma.store.create({
            data: {
              name: storeName,
              mid: `AUTO-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            },
          });
        }

        // 정산 생성
        const settlement = await prisma.settlement.create({
          data: {
            storeId: store.id,
            settlementMonth: month,
            type: SettlementType.REVENUE,
            amount: data.amount,
            status: SettlementStatus.CONFIRMED,
            description: `과거 데이터 임포트 (${data.details.length}건)`,
            isRetroactive: true,
            originalMonth: month,
            adjustmentNote: `엑셀 임포트: ${file.name}`,
            confirmedById: session.user.id,
            confirmedAt: new Date(),
          },
        });

        result.settlementIds.push(settlement.id);
        result.imported++;
      } catch (error) {
        result.errors.push({
          row: -1,
          message: `${storeName}: ${error instanceof Error ? error.message : "생성 실패"}`,
        });
        result.skipped++;
      }
    }

    result.success = result.errors.length === 0;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Legacy import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "임포트 실패" },
      { status: 500 }
    );
  }
}
