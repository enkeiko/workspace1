# 남은 작업 목록

> 작성일: 2024-11-15  
> 현재 상태: 정산 관리 모듈 완료

---

## ✅ 완료된 모듈

1. **고객 관리** ✅
   - Service Layer, API Routes, UI 완료

2. **매장 관리** ✅
   - Service Layer, API Routes, UI 완료

3. **상품 관리** ✅
   - Service Layer, API Routes, UI 완료
   - Smart Delete 기능 포함

4. **견적서 관리** ✅
   - Service Layer, API Routes, UI 완료
   - 주문 전환 기능 포함

5. **주문 관리** ✅
   - Service Layer, API Routes, UI 완료
   - 결제 처리 기능 포함
   - Sonnet 4.1 검토 완료

6. **정산 관리** ✅
   - Service Layer, API Routes, UI 완료
   - 대시보드, 기간별 조회 완료

---

## 📋 남은 MVP 작업

### 1. 상담 관리 (Consultation Management) 🔴 우선순위 높음

**필수 기능**:
- 상담 히스토리 기록 및 조회
- 상담 채널 관리 (카카오톡, 전화, 이메일, 대면 등)
- 고객/매장별 상담 목록 조회
- 상담 내용 및 액션 아이템 관리

**구현 필요**:
- [ ] `lib/services/consultation.service.ts` - Service Layer
- [ ] `app/api/consultations/route.ts` - 목록/생성 API
- [ ] `app/api/consultations/[id]/route.ts` - 상세/수정/삭제 API
- [ ] `app/consultations/page.tsx` - 상담 목록 페이지
- [ ] `app/consultations/[id]/page.tsx` - 상담 상세 페이지
- [ ] `app/consultations/new/page.tsx` - 상담 생성 페이지
- [ ] `app/consultations/[id]/edit/page.tsx` - 상담 수정 페이지

**예상 소요 시간**: 1-2일

---

### 2. 작업 관리 (Task Management) 🔴 우선순위 높음

**필수 기능**:
- 작업 등록 및 상태 관리
- 작업 시간 기록 (타임 트래킹)
- 고객/매장/주문별 작업 연결
- 작업 우선순위 설정
- 작업 마감일 관리

**구현 필요**:
- [ ] `lib/services/task.service.ts` - Service Layer
- [ ] `app/api/tasks/route.ts` - 목록/생성 API
- [ ] `app/api/tasks/[id]/route.ts` - 상세/수정/삭제 API
- [ ] `app/api/tasks/[id]/time/route.ts` - 시간 기록 API
- [ ] `app/tasks/page.tsx` - 작업 목록 페이지
- [ ] `app/tasks/[id]/page.tsx` - 작업 상세 페이지
- [ ] `app/tasks/new/page.tsx` - 작업 생성 페이지
- [ ] `app/tasks/[id]/edit/page.tsx` - 작업 수정 페이지
- [ ] 타임 트래킹 UI 컴포넌트

**예상 소요 시간**: 2-3일

---

### 3. 문서 관리 (Document Management) 🟡 우선순위 중간

**필수 기능**:
- 파일 업로드/다운로드
- 문서 검색 및 필터링
- 고객/매장/주문별 문서 연결
- 문서 분류 및 태그 관리

**구현 필요**:
- [ ] 파일 업로드 처리 (Next.js `request.formData()`)
- [ ] 파일 저장소 설정 (로컬 또는 클라우드)
- [ ] `lib/services/document.service.ts` - Service Layer
- [ ] `app/api/documents/route.ts` - 목록/업로드 API
- [ ] `app/api/documents/[id]/route.ts` - 상세/다운로드/삭제 API
- [ ] `app/documents/page.tsx` - 문서 목록 페이지
- [ ] `app/documents/[id]/page.tsx` - 문서 상세 페이지
- [ ] 파일 업로드 UI 컴포넌트

**예상 소요 시간**: 2-3일

---

### 4. 알림 시스템 (Notification System) 🟡 우선순위 중간

