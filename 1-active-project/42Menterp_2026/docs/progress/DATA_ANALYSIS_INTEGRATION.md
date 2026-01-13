# 운영 데이터 분석 및 시스템 통합 제안서

> **작성일**: 2026-01-14
> **버전**: 1.0
> **분석 대상**: `Data/` 폴더 내 운영 데이터 3개 파일
> **평가 대상**: `docs/Temp/tax_invoice_automation_spec.md`

---

## 1. 분석 개요

### 1.1 분석 대상 파일

| 파일명 | 크기 | 내용 | 분석 결과 |
|--------|------|------|----------|
| `251226_12월 4주_접수시트.xlsx` | 299KB | 주간별 발주 접수 시트 | ✅ 분석 완료 |
| `거래처목록(1~94).xls` | 38KB | 거래처(고객) 마스터 데이터 | ✅ 분석 완료 |
| `세금계산서등록양식(일반).xls` | 90KB | 홈택스 세금계산서 양식 | ⚠️ 암호 보호 |

### 1.2 분석 목적

1. 실제 운영 데이터와 시스템 설계의 정합성 검증
2. 기존 제안 문서(`tax_invoice_automation_spec.md`) 평가
3. 데이터 마이그레이션 전략 수립
4. 시스템 고도화 우선순위 도출

---

## 2. 데이터 분석 결과

### 2.1 접수시트 분석 (이전 문서 참조)

> **상세**: `PRODUCTS_PURCHASEORDERS_ENHANCEMENT.md` 참조

**요약:**
- 38개 주간 시트, 20개 상품(마케팅 서비스)
- 12월 4주차: 77건 발주, 65개 매장
- **문제점**: 비표준화된 컬럼, 수작업 관리

### 2.2 거래처목록 분석

**파일 구조:**
```
시트: 거래처 목록
행 수: 98행 (헤더 4행 + 데이터 94행)
```

**컬럼 구조 (17개):**
| 인덱스 | 필드명 | DB 매핑 | 비고 |
|--------|--------|---------|------|
| 0 | 순번 | - | |
| 1 | 거래처등록번호 | `Customer.businessNo` | ✅ 100% |
| 2 | 종사업장번호 | - | 미사용 |
| 3 | 거래처상호 | `Customer.name` | ✅ |
| 4 | 대표자명 | `Customer.representative` | ✅ 98% |
| 5 | 사업자주소 | `Customer.address` | ⚠️ 21% |
| 6 | 업태 | `Customer.bizType` | |
| 7 | 종목 | `Customer.bizClass` | |
| 8 | 부서명 | - | |
| 9 | 성명 | `Customer.contactName` | |
| 10 | 전화번호 | `Customer.contactPhone` | ❌ 0% |
| 11 | 휴대전화번호 | `Customer.contactPhone` | ❌ 0% |
| 12 | 팩스번호 | - | |
| 13 | 이메일주소 | `Customer.contactEmail` | ✅ 81% |
| 14 | 비고 | `Customer.memo` | |
| 15 | 구분 | - | "주담당자" 등 |
| 16 | 등록일자 | `Customer.createdAt` | |

**데이터 품질:**
```
┌────────────────────┬───────┬─────────┐
│ 항목               │ 건수  │ 비율    │
├────────────────────┼───────┼─────────┤
│ 총 거래처          │ 94    │ 100%    │
│ 사업자번호 있음    │ 94    │ 100%    │
│ 대표자명 있음      │ 92    │ 98%     │
│ 이메일 있음        │ 76    │ 81%     │
│ 주소 있음          │ 20    │ 21%     │
│ 연락처 있음        │ 0     │ 0%      │
└────────────────────┴───────┴─────────┘
```

**업태별 분류:**
```
숙박 및 음식점업: 25개 (27%)
서비스업: 15개 (16%)
전문, 과학 및 기술서비스업: 13개 (14%)
도매 및 소매업: 6개 (6%)
기타: 35개 (37%)
```

### 2.3 세금계산서등록양식 분석

