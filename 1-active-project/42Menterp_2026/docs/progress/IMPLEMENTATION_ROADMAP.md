# 42ment ERP 구현 로드맵 (Implementation Roadmap)

> **작성일**: 2026-01-14
> **버전**: 1.1
> **목적**: 분산된 기획/분석 문서들을 통합하고 구현 우선순위 정리

---

## 0. 용어 정의 (중요)

| 용어 | 정의 | 예시 |
|------|------|------|
| **채널(Channel)** | 마케팅이 이뤄지는 플랫폼 | 네이버, 인스타그램, 틱톡, 유튜브, 카카오 |
| **상품(Product)** | 마케팅 서비스/공급업체 | 피닉스, 히든, 호올스, 말차 등 (20개) |
| **고객(Customer)** | 계약/정산 주체 (Bill-To Party) | 세금계산서 발행 대상 |
| **매장(Store)** | 서비스 제공 대상 (Service Location) | 네이버 플레이스 등록 매장 |

> ⚠️ **주의**: "피닉스, 히든" 등은 **상품(마케팅 서비스)**이지 채널이 아님

---

## 1. 문서 통합 현황

### 1.1 분석/기획 문서 목록

| 문서 | 위치 | 작성자 | 핵심 내용 | 상태 |
|------|------|--------|----------|------|
| **DATA_PATTERNS.md** | `docs/progress/` | Claude Opus | 엑셀 업로드/다운로드, 일괄 처리 공통 패턴 | ✅ 완료 |
| **COMMON_COMPONENTS.md** | `docs/progress/` | Claude Opus | 공용 컴포넌트 설계 (DataTable, BulkActions, Excel) | ✅ 완료 |
| **CUSTOMERS_ENHANCEMENT.md** | `docs/progress/` | Claude Opus | 고객관리 고도화 (동기화, 세금계산서 검증) | ✅ 완료 |
| **PRODUCTS_PURCHASEORDERS_ENHANCEMENT.md** | `docs/progress/` | Claude Opus | 상품/발주관리 고도화 (간편 발주, 상품 마스터) | ✅ 완료 |
| **DATA_ANALYSIS_INTEGRATION.md** | `docs/progress/` | Claude Opus | 운영 데이터 분석 및 통합 제안 | ✅ 완료 |
| **TAX_INVOICE_AUTOMATION.md** | `docs/progress/` | Antigravity + Claude | 세금계산서 자동화 및 데이터 정규화 | ✅ 완료 |
| **batch_order_system_proposal.md** | `docs/Temp/` | Antigravity | 주간 일괄 발주 시스템 (기간 관리, Smart Grid) | 🔄 통합 필요 |

### 1.2 분석된 운영 데이터

| 파일 | 내용 | 핵심 인사이트 |
|------|------|--------------|
| `접수시트.xlsx` | 주간 발주 접수 | 38개 시트, 20개 상품(마케팅 서비스), 주간 77건 평균 |
| `거래처목록.xls` | 고객 마스터 | 94개 거래처, 이메일 81%, 주소 21% |
| `세금계산서양식.xls` | 홈택스 양식 | 암호 보호, 표준 양식 구조 |

---

## 2. 핵심 기능 요구사항 통합

### 2.1 주간 일괄 발주 시스템 (Smart Grid)

> **출처**: `batch_order_system_proposal.md` + `PRODUCTS_PURCHASEORDERS_ENHANCEMENT.md`

**핵심 컨셉:**
- 단순 수량 입력이 아닌 **"기간과 수량을 관리하는 통합 대시보드"**
- 입력(Create)과 수정(Edit) 모드 통합
- 양방향 동기화 (Load/Save)

