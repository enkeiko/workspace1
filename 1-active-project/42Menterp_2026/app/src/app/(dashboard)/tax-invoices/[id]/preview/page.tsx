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

interface TaxInvoice {
  id: string;
  type: string;
  taxType: string;
  status: string;
  issueDate: string;
  ntsConfirmNo: string | null;
  supplierBusinessNo: string;
  supplierName: string;
  supplierCeoName: string | null;
  supplierAddr: string | null;
  receiverBusinessNo: string;
  receiverName: string;
  receiverCeoName: string | null;
  receiverAddr: string | null;
  receiverEmail: string | null;
  supplyAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export default function TaxInvoicePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [taxInvoice, setTaxInvoice] = useState<TaxInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTaxInvoice();
  }, [id]);

  const fetchTaxInvoice = async () => {
    try {
      const res = await fetch(`/api/tax-invoices/${id}`);
      const data = await res.json();

      if (res.ok) {
        setTaxInvoice(data);
      } else {
        toast.error(data.error);
        router.push("/tax-invoices");
      }
    } catch (error) {
      console.error("Failed to fetch tax invoice:", error);
      toast.error("세금계산서 정보를 불러오는데 실패했습니다");
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
      link.download = `tax-invoice-${taxInvoice?.ntsConfirmNo || id}.png`;
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

  if (!taxInvoice) return null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* 버튼 영역 - 인쇄 시 숨김 */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Button variant="ghost" asChild>
          <Link href={`/tax-invoices`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Link>
        </Button>
        <div className="flex gap-2">
          <KakaoSendDialog
            documentType="tax-invoice"
            documentId={id}
            customerName={taxInvoice.receiverName}
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

      {/* 세금계산서 본문 */}
      <div
        ref={printRef}
        className="bg-white p-8 border shadow-sm print:shadow-none print:border-0"
      >
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-wide">세 금 계 산 서</h1>
          <p className="text-sm text-muted-foreground mt-1">TAX INVOICE</p>
        </div>

        {/* 국세청 승인번호 */}
        {taxInvoice.ntsConfirmNo && (
          <div className="text-center bg-gray-50 py-3 mb-6 border">
            <span className="text-sm">국세청 승인번호: </span>
            <span className="font-bold text-blue-600">{taxInvoice.ntsConfirmNo}</span>
          </div>
        )}

        {/* 공급자/공급받는자 정보 */}
        <div className="grid grid-cols-2 gap-0 mb-6 border">
          {/* 공급자 */}
          <div className="border-r">
            <div className="bg-gray-800 text-white text-center py-2 font-bold">
              공급자
            </div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-3 bg-gray-50 w-24">사업자번호</td>
                  <td className="py-2 px-3">{taxInvoice.supplierBusinessNo}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-3 bg-gray-50">상호</td>
                  <td className="py-2 px-3 font-medium">{taxInvoice.supplierName}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-3 bg-gray-50">대표자</td>
                  <td className="py-2 px-3">{taxInvoice.supplierCeoName || "-"}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 bg-gray-50">주소</td>
                  <td className="py-2 px-3">{taxInvoice.supplierAddr || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 공급받는자 */}
          <div>
            <div className="bg-gray-800 text-white text-center py-2 font-bold">
              공급받는자
            </div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-3 bg-gray-50 w-24">사업자번호</td>
                  <td className="py-2 px-3">{taxInvoice.receiverBusinessNo}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-3 bg-gray-50">상호</td>
                  <td className="py-2 px-3 font-medium">{taxInvoice.receiverName}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-3 bg-gray-50">대표자</td>
                  <td className="py-2 px-3">{taxInvoice.receiverCeoName || "-"}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 bg-gray-50">주소</td>
                  <td className="py-2 px-3">{taxInvoice.receiverAddr || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 금액 섹션 */}
        <div className="grid grid-cols-3 gap-0 border mb-6">
          <div className="p-4 text-center border-r">
            <div className="text-sm text-muted-foreground mb-1">공급가액</div>
            <div className="text-xl font-bold">
              {taxInvoice.supplyAmount.toLocaleString()}원
            </div>
          </div>
          <div className="p-4 text-center border-r">
            <div className="text-sm text-muted-foreground mb-1">부가세</div>
            <div className="text-xl font-bold">
              {taxInvoice.taxAmount.toLocaleString()}원
            </div>
          </div>
          <div className="p-4 text-center bg-gray-50">
            <div className="text-sm text-muted-foreground mb-1">합계금액</div>
            <div className="text-xl font-bold text-blue-600">
              {taxInvoice.totalAmount.toLocaleString()}원
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="text-center text-sm text-muted-foreground border-t pt-4">
          <p>
            발행일:{" "}
            {format(new Date(taxInvoice.issueDate), "yyyy년 M월 d일", {
              locale: ko,
            })}
          </p>
          <p className="mt-2">위 금액을 청구합니다.</p>
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