**필수 기능**:
- 기본 알림 기능
- 미수금/미지급금 알림
- 계약 만료 알림
- 작업 마감일 알림

**구현 필요**:
- [ ] `lib/services/notification.service.ts` - Service Layer
- [ ] `app/api/notifications/route.ts` - 알림 목록 API
- [ ] `app/api/notifications/[id]/route.ts` - 알림 읽음 처리 API
- [ ] 알림 UI 컴포넌트 (헤더에 알림 아이콘)
- [ ] 알림 배지 표시

**예상 소요 시간**: 1-2일

---

### 5. 구매 관리 (Purchase Management) 🟢 우선순위 낮음 (정산에 필요)

**필수 기능**:
- 구매 내역 등록 및 관리
- 거래처 정보 관리
- 매입 단가, 트래픽, 블로그 작업 등 구매 항목 관리
- 정산 관리의 비용 집계에 필요

**구현 필요**:
- [ ] `lib/services/purchase.service.ts` - Service Layer
- [ ] `lib/services/vendor.service.ts` - 거래처 Service Layer
- [ ] `app/api/purchases/route.ts` - 구매 목록/생성 API
- [ ] `app/api/purchases/[id]/route.ts` - 상세/수정/삭제 API
- [ ] `app/api/vendors/route.ts` - 거래처 목록/생성 API
- [ ] `app/api/vendors/[id]/route.ts` - 거래처 상세/수정/삭제 API
- [ ] `app/purchases/page.tsx` - 구매 목록 페이지
- [ ] `app/purchases/[id]/page.tsx` - 구매 상세 페이지
- [ ] `app/purchases/new/page.tsx` - 구매 생성 페이지
- [ ] `app/vendors/page.tsx` - 거래처 목록 페이지

**예상 소요 시간**: 2-3일

**참고**: 정산 관리 모듈의 비용 집계 기능이 Purchase 모듈 구현 후 활성화됨

---

### 6. 보고서 관리 (Report Management) 🟢 우선순위 낮음

**필수 기능**:
- 보고서 생성 및 발송
- 보고서 템플릿 관리
- 보고서 발송 이력 추적
- 고객/매장별 보고서 조회

**구현 필요**:
- [ ] `lib/services/report.service.ts` - Service Layer
- [ ] `app/api/reports/route.ts` - 보고서 목록/생성 API
- [ ] `app/api/reports/[id]/route.ts` - 상세/수정/삭제 API
- [ ] `app/api/reports/templates/route.ts` - 템플릿 관리 API
- [ ] `app/reports/page.tsx` - 보고서 목록 페이지
- [ ] `app/reports/[id]/page.tsx` - 보고서 상세 페이지
- [ ] `app/reports/new/page.tsx` - 보고서 생성 페이지

**예상 소요 시간**: 2-3일

---

## 🔧 개선 작업

### 1. Sonnet 검토 이슈 수정 (Critical) 🔴

**주문 관리 모듈 검토에서 발견된 Critical Issues**:

1. **트랜잭션 내부에서 외부 메서드 호출**
   - 위험도: 높음
   - 파일: `lib/services/order.service.ts`
   - 수정 필요

2. **주문 번호 생성 Race Condition**
   - 위험도: 중간
   - 파일: `lib/services/order.service.ts`
   - 수정 필요

3. **결제 처리 동시성 제어 부재**
   - 위험도: 높음
   - 파일: `lib/services/order.service.ts`
   - 수정 필요

**예상 소요 시간**: 0.5-1일

---

### 2. 보안 강화 🟡

1. **CSRF 보호 추가**
   - 위험도: 중간
   - 모든 API Route에 CSRF 토큰 검증 추가

2. **인증/인가 구현**
   - 위험도: 높음
   - 인증 미들웨어 추가
   - 역할 기반 접근 제어 (RBAC)

**예상 소요 시간**: 2-3일

---

### 3. 데이터 다운로드 기능 (Excel) 🟡

