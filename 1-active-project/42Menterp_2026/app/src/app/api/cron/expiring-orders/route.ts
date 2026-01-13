import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyExpiringOrders } from "@/lib/telegram";
import { addDays } from "date-fns";

/**
 * 만료 예정 발주 알림 Cron Job
 *
 * 외부 cron 서비스 (Vercel Cron, cron-job.org 등)에서 호출
 * 매일 오전 9시에 실행 권장
 *
 * 보안: CRON_SECRET 환경변수로 인증
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const d3Date = addDays(now, 3);

    // 3일 내 종료 예정 발주 조회
    const expiringItems = await prisma.purchaseOrderItem.findMany({
      where: {
        endDate: {
          gte: now,
          lte: d3Date,
        },
        purchaseOrder: {
          status: { in: ["CONFIRMED", "IN_PROGRESS"] },
        },
      },
      include: {
        store: { select: { name: true } },
        purchaseOrder: {
          select: {
            purchaseOrderNo: true,
            channel: { select: { name: true } },
          },
        },
      },
      orderBy: { endDate: "asc" },
    });

    if (expiringItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: "만료 예정 발주 없음",
        count: 0,
      });
    }

    // 텔레그램 알림 전송
    const items = expiringItems.map((item) => ({
      purchaseOrderNo: item.purchaseOrder.purchaseOrderNo,
      storeName: item.store.name,
      channelName: item.purchaseOrder.channel.name,
      daysLeft: Math.ceil(
        (new Date(item.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));

    const result = await notifyExpiringOrders({
      count: items.length,
      items,
    });

    return NextResponse.json({
      success: result.success,
      message: result.success ? "알림 전송 완료" : result.error,
      count: items.length,
    });
  } catch (error) {
    console.error("Expiring orders cron error:", error);
    return NextResponse.json(
      { error: "Cron job 실행 실패" },
      { status: 500 }
    );
  }
}
