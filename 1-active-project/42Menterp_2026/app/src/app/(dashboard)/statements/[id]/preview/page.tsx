"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Download, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";

interface StatementItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

interface Statement {
  id: string;
  statementNo: string;
  issueDate: string;
  status: string;
  totalAmount: number;
  taxAmount: number;
  note: string | null;
  createdAt: string;
  salesOrder: {
    id: string;
    salesOrderNo: string;
    customer: {
      id: string;
      name: string;
      businessName: string | null;
      businessNo: string | null;
      ceoName: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
    };
  };
  createdBy: {
    name: string;
    email: string;
  };
  items: StatementItem[];
}

export default function StatementPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStatement();
  }, [id]);

  const fetchStatement = async () => {
    try {
      const res = await fetch(`/api/statements/${id}`);
      const data = await res.json();

      if (res.ok) {
        setStatement(data);
      } else {
        toast.error(data.error);
        router.push("/statements");
      }
    } catch (error) {
      console.error("Failed to fetch statement:", error);
      toast.error("거래명세서 정보를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = async () => {
    if (!printRef.current) return;

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      link.download = `${statement?.statementNo || "statement"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.success("이미지가 다운로드되었습니다");
    } catch (error) {
      console.error("Failed to download image:", error);
      toast.error("이미지 다운로드에 실패했습니다");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!statement) return null;

  const totalWithTax = statement.totalAmount + statement.taxAmount;
  const customer = statement.salesOrder.customer;

  return (
    <div className="max-w-4xl mx-auto">
      {/* 버튼 영역 - 인쇄 시 숨김 */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Button variant="ghost" asChild>
          <Link href={`/statements/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadImage}>
            <Download className="h-4 w-4 mr-2" />
            이미지 저장
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            인쇄
          </Button>
        </div>
      </div>

      {/* 거래명세서 본문 */}
      <div
        ref={printRef}
        className="bg-white p-8 border shadow-sm print:shadow-none print:border-0"
      >
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-wide">거 래 명 세 서</h1>
          <p className="text-sm text-muted-foreground mt-1">STATEMENT OF TRANSACTION</p>
        </div>

        {/* 거래처/공급자 정보 */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* 수신 (거래처) */}
          <div className="border p-4">
            <h3 className="font-bold mb-3 text-center bg-gray-100 py-1">공급받는자</h3>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 w-20 text-muted-foreground">상호</td>
                  <td className="py-1 font-medium">
                    {customer.businessName || customer.name}
                  </td>
                </tr>
                {customer.businessNo && (
                  <tr>
                    <td className="py-1 text-muted-foreground">사업자번호</td>
                    <td className="py-1">{customer.businessNo}</td>
                  </tr>
                )}
                {customer.ceoName && (
                  <tr>
                    <td className="py-1 text-muted-foreground">대표자</td>
                    <td className="py-1">{customer.ceoName}</td>
                  </tr>
                )}
                {customer.address && (
                  <tr>
                    <td className="py-1 text-muted-foreground">주소</td>
                    <td className="py-1">{customer.address}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 발신 (공급자) */}
          <div className="border p-4">
            <h3 className="font-bold mb-3 text-center bg-gray-100 py-1">공급자</h3>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 w-20 text-muted-foreground">상호</td>
                  <td className="py-1 font-medium">42먼트</td>
                </tr>
                <tr>
                  <td className="py-1 text-muted-foreground">담당자</td>
                  <td className="py-1">{statement.createdBy.name}</td>
                </tr>
                <tr>
                  <td className="py-1 text-muted-foreground">이메일</td>
                  <td className="py-1">{statement.createdBy.email}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 명세서 개요 */}
        <div className="mb-6">
          <table className="w-full text-sm border">
            <tbody>
              <tr className="border-b">
                <td className="py-2 px-4 bg-gray-50 w-32">명세서번호</td>
                <td className="py-2 px-4 font-medium">{statement.statementNo}</td>
                <td className="py-2 px-4 bg-gray-50 w-32">발행일</td>
                <td className="py-2 px-4">
                  {format(new Date(statement.issueDate), "yyyy년 M월 d일", {
                    locale: ko,
                  })}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-4 bg-gray-50">수주번호</td>
                <td className="py-2 px-4">{statement.salesOrder.salesOrderNo}</td>
                <td className="py-2 px-4 bg-gray-50">합계금액</td>
                <td className="py-2 px-4 font-bold text-lg">
                  ₩ {totalWithTax.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 명세 항목 */}
        <div className="mb-6">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-3 border text-center w-12">No</th>
                <th className="py-2 px-3 border text-left">품목명</th>
                <th className="py-2 px-3 border text-center w-20">수량</th>
                <th className="py-2 px-3 border text-right w-28">단가</th>
                <th className="py-2 px-3 border text-right w-32">금액</th>
              </tr>
            </thead>
            <tbody>
              {statement.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="py-2 px-3 border text-center">{index + 1}</td>
                  <td className="py-2 px-3 border">{item.description}</td>
                  <td className="py-2 px-3 border text-center">{item.qty}</td>
                  <td className="py-2 px-3 border text-right">
                    {item.unitPrice.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 border text-right">
                    {item.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 합계 */}
        <div className="flex justify-end mb-6">
          <table className="w-64 text-sm border">
            <tbody>
              <tr>
                <td className="py-2 px-4 bg-gray-50 border">공급가액</td>
                <td className="py-2 px-4 text-right border">
                  {statement.totalAmount.toLocaleString()}원
                </td>
              </tr>
              <tr>
                <td className="py-2 px-4 bg-gray-50 border">부가세 (10%)</td>
                <td className="py-2 px-4 text-right border">
                  {statement.taxAmount.toLocaleString()}원
                </td>
              </tr>
              <tr>
                <td className="py-2 px-4 bg-gray-100 border font-bold">합계</td>
                <td className="py-2 px-4 text-right border font-bold text-lg">
                  {totalWithTax.toLocaleString()}원
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 비고 */}
        {statement.note && (
          <div className="border p-4 mb-6">
            <h4 className="font-bold mb-2">비고</h4>
            <p className="text-sm whitespace-pre-wrap">{statement.note}</p>
          </div>
        )}

        {/* 푸터 */}
        <div className="text-center text-sm text-muted-foreground border-t pt-4">
          <p>위와 같이 거래 내역을 명세합니다.</p>
          <p className="mt-2 font-medium">{format(new Date(statement.issueDate), "yyyy년 M월 d일", { locale: ko })}</p>
        </div>
      </div>

      {/* 인쇄 스타일 */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #__next {
            padding: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          [data-print="true"],
          [data-print="true"] * {
            visibility: visible;
          }
          [data-print="true"] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
