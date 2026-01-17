# AdTech Marketing ERP 구현용 에이전트 프롬프트

> **작성일**: 2026-01-16
> **작성자**: Claude (Chief Software Architect)
> **용도**: 다른 Claude Code 에이전트에게 복사-붙여넣기로 전달하여 독립 실행
> **기반 문서**: [20260116_AdTech_Marketing_ERP_Comprehensive_Spec_by_Claude.md](../Domain/20260116_AdTech_Marketing_ERP_Comprehensive_Spec_by_Claude.md)

---

## 사용 방법

1. 아래 프롬프트 중 하나를 **전체 복사**
2. 새로운 Claude Code 세션 시작
3. 프롬프트를 **그대로 붙여넣기**
4. 에이전트가 자동으로 구현 시작

각 프롬프트는 **완전히 독립적**이며, 다른 문서를 참조하지 않고도 실행 가능합니다.

---

## 프롬프트 목록

### P0-1: Universal Search API 구현
### P0-2: Performance-based Billing 자동 정산
### P1-1: Smart Extension (캠페인 자동 연장)
### P1-2: Bulk Evidence Upload (증빙 일괄 업로드)
### P2-1: Client Secret Viewer (고객 공개 리포트)
### P2-2: Traffic Distribution (작업 분배 자동화)
### P3-1: Retroactive Settlement (과거 정산 처리)

---

# P0-1: Universal Search API 구현

```
# Context
당신은 광고 대행사 ERP 시스템(42Menterp_2026)의 백엔드 개발자입니다.
현재 시스템은 주문번호로만 검색이 가능하지만, 광고주는 "강남역 맛집" 같은 키워드로 모든 관련 작업을 찾고 싶어합니다.

# Problem
- 주문번호 기반 검색만 가능 (광고주는 주문번호를 기억하지 못함)
- 키워드, 매장, 작업 타입별 검색 불가
- 검색 결과를 그룹핑해서 보여주지 못함

# Task
다음을 구현하세요:

1. **Schema 확장** (app/prisma/schema.prisma)
   - PurchaseOrderItem, StoreKeyword 모델에 Full-Text Search 인덱스 추가
   ```prisma
   model PurchaseOrderItem {
     keyword String
     @@index([keyword])
     @@fulltext([keyword, note])
   }
   ```

2. **Universal Search API** (app/src/app/api/search/universal/route.ts)
   - Promise.all로 4가지 병렬 검색:
     * 캠페인 (PurchaseOrderItem)
     * 매장 (Store)
     * 키워드 (StoreKeyword)
     * 주문 (PurchaseOrder)
   - 키워드별 그룹핑 함수 구현
   - 응답 형식:
   ```typescript
   {
     results: {
       campaigns: Array<{keyword, stores, totalOrders, activeCount, currentRank}>,
       stores: Array<Store & {keywords, customer}>,
       keywords: Array<StoreKeyword & {store, rankings}>,
       orders: Array<PurchaseOrder & {items, channel}>
     },
     meta: {totalCount, query}
   }
   ```

3. **검색 결과 UI** (components/search/universal-search-results.tsx)
   - 키워드별로 카드 형태로 표시
   - 메타데이터 시각화:
     * 현재 순위 (목표 순위와 함께)
     * 남은 기간 (D-day)
     * 작업 완료율
   - 매장 목록 미리보기 (최대 5개)

# Deliverables
1. schema.prisma (인덱스 추가)
2. app/src/app/api/search/universal/route.ts (완전한 구현)
3. components/search/universal-search-results.tsx (완전한 UI)
4. 테스트: curl 또는 Postman으로 "/api/search/universal?q=강남" 테스트

# Acceptance Criteria
- "강남" 검색 시 관련된 모든 캠페인, 매장, 키워드, 주문이 반환됨
- 검색 응답 시간 < 500ms (병렬 쿼리)
- 키워드별로 그룹핑되어 표시됨
- UI에서 현재 순위, D-day, 완료율이 표시됨

# 참조 기술 스택
- Next.js 16 App Router
- Prisma ORM
- PostgreSQL
- TypeScript
- shadcn/ui
```

---

# P0-2: Performance-based Billing 자동 정산

