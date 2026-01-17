"use client";

import * as React from "react";
import {
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle2,
  FileText,
  ExternalLink,
  Download,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface KeywordData {
  keyword: string;
  storeName: string;
  targetRank: number | null;
  currentRank: number | null;
  rankings: Array<{ date: string; rank: number | null }>;
  status: string;
  proofUrl: string | null;
  thumbnailUrl: string | null;
  completedDays: number;
  totalDays: number;
}

interface ReportData {
  title: string;
  description: string | null;
  showPricing: boolean;
  customerName: string;
  salesOrderNo: string;
  summary: {
    totalKeywords: number;
    completedCount: number;
    completionRate: number;
    avgRank: number;
  };
  keywords: KeywordData[];
  totalAmount: number | null;
}

interface ClientReportViewProps {
  data: ReportData;
  token: string;
}

export function ClientReportView({ data, token }: ClientReportViewProps) {
  // PDF 다운로드 (간이 버전 - 브라우저 인쇄 기능)
  const handlePrintPDF = () => {
    window.print();
  };

  // 금액 포맷
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // 순위 색상
  const getRankColor = (rank: number | null, target: number | null) => {
    if (rank === null) return "text-gray-400";
    if (target && rank <= target) return "text-green-600";
    if (target && rank <= target + 5) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white print:py-0">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-start justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{data.title}</h1>
            {data.description && (
              <p className="text-gray-600 mt-1">{data.description}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              {data.customerName} · {data.salesOrderNo}
            </p>
          </div>
          <Button variant="outline" onClick={handlePrintPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF 저장
          </Button>
        </div>

        {/* 인쇄용 헤더 */}
        <div className="hidden print:block">
          <h1 className="text-2xl font-bold">{data.title}</h1>
          <p className="text-gray-600">
            {data.customerName} · {data.salesOrderNo}
          </p>
        </div>

        {/* 요약 카드 */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                총 키워드
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.summary.totalKeywords}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                완료율
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {data.summary.completionRate}%
              </div>
              <Progress value={data.summary.completionRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                평균 순위
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">{data.summary.avgRank}</span>
                <span className="text-gray-500">위</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 금액 (옵션) */}
        {data.showPricing && data.totalAmount && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                계약 금액
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data.totalAmount)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 키워드별 상세 */}
        <Card>
          <CardHeader>
            <CardTitle>키워드별 성과</CardTitle>
            <CardDescription>
              각 키워드의 현재 순위와 작업 현황을 확인하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.keywords.map((kw, idx) => (
              <div
                key={idx}
                className="border rounded-lg p-4 space-y-3 print:break-inside-avoid"
              >
                {/* 키워드 헤더 */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{kw.keyword}</span>
                      {kw.status === "COMPLETED" ? (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          완료
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          진행중
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{kw.storeName}</p>
                  </div>

                  {/* 순위 표시 */}
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <span
                        className={cn(
                          "text-2xl font-bold",
                          getRankColor(kw.currentRank, kw.targetRank)
                        )}
                      >
                        {kw.currentRank || "-"}
                      </span>
                      <span className="text-gray-500">위</span>
                    </div>
                    {kw.targetRank && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Target className="h-3 w-3" />
                        <span>목표 {kw.targetRank}위</span>
                        {kw.currentRank && kw.currentRank <= kw.targetRank ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 순위 그래프 (간이) */}
                {kw.rankings.length > 0 && (
                  <div className="h-16 flex items-end gap-1">
                    {kw.rankings.slice(0, 14).reverse().map((r, i) => {
                      const maxRank = Math.max(
                        ...kw.rankings.map((x) => x.rank || 100)
                      );
                      const height = r.rank
                        ? ((maxRank - r.rank + 1) / maxRank) * 100
                        : 0;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex-1 rounded-t transition-all",
                            r.rank && kw.targetRank && r.rank <= kw.targetRank
                              ? "bg-green-400"
                              : "bg-gray-300"
                          )}
                          style={{ height: `${Math.max(height, 5)}%` }}
                          title={`${r.date}: ${r.rank || "-"}위`}
                        />
                      );
                    })}
                  </div>
                )}

                {/* 진행률 */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    작업 진행: {kw.completedDays}/{kw.totalDays}일
                  </span>
                  <Progress
                    value={(kw.completedDays / kw.totalDays) * 100}
                    className="w-32"
                  />
                </div>

                {/* 증빙 링크 */}
                {kw.proofUrl && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    {kw.thumbnailUrl && (
                      <img
                        src={kw.thumbnailUrl}
                        alt="작업 증빙"
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <a
                      href={kw.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      작업 증빙 보기
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            ))}

            {data.keywords.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                등록된 키워드가 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* 푸터 */}
        <div className="text-center text-sm text-gray-400 print:hidden">
          <p>이 리포트는 자동 생성되었습니다</p>
          <p>문의사항은 담당자에게 연락해 주세요</p>
        </div>
      </div>

      {/* 인쇄 스타일 */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
