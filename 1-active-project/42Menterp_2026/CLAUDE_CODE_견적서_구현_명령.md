# 견적서(Quotation) 기능 구현 - Claude Code 명령문

> PRD v3.0 "6. 견적서 관리" 섹션 기준 구현 명령
> 
> **사용 방법**: 아래 명령문을 Claude Code 터미널에 복사하여 실행

---

## 전체 구현 명령 (한번에 실행)

```
견적서(Quotation) 기능을 구현해줘. PRD v3.0의 "6. 견적서 관리" 섹션 기준.

요구사항:
1. 견적서와 발주는 양방향 연동 (독립 운영 가능)
   - 견적 → 발주 전환 가능
   - 발주에서 견적서 발행 가능
   - 각각 독립적으로 생성/관리 가능

2. DB 스키마 (prisma/schema.prisma)
   - Quotation, QuotationItem 모델 추가
   - Order에 quotationId 필드 추가 (선택적)
   - Customer, Store와 관계 설정

3. API 구현
   - /api/quotations (CRUD)
   - /api/quotations/[id]/convert-to-order (견적→발주 전환)
   - /api/quotations/[id]/pdf (PDF 생성)

4. UI 페이지
   - /quotations - 목록 (검색/필터/페이지네이션)
   - /quotations/new - 등록 (고객/매장 선택, 항목 추가)
   - /quotations/[id] - 상세/수정

5. PDF 생성 (@react-pdf/renderer)
   - 한글 폰트 지원 (NanumGothic)
   - 견적서 템플릿 (docs/16-pdf-generation.md 참고)

6. 발주 연동
   - 발주 등록 시 기존 견적서 선택 옵션
   - 발주 상세에서 "견적서 발행" 버튼

구현 순서: 스키마 → API → UI → PDF
```

---

## 단계별 명령 (순차 실행)

### Step 1: DB 스키마 추가

```
prisma/schema.prisma에 견적서 모델을 추가해줘.

Quotation 모델:
- id, quotationNumber (Q-YYYYMM-XXXX)
- customerId, storeId (선택)
- status: draft, sent, accepted, rejected, expired
- quotationDate, validUntil
- totalAmount, taxAmount
- notes
- Customer, Store, Order 관계

QuotationItem 모델:
- id, quotationId
- productName, description
- quantity, unitPrice, totalPrice
- notes, sortOrder

Order 모델에 quotationId 필드 추가 (선택적 FK)
```

### Step 2: API 구현

```
견적서 API를 구현해줘.

/api/quotations/route.ts:
- GET: 목록 조회 (검색, 필터, 페이지네이션)
- POST: 생성 (견적번호 자동생성)

/api/quotations/[id]/route.ts:
- GET: 상세 조회
- PUT: 수정
- DELETE: 삭제

/api/quotations/[id]/convert-to-order/route.ts:
- POST: 견적서를 발주로 전환

/api/quotations/[id]/pdf/route.ts:
- GET: PDF 다운로드
```

### Step 3: UI 페이지 구현

```
견적서 UI 페이지를 구현해줘.

/quotations (목록):
- 검색: 견적번호, 고객명
- 필터: 상태, 기간
- 테이블: 견적번호, 고객명, 금액, 상태, 견적일
- 액션: 상세, 수정, 삭제, PDF

/quotations/new (등록):
- 고객/매장 선택 (검색 가능)
- 항목 동적 추가/삭제
- 금액 자동 계산
- 저장, 저장 후 발송

/quotations/[id] (상세/수정):
- 기본 정보 표시/수정
- PDF 미리보기/다운로드
- 발주 전환 버튼
```

### Step 4: PDF 생성 모듈

```
견적서 PDF 생성 모듈을 구현해줘.

@react-pdf/renderer 사용.

lib/pdf/templates/QuotationPDF.tsx:
- 한글 폰트 (NanumGothic)
- 회사 로고, 견적 정보
- 수신자/공급자 정보
- 견적 항목 테이블
- 합계 (공급가액, 부가세, 총액)
- 비고

lib/pdf/generators/generateQuotationPDF.ts:
- Quotation 데이터 조회
- PDF 버퍼 생성

docs/16-pdf-generation.md 템플릿 참고
```

### Step 5: 발주 연동

```
발주-견적서 연동 기능을 추가해줘.

1. 발주 등록 페이지 수정:
   - 기존 견적서 선택 드롭다운 추가
   - 선택 시 견적서 항목 자동 로드

2. 발주 상세 페이지 수정:
   - 연결된 견적서 정보 표시
   - "견적서 발행" 버튼 (견적서 없는 경우)

3. 견적서 상세 페이지:
   - "발주 전환" 버튼
   - 연결된 발주 목록 표시
```

---

## 참고 파일

| 파일 | 설명 |
|------|------|
| PRD_42ment_ERP_v3.0.md | 견적서 요구사항 (섹션 6) |
| docs/02-data-model.md | Quotation 모델 참고 |
| docs/16-pdf-generation.md | PDF 템플릿 설계 |
| app/src/app/(dashboard)/orders/new/page.tsx | 발주 등록 UI 참고 |

---

## 예상 결과물

```
app/
├── prisma/
│   └── schema.prisma          # Quotation, QuotationItem 추가
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── quotations/
│   │   │       ├── route.ts
│   │   │       └── [id]/
│   │   │           ├── route.ts
│   │   │           ├── convert-to-order/route.ts
│   │   │           └── pdf/route.ts
│   │   └── (dashboard)/
│   │       └── quotations/
│   │           ├── page.tsx           # 목록
│   │           ├── new/page.tsx       # 등록
│   │           └── [id]/page.tsx      # 상세/수정
│   └── lib/
│       └── pdf/
│           ├── templates/
│           │   └── QuotationPDF.tsx
│           ├── generators/
│           │   └── generateQuotationPDF.ts
│           └── fonts/
│               └── registerFonts.ts
```