```
# Context
광고 대행사는 "5위 이내 보장형" 같은 성과 기반 계약을 합니다.
매일 순위를 체크하여, 목표를 달성하지 못한 날만큼 자동으로 환불해야 합니다.

# Problem
- 성과 목표(targetRank)를 저장할 필드가 없음
- 순위 체크 결과와 정산이 수동 연동
- 월말에 수동으로 환불 금액 계산

# Task
다음을 구현하세요:

1. **Schema 확장** (app/prisma/schema.prisma)
   ```prisma
   model PurchaseOrderItem {
     // 성과 목표
     goalType      GoalType   @default(RANKING)
     targetRank    Int?       @default(5)
     guaranteeDays Int?       @default(25)

     // 성과 측정 결과
     successDays   Int        @default(0)
     failDays      Int        @default(0)
     currentRank   Int?

     // 정산
     refundPerDay  Int?
   }

   enum GoalType {
     RANKING
     TRAFFIC
     FULL_PERIOD
   }

   model BillingRule {
     id                String       @id @default(cuid())
     productId         String
     product           Product      @relation(fields: [productId], references: [id])
     ruleType          BillingRuleType
     targetRank        Int?
     minCompletionRate Float?
     refundType        RefundType   @default(DAILY_PRORATED)
     refundRate        Float        @default(1.0)
     effectiveFrom     DateTime     @default(now())
     effectiveTo       DateTime?
     isActive          Boolean      @default(true)
     createdAt         DateTime     @default(now())

     @@index([productId])
   }

   enum BillingRuleType {
     RANK_GUARANTEE
     COMPLETION_BASED
     HYBRID
   }

   enum RefundType {
     DAILY_PRORATED
     FULL_REFUND
     NO_REFUND
   }
   ```

2. **BillingCalculatorService** (services/billing-calculator.service.ts)
   - calculatePerformanceBilling(item, month) 메서드:
     * 해당 월의 KeywordRanking 조회
     * targetRank와 비교하여 achievedDays, failedDays 계산
     * dailyRate * failedDays * refundRate = deductionAmount
     * billableAmount = amount - deductionAmount
   - executeMonthlySettlement(month) 메서드:
     * 해당 월 종료된 모든 항목 조회
     * 각 항목별로 calculatePerformanceBilling 실행
     * Settlement 레코드 생성

3. **Profitability API** (app/src/app/api/analytics/profitability/route.ts)
   - 매출, 매입, 환불 집계
   - grossProfit, netProfit, grossMargin, netMargin 계산
   - 상품별/채널별/고객별 breakdown

4. **Profitability Dashboard** (app/src/app/(dashboard)/analytics/profitability/page.tsx)
   - KPI 카드 4개: 매출, 원가, 환불, 마진율
   - Waterfall Chart (수익성 분해)
   - 상품별 마진 테이블

# Deliverables
1. schema.prisma (BillingRule, enum 추가)
2. services/billing-calculator.service.ts
3. app/src/app/api/analytics/profitability/route.ts
4. app/src/app/(dashboard)/analytics/profitability/page.tsx
5. Migration 실행: npx prisma migrate dev

# Acceptance Criteria
- BillingRule에 따라 자동 환불 계산됨
- Profitability API가 실시간 마진 반환
- Dashboard에서 순이익과 마진율이 정확히 표시됨
- 성과 미달 시 unbillableAmount에 환불액 저장됨
```

---

# P1-1: Smart Extension (캠페인 자동 연장)

