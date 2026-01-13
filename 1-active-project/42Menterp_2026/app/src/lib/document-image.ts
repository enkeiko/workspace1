/**
 * 문서 이미지 생성 서비스
 *
 * HTML 템플릿을 이미지(PNG)로 변환
 */

import puppeteer, { Browser } from "puppeteer";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  }
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

interface QuotationData {
  quotationNo: string;
  subject?: string;
  totalAmount: number;
  taxAmount: number;
  validUntil: string;
  note?: string;
  createdAt: string;
  customer: {
    name: string;
    businessName?: string;
    businessNo?: string;
    ceoName?: string;
    phone?: string;
    address?: string;
  };
  createdBy: {
    name: string;
    email: string;
  };
  items: Array<{
    description: string;
    qty: number;
    unitPrice: number;
    amount: number;
  }>;
}

interface StatementData {
  statementNo: string;
  issueDate: string;
  totalAmount: number;
  taxAmount: number;
  note?: string;
  customer: {
    name: string;
    businessName?: string;
    businessNo?: string;
    ceoName?: string;
    address?: string;
  };
  salesOrderNo: string;
  createdBy: {
    name: string;
    email: string;
  };
  items: Array<{
    description: string;
    qty: number;
    unitPrice: number;
    amount: number;
  }>;
}

interface TaxInvoiceData {
  ntsConfirmNo?: string;
  issueDate: string;
  supplierName: string;
  supplierBusinessNo: string;
  supplierCeoName?: string;
  supplierAddr?: string;
  receiverName: string;
  receiverBusinessNo: string;
  receiverCeoName?: string;
  receiverAddr?: string;
  supplyAmount: number;
  taxAmount: number;
  totalAmount: number;
}

function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "yyyy년 M월 d일", { locale: ko });
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

// 공통 스타일
const commonStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
  }
  body {
    background: white;
    padding: 40px;
    width: 800px;
  }
  .header {
    text-align: center;
    margin-bottom: 30px;
  }
  .header h1 {
    font-size: 28px;
    font-weight: bold;
    letter-spacing: 8px;
  }
  .header .subtitle {
    font-size: 12px;
    color: #666;
    margin-top: 4px;
  }
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 30px;
  }
  .info-box {
    border: 1px solid #333;
    padding: 15px;
  }
  .info-box h3 {
    background: #f5f5f5;
    padding: 8px;
    text-align: center;
    font-size: 14px;
    margin-bottom: 12px;
  }
  .info-box table {
    width: 100%;
    font-size: 13px;
  }
  .info-box td {
    padding: 4px 0;
  }
  .info-box td:first-child {
    color: #666;
    width: 70px;
  }
  .summary-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
    font-size: 13px;
  }
  .summary-table td {
    padding: 10px 15px;
    border: 1px solid #ddd;
  }
  .summary-table td.label {
    background: #f9f9f9;
    width: 100px;
  }
  .summary-table td.highlight {
    font-size: 18px;
    font-weight: bold;
  }
  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
    font-size: 13px;
  }
  .items-table th {
    background: #f0f0f0;
    padding: 10px;
    border: 1px solid #ddd;
    font-weight: bold;
  }
  .items-table td {
    padding: 10px;
    border: 1px solid #ddd;
  }
  .items-table .center { text-align: center; }
  .items-table .right { text-align: right; }
  .totals-table {
    width: 250px;
    margin-left: auto;
    border-collapse: collapse;
    font-size: 13px;
    margin-bottom: 20px;
  }
  .totals-table td {
    padding: 8px 12px;
    border: 1px solid #ddd;
  }
  .totals-table td:first-child {
    background: #f9f9f9;
  }
  .totals-table .total-row td {
    background: #f0f0f0;
    font-weight: bold;
    font-size: 16px;
  }
  .note-box {
    border: 1px solid #ddd;
    padding: 15px;
    margin-bottom: 20px;
  }
  .note-box h4 {
    font-size: 14px;
    margin-bottom: 8px;
  }
  .note-box p {
    font-size: 13px;
    white-space: pre-wrap;
  }
  .footer {
    text-align: center;
    font-size: 12px;
    color: #666;
    border-top: 1px solid #ddd;
    padding-top: 20px;
  }
