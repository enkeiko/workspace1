"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Download, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";
import { KakaoSendDialog } from "@/components/kakao-send-dialog";

interface QuotationItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

interface Quotation {
  id: string;
  quotationNo: string;
  subject: string | null;
  status: string;
  totalAmount: number;
  taxAmount: number;
  validUntil: string;
  note: string | null;
  createdAt: string;
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
  createdBy: {
    name: string;
    email: string;
  };
  items: QuotationItem[];
}

export default function QuotationPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const fetchQuotation = async () => {
    try {
      const res = await fetch(`/api/quotations/${id}`);
      const data = await res.json();

      if (res.ok) {
        setQuotation(data);
      } else {
        toast.error(data.error);
        router.push("/quotations");
      }
    } catch (error) {
      console.error("Failed to fetch quotation:", error);
      toast.error("견적서 정보를 불러오는데 실패했습니다");
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
      link.download = `${quotation?.quotationNo || "quotation"}.png`;
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

  if (!quotation) return null;

  const totalWithTax = quotation.totalAmount + quotation.taxAmount;

  return (
    <div className="max-w-4xl mx-auto">
      {/* 버튼 영역 - 인쇄 시 숨김 */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Button variant="ghost" asChild>
          <Link href={`/quotations/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Link>
        </Button>
        <div className="flex gap-2">
          <KakaoSendDialog
            documentType="quotation"
            documentId={id}
            defaultPhone={quotation.customer.phone || ""}
            customerName={quotation.customer.businessName || quotation.customer.name}
          />
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

      {/* 견적서 본문 */}
      <div
        ref={printRef}
        className="bg-white p-8 border shadow-sm print:shadow-none print:border-0"
      >
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-wide">견 적 서</h1>
          <p className="text-sm text-muted-foreground mt-1">QUOTATION</p>
        </div>

        {/* 견적서 정보 */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* 수신 */}
          <div className="border p-4">
            <h3 className="font-bold mb-3 text-center bg-gray-100 py-1">수 신</h3>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 w-20 text-muted-foreground">업체명</td>
                  <td className="py-1 font-medium">
                    {quotation.customer.businessName || quotation.customer.name}
                  </td>
                </tr>
                {quotation.customer.businessNo && (
                  <tr>
                    <td className="py-1 text-muted-foreground">사업자번호</td>
                    <td className="py-1">{quotation.customer.businessNo}</td>
                  </tr>
                )}
                {quotation.customer.ceoName && (
                  <tr>
                    <td className="py-1 text-muted-foreground">대표자</td>
                    <td className="py-1">{quotation.customer.ceoName}</td>
                  </tr>
                )}
                {quotation.customer.phone && (
                  <tr>
                    <td className="py-1 text-muted-foreground">연락처</td>
                    <td className="py-1">{quotation.customer.phone}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 발신 */}
          <div className="border p-4">
            <h3 className="font-bold mb-3 text-center bg-gray-100 py-1">발 신</h3>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 w-20 text-muted-foreground">업체명</td>
                  <td className="py-1 font-medium">42먼트</td>
                </tr>
                <tr>
                  <td className="py-1 text-muted-foreground">담당자</td>
                  <td className="py-1">{quotation.createdBy.name}</td>
                </tr>
                <tr>
                  <td className="py-1 text-muted-foreground">이메일</td>
                  <td className="py-1">{quotation.createdBy.email}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 견적 개요 */}
        <div className="mb-6">
          <table className="w-full text-sm border">
            <tbody>
              <tr className="border-b">
                <td className="py-2 px-4 bg-gray-50 w-32">견적번호</td>
                <td className="py-2 px-4 font-medium">{quotation.quotationNo}</td>
                <td className="py-2 px-4 bg-gray-50 w-32">작성일</td>
                <td className="py-2 px-4">
                  {format(new Date(quotation.createdAt), "yyyy년 M월 d일", {
                    locale: ko,
                  })}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-4 bg-gray-50">유효기간</td>
                <td className="py-2 px-4">
                  {format(new Date(quotation.validUntil), "yyyy년 M월 d일", {
                    locale: ko,
                  })}
                  까지
                </td>
                <td className="py-2 px-4 bg-gray-50">합계금액</td>
                <td className="py-2 px-4 font-bold text-lg">
                  ₩ {totalWithTax.toLocaleString()}
                </td>
              </tr>
              {quotation.subject && (
                <tr>
                  <td className="py-2 px-4 bg-gray-50">제목</td>
                  <td className="py-2 px-4" colSpan={3}>
                    {quotation.subject}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 견적 항목 */}
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
              {quotation.items.map((item, index) => (
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
                  {quotation.totalAmount.toLocaleString()}원
                </td>
              </tr>
              <tr>
                <td className="py-2 px-4 bg-gray-50 border">부가세 (10%)</td>
                <td className="py-2 px-4 text-right border">
                  {quotation.taxAmount.toLocaleString()}원
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
        {quotation.note && (
          <div className="border p-4 mb-6">
            <h4 className="font-bold mb-2">비고</h4>
            <p className="text-sm whitespace-pre-wrap">{quotation.note}</p>
          </div>
        )}

        {/* 푸터 */}
        <div className="text-center text-sm text-muted-foreground border-t pt-4">
          <p>본 견적서의 유효기간은 {format(new Date(quotation.validUntil), "yyyy년 M월 d일", { locale: ko })}까지입니다.</p>
          <p className="mt-1">문의사항이 있으시면 언제든지 연락 주시기 바랍니다.</p>
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
