"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileCheck, AlertCircle, Users, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface QualityReport {
  total: number;
  taxInvoiceReady: number;
  taxInvoiceNotReady: number;
  completionRate: {
    businessNo: number;
    representative: number;
    email: number;
    phone: number;
    address: number;
  };
}

export function TaxInvoiceSummary() {
  const [report, setReport] = useState<QualityReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch("/api/customers/quality-report");
        if (res.ok) {
          const data = await res.json();
          setReport(data);
        }
      } catch (error) {
        console.error("Failed to fetch quality report:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-16 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!report || report.total === 0) {
    return null;
  }

  const readyRate = Math.round((report.taxInvoiceReady / report.total) * 100);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* 전체 고객 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-blue-100 p-3">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">전체 고객</p>
              <p className="text-2xl font-bold">{report.total}개</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 세금계산서 발행 가능 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-green-100 p-3">
              <FileCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">발행 준비 완료</p>
              <p className="text-2xl font-bold">{report.taxInvoiceReady}개</p>
            </div>
          </div>
          <Progress value={readyRate} className="mt-3 h-2" />
          <p className="mt-1 text-xs text-muted-foreground text-right">
            {readyRate}%
          </p>
        </CardContent>
      </Card>

      {/* 정보 누락 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "rounded-full p-3",
                report.taxInvoiceNotReady > 0
                  ? "bg-amber-100"
                  : "bg-gray-100"
              )}
            >
              <AlertCircle
                className={cn(
                  "h-5 w-5",
                  report.taxInvoiceNotReady > 0
                    ? "text-amber-600"
                    : "text-gray-400"
                )}
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">정보 보완 필요</p>
              <p className="text-2xl font-bold">{report.taxInvoiceNotReady}개</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 이메일 입력률 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-purple-100 p-3">
              <Mail className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">이메일 입력률</p>
              <p className="text-2xl font-bold">{report.completionRate.email}%</p>
            </div>
          </div>
          <Progress value={report.completionRate.email} className="mt-3 h-2" />
        </CardContent>
      </Card>
    </div>
  );
}
