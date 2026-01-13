import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await sendTelegramMessage(
      `<b>🔔 42ment ERP 테스트 알림</b>\n\n텔레그램 알림이 정상적으로 연동되었습니다.\n\n테스트 시간: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`
    );

    if (result.success) {
      return NextResponse.json({ success: true, message: "테스트 메시지 전송 완료" });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Telegram test error:", error);
    return NextResponse.json(
      { error: "테스트 메시지 전송 실패" },
      { status: 500 }
    );
  }
}