**파일 상태:** 암호로 보호됨 (홈택스 표준 양식)

**홈택스 표준 양식 구조 (일반적):**

| 구분 | 필드 | 필수 | 설명 |
|------|------|------|------|
| **공급자** | 등록번호 | ✅ | 발행자 사업자번호 |
| | 상호 | ✅ | 발행자 상호 |
| | 성명 | ✅ | 대표자명 |
| | 사업장주소 | | |
| | 업태/종목 | | |
| | 이메일 | | 발행 알림용 |
| **공급받는자** | 등록번호 | ✅ | 수신자 사업자번호 |
| | 상호 | ✅ | 수신자 상호 |
| | 성명 | ✅ | 대표자명 |
| | 사업장주소 | | |
| | 업태/종목 | | |
| | 이메일 | ✅ | 세금계산서 수신용 |
| **거래내역** | 작성일자 | ✅ | YYYYMMDD |
| | 품목 | | 거래 내용 |
| | 규격 | | |
| | 수량 | | |
| | 단가 | | |
| | 공급가액 | ✅ | 세전 금액 |
| | 세액 | ✅ | 부가세 (10%) |
| | 비고 | | |

---

## 3. 기존 문서 평가: `tax_invoice_automation_spec.md`

### 3.1 평가 요약

| 항목 | 평가 | 설명 |
|------|------|------|
| 문제 정의 | ✅ 적절 | 매장/고객 혼재 문제 정확히 파악 |
| 목표 설정 | ✅ 적절 | 데이터 정규화 + 자동 생성 |
| 데이터 분석 | ⚠️ 보완 필요 | 실제 데이터 품질 문제 미반영 |
| 아키텍처 | ✅ 적절 | 프로세스 흐름 명확 |
| API 설계 | ⚠️ 보완 필요 | 상세 스펙 부족 |
| 구현 가이드 | ⚠️ 보완 필요 | 에러 처리, 검증 로직 부족 |

### 3.2 보완이 필요한 사항

#### 1. 데이터 품질 문제 미반영

**문서의 가정:**
> "사업자번호를 기준으로 데이터를 정규화"

**실제 데이터:**
- 주소: 21%만 존재 → **세금계산서 발행 시 주소 누락 가능**
- 연락처: 0% → **담당자 연락 불가**
- 이메일: 81% → **19%는 세금계산서 발송 불가**

**보완 제안:**
```typescript
interface CustomerImportValidation {
  required: ['businessNo', 'name'];
  recommended: ['representative', 'email'];
  optional: ['address', 'phone'];

  // 세금계산서 발행 가능 여부 체크
  taxInvoiceReady: (customer) => {
    return !!customer.businessNo &&
           !!customer.name &&
           !!customer.email;
  };
}
```

#### 2. 홈택스 양식 상세 구조 누락

**문서의 설명:**
> "홈택스 양식 요구사항" 테이블만 제공

**보완 제안:**
- 실제 홈택스 양식의 컬럼 순서, 셀 위치
- 날짜 형식 (YYYYMMDD)
- 금액 형식 (숫자, 천단위 구분 없음)
- 파일 인코딩 (EUC-KR / UTF-8)

#### 3. 정산 데이터 연동 구체화 부족

**문서의 설명:**
> "해당 월의 확정된 정산(Settlement) 조회"

**보완 제안:**
```typescript
interface TaxInvoiceExportOptions {
  year: number;
  month: number;

  // 정산 필터
  settlementFilter: {
    status: 'CONFIRMED' | 'PAID';
    type: 'REVENUE';  // 매출 세금계산서
    excludeZeroAmount: boolean;
  };

  // 그룹핑 옵션
  groupBy: 'CUSTOMER' | 'SETTLEMENT';

  // 품목명 생성 규칙
  itemNameTemplate: '{month}월 마케팅 대행료';
}
```

#### 4. 에러 처리 및 검증 로직 부재

