/**
 * 바로빌 API 서비스
 * https://dev.barobill.co.kr/
 *
 * 주요 기능:
 * - 세금계산서 발행/조회
 * - 사업자 상태조회
 * - 계좌 실명조회
 */

import { XMLParser, XMLBuilder } from "fast-xml-parser";

// 바로빌 API 설정
const BAROBILL_CONFIG = {
  // 테스트 환경
  TEST_URL: "https://testws.barobill.co.kr",
  // 운영 환경
  PROD_URL: "https://ws.barobill.co.kr",
  // WSDL 경로
  TAX_INVOICE_WSDL: "/BAROBILL.asmx?WSDL",
  BANK_ACCOUNT_WSDL: "/BANKACCOUNT.asmx?WSDL",
  CORP_STATE_WSDL: "/CORPSTATE.asmx?WSDL",
};

interface BarobillConfig {
  certKey: string;        // 인증키
  corpNum: string;        // 사업자번호
  userId: string;         // 바로빌 아이디
  isTest?: boolean;       // 테스트 환경 여부
}

interface TaxInvoiceItem {
  purchaseExpiryDate?: string;  // 거래일자
  itemName?: string;            // 품명
  itemSpec?: string;            // 규격
  itemQuantity?: number;        // 수량
  itemUnitCost?: number;        // 단가
  itemSupplyValue?: number;     // 공급가액
  itemTaxValue?: number;        // 세액
  itemNote?: string;            // 비고
}

interface TaxInvoiceData {
  // 공급자 정보
  invoicerCorpNum: string;           // 공급자 사업자번호
  invoicerMgtKey?: string;           // 공급자 문서번호
  invoicerCorpName: string;          // 공급자 상호
  invoicerCeoName: string;           // 공급자 대표자
  invoicerAddr?: string;             // 공급자 주소
  invoicerBizType?: string;          // 공급자 업태
  invoicerBizClass?: string;         // 공급자 종목
  invoicerEmail?: string;            // 공급자 이메일

  // 공급받는자 정보
  invoiceeCorpNum: string;           // 공급받는자 사업자번호
  invoiceeCorpName: string;          // 공급받는자 상호
  invoiceeCeoName: string;           // 공급받는자 대표자
  invoiceeAddr?: string;             // 공급받는자 주소
  invoiceeBizType?: string;          // 공급받는자 업태
  invoiceeBizClass?: string;         // 공급받는자 종목
  invoiceeEmail1?: string;           // 공급받는자 이메일1
  invoiceeEmail2?: string;           // 공급받는자 이메일2

  // 세금계산서 정보
  taxType: "TAX" | "ZERO" | "FREE";  // 과세유형 (과세/영세/면세)
  issueType: "NORMAL" | "MODIFY";    // 발행유형
  purposeType: "CHARGE" | "PROOF";   // 영수/청구
  writeDate: string;                 // 작성일자 (YYYYMMDD)
  supplyCostTotal: number;           // 공급가액 합계
  taxTotal: number;                  // 세액 합계
  totalAmount: number;               // 합계금액
  cash?: number;                     // 현금
  chkBill?: number;                  // 수표
  note?: number;                     // 어음
  credit?: number;                   // 외상미수금
  remark1?: string;                  // 비고1
  remark2?: string;                  // 비고2
  remark3?: string;                  // 비고3

  // 품목
  items?: TaxInvoiceItem[];
}

interface CorpStateResult {
  corpNum: string;
  taxType: string;          // 01:일반, 02:간이, 03:면세, 04:비과세 등
  taxTypeDate?: string;     // 과세유형 전환일
  closedState: string;      // 01:계속사업자, 02:휴업자, 03:폐업자
  closedDate?: string;      // 휴폐업일
  corpName?: string;        // 상호
  stateCode: number;        // 상태코드
  stateMessage: string;     // 상태메시지
}

interface BankAccountResult {
  bankCode: string;
  accountNo: string;
  accountHolder: string;
  matchResult: string;      // 0:불일치, 1:일치
  stateCode: number;
  stateMessage: string;
}

export class BarobillService {
  private config: BarobillConfig;
  private baseUrl: string;
  private xmlParser: XMLParser;
  private xmlBuilder: XMLBuilder;