```
# Context
광고 계약이 만료되면 고객이 이탈합니다.
시스템이 D-3일 때 자동으로 감지하고, 원클릭으로 동일 조건 연장을 제안해야 합니다.

# Problem
- 만료 예정 주문을 수동으로 확인
- 연장 시 새로 견적 → 주문 → 발주 생성 (5단계)
- 재계약 누락으로 고객 이탈

# Task
다음을 구현하세요:

1. **Schema 추가** (app/prisma/schema.prisma)
   ```prisma
   model CampaignRenewal {
     id                String          @id @default(cuid())
     originalOrderId   String
     originalOrder     PurchaseOrder   @relation("OriginalOrder", fields: [originalOrderId], references: [id])
     proposedStartDate DateTime
     proposedEndDate   DateTime
     proposedAmount    Int
     status            RenewalStatus   @default(PENDING)
     renewedOrderId    String?         @unique
     renewedOrder      PurchaseOrder?  @relation("RenewedOrder", fields: [renewedOrderId], references: [id])
     expiryNotifiedAt  DateTime?
     acceptedAt        DateTime?
     acceptedById      String?
     acceptedBy        User?           @relation(fields: [acceptedById], references: [id])
     createdAt         DateTime        @default(now())

     @@index([originalOrderId])
     @@index([status])
   }

   enum RenewalStatus {
     PENDING
     ACCEPTED
     DECLINED
     EXPIRED
   }
   ```

2. **Cron Job** (app/src/app/api/cron/renewal-proposals/route.ts)
   - 3일 내 만료 예정 주문 조회
   - CampaignRenewal 자동 생성
   - 알림 전송 (Slack/Email)

3. **Renewal API** (app/src/app/api/renewals/accept/route.ts)
   - 원본 주문의 모든 항목 복제
   - 새 PurchaseOrder 생성 (status: CONFIRMED)
   - CampaignRenewal.status = ACCEPTED로 변경

4. **RenewalCard UI** (components/renewal/renewal-card.tsx)
   - D-Day Color Coding:
     * D-0: bg-red-50
     * D-3: bg-orange-50
     * D-7: bg-yellow-50
   - "동일 조건으로 연장" 버튼
   - 원본 캠페인 정보 표시
   - 연장 기간/금액 표시

# Deliverables
1. schema.prisma (CampaignRenewal 추가)
2. app/src/app/api/cron/renewal-proposals/route.ts
3. app/src/app/api/renewals/accept/route.ts
4. components/renewal/renewal-card.tsx
5. Cron 설정 (Vercel Cron 또는 GitHub Actions)

# Acceptance Criteria
- D-3일에 자동으로 CampaignRenewal 생성됨
- "연장" 버튼 클릭 시 새 주문이 자동 생성됨
- 새 주문은 원본과 동일한 항목, 단가, 키워드를 가짐
- D-Day에 따라 카드 배경색이 변경됨
```

---

# P1-2: Bulk Evidence Upload (증빙 일괄 업로드)

```
# Context
작업자가 50개 블로그 URL을 수동으로 입력하는 것은 비효율적입니다.
엑셀 파일로 [주문번호, 키워드, URL]만 업로드하면 자동 매칭되어야 합니다.

# Problem
- 증빙 URL을 하나씩 수동 입력
- 썸네일을 수동으로 캡처하여 업로드
- 작업 완료 처리를 수동으로 해야 함

# Task
다음을 구현하세요:

1. **Bulk Upload API** (app/src/app/api/proof/bulk-upload/route.ts)
   - 엑셀 파싱 (xlsx 라이브러리)
   - 예상 포맷: | 주문번호 | 키워드 | 매장명 | 작업URL | 완료일 |
   - PurchaseOrderItem 매칭 (주문번호 + 키워드 + 매장명)
   - proofUrl 업데이트
   - status를 COMPLETED로 변경
   - 썸네일 생성 Job 큐에 추가

2. **Thumbnail Generator** (lib/thumbnail-generator.ts)
   - Puppeteer로 URL 스크린샷 생성
   - OG 이미지 추출 시도
   - S3/Cloudinary/Vercel Blob에 업로드
   - PurchaseOrderItem.thumbnailUrl 업데이트

3. **Upload Form UI** (components/proof/bulk-upload-form.tsx)
   - 파일 업로드 Input
   - 업로드 진행 상태 표시
   - 결과 요약: 총 건수, 성공, 실패
   - 실패 건 상세 내역 표시

# Deliverables
1. app/src/app/api/proof/bulk-upload/route.ts
2. lib/thumbnail-generator.ts
3. components/proof/bulk-upload-form.tsx
4. package.json (xlsx, puppeteer 추가)
5. 테스트 엑셀 파일 샘플

# Acceptance Criteria
- 엑셀 업로드 시 자동으로 PurchaseOrderItem 매칭됨
- proofUrl이 정확히 저장됨
- 썸네일이 자동 생성되어 thumbnailUrl에 저장됨
- 성공/실패 건수가 정확히 표시됨
- 매칭 실패 시 오류 메시지 표시됨
```

---

# P2-1: Client Secret Viewer (고객 공개 리포트)