`;

// 견적서 HTML 생성
function generateQuotationHtml(data: QuotationData): string {
  const totalWithTax = data.totalAmount + data.taxAmount;
  const itemRows = data.items
    .map(
      (item, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td>${item.description}</td>
      <td class="center">${item.qty}</td>
      <td class="right">${formatNumber(item.unitPrice)}</td>
      <td class="right">${formatNumber(item.amount)}</td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${commonStyles}</style>
</head>
<body>
  <div class="header">
    <h1>견 적 서</h1>
    <p class="subtitle">QUOTATION</p>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>수 신</h3>
      <table>
        <tr>
          <td>업체명</td>
          <td><strong>${data.customer.businessName || data.customer.name}</strong></td>
        </tr>
        ${data.customer.businessNo ? `<tr><td>사업자번호</td><td>${data.customer.businessNo}</td></tr>` : ""}
        ${data.customer.ceoName ? `<tr><td>대표자</td><td>${data.customer.ceoName}</td></tr>` : ""}
        ${data.customer.phone ? `<tr><td>연락처</td><td>${data.customer.phone}</td></tr>` : ""}
      </table>
    </div>

    <div class="info-box">
      <h3>발 신</h3>
      <table>
        <tr>
          <td>업체명</td>
          <td><strong>42먼트</strong></td>
        </tr>
        <tr>
          <td>담당자</td>
          <td>${data.createdBy.name}</td>
        </tr>
        <tr>
          <td>이메일</td>
          <td>${data.createdBy.email}</td>
        </tr>
      </table>
    </div>
  </div>

  <table class="summary-table">
    <tr>
      <td class="label">견적번호</td>
      <td><strong>${data.quotationNo}</strong></td>
      <td class="label">작성일</td>
      <td>${formatDate(data.createdAt)}</td>
    </tr>
    <tr>
      <td class="label">유효기간</td>
      <td>${formatDate(data.validUntil)}까지</td>
      <td class="label">합계금액</td>
      <td class="highlight">₩ ${formatNumber(totalWithTax)}</td>
    </tr>
    ${data.subject ? `<tr><td class="label">제목</td><td colspan="3">${data.subject}</td></tr>` : ""}
  </table>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width:50px">No</th>
        <th>품목명</th>
        <th style="width:70px">수량</th>
        <th style="width:100px">단가</th>
        <th style="width:120px">금액</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <table class="totals-table">
    <tr>
      <td>공급가액</td>
      <td class="right">${formatNumber(data.totalAmount)}원</td>
    </tr>
    <tr>
      <td>부가세 (10%)</td>
      <td class="right">${formatNumber(data.taxAmount)}원</td>
    </tr>
    <tr class="total-row">
      <td>합계</td>
      <td class="right">${formatNumber(totalWithTax)}원</td>
    </tr>
  </table>

  ${data.note ? `<div class="note-box"><h4>비고</h4><p>${data.note}</p></div>` : ""}

  <div class="footer">
    <p>본 견적서의 유효기간은 ${formatDate(data.validUntil)}까지입니다.</p>
    <p>문의사항이 있으시면 언제든지 연락 주시기 바랍니다.</p>
  </div>
</body>
</html>`;
}