**추가 필요:**
```typescript
interface ImportValidationResult {
  valid: CustomerImportRow[];
  errors: {
    row: number;
    field: string;
    value: unknown;
    error: 'MISSING_REQUIRED' | 'INVALID_FORMAT' | 'DUPLICATE';
    message: string;
  }[];
  warnings: {
    row: number;
    field: string;
    warning: 'MISSING_EMAIL' | 'MISSING_ADDRESS';
    message: string;
  }[];
}
```

---

## 4. 통합 적용 제안

### 4.1 데이터 통합 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                        운영 데이터 통합 파이프라인                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │ 거래처목록    │    │ 접수시트     │    │ 정산 데이터   │          │
│  │ (.xls)       │    │ (.xlsx)      │    │ (DB)         │          │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘          │
│         │                   │                   │                   │
│         ▼                   ▼                   ▼                   │
│  ┌──────────────────────────────────────────────────────┐          │
│  │                    Import Layer                       │          │
│  │  - 파싱 (xlsx, xls)                                   │          │
│  │  - 검증 (필수 필드, 형식)                              │          │
│  │  - 중복 제거 (사업자번호 기준)                         │          │
│  └──────────────────────────────────────────────────────┘          │
│                            │                                        │
│                            ▼                                        │
│  ┌──────────────────────────────────────────────────────┐          │
│  │                    ERP Database                       │          │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │          │
│  │  │Customer │──│ Store   │──│Purchase │──│Settlem- │ │          │
│  │  │         │  │         │  │Order    │  │ent      │ │          │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │          │
│  └──────────────────────────────────────────────────────┘          │
│                            │                                        │
│                            ▼                                        │
│  ┌──────────────────────────────────────────────────────┐          │
│  │                    Export Layer                       │          │
│  │  - 홈택스 양식 생성                                    │          │
│  │  - 발주서 시트 생성                                    │          │
│  │  - 정산서 PDF 생성                                     │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 구현 우선순위

#### Phase 1: 고객 마스터 데이터 정비

| # | 작업 | 관련 문서 |
|---|------|----------|
| 1-1 | 거래처목록 Import API | `DATA_PATTERNS.md` |
| 1-2 | 고객 데이터 품질 대시보드 | 신규 |
| 1-3 | 세금계산서 준비 상태 뱃지 | `CUSTOMERS_ENHANCEMENT.md` |

```typescript
// POST /api/customers/import-legacy
// 기존 거래처목록 엑셀 임포트 (일회성 마이그레이션)
interface LegacyCustomerImport {
  file: File;
  options: {
    updateExisting: boolean;    // 기존 고객 업데이트
    createStoreLinks: boolean;  // 매장 연결 시도
    skipInvalid: boolean;       // 오류 건 건너뛰기
  };
}
```

#### Phase 2: 발주 프로세스 자동화

| # | 작업 | 관련 문서 |
|---|------|----------|
| 2-1 | 간편 발주 등록 | `PRODUCTS_PURCHASEORDERS_ENHANCEMENT.md` |
| 2-2 | 주간 일괄 업로드 | `PRODUCTS_PURCHASEORDERS_ENHANCEMENT.md` |
| 2-3 | 상품 마스터 등록 (20개) | `PRODUCTS_PURCHASEORDERS_ENHANCEMENT.md` |

#### Phase 3: 세금계산서 자동화

| # | 작업 | 관련 문서 |
|---|------|----------|
| 3-1 | 홈택스 양식 Export API | `tax_invoice_automation_spec.md` |
| 3-2 | 정산-세금계산서 연동 | `tax_invoice_automation_spec.md` |
| 3-3 | 일괄 발행 워크플로우 | 신규 |

```typescript
// GET /api/tax-invoices/export-hometax
interface HometaxExportRequest {
  year: number;
  month: number;
  format: 'XLS' | 'CSV';

  // 필터
  customerIds?: string[];
  minAmount?: number;

  // 옵션
  includeZeroAmount: boolean;
  itemNameTemplate: string;
}

interface HometaxExportResponse {
  success: boolean;
  fileUrl: string;
  summary: {
    totalCustomers: number;
    totalAmount: number;
    totalTax: number;
    skipped: {
      count: number;
      reasons: { reason: string; count: number }[];
    };
  };
}
```