**Grid 구조:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 주간 발주 그리드                    [2026년 1월 3주차 ▼]  [저장] [시트전송] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─ 일괄 설정 ─────────────────────────────────────────────────────────────┐│
│ │ 기간: [01-13] ~ [01-19]  ☑ 전체 적용                                    ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ │ 매장명         │ 피닉스(트래픽)    │ 히든(트래픽)      │ 겟(리뷰)  │ 상태│
│ │                │ 기간    │ 수량   │ 기간    │ 수량   │ 기간│수량│     │
│ ├────────────────┼─────────┼────────┼─────────┼────────┼─────┼────┼─────┤
│ │ 일괄설정       │ 01-13~19│        │ 01-13~19│        │ -   │    │  -  │
│ │ 강남맛집       │ 01-13~19│ [100]  │ 01-13~19│ [200]  │  -  │[5] │ 완료│
│ │ 홍대카페       │ 01-14~16│ [ 50]  │ 01-13~19│ [150]  │  -  │[3] │ 진행│
│ │ 신촌분식 ⚠️    │ 01-13~19│ [100]  │    -    │   -    │  -  │ -  │ 수동│
│ └────────────────┴─────────┴────────┴─────────┴────────┴─────┴────┴─────┘│
│                                                                             │
│ ⚠️ = Manual Override (개별 문서에서 수동 수정됨, 일괄 저장 시 보호)        │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Cell 데이터 구조:**
```typescript
interface GridCellData {
  qty: number;              // 수량
  startDate: string;        // 시작일 (YYYY-MM-DD)
  endDate: string;          // 종료일 (YYYY-MM-DD)
  isManualOverride: boolean; // 수동 수정 여부
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED';
  linkedSalesOrderItemId?: string;
  linkedPurchaseOrderItemId?: string;
}
```

**프로세스 연결:**
```
주간 발주 그리드 ←→ 수주(SalesOrder) → 발주(PurchaseOrder) → 정산(Settlement)
                         ↓
                    거래명세서(Statement)
```

### 2.2 상품(마케팅 서비스) 마스터 (20개)

> **출처**: `PRODUCTS_PURCHASEORDERS_ENHANCEMENT.md`

| 유형 | 상품(마케팅 서비스) | 코드 |
|------|---------------------|------|
| 트래픽 | 피닉스, 호올스, 히든, 엑셀런트, 토스, 다타, 언더더딜, 퍼펙트, 버즈빌, 텐케이 | PHOENIX, HOALLS, HIDDEN, EXCELLENT, TOSS, DATA, UNDERTHEDEAL, PERFECT, BUZZVIL, TENK |
| 길찾기 | 홈런볼/길찾, 말차길찾기, 버즈빌길 | HOMERUNBALL, MATCHA_DIR, BUZZVIL_DIR |
| 블로그 | 실블, 비실 | REAL_BLOG, ANON_BLOG |
| 리뷰 | 겟, 추가, 247 | GET, EXTRA, 247 |
| 영수증 | 영수증(퍼플), 영수증(애드), 영수증(불곰) | RECEIPT_PURPLE, RECEIPT_AD, RECEIPT_BEAR |

### 2.3 고객-매장 데이터 정규화

> **출처**: `CUSTOMERS_ENHANCEMENT.md` + `TAX_INVOICE_AUTOMATION.md`

**핵심 개념:**
- **고객(Customer)**: 계약/정산 주체 (Bill-To Party) - 세금계산서 발행 대상
- **매장(Store)**: 서비스 제공 대상 (Service Location) - 마케팅 작업 대상

**데이터 품질 현황:**
```
거래처 94개:
├─ 사업자번호: 100% ✅
├─ 대표자명: 98% ✅
├─ 이메일: 81% ⚠️ (19% 세금계산서 발송 불가)
├─ 주소: 21% ⚠️
└─ 연락처: 0% ❌
```

---

## 3. 구현 Task 목록

### 3.1 인프라 (Foundation)

| ID | Task | 관련 문서 | 우선순위 | 예상 공수 |
|----|------|----------|---------|----------|
| F-01 | 공용 컴포넌트: DataTable | `COMMON_COMPONENTS.md` | 🔴 높음 | 4h |
| F-02 | 공용 컴포넌트: BulkActionBar | `COMMON_COMPONENTS.md` | 🔴 높음 | 3h |
| F-03 | 공용 컴포넌트: Excel (Import/Export/Template) | `COMMON_COMPONENTS.md` | 🔴 높음 | 6h |
| F-04 | 공용 Hook: useSelection, useBulkAction, useExcel | `COMMON_COMPONENTS.md` | 🔴 높음 | 4h |
| F-05 | 패키지 설치: xlsx, file-saver | - | ✅ 완료 | - |

