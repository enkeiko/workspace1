"use server";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

/**
 * 증빙 일괄 업로드 API
 *
 * 엑셀 파일 포맷:
 * | 발주번호 | 키워드 | 매장명 | 작업URL | 완료일 |
 *
 * 매칭 로직:
 * 1. 발주번호로 PurchaseOrder 조회
 * 2. 키워드 + 매장명으로 PurchaseOrderItem 매칭
 * 3. proofUrl 업데이트 & status를 COMPLETED로 변경
 */

interface ExcelRow {
  발주번호?: string;
  purchaseOrderNo?: string;
  키워드?: string;
  keyword?: string;
  매장명?: string;
  storeName?: string;
  작업URL?: string;
  proofUrl?: string;
  url?: string;
  완료일?: string | number | Date;
  completedAt?: string | number | Date;
}

interface ProcessResult {
  success: boolean;
  row: number;
  purchaseOrderNo: string;
  keyword: string;
  storeName: string;
  proofUrl: string;
  error?: string;
}

interface BulkUploadResponse {
  success: boolean;
  summary: {
    total: number;
    success: number;
    failed: number;
  };
  results: ProcessResult[];
  thumbnailJobIds?: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse<BulkUploadResponse | { error: string }>> {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // FormData에서 파일 추출
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    }

    // 파일 확장자 검증
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls") && !fileName.endsWith(".csv")) {
      return NextResponse.json(
        { error: "지원하지 않는 파일 형식입니다. xlsx, xls, csv 파일만 가능합니다." },
        { status: 400 }
      );
    }

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // xlsx로 파싱
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

    if (rows.length === 0) {
      return NextResponse.json({ error: "데이터가 없습니다" }, { status: 400 });
    }

    // 처리 결과
    const results: ProcessResult[] = [];
    const thumbnailJobIds: string[] = [];

    // 각 행 처리
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 헤더가 1행이므로 데이터는 2행부터

      // 필드 추출 (한글/영문 둘 다 지원)
      const purchaseOrderNo = (row.발주번호 || row.purchaseOrderNo || "").toString().trim();
      const keyword = (row.키워드 || row.keyword || "").toString().trim();
      const storeName = (row.매장명 || row.storeName || "").toString().trim();
      const proofUrl = (row.작업URL || row.proofUrl || row.url || "").toString().trim();
      const completedAtRaw = row.완료일 || row.completedAt;

      // 필수 필드 검증
      if (!purchaseOrderNo || !keyword || !storeName || !proofUrl) {
        results.push({
          success: false,
          row: rowNum,
          purchaseOrderNo,
          keyword,
          storeName,
          proofUrl,
          error: "필수 필드가 누락되었습니다 (발주번호, 키워드, 매장명, 작업URL)",
        });
        continue;
      }

      // URL 형식 검증
      try {
        new URL(proofUrl);
      } catch {
        results.push({
          success: false,
          row: rowNum,
          purchaseOrderNo,
          keyword,
          storeName,
          proofUrl,
          error: "유효하지 않은 URL 형식입니다",
        });
        continue;
      }

      // 완료일 파싱
      let completedAt: Date | null = null;
      if (completedAtRaw) {
        if (typeof completedAtRaw === "number") {
          // 엑셀 날짜 시리얼 넘버
          completedAt = XLSX.SSF.parse_date_code(completedAtRaw) as unknown as Date;
          if (completedAt && typeof completedAt === "object" && "y" in completedAt) {
            const d = completedAt as unknown as { y: number; m: number; d: number };
            completedAt = new Date(d.y, d.m - 1, d.d);
          }
        } else if (typeof completedAtRaw === "string") {
          completedAt = new Date(completedAtRaw);
        } else if (completedAtRaw instanceof Date) {
          completedAt = completedAtRaw;
        }

        if (completedAt && isNaN(completedAt.getTime())) {
          completedAt = null;
        }
      }

      try {
        // 발주 조회
        const purchaseOrder = await prisma.purchaseOrder.findUnique({
          where: { purchaseOrderNo },
          include: {
            items: {
              include: {
                store: true,
              },
            },
          },
        });

        if (!purchaseOrder) {
          results.push({
            success: false,
            row: rowNum,
            purchaseOrderNo,
            keyword,
            storeName,
            proofUrl,
            error: `발주번호 '${purchaseOrderNo}'를 찾을 수 없습니다`,
          });
          continue;
        }

        // 키워드 + 매장명으로 항목 매칭
        const matchedItem = purchaseOrder.items.find(
          (item) =>
            item.keyword.toLowerCase() === keyword.toLowerCase() &&
            item.store.name.toLowerCase() === storeName.toLowerCase()
        );

        if (!matchedItem) {
          results.push({
            success: false,
            row: rowNum,
            purchaseOrderNo,
            keyword,
            storeName,
            proofUrl,
            error: `키워드 '${keyword}', 매장 '${storeName}'에 해당하는 항목을 찾을 수 없습니다`,
          });
          continue;
        }

        // 항목 업데이트
        await prisma.purchaseOrderItem.update({
          where: { id: matchedItem.id },
          data: {
            proofUrl,
            completedAt: completedAt || new Date(),
            status: "COMPLETED",
          },
        });

        // 썸네일 생성 작업 큐에 추가 (비동기)
        // 실제 환경에서는 BullMQ, SQS 등 Job Queue 사용 권장
        thumbnailJobIds.push(matchedItem.id);

        results.push({
          success: true,
          row: rowNum,
          purchaseOrderNo,
          keyword,
          storeName,
          proofUrl,
        });
      } catch (error) {
        console.error(`Row ${rowNum} processing error:`, error);
        results.push({
          success: false,
          row: rowNum,
          purchaseOrderNo,
          keyword,
          storeName,
          proofUrl,
          error: error instanceof Error ? error.message : "처리 중 오류 발생",
        });
      }
    }

    // 결과 집계
    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    // 썸네일 생성 비동기 실행 (성공한 항목들)
    if (thumbnailJobIds.length > 0) {
      // 비동기로 썸네일 생성 시작 (응답은 먼저 반환)
      generateThumbnailsAsync(thumbnailJobIds).catch((err) => {
        console.error("Thumbnail generation error:", err);
      });
    }

    return NextResponse.json({
      success: failedCount === 0,
      summary: {
        total: rows.length,
        success: successCount,
        failed: failedCount,
      },
      results,
      thumbnailJobIds,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "업로드 처리 실패" },
      { status: 500 }
    );
  }
}

/**
 * 썸네일 비동기 생성
 * 실제 환경에서는 별도 Job Queue로 처리 권장
 */
async function generateThumbnailsAsync(itemIds: string[]): Promise<void> {
  const { generateThumbnail } = await import("@/lib/thumbnail-generator");

  for (const itemId of itemIds) {
    try {
      const item = await prisma.purchaseOrderItem.findUnique({
        where: { id: itemId },
        select: { id: true, proofUrl: true },
      });

      if (item?.proofUrl) {
        const thumbnailUrl = await generateThumbnail(item.proofUrl, itemId);

        if (thumbnailUrl) {
          await prisma.purchaseOrderItem.update({
            where: { id: itemId },
            data: { thumbnailUrl },
          });
        }
      }
    } catch (error) {
      console.error(`Thumbnail generation failed for item ${itemId}:`, error);
    }
  }
}
