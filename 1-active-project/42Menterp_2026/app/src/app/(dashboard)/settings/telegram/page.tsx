"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, CheckCircle, XCircle, Loader2, Info, Bell } from "lucide-react";
import { toast } from "sonner";

export default function TelegramSettingsPage() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const handleTestNotification = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/notifications/telegram/test", {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult("success");
        toast.success("테스트 메시지가 전송되었습니다");
      } else {
        setTestResult("error");
        toast.error(data.error || "테스트 메시지 전송 실패");
      }
    } catch (error) {
      setTestResult("error");
      toast.error("테스트 중 오류가 발생했습니다");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">텔레그램 알림 설정</h2>
        <p className="text-muted-foreground">
          텔레그램 봇을 통해 발주, 정산 등의 알림을 받을 수 있습니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>텔레그램 봇 연동</CardTitle>
          <CardDescription>
            텔레그램 봇을 생성하고 연동하여 실시간 알림을 받으세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">설정 방법</p>
                <ol className="list-decimal list-inside space-y-1 text-sm mt-2 text-blue-800 dark:text-blue-200">
                  <li>텔레그램에서 <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">@BotFather</code>를 검색하여 대화 시작</li>
                  <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/newbot</code> 명령어로 새 봇 생성</li>
                  <li>봇 이름과 username 설정 후 토큰 발급</li>
                  <li>생성된 봇과 대화 시작 (또는 그룹에 추가)</li>
                  <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code>로 chat_id 확인</li>
                  <li>아래 환경변수를 <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">.env</code> 파일에 추가</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">환경변수 설정 (서버 재시작 필요)</p>
              <div className="rounded-md bg-muted p-4 font-mono text-sm">
                <p>TELEGRAM_BOT_TOKEN=your_bot_token_here</p>
                <p>TELEGRAM_CHAT_ID=your_chat_id_here</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button onClick={handleTestNotification} disabled={testing}>
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    테스트 중...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    테스트 메시지 전송
                  </>
                )}
              </Button>
              {testResult === "success" && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  연동 성공
                </Badge>
              )}
              {testResult === "error" && (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  연동 실패
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            알림 종류
          </CardTitle>
          <CardDescription>
            다음과 같은 상황에서 텔레그램 알림이 전송됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
                <span className="text-lg">📦</span>
              </div>
              <div>
                <p className="font-medium">새 발주 등록</p>
                <p className="text-sm text-muted-foreground">
                  발주가 새로 등록되면 발주번호, 채널, 수량, 금액 정보와 함께 알림
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950">
                <span className="text-lg">🔄</span>
              </div>
              <div>
                <p className="font-medium">발주 상태 변경</p>
                <p className="text-sm text-muted-foreground">
                  발주 상태가 변경되면 (확정, 진행, 완료, 취소) 알림
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950">
                <span className="text-lg">⏰</span>
              </div>
              <div>
                <p className="font-medium">만료 예정 알림</p>
                <p className="text-sm text-muted-foreground">
                  3일 내 종료되는 발주가 있으면 매일 오전 알림 (예정)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950">
                <span className="text-lg">💰</span>
              </div>
              <div>
                <p className="font-medium">정산 요약</p>
                <p className="text-sm text-muted-foreground">
                  일일 정산 요약 알림 (예정)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
