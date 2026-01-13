# 16. PDF 생성 모듈 상세 설계

> PDF Generation Module - 견적서/세금계산서 PDF 템플릿

## 1. 개요

### 1.1 모듈 목적

PDF 생성 모듈은 **고객에게 전달할 공식 문서**를 생성합니다.

- 견적서 PDF
- 세금계산서 PDF
- 발주서 PDF (거래처용)

### 1.2 핵심 기능

| 기능 | 설명 |
|------|------|
| 견적서 생성 | 고객용 견적서 PDF |
| 세금계산서 생성 | 공식 세금계산서 양식 |
| 발주서 생성 | 거래처용 발주서 |
| 템플릿 관리 | 회사 로고, 정보 설정 |
| 미리보기 | 생성 전 미리보기 |

---

## 2. 기술 스택

### 2.1 라이브러리 선택

| 옵션 | 장점 | 단점 | 선택 |
|------|------|------|------|
| **@react-pdf/renderer** | React 컴포넌트, 한글 지원 | 서버사이드 복잡 | ⭐ 선택 |
| pdfmake | 간단한 API | 스타일링 제한 | - |
| puppeteer | HTML→PDF | 무거움, 서버 필요 | - |
| jsPDF | 가벼움 | 한글 폰트 복잡 | - |

### 2.2 의존성

```json
{
  "dependencies": {
    "@react-pdf/renderer": "^3.x",
    "@react-pdf/font": "^2.x"
  }
}
```

---

## 3. PDF 템플릿 설계

### 3.1 견적서 템플릿

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  [회사 로고]                              견   적   서          │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  견적번호: Q-202601-0001              견적일: 2026년 01월 05일  │
│  유효기간: 2026년 01월 12일까지                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  수   신                                                │   │
│  │  ───────────────────────────────────────────────────── │   │
│  │  상  호: 길동이네 치킨                                  │   │
│  │  담당자: 홍길동                                         │   │
│  │  연락처: 010-1234-5678                                  │   │
│  │  이메일: hong@example.com                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  공   급   자                                           │   │
│  │  ───────────────────────────────────────────────────── │   │
│  │  상  호: (주)42멘트                 [인]                │   │
│  │  대표자: 김대표                                         │   │
│  │  사업자번호: 123-45-67890                               │   │
│  │  주  소: 서울시 강남구 ...                              │   │
│  │  연락처: 02-1234-5678                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  아래와 같이 견적합니다.                                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ No │ 품  목         │ 규격  │ 수량 │ 단가     │ 금액    │   │
│  ├────┼────────────────┼──────┼─────┼─────────┼────────┤   │
│  │  1 │ 파워블로거 포스팅│ -    │   5 │ 45,000  │ 225,000│   │
│  │  2 │ 체험단 리뷰     │ -    │  10 │ 22,000  │ 220,000│   │
│  │  3 │ 트래픽 50타     │ 30일 │   1 │ 50,000  │  50,000│   │
│  ├────┴────────────────┴──────┴─────┴─────────┼────────┤   │
│  │                              공급가액 합계  │ 495,000│   │
│  │                              부가세 (10%)   │  49,500│   │
│  │                              ═══════════════╪════════│   │
│  │                              총 견적금액    │ 544,500│   │
│  └─────────────────────────────────────────────┴────────┘   │
│                                                                 │
│  ※ 비고                                                        │
│  - 상기 금액은 부가세 포함 금액입니다.                          │
│  - 유효기간 내 계약 시 동일 조건 적용됩니다.                    │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  (주)42멘트 │ Tel: 02-1234-5678 │ www.42ment.com               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 세금계산서 템플릿

