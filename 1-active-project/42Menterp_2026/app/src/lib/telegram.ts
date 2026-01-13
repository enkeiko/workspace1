/**
 * Telegram 알림 유틸리티
 *
 * 환경변수:
 * - TELEGRAM_BOT_TOKEN: 텔레그램 봇 토큰
 * - TELEGRAM_CHAT_ID: 알림을 받을 채팅방 ID (그룹 또는 개인)
 */

const TELEGRAM_API_URL = "https://api.telegram.org/bot";

interface TelegramMessage {
  chat_id: string | number;
  text: string;
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
  disable_notification?: boolean;
}

interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
}

/**
 * 텔레그램 메시지 전송
 */
export async function sendTelegramMessage(
  text: string,
  options?: {
    parseMode?: "HTML" | "Markdown" | "MarkdownV2";
    silent?: boolean;
    chatId?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = options?.chatId || process.env.TELEGRAM_CHAT_ID;

  if (!botToken) {
    console.warn("TELEGRAM_BOT_TOKEN is not configured");
    return { success: false, error: "Bot token not configured" };
  }

  if (!chatId) {
    console.warn("TELEGRAM_CHAT_ID is not configured");
    return { success: false, error: "Chat ID not configured" };
  }

  try {
    const message: TelegramMessage = {
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode || "HTML",
      disable_notification: options?.silent || false,
    };

    const response = await fetch(`${TELEGRAM_API_URL}${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    const data: TelegramResponse = await response.json();

    if (!data.ok) {
      console.error("Telegram API error:", data.description);
      return { success: false, error: data.description };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * 발주 생성 알림
 */
export async function notifyPurchaseOrderCreated(data: {
  purchaseOrderNo: string;
  channelName: string;
  totalQty: number;
  totalAmount: number;
  createdBy: string;
}) {
  const message = `
<b>📦 새 발주 등록</b>

• 발주번호: <code>${data.purchaseOrderNo}</code>
• 채널: ${data.channelName}
• 수량: ${data.totalQty.toLocaleString()}개
• 금액: ${data.totalAmount.toLocaleString()}원
• 담당자: ${data.createdBy}
`.trim();

  return sendTelegramMessage(message);
}

/**
 * 발주 상태 변경 알림
 */
export async function notifyPurchaseOrderStatusChanged(data: {
  purchaseOrderNo: string;
  channelName: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
}) {
  const statusLabels: Record<string, string> = {
    DRAFT: "초안",
    PENDING: "대기",
    CONFIRMED: "확정",
    IN_PROGRESS: "진행중",
    COMPLETED: "완료",
    CANCELLED: "취소",
  };

  const emoji = data.toStatus === "COMPLETED" ? "✅" :
                data.toStatus === "CANCELLED" ? "❌" :
                data.toStatus === "IN_PROGRESS" ? "🔄" : "📋";

  const message = `
<b>${emoji} 발주 상태 변경</b>

• 발주번호: <code>${data.purchaseOrderNo}</code>
• 채널: ${data.channelName}
• 상태: ${statusLabels[data.fromStatus] || data.fromStatus} → <b>${statusLabels[data.toStatus] || data.toStatus}</b>
• 변경자: ${data.changedBy}
`.trim();

  return sendTelegramMessage(message);
}

/**
 * 만료 예정 발주 알림
 */
export async function notifyExpiringOrders(data: {
  count: number;
  items: Array<{
    purchaseOrderNo: string;
    storeName: string;
    channelName: string;
    daysLeft: number;
  }>;
}) {
  if (data.count === 0) return { success: true };

  const itemsList = data.items
    .slice(0, 5)
    .map((item) => `• ${item.storeName} (${item.channelName}) - D-${item.daysLeft}`)
    .join("\n");

  const message = `
<b>⏰ 만료 예정 발주 알림</b>

3일 내 종료 예정: <b>${data.count}건</b>

${itemsList}
${data.count > 5 ? `\n... 외 ${data.count - 5}건` : ""}
`.trim();

  return sendTelegramMessage(message);
}

/**
 * 일일 정산 요약 알림
 */
export async function notifyDailySettlementSummary(data: {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  pendingCount: number;
}) {
  const profitEmoji = data.profit >= 0 ? "📈" : "📉";

  const message = `
<b>💰 일일 정산 요약</b>
<i>${data.date}</i>

• 매출: ${data.revenue.toLocaleString()}원
• 비용: ${data.cost.toLocaleString()}원
• 수익: ${profitEmoji} ${data.profit.toLocaleString()}원
• 미정산: ${data.pendingCount}건
`.trim();

  return sendTelegramMessage(message);
}

/**
 * 에러 알림 (시스템 관리자용)
 */
export async function notifySystemError(data: {
  type: string;
  message: string;
  details?: string;
}) {
  const message = `
<b>🚨 시스템 오류</b>

• 유형: ${data.type}
• 메시지: ${data.message}
${data.details ? `• 상세: <code>${data.details}</code>` : ""}
`.trim();

  return sendTelegramMessage(message);
}