### 3.2 마스터 데이터 (Master Data)

| ID | Task | 관련 문서 | 우선순위 | 예상 공수 |
|----|------|----------|---------|----------|
| M-01 | 상품 마스터 등록 (20개 마케팅 서비스) | `PRODUCTS_PURCHASEORDERS_ENHANCEMENT.md` | 🔴 높음 | 2h |
| M-02 | 거래처목록 Import API | `DATA_ANALYSIS_INTEGRATION.md` | 🔴 높음 | 4h |
| M-03 | 거래처 94건 마이그레이션 | `DATA_ANALYSIS_INTEGRATION.md` | 🔴 높음 | 2h |
| M-04 | 고객-매장 연결 검증 | `CUSTOMERS_ENHANCEMENT.md` | 🟡 중간 | 2h |

### 3.3 고객 관리 (Customers)

| ID | Task | 관련 문서 | 우선순위 | 예상 공수 |
|----|------|----------|---------|----------|
| C-01 | 목록 페이지 리팩토링 (공용 컴포넌트 적용) | `CUSTOMERS_ENHANCEMENT.md` | 🟡 중간 | 3h |
| C-02 | 엑셀 업로드/다운로드 API | `DATA_PATTERNS.md` | 🟡 중간 | 4h |
| C-03 | 세금계산서 준비 상태 뱃지 | `CUSTOMERS_ENHANCEMENT.md` | 🟡 중간 | 2h |
| C-04 | 고객-매장 동기화 다이얼로그 | `CUSTOMERS_ENHANCEMENT.md` | 🟢 낮음 | 3h |
| C-05 | 데이터 품질 대시보드 | `DATA_ANALYSIS_INTEGRATION.md` | 🟢 낮음 | 3h |

### 3.4 상품 관리 (Products)

| ID | Task | 관련 문서 | 우선순위 | 예상 공수 |
|----|------|----------|---------|----------|
| P-01 | 유형별 그룹화 뷰 | `PRODUCTS_PURCHASEORDERS_ENHANCEMENT.md` | 🟡 중간 | 3h |
| P-02 | 단가 일괄 수정 기능 | `PRODUCTS_PURCHASEORDERS_ENHANCEMENT.md` | 🟢 낮음 | 3h |
| P-03 | 엑셀 업로드/다운로드 API | `DATA_PATTERNS.md` | 🟢 낮음 | 3h |

### 3.5 발주 관리 (Purchase Orders) - 🔴 핵심

| ID | Task | 관련 문서 | 우선순위 | 예상 공수 |
|----|------|----------|---------|----------|
| **PO-01** | **주간 발주 그리드 UI** | `batch_order_system_proposal.md` | 🔴 높음 | 8h |
| **PO-02** | **기간 설정 컴포넌트 (DateRange)** | `batch_order_system_proposal.md` | 🔴 높음 | 4h |
| **PO-03** | **그리드 저장 API (SO/PO 연동)** | `batch_order_system_proposal.md` | 🔴 높음 | 6h |
| PO-04 | 주간별 그룹화 뷰 (목록) | `PRODUCTS_PURCHASEORDERS_ENHANCEMENT.md` | 🟡 중간 | 3h |
| PO-05 | 접수시트 양식 템플릿 | `PRODUCTS_PURCHASEORDERS_ENHANCEMENT.md` | 🟡 중간 | 2h |
| PO-06 | 주간 일괄 업로드 (엑셀) | `PRODUCTS_PURCHASEORDERS_ENHANCEMENT.md` | 🟡 중간 | 4h |
| PO-07 | Manual Override 보호 로직 | `batch_order_system_proposal.md` | 🟡 중간 | 3h |
| PO-08 | Google Sheet 전송 기능 | 기존 기능 | 🟢 낮음 | 2h |