```
┌─────────────────────────────────────────────────────────────────┐
│                      세  금  계  산  서                         │
│                        (공급받는자 보관용)                       │
├─────────────────────────────────────────────────────────────────┤
│  작성일자: 2026년 01월 05일                                     │
│  승인번호: 20260105-12345678-abcd1234                           │
├─────────────────────┬───────────────────────────────────────────┤
│                     │                                           │
│  공                 │  등록번호: 123-45-67890                   │
│  급                 │  상    호: (주)42멘트      성명: 김대표   │
│  자                 │  사업장:   서울시 강남구 ...              │
│                     │  업    태: 서비스업        종목: 광고대행 │
│                     │                                           │
├─────────────────────┼───────────────────────────────────────────┤
│                     │                                           │
│  공                 │  등록번호: 987-65-43210                   │
│  급                 │  상    호: 길동이네 치킨    성명: 홍길동  │
│  받                 │  사업장:   서울시 서초구 ...              │
│  는                 │  업    태: 요식업          종목: 치킨     │
│  자                 │                                           │
│                     │                                           │
├─────────────────────┴───────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │   공급가액     │     세액      │      합계금액         │    │
│  ├────────────────┼───────────────┼───────────────────────┤    │
│  │    495,000     │    49,500     │      544,500          │    │
│  └────────────────┴───────────────┴───────────────────────┘    │
│                                                                 │
│  ┌─────┬────────────┬──────┬─────┬────────┬────────┬──────┐   │
│  │월/일│  품   목   │ 규격 │수량 │ 단 가  │ 공급가액│ 세액 │   │
│  ├─────┼────────────┼──────┼─────┼────────┼────────┼──────┤   │
│  │01/05│파워블로거   │  -   │  5  │ 45,000 │225,000 │22,500│   │
│  │01/05│체험단 리뷰  │  -   │ 10  │ 22,000 │220,000 │22,000│   │
│  │01/05│트래픽 50타  │ 30일 │  1  │ 50,000 │ 50,000 │ 5,000│   │
│  ├─────┴────────────┴──────┴─────┴────────┼────────┼──────┤   │
│  │                              합   계   │495,000 │49,500│   │
│  └────────────────────────────────────────┴────────┴──────┘   │
│                                                                 │
│  ※ 이 계산서는 전자세금계산서로 국세청에 신고되었습니다.        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 구현 설계

### 4.1 컴포넌트 구조

```
lib/pdf/
├── templates/
│   ├── QuotationPDF.tsx      # 견적서 템플릿
│   ├── InvoicePDF.tsx        # 세금계산서 템플릿
│   ├── PurchaseOrderPDF.tsx  # 발주서 템플릿
│   └── components/
│       ├── PDFHeader.tsx     # 공통 헤더
│       ├── PDFFooter.tsx     # 공통 푸터
│       ├── PDFTable.tsx      # 공통 테이블
│       └── PDFSignature.tsx  # 도장/서명
│
├── styles/
│   └── pdfStyles.ts          # 공통 스타일
│
├── fonts/
│   └── registerFonts.ts      # 한글 폰트 등록
│
└── generators/
    ├── generateQuotationPDF.ts
    ├── generateInvoicePDF.ts
    └── generatePurchaseOrderPDF.ts
```

### 4.2 한글 폰트 설정

```typescript
// lib/pdf/fonts/registerFonts.ts
import { Font } from '@react-pdf/renderer';

Font.register({
  family: 'NanumGothic',
  fonts: [
    { src: '/fonts/NanumGothic-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/NanumGothic-Bold.ttf', fontWeight: 'bold' },
  ],
});

Font.register({
  family: 'NanumMyeongjo',
  fonts: [
    { src: '/fonts/NanumMyeongjo-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/NanumMyeongjo-Bold.ttf', fontWeight: 'bold' },
  ],
});
```

### 4.3 견적서 PDF 컴포넌트

```tsx
// lib/pdf/templates/QuotationPDF.tsx
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

interface QuotationPDFProps {
  quotation: {
    quotationNumber: string;
    quotationDate: string;
    validUntil: string;
    customer: {
      name: string;
      contactPerson: string;
      phone: string;
      email: string;
    };
    items: Array<{
      name: string;
      spec: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    subtotal: number;
    tax: number;
    total: number;
    notes: string;
  };
  company: {
    name: string;
    ceo: string;
    businessNumber: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
  };
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'NanumGothic',
    fontSize: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // ... 추가 스타일
});

export const QuotationPDF: React.FC<QuotationPDFProps> = ({
  quotation,
  company,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* 헤더 */}
      <View style={styles.header}>
        {company.logo && (
          <Image src={company.logo} style={{ width: 100, height: 50 }} />
        )}
        <Text style={styles.title}>견 적 서</Text>
      </View>

      {/* 견적 정보 */}
      <View>
        <Text>견적번호: {quotation.quotationNumber}</Text>
        <Text>견적일: {quotation.quotationDate}</Text>
        <Text>유효기간: {quotation.validUntil}까지</Text>
      </View>

      {/* 수신자 정보 */}
      {/* ... */}

      {/* 공급자 정보 */}
      {/* ... */}

      {/* 견적 항목 테이블 */}
      {/* ... */}

      {/* 합계 */}
      {/* ... */}

      {/* 비고 */}
      {/* ... */}

      {/* 푸터 */}
      {/* ... */}
    </Page>
  </Document>
);
```

### 4.4 PDF 생성 함수

```typescript
// lib/pdf/generators/generateQuotationPDF.ts
import { renderToBuffer } from '@react-pdf/renderer';
import { QuotationPDF } from '../templates/QuotationPDF';
import { prisma } from '@/lib/prisma/client';

