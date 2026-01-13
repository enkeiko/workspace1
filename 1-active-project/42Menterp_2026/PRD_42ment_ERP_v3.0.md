# 42ment 네이버 플레이스 마케팅 ERP PRD v3.0

> **작성일**: 2026-01-12  
> **버전**: 3.0  
> **상태**: 최종 검토 대기

---

## 0. 문서 구성 안내

이 문서는 전체 인덱스 및 루프 설계 요약본입니다.  
상세 내용은 아래 챕터 문서로 분리되어 있습니다(문서당 800줄 이하).

## 1. 용어 정리 (혼동 방지)

- 상품 = 기존 문서의 “채널” (발주 단위)
- 알림 채널 = 시스템/카카오/이메일/슬랙 등 통신 채널

---

## 2. End-to-End 업무 루프 설계

### 2.1 개념 흐름
```
고객(Customer)
  → 매장(Store)
    → 상품(Product)
      → 견적(Quotation)
        → 주문/수주(Sales Order)
          → 발주(Purchase Order)
            → 명세(Work Statement)
              → 정산(Settlement)
                → 세금계산서/입금
```

### 2.2 핵심 연결 규칙
- **견적 → 주문/수주**: 견적 승인(accepted) 시 주문 생성
- **주문/수주 → 발주**: 주문 확정 시 상품별로 발주 분리 생성
- **발주 → 명세**: 수주 시트(작업결과) 동기화로 명세 생성/갱신
- **명세 → 정산**: 명세 확정 시 정산 라인 생성
- **정산 → 계산서/입금**: 정산 완료 시 계산서 발행 및 입금 매칭

### 2.3 데이터 연계 원칙
- 모든 문서는 상위 문서 ID를 보유하여 역추적 가능
- 수량/단가/기간은 **스냅샷**으로 저장해 재현 가능
- 상태 전이는 상위 → 하위 순으로 진행 (상위 취소 시 하위 자동 정리)

### 2.4 연결 키
- `customer_id` → `store_id` → `product_id`
- `quotation_id` → `sales_order_id` → `purchase_order_id`
- `work_statement_id` → `settlement_id`

### 2.5 문서 상태 전이 규칙

| 상위 문서 액션 | 하위 문서 처리 | 비고 |
|--------------|--------------|------|
| 견적 삭제 | 연결된 주문이 없으면 삭제 가능 | 주문 있으면 취소만 |
| 견적 취소 | 연결된 주문에 영향 없음 | 주문은 독립 상태 유지 |
| 주문 취소 | 발주대기 발주만 자동 취소 | 진행중 발주는 경고 후 수동 처리 |
| 발주 취소 | 작업로그 soft delete | 명세 생성 전만 취소 가능 |
| 명세 확정 | 정산 라인 자동 생성 | 확정 후 수정 불가 (locked) |

**취소 불가 조건:**
- 명세가 확정(confirmed)된 발주는 취소 불가
- 정산 완료(paid)된 명세는 수정 불가
- 세금계산서 발행된 정산은 취소 불가

### 2.6 스냅샷 규칙

| 시점 | 저장 항목 | 테이블.컬럼 |
|------|----------|------------|
| 견적 생성 | 상품 단가 | `quotation_items.unit_price` |
| 주문 생성 | 상품 단가 | `sales_order_items.unit_price` |
| 발주 확정 | 확정 단가 | `purchase_order_items.unit_price` |
| 명세 확정 | 최종 단가 | `work_statement_items.unit_price_snapshot` |

**스냅샷 원칙:**
- 상품 마스터 단가 변경 시 기존 문서에 영향 없음
- 각 문서는 생성/확정 시점의 단가를 보유
- 정산은 명세의 스냅샷 단가 기준으로 계산

---

## 3. 챕터 문서 맵

| 문서 | 내용 |
|------|------|
| `docs/PRD_v3.0/PRD_42ment_ERP_v3.0_01_Business_Architecture.md` | 비즈니스/아키텍처 |
| `docs/PRD_v3.0/PRD_42ment_ERP_v3.0_02_Users_Stores.md` | 사용자/고객/매장 |
| `docs/PRD_v3.0/PRD_42ment_ERP_v3.0_03_Product_Quotation.md` | 상품/견적 |
| `docs/PRD_v3.0/PRD_42ment_ERP_v3.0_04_Order_Sheets.md` | 주문/발주/시트 연동 |
| `docs/PRD_v3.0/PRD_42ment_ERP_v3.0_05_Settlement_Billing.md` | 명세/정산/바로빌 |
| `docs/PRD_v3.0/PRD_42ment_ERP_v3.0_06_Partners.md` | 파트너사 |
| `docs/PRD_v3.0/PRD_42ment_ERP_v3.0_07_Work_Tracking.md` | 작업로그/키워드 트래킹 |
| `docs/PRD_v3.0/PRD_42ment_ERP_v3.0_08_Notifications_Dashboard.md` | 알림/대시보드 |
| `docs/PRD_v3.0/PRD_42ment_ERP_v3.0_09_System_ERD_Roadmap_NFR.md` | 시스템/ERD/로드맵/비기능 |
| `docs/PRD_v3.0/PRD_42ment_ERP_v3.0_10_Appendix.md` | 부록 |