### 3.6 세금계산서 (Tax Invoice)

| ID | Task | 관련 문서 | 우선순위 | 예상 공수 |
|----|------|----------|---------|----------|
| T-01 | 홈택스 양식 Export API | `TAX_INVOICE_AUTOMATION.md` | 🟡 중간 | 4h |
| T-02 | 정산-세금계산서 연동 | `TAX_INVOICE_AUTOMATION.md` | 🟡 중간 | 3h |
| T-03 | 발행 전 검증 체크 | `TAX_INVOICE_AUTOMATION.md` | 🟢 낮음 | 2h |

---

## 4. 구현 순서 (Phases)

### Phase 1: 인프라 구축 (Foundation) - 1주

```
목표: 공용 컴포넌트 완성, 재사용 기반 마련

┌─────────────────────────────────────────────────────────────┐
│ Week 1                                                      │
├─────────────────────────────────────────────────────────────┤
│ F-01 DataTable ──┬──→ F-02 BulkActionBar                   │
│                  │                                          │
│ F-03 Excel ──────┴──→ F-04 Hooks                           │
│                                                             │
│ M-01 상품 마스터 등록 (20개 마케팅 서비스)                  │
└─────────────────────────────────────────────────────────────┘
```

**산출물:**
- `components/common/data-table/`
- `components/common/bulk-actions/`
- `components/common/excel/`
- `components/common/hooks/`
- 상품 마스터 데이터 (DB)

### Phase 2: 마스터 데이터 정비 - 0.5주

```
목표: 거래처 데이터 마이그레이션, 고객-매장 연결

┌─────────────────────────────────────────────────────────────┐
│ Week 2 (전반)                                               │
├─────────────────────────────────────────────────────────────┤
│ M-02 거래처 Import API ──→ M-03 94건 마이그레이션           │
│                                                             │
│ M-04 고객-매장 연결 검증                                    │
└─────────────────────────────────────────────────────────────┘
```

**산출물:**
- `/api/customers/import-legacy` API
- Customer 테이블 94건
- 고객-매장 연결 완료

### Phase 3: 주간 발주 시스템 (핵심) - 1.5주

```
목표: Smart Grid 구현, 수주/발주 연동

┌─────────────────────────────────────────────────────────────┐
│ Week 2 (후반) ~ Week 3                                      │
├─────────────────────────────────────────────────────────────┤
│ PO-02 DateRange ──→ PO-01 주간 발주 그리드 UI              │
│                            │                                │
│                            ▼                                │
│                     PO-03 그리드 저장 API                   │
│                            │                                │
│                            ▼                                │
│                     PO-07 Manual Override 보호              │
└─────────────────────────────────────────────────────────────┘
```

**산출물:**
- `/purchase-orders/weekly` 페이지 (Smart Grid)
- `/api/purchase-orders/grid-save` API
- SalesOrder ↔ PurchaseOrder 자동 연동

### Phase 4: 고객/상품 관리 고도화 - 1주

```
목표: 엑셀 기능 적용, UI 개선

┌─────────────────────────────────────────────────────────────┐
│ Week 4                                                      │
├─────────────────────────────────────────────────────────────┤
│ C-01 고객 목록 리팩토링 ──→ C-02 엑셀 API                   │
│                                                             │
│ P-01 상품 그룹화 뷰 ──→ C-03 세금계산서 준비 상태           │
│                                                             │
│ PO-04 발주 주간 그룹화 ──→ PO-05 접수시트 템플릿            │
└─────────────────────────────────────────────────────────────┘
```

### Phase 5: 세금계산서 자동화 - 0.5주