  constructor(config: BarobillConfig) {
    this.config = config;
    this.baseUrl = config.isTest
      ? BAROBILL_CONFIG.TEST_URL
      : BAROBILL_CONFIG.PROD_URL;

    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });

    this.xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
  }

  /**
   * SOAP 요청 전송
   */
  private async sendSoapRequest(
    endpoint: string,
    action: string,
    body: string
  ): Promise<unknown> {
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    ${body}
  </soap:Body>
</soap:Envelope>`;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": action,
      },
      body: soapEnvelope,
    });

    const text = await response.text();
    return this.xmlParser.parse(text);
  }

  /**
   * 사업자번호 형식 정리 (숫자만)
   */
  private cleanCorpNum(corpNum: string): string {
    return corpNum.replace(/[^0-9]/g, "");
  }

  /**
   * 사업자 상태조회
   * @param corpNum 조회할 사업자번호
   */
  async checkCorpState(corpNum: string): Promise<CorpStateResult> {
    const cleanedCorpNum = this.cleanCorpNum(corpNum);

    const body = `
    <CheckCorpNum xmlns="http://BaroBill.com/">
      <CERTKEY>${this.config.certKey}</CERTKEY>
      <CorpNum>${this.cleanCorpNum(this.config.corpNum)}</CorpNum>
      <CheckCorpNum>${cleanedCorpNum}</CheckCorpNum>
    </CheckCorpNum>`;

    try {
      const result = await this.sendSoapRequest(
        BAROBILL_CONFIG.CORP_STATE_WSDL.replace("?WSDL", ""),
        "http://BaroBill.com/CheckCorpNum",
        body
      ) as Record<string, unknown>;

      const envelope = result["soap:Envelope"] as Record<string, unknown>;
      const soapBody = envelope["soap:Body"] as Record<string, unknown>;
      const response = soapBody["CheckCorpNumResponse"] as Record<string, unknown>;
      const checkResult = response["CheckCorpNumResult"] as Record<string, unknown>;

      return {
        corpNum: cleanedCorpNum,
        taxType: String(checkResult["TaxType"] || ""),
        taxTypeDate: String(checkResult["TaxTypeDate"] || ""),
        closedState: String(checkResult["ClosedState"] || ""),
        closedDate: String(checkResult["ClosedDate"] || ""),
        corpName: String(checkResult["CorpName"] || ""),
        stateCode: Number(checkResult["StateCode"]) || 0,
        stateMessage: String(checkResult["StateMessage"] || ""),
      };
    } catch (error) {
      console.error("사업자 상태조회 실패:", error);
      throw new Error("사업자 상태조회에 실패했습니다");
    }
  }

  /**
   * 계좌 실명조회
   * @param bankCode 은행코드
   * @param accountNo 계좌번호
   * @param accountHolder 예금주명
   */
  async checkBankAccount(
    bankCode: string,
    accountNo: string,
    accountHolder: string
  ): Promise<BankAccountResult> {
    const body = `
    <CheckAccountInfo xmlns="http://BaroBill.com/">
      <CERTKEY>${this.config.certKey}</CERTKEY>
      <CorpNum>${this.cleanCorpNum(this.config.corpNum)}</CorpNum>
      <BankCode>${bankCode}</BankCode>
      <AccountNo>${accountNo.replace(/[^0-9]/g, "")}</AccountNo>
      <AccountHolder>${accountHolder}</AccountHolder>
    </CheckAccountInfo>`;

    try {
      const result = await this.sendSoapRequest(
        BAROBILL_CONFIG.BANK_ACCOUNT_WSDL.replace("?WSDL", ""),
        "http://BaroBill.com/CheckAccountInfo",
        body
      ) as Record<string, unknown>;

      const envelope = result["soap:Envelope"] as Record<string, unknown>;
      const soapBody = envelope["soap:Body"] as Record<string, unknown>;
      const response = soapBody["CheckAccountInfoResponse"] as Record<string, unknown>;
      const checkResult = response["CheckAccountInfoResult"] as Record<string, unknown>;

      return {
        bankCode,
        accountNo,
        accountHolder,
        matchResult: String(checkResult["MatchResult"] || ""),
        stateCode: Number(checkResult["StateCode"]) || 0,
        stateMessage: String(checkResult["StateMessage"] || ""),
      };
    } catch (error) {
      console.error("계좌 실명조회 실패:", error);
      throw new Error("계좌 실명조회에 실패했습니다");
    }
  }

  /**
   * 세금계산서 발행
   */
  async issueTaxInvoice(data: TaxInvoiceData): Promise<{
    ntsConfirmNum: string;
    invoiceId: string;
    stateCode: number;
    stateMessage: string;
  }> {
    // 품목 XML 생성
    const itemsXml = (data.items || []).map((item, index) => `
      <TaxInvoiceTradeLineItem>
        <PurchaseExpiryDate>${item.purchaseExpiryDate || data.writeDate}</PurchaseExpiryDate>
        <Name>${item.itemName || ""}</Name>
        <Specification>${item.itemSpec || ""}</Specification>
        <Quantity>${item.itemQuantity || 1}</Quantity>
        <UnitCost>${item.itemUnitCost || 0}</UnitCost>
        <SupplyValue>${item.itemSupplyValue || 0}</SupplyValue>
        <TaxValue>${item.itemTaxValue || 0}</TaxValue>
        <Note>${item.itemNote || ""}</Note>
        <SerialNum>${index + 1}</SerialNum>
      </TaxInvoiceTradeLineItem>
    `).join("");

    const body = `
    <RegistAndIssueTaxInvoice xmlns="http://BaroBill.com/">
      <CERTKEY>${this.config.certKey}</CERTKEY>
      <CorpNum>${this.cleanCorpNum(this.config.corpNum)}</CorpNum>
      <TaxInvoice>
        <InvoicerCorpNum>${this.cleanCorpNum(data.invoicerCorpNum)}</InvoicerCorpNum>
        <InvoicerMgtKey>${data.invoicerMgtKey || ""}</InvoicerMgtKey>
        <InvoicerCorpName>${data.invoicerCorpName}</InvoicerCorpName>
        <InvoicerCEOName>${data.invoicerCeoName}</InvoicerCEOName>
        <InvoicerAddr>${data.invoicerAddr || ""}</InvoicerAddr>
        <InvoicerBizType>${data.invoicerBizType || ""}</InvoicerBizType>
        <InvoicerBizClass>${data.invoicerBizClass || ""}</InvoicerBizClass>
        <InvoicerEmail>${data.invoicerEmail || ""}</InvoicerEmail>

        <InvoiceeCorpNum>${this.cleanCorpNum(data.invoiceeCorpNum)}</InvoiceeCorpNum>
        <InvoiceeCorpName>${data.invoiceeCorpName}</InvoiceeCorpName>
        <InvoiceeCEOName>${data.invoiceeCeoName}</InvoiceeCEOName>
        <InvoiceeAddr>${data.invoiceeAddr || ""}</InvoiceeAddr>
        <InvoiceeBizType>${data.invoiceeBizType || ""}</InvoiceeBizType>
        <InvoiceeBizClass>${data.invoiceeBizClass || ""}</InvoiceeBizClass>
        <InvoiceeEmail1>${data.invoiceeEmail1 || ""}</InvoiceeEmail1>
        <InvoiceeEmail2>${data.invoiceeEmail2 || ""}</InvoiceeEmail2>

        <TaxType>${data.taxType === "TAX" ? "01" : data.taxType === "ZERO" ? "02" : "03"}</TaxType>
        <IssueType>${data.issueType === "NORMAL" ? "01" : "02"}</IssueType>
        <PurposeType>${data.purposeType === "CHARGE" ? "01" : "02"}</PurposeType>
        <WriteDate>${data.writeDate}</WriteDate>
        <SupplyCostTotal>${data.supplyCostTotal}</SupplyCostTotal>
        <TaxTotal>${data.taxTotal}</TaxTotal>
        <TotalAmount>${data.totalAmount}</TotalAmount>
        <Cash>${data.cash || 0}</Cash>
        <ChkBill>${data.chkBill || 0}</ChkBill>
        <Note>${data.note || 0}</Note>
        <Credit>${data.credit || 0}</Credit>
        <Remark1>${data.remark1 || ""}</Remark1>
        <Remark2>${data.remark2 || ""}</Remark2>
        <Remark3>${data.remark3 || ""}</Remark3>

        <TaxInvoiceTradeLineItems>
          ${itemsXml}
        </TaxInvoiceTradeLineItems>
      </TaxInvoice>
      <SendSMS>false</SendSMS>
    </RegistAndIssueTaxInvoice>`;

    try {
      const result = await this.sendSoapRequest(
        BAROBILL_CONFIG.TAX_INVOICE_WSDL.replace("?WSDL", ""),
        "http://BaroBill.com/RegistAndIssueTaxInvoice",
        body
      ) as Record<string, unknown>;

      const envelope = result["soap:Envelope"] as Record<string, unknown>;
      const soapBody = envelope["soap:Body"] as Record<string, unknown>;
      const response = soapBody["RegistAndIssueTaxInvoiceResponse"] as Record<string, unknown>;
      const issueResult = response["RegistAndIssueTaxInvoiceResult"] as Record<string, unknown>;

      return {
        ntsConfirmNum: String(issueResult["NTSConfirmNum"] || ""),
        invoiceId: String(issueResult["InvoiceId"] || ""),
        stateCode: Number(issueResult["StateCode"]) || 0,
        stateMessage: String(issueResult["StateMessage"] || ""),
      };
    } catch (error) {
      console.error("세금계산서 발행 실패:", error);
      throw new Error("세금계산서 발행에 실패했습니다");
    }
  }

  /**
   * 세금계산서 상태 조회
   */
  async getTaxInvoiceState(
    invoicerCorpNum: string,
    mgtKey: string
  ): Promise<{
    ntsConfirmNum: string;
    stateCode: number;
    stateDT: string;
    stateMessage: string;
  }> {
    const body = `
    <GetTaxInvoiceState xmlns="http://BaroBill.com/">
      <CERTKEY>${this.config.certKey}</CERTKEY>
      <CorpNum>${this.cleanCorpNum(this.config.corpNum)}</CorpNum>
      <InvoicerCorpNum>${this.cleanCorpNum(invoicerCorpNum)}</InvoicerCorpNum>
      <MgtKey>${mgtKey}</MgtKey>
    </GetTaxInvoiceState>`;

    try {
      const result = await this.sendSoapRequest(
        BAROBILL_CONFIG.TAX_INVOICE_WSDL.replace("?WSDL", ""),
        "http://BaroBill.com/GetTaxInvoiceState",
        body
      ) as Record<string, unknown>;

      const envelope = result["soap:Envelope"] as Record<string, unknown>;
      const soapBody = envelope["soap:Body"] as Record<string, unknown>;
      const response = soapBody["GetTaxInvoiceStateResponse"] as Record<string, unknown>;
      const stateResult = response["GetTaxInvoiceStateResult"] as Record<string, unknown>;

      return {
        ntsConfirmNum: String(stateResult["NTSConfirmNum"] || ""),
        stateCode: Number(stateResult["StateCode"]) || 0,
        stateDT: String(stateResult["StateDT"] || ""),
        stateMessage: String(stateResult["StateMessage"] || ""),
      };
    } catch (error) {
      console.error("세금계산서 상태조회 실패:", error);
      throw new Error("세금계산서 상태조회에 실패했습니다");
    }
  }

  /**
   * 세금계산서 PDF 다운로드 URL 조회
   */
  async getTaxInvoicePDFURL(
    invoicerCorpNum: string,
    mgtKey: string
  ): Promise<string> {
    const body = `
    <GetTaxInvoicePDFURL xmlns="http://BaroBill.com/">
      <CERTKEY>${this.config.certKey}</CERTKEY>
      <CorpNum>${this.cleanCorpNum(this.config.corpNum)}</CorpNum>
      <InvoicerCorpNum>${this.cleanCorpNum(invoicerCorpNum)}</InvoicerCorpNum>
      <MgtKey>${mgtKey}</MgtKey>
    </GetTaxInvoicePDFURL>`;

    try {
      const result = await this.sendSoapRequest(
        BAROBILL_CONFIG.TAX_INVOICE_WSDL.replace("?WSDL", ""),
        "http://BaroBill.com/GetTaxInvoicePDFURL",
        body
      ) as Record<string, unknown>;

      const envelope = result["soap:Envelope"] as Record<string, unknown>;
      const soapBody = envelope["soap:Body"] as Record<string, unknown>;
      const response = soapBody["GetTaxInvoicePDFURLResponse"] as Record<string, unknown>;

      return String(response["GetTaxInvoicePDFURLResult"] || "");
    } catch (error) {
      console.error("PDF URL 조회 실패:", error);
      throw new Error("PDF URL 조회에 실패했습니다");
    }
  }
}

// 바로빌 서비스 인스턴스 생성 헬퍼
export function createBarobillService(): BarobillService | null {
  const certKey = process.env.BAROBILL_CERT_KEY;
  const corpNum = process.env.BAROBILL_CORP_NUM;
  const userId = process.env.BAROBILL_USER_ID;
  const isTest = process.env.BAROBILL_TEST_MODE === "true";

  if (!certKey || !corpNum || !userId) {
    console.warn("바로빌 API 설정이 없습니다");
    return null;
  }

  return new BarobillService({
    certKey,
    corpNum,
    userId,
    isTest,
  });
}

// 은행 코드 목록
export const BANK_CODES = {
  "004": "KB국민",
  "011": "NH농협",
  "020": "우리",
  "023": "SC제일",
  "027": "한국씨티",
  "031": "대구",
  "032": "부산",
  "034": "광주",
  "035": "제주",
  "037": "전북",
  "039": "경남",
  "045": "새마을금고",
  "048": "신협",
  "050": "상호저축",
  "054": "HSBC",
  "055": "도이치",
  "057": "제이피모간",
  "060": "BOA",
  "062": "중국공상",
  "064": "산림조합",
  "071": "우체국",
  "081": "KEB하나",
  "088": "신한",
  "089": "K뱅크",
  "090": "카카오뱅크",
  "092": "토스뱅크",
} as const;

// 사업자 상태 코드
export const CORP_STATE_CODES = {
  TAX_TYPE: {
    "01": "일반과세자",
    "02": "간이과세자",
    "03": "면세사업자",
    "04": "비영리법인/국가기관",
    "05": "휴업자",
    "06": "폐업자",
    "07": "미등록",
  },
  CLOSED_STATE: {
    "01": "계속사업자",
    "02": "휴업자",
    "03": "폐업자",
  },
} as const;
