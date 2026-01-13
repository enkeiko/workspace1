"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  XCircle,
  Database,
  Key,
  FileSpreadsheet,
  Building2,
  Search,
  Loader2,
  AlertCircle,
  Bell,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface BusinessCheck {
  id: string;
  businessNo: string;
  businessName: string | null;
  status: "ACTIVE" | "CLOSED" | "SUSPENDED" | "UNKNOWN";
  checkedAt: string;
  checkedBy: { id: string; name: string };
}

const statusMap: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "정상 영업", color: "text-green-600" },
  CLOSED: { label: "폐업", color: "text-red-600" },
  SUSPENDED: { label: "휴업", color: "text-yellow-600" },
  UNKNOWN: { label: "확인 불가", color: "text-gray-600" },
};

export default function SettingsPage() {
  const [businessNo, setBusinessNo] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<BusinessCheck | null>(null);
  const [recentChecks, setRecentChecks] = useState<BusinessCheck[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchRecentChecks();
  }, []);

  const fetchRecentChecks = async () => {
    try {
      const res = await fetch("/api/business-check?limit=10");
      if (res.ok) {
        const data = await res.json();
        setRecentChecks(data.checks || []);
      }
    } catch (error) {
      console.error("Failed to fetch recent checks:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCheck = async () => {
    if (!businessNo || businessNo.length !== 10) {
      alert("사업자등록번호 10자리를 입력해주세요");
      return;
    }

    try {
      setChecking(true);
      setCheckResult(null);

      const res = await fetch("/api/business-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessNo: businessNo.replace(/-/g, "") }),
      });

      if (res.ok) {
        const result = await res.json();
        setCheckResult(result);
        fetchRecentChecks();
      } else {
        const error = await res.json();
        alert(error.error || "조회에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to check business:", error);
      alert("사업자 상태 조회에 실패했습니다");
    } finally {
      setChecking(false);
    }
  };

  const formatBusinessNo = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 10);
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5)}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">시스템 설정</h2>
        <p className="text-muted-foreground">
          시스템 환경 설정 및 연동 상태를 확인하세요.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              데이터베이스
            </CardTitle>
            <CardDescription>Supabase PostgreSQL 연결 상태</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>연결됨</span>
              <Badge variant="outline">Supabase</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              인증
            </CardTitle>
            <CardDescription>NextAuth.js 세션 관리</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>활성화됨</span>
              <Badge variant="outline">Credentials Provider</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Google Sheets 연동
            </CardTitle>
            <CardDescription>발주서 자동 출력을 위한 API 연결</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>설정됨</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-yellow-600" />
                    <span className="text-muted-foreground">환경변수 설정 필요</span>
                  </>
                )}
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>필요한 환경변수:</p>
                <ul className="list-disc list-inside text-xs">
                  <li>GOOGLE_SERVICE_ACCOUNT_EMAIL</li>
                  <li>GOOGLE_PRIVATE_KEY</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>시스템 정보</CardTitle>
            <CardDescription>42ment ERP 버전 정보</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">버전</dt>
                <dd>2.0.0 (Phase 2)</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">프레임워크</dt>
                <dd>Next.js 14</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">ORM</dt>
                <dd>Prisma</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">데이터베이스</dt>
                <dd>PostgreSQL</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              텔레그램 알림
            </CardTitle>
            <CardDescription>실시간 알림 연동 설정</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {process.env.TELEGRAM_BOT_TOKEN ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>설정됨</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-yellow-600" />
                    <span className="text-muted-foreground">설정 필요</span>
                  </>
                )}
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings/telegram">
                  설정하기 <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 사업자 상태 조회 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            사업자 상태 조회
          </CardTitle>
          <CardDescription>
            사업자등록번호로 영업 상태를 확인합니다 (국세청 API 연동)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="businessNo" className="sr-only">
                  사업자등록번호
                </Label>
                <Input
                  id="businessNo"
                  type="text"
                  placeholder="사업자등록번호 (000-00-00000)"
                  value={formatBusinessNo(businessNo)}
                  onChange={(e) => setBusinessNo(e.target.value.replace(/\D/g, ""))}
                  maxLength={12}
                />
              </div>
              <Button onClick={handleCheck} disabled={checking || businessNo.length !== 10}>
                {checking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-2">조회</span>
              </Button>
            </div>

            {/* 조회 결과 */}
            {checkResult && (
              <div className="p-4 border rounded-lg bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {checkResult.businessNo.replace(/(\d{3})(\d{2})(\d{5})/, "$1-$2-$3")}
                    </p>
                    {checkResult.businessName && (
                      <p className="text-sm text-muted-foreground">{checkResult.businessName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {checkResult.status === "ACTIVE" ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : checkResult.status === "UNKNOWN" ? (
                      <AlertCircle className="h-5 w-5 text-gray-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className={`font-medium ${statusMap[checkResult.status]?.color}`}>
                      {statusMap[checkResult.status]?.label}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 최근 조회 기록 */}
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-3">최근 조회 기록</h4>
              {loadingHistory ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : recentChecks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  조회 기록이 없습니다
                </p>
              ) : (
                <div className="space-y-2">
                  {recentChecks.map((check) => (
                    <div
                      key={check.id}
                      className="flex items-center justify-between p-2 border rounded text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono">
                          {check.businessNo.replace(/(\d{3})(\d{2})(\d{5})/, "$1-$2-$3")}
                        </span>
                        <Badge
                          variant={check.status === "ACTIVE" ? "default" : "secondary"}
                          className={statusMap[check.status]?.color}
                        >
                          {statusMap[check.status]?.label}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {format(new Date(check.checkedAt), "M/d HH:mm", { locale: ko })} ·{" "}
                        {check.checkedBy.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
