import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

interface ExcelRow {
  매장MID?: string;
  매장명?: string;
  채널코드?: string;
  정산월?: string;
  유형?: string;
  금액?: number | string;
  설명?: string;
  상태?: string;
}

const validTypes = ["REVENUE", "COST"];
const validStatuses = ["PENDING", "CONFIRMED", "PAID"];

/**
 * 정산 엑셀 일괄 등록 API
 *
 * POST /api/settlements/import
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
      errors: [] as string[],
    };

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNum = i + 2; // 헤더 행 제외

      const mid = row["매장MID"];
      const settlementMonth = row["정산월"];
      const type = row["유형"]?.toUpperCase();
      const amount = row["금액"];

      // 필수 필드 검증
      if (!mid || !settlementMonth || !type || !amount) {
        results.failed++;
        results.errors.push(`${rowNum}행: 매장MID, 정산월, 유형, 금액은 필수입니다`);
        continue;
      }

      // 유형 검증
      if (!validTypes.includes(type)) {
        results.failed++;
        results.errors.push(`${rowNum}행: 유효하지 않은 유형 - ${type} (REVENUE 또는 COST)`);
        continue;
      }

      // 정산월 형식 검증
      if (!/^\d{4}-\d{2}$/.test(settlementMonth)) {
        results.failed++;
        results.errors.push(`${rowNum}행: 정산월 형식 오류 - ${settlementMonth} (YYYY-MM)`);
        continue;
      }

      try {
        // 매장 찾기
        const store = await prisma.store.findUnique({
          where: { mid: String(mid) },
        });

        if (!store) {
          results.failed++;
          results.errors.push(`${rowNum}행: 매장을 찾을 수 없음 - MID: ${mid}`);
          continue;
        }

        // 채널 찾기 (선택)
        let channelId: string | null = null;
        if (row["채널코드"]) {
          const channel = await prisma.channel.findUnique({
            where: { code: row["채널코드"] },
          });
          if (channel) {
            channelId = channel.id;
          }
        }

        // 상태 검증
        let status: "PENDING" | "CONFIRMED" | "PAID" = "PENDING";
        if (row["상태"]) {
          const statusUpper = row["상태"].toUpperCase();
          if (validStatuses.includes(statusUpper)) {
            status = statusUpper as "PENDING" | "CONFIRMED" | "PAID";
          }
        }

        // 정산 생성
        await prisma.settlement.create({
          data: {
            storeId: store.id,
            channelId,
            settlementMonth,
            type: type as "REVENUE" | "COST",
            amount: typeof amount === "number" ? amount : parseInt(String(amount)),
            description: row["설명"] || null,
            status,
          },
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${rowNum}행: ${(error as Error).message}`);
      }
    }

    return NextResponse.json({
      message: `처리 완료: 성공 ${results.success}건, 실패 ${results.failed}건`,
      results,
    });
  } catch (error) {
    console.error("Failed to import settlements:", error);
    return NextResponse.json(
      { error: "엑셀 업로드에 실패했습니다" },
      { status: 500 }
    );
  }
}