```
# Context
고객에게 매번 엑셀 파일을 이메일로 보내는 것은 비효율적입니다.
로그인 없이 접근 가능한 비밀 링크를 생성하여 실시간 성과를 공유해야 합니다.

# Problem
- 보고서를 엑셀로 만들어 이메일 전송
- 버전 관리 문제 (고객이 이전 버전을 봄)
- 실시간 성과 반영 불가

# Task
다음을 구현하세요:

1. **Schema 추가** (app/prisma/schema.prisma)
   ```prisma
   model ClientReport {
     id              String   @id @default(cuid())
     secretToken     String   @unique @default(cuid())
     salesOrderId    String
     salesOrder      SalesOrder @relation(fields: [salesOrderId], references: [id])
     title           String
     description     String?
     showPricing     Boolean  @default(false)
     expiresAt       DateTime?
     viewCount       Int      @default(0)
     lastViewedAt    DateTime?
     createdAt       DateTime @default(now())
     updatedAt       DateTime @updatedAt

     @@index([secretToken])
   }
   ```

2. **Report Creation API** (app/src/app/api/reports/create/route.ts)
   - ClientReport 생성
   - secretToken 자동 생성 (cuid)
   - 공유 URL 반환: `${NEXT_PUBLIC_URL}/reports/${secretToken}`

3. **Public Report Page** (app/src/app/reports/[token]/page.tsx)
   - 로그인 불필요 (Public Route)
   - 만료 체크 (expiresAt)
   - 조회수 증가 (viewCount++)
   - 성과 요약 카드 3개: 총 키워드, 완료율, 평균 순위
   - 키워드별 상세:
     * 순위 그래프 (RankingChart)
     * 작업 증빙 썸네일
     * 현재 순위 vs 목표 순위
   - PDF Export 버튼

4. **PDF Export** (lib/pdf-exporter.ts)
   - Puppeteer로 /reports/[token] 페이지를 PDF로 변환
   - 또는 react-pdf 라이브러리 사용

# Deliverables
1. schema.prisma (ClientReport 추가)
2. app/src/app/api/reports/create/route.ts
3. app/src/app/reports/[token]/page.tsx
4. lib/pdf-exporter.ts
5. Migration 실행

# Acceptance Criteria
- 공유 링크가 로그인 없이 접근 가능
- 만료일 지난 링크는 접근 불가
- 조회수가 정확히 카운트됨
- 순위 그래프가 정확히 표시됨
- PDF Export 버튼 클릭 시 다운로드됨
```

---

# P2-2: Traffic Distribution (작업 분배 자동화)

```
# Context
1,000개 트래픽 주문을 5개 실행사에 나누는 작업을 수동으로 하면 1시간 이상 걸립니다.
드래그 앤 드롭으로 배정하거나, 자동 분배 알고리즘을 사용해야 합니다.

# Problem
- 주문을 실행사별로 수동 분배
- 실행사별 용량을 고려하지 못함
- 최저가 실행사를 찾기 어려움

# Task
다음을 구현하세요:

1. **Distribution Service** (services/distribution.service.ts)
   - autoDistribute(orderItems) 메서드:
     * 채널별 현재 부하 조회
     * 채널별 용량 계산 (maxMonthlyQty - currentLoad)
     * 최소 비용 우선 정렬
     * 용량이 있는 가장 저렴한 채널에 할당
     * Map<channelId, items[]> 반환

2. **Distribution Board UI** (components/distribution/traffic-distribution-board.tsx)
   - @dnd-kit/core 사용
   - 미할당 풀 (Unassigned)
   - 채널별 칸반 카드
   - 드래그 앤 드롭으로 할당
   - "자동 분배" 버튼
   - "{count}건 채널에 전송" 버튼

3. **Bulk Assign API** (app/src/app/api/distribution/bulk-assign/route.ts)
   - 선택된 항목들의 channelId 일괄 업데이트
   - PurchaseOrder 생성 (채널별로)

# Deliverables
1. services/distribution.service.ts
2. components/distribution/traffic-distribution-board.tsx
3. app/src/app/api/distribution/bulk-assign/route.ts
4. package.json (@dnd-kit/core 추가)

# Acceptance Criteria
- 드래그 앤 드롭으로 채널 할당 가능
- 자동 분배 시 최저가 채널 우선 선택
- 채널 용량 초과 시 경고 표시
- 일괄 전송 시 채널별로 PurchaseOrder 생성됨
```

---

# P3-1: Retroactive Settlement (과거 정산 처리)