### 4.3 데이터 품질 개선 계획

**1단계: 현황 파악**
```typescript
// GET /api/customers/quality-report
interface CustomerQualityReport {
  total: number;
  taxInvoiceReady: number;      // 세금계산서 발행 가능
  missingFields: {
    email: number;
    address: number;
    representative: number;
    phone: number;
  };
  recommendations: {
    customerId: string;
    customerName: string;
    missingFields: string[];
  }[];
}
```

**2단계: 자동 보완**
- 사업자번호로 국세청 API 조회하여 상호/대표자 자동 채우기
- 매장 정보에서 누락된 고객 정보 역동기화

**3단계: 수동 보완 유도**
- 세금계산서 발행 전 필수 정보 입력 안내
- 대시보드에 "정보 미완료 고객" 알림

---

## 5. 문서 업데이트 권장사항

### 5.1 `tax_invoice_automation_spec.md` 보완 항목

| 섹션 | 추가 내용 |
|------|----------|
| 2.1 원천 데이터 분석 | 실제 데이터 품질 통계 (주소 21%, 연락처 0% 등) |
| 2.2 홈택스 양식 | 실제 컬럼 순서, 형식, 인코딩 상세 |
| 4.2 API 엔드포인트 | 상세 Request/Response 스펙 |
| 신규 | 에러 처리 및 검증 로직 |
| 신규 | 데이터 품질 체크 및 보완 전략 |

### 5.2 문서 통합 제안

| 현재 문서 | 권장 조치 |
|----------|----------|
| `tax_invoice_automation_spec.md` | → `docs/progress/` 이동 후 보완 |
| `store_customer_integration_proposal_260114.md` | ✅ 이미 통합됨 (`CUSTOMERS_ENHANCEMENT.md`) |

---

## 6. 체크리스트

### 데이터 마이그레이션

- [ ] 거래처목록 94건 → Customer 테이블 임포트
- [ ] 사업자번호 중복 체크 및 병합
- [ ] 매장(Store)과 고객(Customer) 연결
- [ ] 데이터 품질 보고서 생성

### 세금계산서 자동화

- [ ] 홈택스 양식 Export API 구현
- [ ] 정산 데이터 그룹핑 로직
- [ ] 파일 생성 (XLS/CSV)
- [ ] 누락 정보 경고 처리

### 발주 프로세스

- [ ] 상품 마스터 등록 (20개 마케팅 서비스)
- [ ] 간편 발주 UI 구현
- [ ] 주간 일괄 업로드 구현

---

## 7. 결론

### 7.1 핵심 발견

1. **거래처목록**은 94개 고객 정보를 포함하며, 세금계산서 발행에 필요한 핵심 정보(사업자번호, 상호, 이메일)를 대부분 보유
2. **데이터 품질 문제**: 주소 21%, 연락처 0%로 보완 필요
3. **접수시트**는 발주 프로세스의 핵심 데이터로, 시스템화 시 업무 효율 대폭 향상 예상

### 7.2 권장 순서

```
1. 고객 마스터 정비 (거래처목록 Import)
       ↓
2. 데이터 품질 보완 (누락 정보 입력)
       ↓
3. 발주 프로세스 자동화 (간편 발주, 일괄 업로드)
       ↓
4. 세금계산서 자동화 (홈택스 Export)
```

### 7.3 기대 효과

| 영역 | 현재 | 개선 후 |
|------|------|---------|
| 고객 등록 | 수동 입력 | 엑셀 일괄 Import |
| 발주 등록 | 엑셀 → 시스템 이중 입력 | 간편 발주 or 엑셀 업로드 |
| 세금계산서 | 수동 홈택스 입력 | 자동 양식 생성 → 업로드 |
| 데이터 정합성 | 매장/고객 혼재 | 사업자번호 기준 정규화 |

---

**작성자**: Claude Opus 4.5
**문서 버전**: 1.0