export async function generateQuotationPDF(quotationId: number): Promise<Buffer> {
  // 1. 데이터 조회
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      customer: true,
      items: { include: { product: true } },
    },
  });

  if (!quotation) {
    throw new Error('견적서를 찾을 수 없습니다.');
  }

  // 2. 회사 정보 조회 (설정에서)
  const company = await getCompanyInfo();

  // 3. PDF 데이터 가공
  const pdfData = {
    quotationNumber: quotation.quotationNumber,
    quotationDate: formatDate(quotation.quotationDate),
    validUntil: formatDate(quotation.validUntil),
    customer: {
      name: quotation.customer.name,
      contactPerson: quotation.customer.contactPerson || '',
      phone: quotation.customer.phone || '',
      email: quotation.customer.email || '',
    },
    items: quotation.items.map((item, index) => ({
      no: index + 1,
      name: item.productName || item.product?.name || '',
      spec: '-',
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
    })),
    subtotal: Number(quotation.totalAmount) / 1.1,
    tax: Number(quotation.totalAmount) - Number(quotation.totalAmount) / 1.1,
    total: Number(quotation.totalAmount),
    notes: quotation.notes || '',
  };

  // 4. PDF 생성
  const pdfBuffer = await renderToBuffer(
    <QuotationPDF quotation={pdfData} company={company} />
  );

  return pdfBuffer;
}
```

---

## 5. API 설계

### 5.1 PDF 다운로드 API

#### GET /api/quotations/[id]/pdf
견적서 PDF 다운로드

**Response:** `application/pdf`

```typescript
// app/api/quotations/[id]/pdf/route.ts
import { NextResponse } from 'next/server';
import { generateQuotationPDF } from '@/lib/pdf/generators/generateQuotationPDF';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const quotationId = parseInt(params.id);
    const pdfBuffer = await generateQuotationPDF(quotationId);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="quotation-${params.id}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: 'PDF 생성 실패' } },
      { status: 500 }
    );
  }
}
```

### 5.2 미리보기 API

#### GET /api/quotations/[id]/pdf/preview
견적서 PDF 미리보기 (브라우저에서 열기)

```typescript
// Content-Disposition: inline (브라우저에서 열기)
headers: {
  'Content-Type': 'application/pdf',
  'Content-Disposition': `inline; filename="quotation-${params.id}.pdf"`,
}
```

---

## 6. UI 연동

### 6.1 PDF 다운로드 버튼

```tsx
// components/quotations/QuotationActions.tsx
function QuotationActions({ quotationId }: { quotationId: number }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/quotations/${quotationId}/pdf`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `견적서-${quotationId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('PDF 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button onClick={handleDownloadPDF} disabled={isGenerating}>
      {isGenerating ? '생성 중...' : 'PDF 다운로드'}
    </Button>
  );
}
```

### 6.2 미리보기 모달

```tsx
function PDFPreviewModal({ quotationId, isOpen, onClose }) {
  const pdfUrl = `/api/quotations/${quotationId}/pdf/preview`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <iframe
          src={pdfUrl}
          className="w-full h-full"
          title="PDF Preview"
        />
      </DialogContent>
    </Dialog>
  );
}
```

---

## 7. 회사 정보 설정

### 7.1 설정 데이터

```typescript
interface CompanyInfo {
  name: string;
  ceo: string;
  businessNumber: string;
  address: string;
  phone: string;
  fax?: string;
  email: string;
  website?: string;
  logo?: string; // 로고 이미지 URL
  stamp?: string; // 도장 이미지 URL
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
}
```

### 7.2 설정 페이지

```
┌─────────────────────────────────────────────────────────────────┐
│  회사 정보 설정                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [기본 정보]                                                    │
│  회사명 *       [(주)42멘트                       ]            │
│  대표자 *       [김대표                           ]            │
│  사업자번호 *   [123-45-67890                     ]            │
│                                                                 │
│  [연락처]                                                       │
│  주소 *         [서울시 강남구 ...                ]            │
│  전화번호 *     [02-1234-5678                     ]            │
│  팩스           [02-1234-5679                     ]            │
│  이메일 *       [contact@42ment.com               ]            │
│  웹사이트       [www.42ment.com                   ]            │
│                                                                 │
│  [이미지]                                                       │
│  로고           [이미지 업로드] [미리보기]                      │
│  도장           [이미지 업로드] [미리보기]                      │
│                                                                 │
│  [계좌 정보]                                                    │
│  은행명         [국민은행                         ]            │
│  계좌번호       [123-456-789012                   ]            │
│  예금주         [(주)42멘트                       ]            │
│                                                                 │
│                                         [저장]                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. 구현 우선순위

### Phase 1 (필수)
1. [ ] @react-pdf/renderer 설치
2. [ ] 한글 폰트 설정
3. [ ] 견적서 PDF 템플릿
4. [ ] 견적서 PDF API

### Phase 2 (권장)
5. [ ] 세금계산서 PDF 템플릿
6. [ ] 발주서 PDF 템플릿
7. [ ] 회사 정보 설정 페이지
8. [ ] PDF 미리보기 기능

### Phase 3 (선택)
9. [ ] 이메일 첨부 발송
10. [ ] 템플릿 커스터마이징
11. [ ] 다국어 지원

---

## 변경 이력

| 버전 | 날짜 | 변경 내역 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2026-01-05 | 초안 작성 | AI Assistant |