```
# Context
시스템 도입 전의 과거 정산 데이터(엑셀)를 임포트해야 합니다.
또한, 확정된 정산에서 누락 건이 발견되면 재계산하여 차액을 조정해야 합니다.

# Problem
- 과거 1년치 데이터를 수동 입력해야 함
- 확정된 정산 수정 불가
- 누락 건 발견 시 처리 방법 없음

# Task
다음을 구현하세요:

1. **Schema 확장** (app/prisma/schema.prisma)
   ```prisma
   model Settlement {
     // 기존 필드...

     // 소급분 정산
     isRetroactive   Boolean @default(false)
     originalMonth   String?
     adjustmentNote  String?

     @@index([isRetroactive])
     @@index([originalMonth])
   }
   ```

2. **Legacy Import API** (app/src/app/api/legacy/import-settlement/route.ts)
   - 엑셀 파싱
   - 예상 포맷: | 매장명 | 키워드 | 작업유형 | 수량 | 단가 | 금액 | 성공여부 |
   - 매장 자동 생성 (없으면)
   - Settlement 직접 생성 (isRetroactive: true)
   - 성공/실패 결과 반환

3. **Recalculation API** (app/src/app/api/settlements/recalculate/route.ts)
   - 기존 정산액 조회 (CONFIRMED/PAID 상태)
   - 실제 데이터로 재계산
   - 차액 계산 (actualTotal - existingTotal)
   - 차액 정산서 생성 (type: COST 또는 REFUND)

4. **Legacy Import Form** (components/legacy/legacy-import-form.tsx)
   - 대상 월 선택 (Input type="month")
   - 엑셀 파일 업로드
   - 임포트 버튼
   - 결과 표시

5. **Recalculation Button** (components/settlement/recalculation-button.tsx)
   - "재계산" 버튼
   - 확인 다이얼로그
   - 차액 정산서 생성 알림

6. **Settlement List Filter** (components/settlement/settlement-list.tsx)
   - 소급분 포함/제외 토글
   - 소급분 행은 bg-yellow-50 배경
   - Badge로 "소급 (원래 월)" 표시

# Deliverables
1. schema.prisma (Settlement 필드 추가)
2. app/src/app/api/legacy/import-settlement/route.ts
3. app/src/app/api/settlements/recalculate/route.ts
4. components/legacy/legacy-import-form.tsx
5. components/settlement/recalculation-button.tsx
6. components/settlement/settlement-list.tsx
7. Migration 실행

# Acceptance Criteria
- 엑셀 업로드 시 과거 정산 데이터가 임포트됨
- isRetroactive: true로 저장됨
- 재계산 시 차액 정산서가 생성됨
- 소급분 필터링이 정확히 작동함
- 소급분 행이 시각적으로 구분됨
```

---

## 실행 순서 권장사항

**Phase 1 (필수, 먼저 실행)**:
1. P0-1: Universal Search API 구현
2. P0-2: Performance-based Billing 자동 정산

**Phase 2 (중요)**:
3. P1-1: Smart Extension
4. P1-2: Bulk Evidence Upload

**Phase 3 (선택)**:
5. P2-1: Client Secret Viewer
6. P2-2: Traffic Distribution

**Phase 4 (데이터 마이그레이션)**:
7. P3-1: Retroactive Settlement

---

## 주의사항

### 공통 기술 스택
모든 프롬프트는 다음 스택을 사용합니다:
- **Framework**: Next.js 16 App Router
- **ORM**: Prisma
- **Database**: PostgreSQL
- **UI**: shadcn/ui + Tailwind CSS
- **Language**: TypeScript

### 실행 전 체크리스트
- [ ] `app/prisma/schema.prisma` 파일 존재 확인
- [ ] `package.json`에 필요한 의존성 설치
- [ ] DATABASE_URL 환경 변수 설정
- [ ] Prisma Client 생성: `npx prisma generate`

### 실행 후 체크리스트
- [ ] Migration 실행: `npx prisma migrate dev`
- [ ] TypeScript 컴파일 오류 없는지 확인: `npm run build`
- [ ] 로컬 서버 실행: `npm run dev`
- [ ] 각 Acceptance Criteria 테스트

---

## 문의 및 이슈

프롬프트 실행 중 문제가 발생하면:
1. 원본 문서 참조: [20260116_AdTech_Marketing_ERP_Comprehensive_Spec_by_Claude.md](../Domain/20260116_AdTech_Marketing_ERP_Comprehensive_Spec_by_Claude.md)
2. Schema 확인: `app/prisma/schema.prisma`
3. 기존 구현 코드 검색: `grep -r "PurchaseOrderItem" app/src`

---

**최종 업데이트**: 2026-01-16
**버전**: 1.0
