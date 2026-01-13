import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 시트 임포트 처리 API
 * Expert Review: "Clean" 데이터를 Core DB에 반영
 *
 * Sheet -> Staging (Raw) -> Validation -> Core DB
 */

/**
 * POST: 검증된 임포트 로그를 Core DB에 처리
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
        matchedPurchaseOrder: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!log) {
      return NextResponse.json(
        { error: "임포트 로그를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // VALIDATED 상태만 처리 가능
    if (log.status !== "VALIDATED") {
      return NextResponse.json(
        { error: "검증된 로그만 처리할 수 있습니다" },
        { status: 400 }
      );
    }

    const rawData = log.rawData as Record<string, unknown>;
    const columnMapping = log.channelSheet.columnMapping as Record<string, string> | null;

    // 트랜잭션으로 처리
    const result = await prisma.$transaction(async (tx) => {
      let processedData: Record<string, unknown> = {};

      // 채널 시트 타입에 따른 처리
      const sheetType = log.channelSheet.sheetType;

      switch (sheetType) {
        case "WORK_REPORT": {
          // 작업 보고서 -> WorkLog 생성
          const midField = columnMapping?.mid || "mid";
          const qtyField = columnMapping?.qty || "qty";
          const dateField = columnMapping?.date || "date";
          const descField = columnMapping?.description || "description";

          // 매장 찾기
          const store = await tx.store.findFirst({
            where: {
              OR: [
                { mid: String(rawData[midField]) },
                { name: String(rawData[midField]) },
              ],
            },
          });

          if (!store) {
            throw new Error(`매장을 찾을 수 없습니다: ${rawData[midField]}`);
          }

          // WorkLog 생성
          const workLog = await tx.workLog.create({
            data: {
              storeId: store.id,
              purchaseOrderId: log.matchedPurchaseOrderId,
              workType: "CHANNEL_REPORT",
              workDate: rawData[dateField] ? new Date(String(rawData[dateField])) : new Date(),
              description: String(rawData[descField]) || `${log.channelSheet.channel.name} 작업 보고`,
              qty: rawData[qtyField] ? Number(rawData[qtyField]) : 0,
              proofUrl: rawData.proofUrl ? String(rawData.proofUrl) : null,
              createdById: session.user.id,
            },
          });

          processedData = { workLog };
          break;
        }

        case "SETTLEMENT": {
          // 정산 데이터 -> Settlement 업데이트
          const midField = columnMapping?.mid || "mid";
          const amountField = columnMapping?.amount || "amount";
          const monthField = columnMapping?.month || "settlementMonth";

          const store = await tx.store.findFirst({
            where: {
              OR: [
                { mid: String(rawData[midField]) },
                { name: String(rawData[midField]) },
              ],
            },
          });

          if (!store) {
            throw new Error(`매장을 찾을 수 없습니다: ${rawData[midField]}`);
          }

          const settlementMonth = String(rawData[monthField]) || new Date().toISOString().slice(0, 7);
          const amount = Number(rawData[amountField]) || 0;

          // 기존 정산 찾기 또는 생성
          let settlement = await tx.settlement.findFirst({
            where: {
              storeId: store.id,
              channelId: log.channelSheet.channelId,
              settlementMonth,
              type: "COST",
            },
          });

          if (settlement) {
            settlement = await tx.settlement.update({
              where: { id: settlement.id },
              data: {
                amount: settlement.amount + amount,
                description: `${settlement.description} + 시트 데이터 반영`,
              },
            });
          } else {
            settlement = await tx.settlement.create({
              data: {
                tenantId: store.tenantId!,
                storeId: store.id,
                channelId: log.channelSheet.channelId,
                settlementMonth,
                type: "COST",
                amount,
                description: `${settlementMonth} ${log.channelSheet.channel.name} 정산 (시트)`,
                status: "PENDING",
              },
            });
          }

          processedData = { settlement };
          break;
        }

        case "KEYWORD_RANK": {
          // 키워드 순위 데이터 -> KeywordRanking 생성
          const midField = columnMapping?.mid || "mid";
          const keywordField = columnMapping?.keyword || "keyword";
          const rankField = columnMapping?.rank || "rank";
          const dateField = columnMapping?.date || "date";

          const store = await tx.store.findFirst({
            where: {
              OR: [
                { mid: String(rawData[midField]) },
                { name: String(rawData[midField]) },
              ],
            },
          });

          if (!store) {
            throw new Error(`매장을 찾을 수 없습니다: ${rawData[midField]}`);
          }

          // StoreKeyword 찾기 또는 생성
          let storeKeyword = await tx.storeKeyword.findFirst({
            where: {
              storeId: store.id,
              keyword: String(rawData[keywordField]),
            },
          });

          if (!storeKeyword) {
            storeKeyword = await tx.storeKeyword.create({
              data: {
                storeId: store.id,
                keyword: String(rawData[keywordField]),
                isActive: true,
              },
            });
          }

          // 순위 기록
          const ranking = await tx.keywordRanking.create({
            data: {
              storeKeywordId: storeKeyword.id,
              ranking: Number(rawData[rankField]) || 0,
              checkDate: rawData[dateField] ? new Date(String(rawData[dateField])) : new Date(),
            },
          });

          processedData = { storeKeyword, ranking };
          break;
        }

        default: {
          // ORDER, RECEIPT 등: WorkLog로 기록
          const midField = columnMapping?.mid || "mid";

          const store = await tx.store.findFirst({
            where: {
              OR: [
                { mid: String(rawData[midField]) },
                { name: String(rawData[midField]) },
              ],
            },
          });

          if (store) {
            const workLog = await tx.workLog.create({
              data: {
                storeId: store.id,
                purchaseOrderId: log.matchedPurchaseOrderId,
                workType: "SHEET_IMPORT",
                workDate: new Date(),
                description: `${log.channelSheet.channel.name} 시트 데이터 임포트`,
                metadata: JSON.parse(JSON.stringify(rawData)),
                createdById: session.user.id,
              },
            });

            processedData = { workLog };
          }
        }
      }

      // 로그 상태 업데이트
      const updatedLog = await tx.sheetImportLog.update({
        where: { id },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
          processedById: session.user.id,
        },
      });

      return { log: updatedLog, processedData };
    });

    return NextResponse.json({
      message: "시트 데이터가 성공적으로 처리되었습니다",
      log: result.log,
      processedData: result.processedData,
    });
  } catch (error) {
    console.error("Failed to process sheet import:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "처리에 실패했습니다" },
      { status: 500 }
    );
  }
}
