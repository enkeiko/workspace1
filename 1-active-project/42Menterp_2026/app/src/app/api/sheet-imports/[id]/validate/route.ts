import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 시트 임포트 검증 API
 * Expert Review: "Dirty" 데이터를 검증하여 "Clean" 상태로 전환
 */

interface ValidationError {
  field: string;
  message: string;
}

/**
 * POST: 임포트 로그 검증
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 로그 조회
    const log = await prisma.sheetImportLog.findUnique({
      where: { id },
      include: {
        channelSheet: {
          include: { channel: true },
        },
      },
    });

    if (!log) {
      return NextResponse.json(
        { error: "임포트 로그를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 이미 처리된 경우
    if (log.status === "PROCESSED") {
      return NextResponse.json(
        { error: "이미 처리된 로그입니다" },
        { status: 400 }
      );
    }

    const errors: ValidationError[] = [];
    const rawData = log.rawData as Record<string, unknown>;

    // 필수 필드 검증 (채널 시트 매핑에 따라)
    const columnMapping = log.channelSheet.columnMapping as Record<string, string> | null;

    if (columnMapping) {
      // 매장 ID/MID 검증
      const midField = columnMapping.mid || "mid";
      if (!rawData[midField]) {
        errors.push({ field: midField, message: "매장 ID가 필요합니다" });
      }

      // 수량 검증
      const qtyField = columnMapping.qty || "qty";
      if (rawData[qtyField] !== undefined) {
        const qty = Number(rawData[qtyField]);
        if (isNaN(qty) || qty < 0) {
          errors.push({ field: qtyField, message: "수량은 0 이상의 숫자여야 합니다" });
        }
      }

      // 날짜 검증
      const dateField = columnMapping.date || "date";
      if (rawData[dateField]) {
        const date = new Date(String(rawData[dateField]));
        if (isNaN(date.getTime())) {
          errors.push({ field: dateField, message: "유효하지 않은 날짜 형식입니다" });
        }
      }
    }

    // 발주 매칭 시도
    let matchedPurchaseOrderId: string | null = null;

    if (rawData.purchaseOrderNo) {
      const po = await prisma.purchaseOrder.findUnique({
        where: { purchaseOrderNo: String(rawData.purchaseOrderNo) },
      });
      if (po) {
        matchedPurchaseOrderId = po.id;
      } else {
        errors.push({
          field: "purchaseOrderNo",
          message: `발주번호 '${rawData.purchaseOrderNo}'를 찾을 수 없습니다`,
        });
      }
    }

    // 검증 결과 업데이트
    const status = errors.length === 0 ? "VALIDATED" : "FAILED";

    const updatedLog = await prisma.sheetImportLog.update({
      where: { id },
      data: {
        status,
        validationErrors: errors.length > 0 ? JSON.parse(JSON.stringify(errors)) : undefined,
        matchedPurchaseOrderId,
      },
    });

    return NextResponse.json({
      message: status === "VALIDATED" ? "검증 완료" : "검증 실패",
      log: updatedLog,
      errors,
    });
  } catch (error) {
    console.error("Failed to validate sheet import:", error);
    return NextResponse.json(
      { error: "검증에 실패했습니다" },
      { status: 500 }
    );
  }
}