// 거래명세서 HTML 생성
function generateStatementHtml(data: StatementData): string {
  const totalWithTax = data.totalAmount + data.taxAmount;
  const itemRows = data.items
    .map(
      (item, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td>${item.description}</td>
      <td class="center">${item.qty}</td>
      <td class="right">${formatNumber(item.unitPrice)}</td>
      <td class="right">${formatNumber(item.amount)}</td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${commonStyles}</style>
</head>
<body>
  <div class="header">
    <h1>거 래 명 세 서</h1>
    <p class="subtitle">STATEMENT OF TRANSACTION</p>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>공급받는자</h3>
      <table>
        <tr>
          <td>상호</td>
          <td><strong>${data.customer.businessName || data.customer.name}</strong></td>
        </tr>
        ${data.customer.businessNo ? `<tr><td>사업자번호</td><td>${data.customer.businessNo}</td></tr>` : ""}
        ${data.customer.ceoName ? `<tr><td>대표자</td><td>${data.customer.ceoName}</td></tr>` : ""}
        ${data.customer.address ? `<tr><td>주소</td><td>${data.customer.address}</td></tr>` : ""}
      </table>
    </div>

    <div class="info-box">
      <h3>공급자</h3>
      <table>
        <tr>
          <td>상호</td>
          <td><strong>42먼트</strong></td>
        </tr>
        <tr>
          <td>담당자</td>
          <td>${data.createdBy.name}</td>
        </tr>
        <tr>
          <td>이메일</td>
          <td>${data.createdBy.email}</td>
        </tr>
      </table>
    </div>
  </div>

  <table class="summary-table">
    <tr>
      <td class="label">명세서번호</td>
      <td><strong>${data.statementNo}</strong></td>
      <td class="label">발행일</td>
      <td>${formatDate(data.issueDate)}</td>
    </tr>
    <tr>
      <td class="label">수주번호</td>
      <td>${data.salesOrderNo}</td>
      <td class="label">합계금액</td>
      <td class="highlight">₩ ${formatNumber(totalWithTax)}</td>
    </tr>
  </table>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width:50px">No</th>
        <th>품목명</th>
        <th style="width:70px">수량</th>
        <th style="width:100px">단가</th>
        <th style="width:120px">금액</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <table class="totals-table">
    <tr>
      <td>공급가액</td>
      <td class="right">${formatNumber(data.totalAmount)}원</td>
    </tr>
    <tr>
      <td>부가세 (10%)</td>
      <td class="right">${formatNumber(data.taxAmount)}원</td>
    </tr>
    <tr class="total-row">
      <td>합계</td>
      <td class="right">${formatNumber(totalWithTax)}원</td>
    </tr>
  </table>

  ${data.note ? `<div class="note-box"><h4>비고</h4><p>${data.note}</p></div>` : ""}

  <div class="footer">
    <p>위와 같이 거래 내역을 명세합니다.</p>
    <p style="font-weight:bold; margin-top:8px;">${formatDate(data.issueDate)}</p>
  </div>
</body>
</html>`;
}

// 세금계산서 HTML 생성
function generateTaxInvoiceHtml(data: TaxInvoiceData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    ${commonStyles}
    .tax-invoice-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 20px;
    }
    .tax-invoice-table th,
    .tax-invoice-table td {
      border: 1px solid #333;
      padding: 8px;
    }
    .tax-invoice-table th {
      background: #e8e8e8;
      font-weight: bold;
      text-align: center;
    }
    .section-header {
      background: #333;
      color: white;
      text-align: center;
      font-weight: bold;
      padding: 6px;
    }
    .amount-section {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0;
      border: 1px solid #333;
      margin-bottom: 20px;
    }
    .amount-box {
      padding: 15px;
      text-align: center;
      border-right: 1px solid #333;
    }
    .amount-box:last-child {
      border-right: none;
    }
    .amount-box .label {
      font-size: 12px;
      color: #666;
      margin-bottom: 5px;
    }
    .amount-box .value {
      font-size: 20px;
      font-weight: bold;
    }
    .nts-number {
      text-align: center;
      background: #f5f5f5;
      padding: 10px;
      margin-bottom: 20px;
      font-size: 14px;
    }
    .nts-number strong {
      color: #0066cc;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>세 금 계 산 서</h1>
    <p class="subtitle">TAX INVOICE</p>
  </div>

  ${data.ntsConfirmNo ? `
  <div class="nts-number">
    국세청 승인번호: <strong>${data.ntsConfirmNo}</strong>
  </div>
  ` : ""}

  <table class="tax-invoice-table">
    <tr>
      <th colspan="4" class="section-header">공급자</th>
      <th colspan="4" class="section-header">공급받는자</th>
    </tr>
    <tr>
      <th>사업자번호</th>
      <td colspan="3">${data.supplierBusinessNo}</td>
      <th>사업자번호</th>
      <td colspan="3">${data.receiverBusinessNo}</td>
    </tr>
    <tr>
      <th>상호</th>
      <td colspan="3"><strong>${data.supplierName}</strong></td>
      <th>상호</th>
      <td colspan="3"><strong>${data.receiverName}</strong></td>
    </tr>
    <tr>
      <th>대표자</th>
      <td colspan="3">${data.supplierCeoName || "-"}</td>
      <th>대표자</th>
      <td colspan="3">${data.receiverCeoName || "-"}</td>
    </tr>
    <tr>
      <th>주소</th>
      <td colspan="3">${data.supplierAddr || "-"}</td>
      <th>주소</th>
      <td colspan="3">${data.receiverAddr || "-"}</td>
    </tr>
  </table>

  <div class="amount-section">
    <div class="amount-box">
      <div class="label">공급가액</div>
      <div class="value">${formatNumber(data.supplyAmount)}원</div>
    </div>
    <div class="amount-box">
      <div class="label">부가세</div>
      <div class="value">${formatNumber(data.taxAmount)}원</div>
    </div>
    <div class="amount-box">
      <div class="label">합계금액</div>
      <div class="value" style="color:#0066cc;">${formatNumber(data.totalAmount)}원</div>
    </div>
  </div>

  <div class="footer">
    <p>발행일: ${formatDate(data.issueDate)}</p>
    <p style="margin-top:8px;">위 금액을 청구합니다.</p>
  </div>
</body>
</html>`;
}

// HTML을 이미지로 변환
export async function generateDocumentImage(
  type: "quotation" | "statement" | "tax-invoice",
  data: QuotationData | StatementData | TaxInvoiceData
): Promise<Buffer> {
  let html: string;

  switch (type) {
    case "quotation":
      html = generateQuotationHtml(data as QuotationData);
      break;
    case "statement":
      html = generateStatementHtml(data as StatementData);
      break;
    case "tax-invoice":
      html = generateTaxInvoiceHtml(data as TaxInvoiceData);
      break;
    default:
      throw new Error(`지원하지 않는 문서 유형: ${type}`);
  }

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 800, height: 1200 });
    await page.setContent(html, { waitUntil: "networkidle0" });

    // 컨텐츠 높이에 맞게 조정
    const bodyHandle = await page.$("body");
    const boundingBox = await bodyHandle?.boundingBox();
    const height = boundingBox?.height || 1200;

    await page.setViewport({ width: 800, height: Math.ceil(height) + 80 });

    const screenshot = await page.screenshot({
      type: "png",
      fullPage: true,
    });

    return Buffer.from(screenshot);
  } finally {
    await page.close();
  }
}

export type { QuotationData, StatementData, TaxInvoiceData };