**필수 기능**:
- 모든 데이터를 Excel로 다운로드
- 고객 목록 다운로드
- 매장 목록 다운로드
- 주문 목록 다운로드
- 정산 데이터 다운로드

**구현 필요**:
- [ ] Excel 생성 라이브러리 설치 (`xlsx` 또는 `exceljs`)
- [ ] `lib/utils/excel-export.ts` - Excel 생성 유틸리티
- [ ] 각 모듈에 다운로드 API 추가
- [ ] UI에 다운로드 버튼 추가

**예상 소요 시간**: 1-2일

---

### 4. 대시보드 개선 🟢

**현재**: 정산 대시보드만 존재

**개선 필요**:
- [ ] 메인 대시보드 페이지 (`app/page.tsx`)
- [ ] 전체 현황 요약 (주문 수, 미수금, 진행 중 작업 등)
- [ ] 최근 활동 피드
- [ ] 빠른 액션 버튼

**예상 소요 시간**: 1-2일

---

## 📊 우선순위별 작업 순서

### Phase 1: 핵심 기능 완성 (1-2주)
1. ✅ 고객 관리
2. ✅ 매장 관리
3. ✅ 상품 관리
4. ✅ 견적서 관리
5. ✅ 주문 관리
6. ✅ 정산 관리
7. 🔴 **상담 관리** (다음 작업)
8. 🔴 **작업 관리** (다음 작업)

### Phase 2: 보완 기능 (1주)
1. 🟡 문서 관리
2. 🟡 알림 시스템
3. 🟢 구매 관리 (정산 비용 집계 활성화)

### Phase 3: 개선 작업 (1주)
1. 🔴 Sonnet 검토 이슈 수정 (Critical)
2. 🟡 보안 강화 (CSRF, 인증/인가)
3. 🟡 데이터 다운로드 기능
4. 🟢 대시보드 개선

### Phase 4: 추가 기능 (선택)
1. 🟢 보고서 관리
2. 기타 향후 확장 기능

---

## 📈 진행률

### 전체 진행률: 약 60%

- **완료**: 6개 모듈 (고객, 매장, 상품, 견적서, 주문, 정산)
- **진행 중**: 0개 모듈
- **남은 작업**: 6개 모듈 (상담, 작업, 문서, 알림, 구매, 보고서)

### MVP 완성도: 약 60%

**MVP 필수 기능**:
- ✅ 고객 관리
- ✅ 매장 관리
- ✅ 주문 관리
- ✅ 정산 대시보드
- 🔴 작업 관리 (다음)
- 🔴 상담 관리 (다음)
- 🟡 문서 관리
- 🟡 알림 시스템

---

## 🎯 다음 단계 권장사항

1. **상담 관리 모듈 구현** (1-2일)
   - MVP 필수 기능
   - 비교적 간단한 CRUD 작업

2. **작업 관리 모듈 구현** (2-3일)
   - MVP 필수 기능
   - 타임 트래킹 기능 포함

3. **Sonnet 검토 이슈 수정** (0.5-1일)
   - Critical Issues 우선 수정
   - 프로덕션 배포 전 필수

4. **구매 관리 모듈 구현** (2-3일)
   - 정산 관리의 비용 집계 활성화
   - 정산 대시보드 완성도 향상

---

## 📝 참고사항

- 모든 모듈은 동일한 패턴으로 구현:
  1. Service Layer 구현
  2. API Routes 구현
  3. UI 구현
  4. 자체 검토 및 Sonnet 검토

- 각 모듈 완료 후:
  - 자체 검토 문서 작성
  - Sonnet 4.1 검토 요청
  - Critical Issues 수정

- 프로덕션 배포 전 필수:
  - 모든 Critical Issues 수정
  - 보안 강화 (CSRF, 인증/인가)
  - 기본 테스트 완료

---

**마지막 업데이트**: 2024-11-15  
**다음 검토 예정일**: 상담 관리 모듈 완료 후