```
목표: 홈택스 양식 자동 생성

┌─────────────────────────────────────────────────────────────┐
│ Week 5 (전반)                                               │
├─────────────────────────────────────────────────────────────┤
│ T-01 홈택스 Export API ──→ T-02 정산 연동                   │
│                                                             │
│ T-03 발행 전 검증                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. API 엔드포인트 종합

### 신규 구현 필요

| 메서드 | 엔드포인트 | 기능 | Phase |
|--------|-----------|------|-------|
| **POST** | `/api/purchase-orders/grid-save` | 주간 그리드 저장 (SO/PO 연동) | 3 |
| **GET** | `/api/purchase-orders/grid-load` | 주간 그리드 로드 | 3 |
| POST | `/api/customers/import-legacy` | 거래처목록 마이그레이션 | 2 |
| GET | `/api/customers/quality-report` | 데이터 품질 리포트 | 4 |
| GET | `/api/tax-invoices/export-hometax` | 홈택스 양식 Export | 5 |
| PATCH | `/api/{resource}/bulk` | 일괄 수정/삭제 (공통) | 4 |
| POST | `/api/{resource}/import` | 엑셀 업로드 (공통) | 4 |
| GET | `/api/{resource}/export` | 엑셀 다운로드 (공통) | 4 |
| GET | `/api/{resource}/template` | 양식 다운로드 (공통) | 4 |

---

## 6. 문서 정리 작업

### 통합/이동 필요

| 현재 위치 | 조치 | 대상 |
|----------|------|------|
| `docs/Temp/batch_order_system_proposal.md` | → `docs/progress/` 이동 | 주간 발주 시스템 |
| `docs/Temp/` | 폴더 삭제 (모든 문서 이동 완료 후) | - |

### 업데이트 필요

| 문서 | 업데이트 내용 |
|------|-------------|
| `PRODUCTS_PURCHASEORDERS_ENHANCEMENT.md` | `batch_order_system_proposal.md` 내용 병합 (기간 관리, Smart Grid) |
| `CONTEXT_SUMMARY.md` | 이 로드맵 문서 추가 |

---

## 7. 체크리스트

### Phase 1 완료 기준
- [ ] DataTable 컴포넌트 동작
- [ ] BulkActionBar 컴포넌트 동작
- [ ] Excel Import/Export 컴포넌트 동작
- [ ] 상품(마케팅 서비스) 20개 등록

### Phase 2 완료 기준
- [ ] 거래처 Import API 동작
- [ ] Customer 테이블 94건 존재
- [ ] 고객-매장 연결 완료

### Phase 3 완료 기준
- [ ] 주간 발주 그리드 UI 동작
- [ ] 기간 설정 (일괄/개별) 가능
- [ ] 저장 시 SalesOrder/PurchaseOrder 생성
- [ ] 기존 데이터 Load/Edit 가능
- [ ] Manual Override 보호 동작

### Phase 4 완료 기준
- [ ] 고객 목록 엑셀 업로드/다운로드 가능
- [ ] 상품 유형별 그룹화 뷰 동작
- [ ] 세금계산서 준비 상태 표시

### Phase 5 완료 기준
- [ ] 홈택스 양식 다운로드 가능
- [ ] 정산 데이터 기반 자동 생성
- [ ] 누락 정보 경고 표시

---

## 8. 결론

### 핵심 우선순위 (Top 5)

1. **공용 컴포넌트 구현** - 모든 페이지의 기반
2. **상품(마케팅 서비스) 마스터 등록** - 발주 시스템의 기초 데이터
3. **주간 발주 그리드 (Smart Grid)** - 업무 핵심 기능
4. **거래처 데이터 마이그레이션** - 세금계산서 발행 전제
5. **홈택스 양식 Export** - 정산 업무 자동화

### 예상 총 공수

| Phase | 기간 | 주요 산출물 |
|-------|------|------------|
| Phase 1 | 1주 | 공용 컴포넌트, 상품 마스터 |
| Phase 2 | 0.5주 | 거래처 94건 마이그레이션 |
| Phase 3 | 1.5주 | **주간 발주 Smart Grid** |
| Phase 4 | 1주 | 고객/상품 관리 엑셀 기능 |
| Phase 5 | 0.5주 | 세금계산서 자동화 |
| **합계** | **4.5주** | |

---

**작성자**: Claude Opus 4.5
**문서 버전**: 1.0
