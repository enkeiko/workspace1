"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Building,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { BANK_CODES } from "@/lib/barobill";

interface CorpCheckResult {
  corpNum: string;
  corpName: string | null;
  taxType: string;
  taxTypeLabel: string;
  closedState: string;
  closedStateLabel: string;
  isActive: boolean;
}

interface BankCheckResult {
  bankCode: string;
  bankName: string;
  accountNo: string;
  accountHolder: string;
  isMatch: boolean;
}

export default function BarobillSettingsPage() {
  // 사업자 상태조회
  const [corpBusinessNo, setCorpBusinessNo] = useState("");
  const [corpLoading, setCorpLoading] = useState(false);
  const [corpResult, setCorpResult] = useState<CorpCheckResult | null>(null);
  const [corpError, setCorpError] = useState<string | null>(null);

  // 계좌 실명조회
  const [bankCode, setBankCode] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [bankLoading, setBankLoading] = useState(false);
  const [bankResult, setBankResult] = useState<BankCheckResult | null>(null);
  const [bankError, setBankError] = useState<string | null>(null);

  // 사업자 상태조회
  const handleCorpCheck = async () => {
    if (!corpBusinessNo) {
      setCorpError("사업자번호를 입력해주세요");
      return;
    }

    setCorpLoading(true);
    setCorpError(null);
    setCorpResult(null);

    try {
      const res = await fetch("/api/barobill/corp-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessNo: corpBusinessNo,
          saveResult: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "조회에 실패했습니다");
      }

      setCorpResult(data.data);
    } catch (error) {
      setCorpError(
        error instanceof Error ? error.message : "조회에 실패했습니다"
      );
    } finally {
      setCorpLoading(false);
    }
  };

  // 계좌 실명조회
  const handleBankCheck = async () => {
    if (!bankCode || !accountNo || !accountHolder) {
      setBankError("모든 항목을 입력해주세요");
      return;
    }

    setBankLoading(true);
    setBankError(null);
    setBankResult(null);

    try {
      const res = await fetch("/api/barobill/bank-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankCode,
          accountNo,
          accountHolder,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "조회에 실패했습니다");
      }

      setBankResult(data.data);
    } catch (error) {
      setBankError(
        error instanceof Error ? error.message : "조회에 실패했습니다"
      );
    } finally {
      setBankLoading(false);
    }
  };

  // 사업자번호 포맷팅
  const formatBusinessNo = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 10)}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">바로빌 API 설정</h2>
        <p className="text-muted-foreground">
          세금계산서 발행 및 사업자/계좌 조회 기능을 사용합니다.
        </p>
      </div>

      {/* API 설정 안내 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            API 연동 설정
          </CardTitle>
          <CardDescription>
            바로빌 API를 사용하려면 환경 변수를 설정해야 합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 font-mono text-sm space-y-1">
            <p># .env.local 파일에 추가</p>
            <p className="text-blue-600 dark:text-blue-400">
              BAROBILL_CERT_KEY=&quot;발급받은_인증키&quot;
            </p>
            <p className="text-blue-600 dark:text-blue-400">
              BAROBILL_CORP_NUM=&quot;사업자번호&quot;
            </p>
            <p className="text-blue-600 dark:text-blue-400">
              BAROBILL_USER_ID=&quot;바로빌_아이디&quot;
            </p>
            <p className="text-blue-600 dark:text-blue-400">
              BAROBILL_TEST_MODE=&quot;true&quot; # 테스트 환경
            </p>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            바로빌 회원가입 후 API 인증키를 발급받을 수 있습니다.{" "}
            <a
              href="https://dev.barobill.co.kr/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              바로빌 개발자센터
            </a>
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 사업자 상태조회 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              사업자 상태조회
            </CardTitle>
            <CardDescription>
              사업자번호로 휴/폐업 상태를 조회합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="corpBusinessNo">사업자번호</Label>
              <Input
                id="corpBusinessNo"
                placeholder="000-00-00000"
                value={corpBusinessNo}
                onChange={(e) =>
                  setCorpBusinessNo(formatBusinessNo(e.target.value))
                }
                maxLength={12}
              />
            </div>
            <Button
              onClick={handleCorpCheck}
              disabled={corpLoading}
              className="w-full"
            >
              {corpLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              조회하기
            </Button>

            {corpError && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <XCircle className="h-4 w-4" />
                {corpError}
              </div>
            )}

            {corpResult && (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">사업자 상태</span>
                  {corpResult.isActive ? (
                    <Badge className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      정상 영업
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      {corpResult.closedStateLabel}
                    </Badge>
                  )}
                </div>
                {corpResult.corpName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">상호명</span>
                    <span>{corpResult.corpName}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">과세유형</span>
                  <span>{corpResult.taxTypeLabel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">사업자번호</span>
                  <span className="font-mono">{formatBusinessNo(corpResult.corpNum)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 계좌 실명조회 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              계좌 실명조회
            </CardTitle>
            <CardDescription>
              계좌번호와 예금주명의 일치 여부를 확인합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bankCode">은행</Label>
              <Select value={bankCode} onValueChange={setBankCode}>
                <SelectTrigger>
                  <SelectValue placeholder="은행 선택" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BANK_CODES).map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNo">계좌번호</Label>
              <Input
                id="accountNo"
                placeholder="계좌번호 입력 (- 없이)"
                value={accountNo}
                onChange={(e) =>
                  setAccountNo(e.target.value.replace(/[^0-9]/g, ""))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountHolder">예금주명</Label>
              <Input
                id="accountHolder"
                placeholder="예금주명 입력"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
              />
            </div>
            <Button
              onClick={handleBankCheck}
              disabled={bankLoading}
              className="w-full"
            >
              {bankLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              실명조회
            </Button>

            {bankError && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <XCircle className="h-4 w-4" />
                {bankError}
              </div>
            )}

            {bankResult && (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">실명 확인 결과</span>
                  {bankResult.isMatch ? (
                    <Badge className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      일치
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      불일치
                    </Badge>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">은행</span>
                  <span>{bankResult.bankName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">계좌번호</span>
                  <span className="font-mono">{bankResult.accountNo}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">예금주</span>
                  <span>{bankResult.accountHolder}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
