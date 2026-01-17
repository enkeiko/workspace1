# 42Menterp_2026 아키텍처 개선 실행 프롬프트

> **참조 문서**: [Deep_Analysis_Report.md](./Deep_Analysis_Report.md)
> **작성일**: 2026-01-16
> **목적**: 심층 분석 리포트의 각 단계를 실제로 구현하기 위한 실행 가능한 프롬프트 모음

---

## 📋 사용 방법

각 우선순위(P0, P1, P2, P3)에 따라 순차적으로 프롬프트를 복사하여 Claude Code에 입력하세요.

**작업 전 체크리스트**:
- [ ] `Deep_Analysis_Report.md` 문서를 읽고 전체 맥락 이해
- [ ] Git 브랜치 생성 (예: `feature/keyboard-navigation`, `fix/concurrency-control`)
- [ ] 현재 작업 중인 기능과 충돌하지 않는지 확인
- [ ] 데이터베이스 백업 (특히 P0 작업 시)

---

## P0: 즉시 조치 필요 (시스템 안정성)

### P0-1: 동시성 제어 추가 (Priority: CRITICAL)

**예상 작업 시간**: 3일
**영향 범위**: `app/src/app/api/purchase-orders/grid-save/route.ts`

```
docs/Architecture/Deep_Analysis_Report.md의 "2.1 동시성 제어" 섹션을 참조하여 다음을 구현해주세요:

1. Prisma Transaction + SELECT FOR UPDATE 패턴 적용
   - grid-save/route.ts의 channelGroups 루프를 트랜잭션으로 감싸기
   - PostgreSQL Row-Level Lock 사용 ($queryRaw)
   - isolation level을 Serializable로 설정

2. schema.prisma에 Optimistic Concurrency Control 필드 추가
   - PurchaseOrder 모델에 version 필드 추가
   - PurchaseOrderItem 모델에 version 필드 추가
   - 마이그레이션 파일 생성

3. API에서 버전 체크 로직 구현
   - updateMany를 사용하여 version 체크
   - 동시 수정 감지 시 명확한 에러 메시지 반환

4. 단위 테스트 작성
   - 동시 요청 시나리오 테스트
   - Race Condition 방지 검증

주의사항:
- 기존 데이터에 대한 마이그레이션 전략 고려
- 트랜잭션 타임아웃 설정 (10초)
- 에러 핸들링 명확하게 처리

완료 후:
- 테스트 결과 보고
- 성능 영향도 분석 (Before/After)
```

---

### P0-2: Batch Insert 전환 (Priority: CRITICAL)

**예상 작업 시간**: 2일
**영향 범위**: `app/src/app/api/purchase-orders/grid-save/route.ts`

```
docs/Architecture/Deep_Analysis_Report.md의 "2.2 대용량 처리" 섹션을 참조하여 다음을 구현해주세요:

1. N+1 쿼리 문제 해결
   - 현재 for 루프의 create를 createMany로 변환
   - skipDuplicates 옵션 활용
   - 기존 항목 업데이트는 updateMany로 일괄 처리

2. 쿼리 실행 횟수 최적화
   - Before: N개 항목 × 2번(find + create/update) = 2N번 쿼리
   - After: 1번(findMany) + 1번(createMany) + 1번(updateMany) = 3번 쿼리

3. 성능 측정 코드 추가
   - console.time/console.timeEnd로 실행 시간 측정
   - 쿼리 로그 활성화하여 실제 SQL 확인

4. 에러 처리 개선
   - 일부 항목 실패 시 전체 롤백 vs 부분 성공 정책 결정
   - 실패한 항목 목록 반환

테스트 시나리오:
- 10개 항목 저장 (기준)
- 100개 항목 저장
- 1,000개 항목 저장
- 타임아웃 발생 여부 확인

완료 후:
- 벤치마크 결과 공유 (처리 시간, 쿼리 수)
```

---

## P1: 1개월 내 - 생산성 향상

### P1-1: 키보드 네비게이션 구현

**예상 작업 시간**: 1주
**신규 파일**:
- `app/src/components/ui/keyboard-input.tsx`
- `app/src/hooks/use-grid-keyboard-navigation.ts`

```
docs/Architecture/Deep_Analysis_Report.md의 "1.1 키보드 접근성" 섹션을 참조하여 다음을 구현해주세요:

Phase 1: KeyboardInput 컴포넌트 생성
1. components/ui/keyboard-input.tsx 파일 생성
   - forwardRef 패턴 사용
   - onEnter, onEscape, onArrowDown, onArrowUp 콜백 지원
   - selectOnFocus 옵션 구현
   - 기존 Input 컴포넌트 확장

Phase 2: useGridKeyboardNavigation 훅 생성
2. hooks/use-grid-keyboard-navigation.ts 파일 생성
   - cellRefs Map 관리
   - moveDown, moveUp, moveRight 메서드 구현
   - registerCell 메서드로 셀 등록
   - 행 끝에서 Enter 시 다음 행 첫 열로 이동

Phase 3: WeeklyOrderGrid 적용
3. weekly-order-grid.tsx 수정
   - useGridKeyboardNavigation 훅 사용
   - GridCell 컴포넌트에 KeyboardInput 적용
   - rowIndex, colIndex 계산 로직 추가

Phase 4: 테스트
4. 키보드 네비게이션 동작 확인
   - Enter: 다음 셀로 이동
   - 화살표: 상하 이동
   - Esc: 포커스 해제
   - Tab: 기본 동작 유지

사용자 경험 개선 포인트:
- 셀 포커스 시 전체 선택되어야 함
- 시각적 포커스 표시 (border 색상 변경)
- 수량 입력 시 즉시 반영

완료 후:
- 실제 사용자 테스트 피드백 수집
- 키보드 단축키 가이드 문서 작성
```

---

### P1-2: Service Layer 분리

**예상 작업 시간**: 2주
**신규 디렉토리**:
- `app/src/services/`
- `app/src/repositories/`
- `app/src/lib/validators/`

```
docs/Architecture/Deep_Analysis_Report.md의 "3.1 Service Layer Pattern" 섹션을 참조하여 다음을 구현해주세요:

Step 1: 폴더 구조 생성
1. 디렉토리 생성
   - src/services/
   - src/repositories/
   - src/lib/validators/

Step 2: Validator 레이어 구현
2. lib/validators/grid.schema.ts 생성
   - Zod 스키마로 GridSaveRequest 타입 정의
   - 런타임 검증 로직 추가

Step 3: Repository 레이어 구현
3. repositories/purchase-order.repository.ts 생성
   - Prisma 의존성만 이 레이어에 집중
   - bulkSaveWithTransaction 메서드 구현
   - findByWeekAndChannel 메서드 구현

4. repositories/product.repository.ts 생성
   - findActiveProductMap 메서드 구현

Step 4: Service 레이어 구현
5. services/grid.service.ts 생성
   - GridService 클래스 작성
   - saveWeeklyGrid 메서드 구현
   - 비즈니스 로직만 포함 (DB 쿼리 없음)
   - validateWeekKey, groupByChannel 등 헬퍼 메서드

Step 5: API Route 리팩토링
6. app/api/purchase-orders/grid-save/route.ts 수정
   - 260줄 → 30줄 이하로 축소
   - GridService 의존성 주입
   - 에러 핸들링만 담당

Step 6: 단위 테스트 작성
7. services/__tests__/grid.service.test.ts 생성
   - 비즈니스 로직 단위 테스트
   - Mock Repository 사용
   - 80% 이상 커버리지 목표

마이그레이션 전략:
- 기존 API는 deprecated로 표시하고 유지
- 새 API 엔드포인트 생성 (v2)
- 점진적으로 클라이언트 코드 전환

완료 후:
- 테스트 커버리지 리포트 제출
- 기존 API와 동작 일치 여부 검증
```

---

## P2: 3개월 내 - UX 개선

### P2-1: AG-Grid 도입

**예상 작업 시간**: 1.5주
**영향 파일**: `app/src/components/purchase-orders/weekly-order-grid.tsx`

```
docs/Architecture/Deep_Analysis_Report.md의 "1.2 Grid UX" 섹션을 참조하여 다음을 구현해주세요:

Step 1: 의존성 설치
1. 패키지 설치
   npm install ag-grid-react ag-grid-community
   npm install --save-dev @types/ag-grid-community

Step 2: AG-Grid 기본 설정
2. weekly-order-grid.tsx 리팩토링
   - AgGridReact 컴포넌트로 교체
   - columnDefs 정의 (상품별 컬럼)
   - rowData 정의 (매장별 행)

Step 3: 편집 기능 구현
3. 셀 에디터 설정
   - editable: true 설정
   - cellEditor: 'agNumberCellEditor'
   - valueSetter로 handleCellChange 연결

Step 4: 복사/붙여넣기 기능
4. Range Selection 활성화
   - enableRangeSelection: true
   - enableCellChangeFlash: true
   - onPasteStart 이벤트 핸들링

Step 5: 성능 최적화
5. Virtual Scrolling 자동 적용 확인
   - 2,000개 셀 렌더링 테스트
   - 스크롤 성능 측정

Step 6: 스타일링
6. ag-theme-alpine 커스터마이징
   - TailwindCSS와 통합
   - 다크모드 지원

주의사항:
- AG-Grid Community 버전 사용 (MIT 라이선스)
- 기존 키보드 네비게이션과 충돌하지 않도록 조정
- 모바일 반응형 고려

완료 후:
- 엑셀 데이터 붙여넣기 데모 영상 제작
- 성능 벤치마크 (기존 Table vs AG-Grid)
```

---

### P2-2: 낙관적 업데이트 구현

**예상 작업 시간**: 1주
**신규 파일**:
- `app/src/hooks/use-optimistic-grid.ts`
- `app/src/actions/grid-actions.ts`

```
docs/Architecture/Deep_Analysis_Report.md의 "1.3 낙관적 업데이트" 섹션을 참조하여 다음을 구현해주세요:

Step 1: Server Action 생성
1. actions/grid-actions.ts 파일 생성
   - "use server" 지시어 추가
   - saveGridAction 함수 구현
   - 기존 grid-save API 로직 이동
   - revalidatePath 호출

Step 2: useOptimistic Hook 생성
2. hooks/use-optimistic-grid.ts 파일 생성
   - useOptimistic 훅 사용
   - useTransition 훅 사용
   - handleSave 메서드 구현
   - 롤백 로직 구현

Step 3: WeeklyOrderGrid 적용
3. weekly-order-grid.tsx 수정
   - useOptimisticGrid 훅 사용
   - optimisticStores 상태로 렌더링
   - isPending 상태로 로딩 표시

Step 4: 에러 처리
4. 실패 시 사용자 피드백
   - Toast 메시지 표시
   - 롤백 애니메이션 추가
   - 재시도 버튼 제공

Step 5: 테스트
5. 낙관적 업데이트 동작 확인
   - 저장 버튼 클릭 시 즉시 UI 업데이트
   - 백그라운드 저장 진행
   - 실패 시 롤백 확인

성능 개선 목표:
- Before: 저장 완료까지 사용자 대기 (3초)
- After: 즉시 다음 작업 가능 (0초 대기)

완료 후:
- 사용자 반응 시간 측정 (UX 메트릭)
- 네트워크 오류 시나리오 테스트
```

---

## P3: 6개월 내 - 확장성

### P3-1: Background Job Queue 구현

**예상 작업 시간**: 2주
**의존성**: Redis, BullMQ

```
docs/Architecture/Deep_Analysis_Report.md의 "2.2 대용량 처리 - Solution 2" 섹션을 참조하여 다음을 구현해주세요:

Step 1: 인프라 준비
1. Redis 설치 및 설정
   - Docker Compose에 Redis 추가
   - 환경변수 REDIS_URL 설정

Step 2: BullMQ 설정
2. 패키지 설치 및 설정
   npm install bullmq ioredis
   - lib/queue.ts 파일 생성
   - gridSaveQueue 정의

Step 3: Worker 구현
3. workers/grid-save.worker.ts 생성
   - Worker 프로세스 구현
   - 별도 프로세스로 실행
   - concurrency: 5 설정

Step 4: API 수정
4. grid-save API를 큐 기반으로 변경
   - 즉시 jobId 반환
   - 작업 상태 조회 API 추가
   - WebSocket으로 진행 상황 푸시 (선택)

Step 5: UI 수정
5. 백그라운드 작업 상태 표시
   - 진행 상황 프로그레스 바
   - 완료 알림
   - 작업 이력 목록

Step 6: 모니터링
6. BullMQ Dashboard 설정
   - bull-board 설치
   - 작업 실패 모니터링
   - 재시도 정책 설정

주의사항:
- Worker 프로세스 자동 재시작 설정
- 작업 실패 시 알림 전송
- 큐 크기 모니터링

완료 후:
- 부하 테스트 (동시 100개 작업)
- 장애 복구 시나리오 테스트
```

---

### P3-2: Auto Audit Logging 구현

**예상 작업 시간**: 1주
**신규 파일**: `app/src/lib/prisma-middleware.ts`

```
docs/Architecture/Deep_Analysis_Report.md의 "2.3 Audit Logging" 섹션을 참조하여 다음을 구현해주세요:

Step 1: Prisma Middleware 구현
1. lib/prisma-middleware.ts 파일 생성
   - prisma.$use 미들웨어 등록
   - UPDATE 작업 감지
   - 상태 변경 자동 기록

Step 2: 감사 대상 모델 정의
2. AUDITED_MODELS 배열 설정
   - SalesOrder
   - PurchaseOrder
   - WorkStatement
   - Settlement
   - TaxInvoice

Step 3: StatusHistory 자동 생성
3. 상태 변경 시 자동 기록
   - fromStatus, toStatus 추출
   - changedById 현재 사용자로 설정
   - 트랜잭션 내에서 처리

Step 4: 기존 수동 기록 제거
4. API Route에서 recordStatusChange 호출 제거
   - confirm/route.ts 정리
   - cancel/route.ts 정리
   - complete/route.ts 정리

Step 5: 감사 로그 조회 UI
5. 엔티티별 변경 이력 조회 페이지
   - StatusHistory 타임라인 컴포넌트
   - 필터링 및 검색 기능

Step 6: 테스트
6. 모든 상태 전이 시나리오 테스트
   - 자동 기록 확인
   - 누락된 기록 없는지 검증

컴플라이언스 체크리스트:
- [ ] 모든 상태 변경 기록됨
- [ ] 변경자 정보 포함
- [ ] 변경 시각 기록
- [ ] 변경 사유 기록 (선택)

완료 후:
- 감사 로그 리포트 생성 기능 추가
- CSV 내보내기 구현
```

---

## 🔧 공통 작업 프롬프트

### 단위 테스트 작성

```
[구현한 기능]에 대한 단위 테스트를 작성해주세요.

테스트 프레임워크:
- Vitest 사용
- @testing-library/react (UI 컴포넌트)
- @testing-library/react-hooks (커스텀 훅)

테스트 커버리지 목표:
- Line Coverage: 80% 이상
- Branch Coverage: 75% 이상
- Function Coverage: 90% 이상

테스트 케이스:
1. Happy Path (정상 동작)
2. Edge Cases (경계값)
3. Error Cases (에러 처리)
4. Async Cases (비동기 처리)

파일 위치:
- src/__tests__/[기능명].test.ts

실행 방법:
npm run test
npm run test:coverage
```

---

### 마이그레이션 실행

```
schema.prisma 변경 사항에 대한 마이그레이션을 생성하고 실행해주세요.

절차:
1. 마이그레이션 파일 생성
   npx prisma migrate dev --name [변경사항_설명]

2. 마이그레이션 검토
   - migration.sql 파일 확인
   - 데이터 손실 여부 체크
   - 인덱스 성능 영향도 분석

3. 테스트 환경 적용
   - 개발 DB에 먼저 적용
   - 데이터 무결성 확인

4. 프로덕션 적용 계획
   - 백업 계획 수립
   - 롤백 절차 준비
   - 다운타임 최소화 방안

주의사항:
- NOT NULL 컬럼 추가 시 기본값 설정
- UNIQUE 제약 조건 추가 시 기존 데이터 정리
- 대용량 테이블 변경 시 ALTER TABLE 성능 고려
```

---

### 성능 벤치마크

```
[구현한 기능]에 대한 성능 벤치마크를 실행해주세요.

측정 항목:
1. 응답 시간 (Response Time)
   - p50, p95, p99 측정
   - Before/After 비교

2. 처리량 (Throughput)
   - 초당 요청 처리 수
   - 동시 사용자 수

3. 리소스 사용량
   - CPU 사용률
   - 메모리 사용량
   - DB 커넥션 수

4. 데이터베이스 쿼리
   - 쿼리 실행 횟수
   - 쿼리 실행 시간
   - N+1 쿼리 여부

도구:
- k6 (부하 테스트)
- Prisma Query Log
- Chrome DevTools Performance

리포트 형식:
| 지표 | Before | After | 개선율 |
|------|--------|-------|--------|
| 응답시간(p95) | 3000ms | 500ms | 83% |
| 쿼리 수 | 200 | 3 | 98.5% |
```

---

## 📊 진행 상황 추적

### 완료 체크리스트

```markdown
## P0: 시스템 안정성
- [ ] P0-1: 동시성 제어 추가
  - [ ] Prisma Transaction 적용
  - [ ] version 필드 추가 (마이그레이션)
  - [ ] 버전 체크 로직 구현
  - [ ] 단위 테스트 작성
  - [ ] 성능 테스트

- [ ] P0-2: Batch Insert 전환
  - [ ] createMany 전환
  - [ ] updateMany 전환
  - [ ] 벤치마크 실행
  - [ ] 에러 핸들링 개선

## P1: 생산성 향상
- [ ] P1-1: 키보드 네비게이션
  - [ ] KeyboardInput 컴포넌트
  - [ ] useGridKeyboardNavigation 훅
  - [ ] WeeklyOrderGrid 적용
  - [ ] 사용자 테스트

- [ ] P1-2: Service Layer 분리
  - [ ] Validator 레이어
  - [ ] Repository 레이어
  - [ ] Service 레이어
  - [ ] API Route 리팩토링
  - [ ] 단위 테스트 (80% 커버리지)

## P2: UX 개선
- [ ] P2-1: AG-Grid 도입
  - [ ] 의존성 설치
  - [ ] 기본 설정
  - [ ] 편집 기능
  - [ ] 복사/붙여넣기
  - [ ] 성능 테스트

- [ ] P2-2: 낙관적 업데이트
  - [ ] Server Action
  - [ ] useOptimistic Hook
  - [ ] WeeklyOrderGrid 적용
  - [ ] 에러 처리

## P3: 확장성
- [ ] P3-1: Background Job Queue
  - [ ] Redis 설정
  - [ ] BullMQ 설정
  - [ ] Worker 구현
  - [ ] API 수정
  - [ ] 모니터링

- [ ] P3-2: Auto Audit Logging
  - [ ] Prisma Middleware
  - [ ] 자동 기록 구현
  - [ ] 수동 기록 제거
  - [ ] 조회 UI
  - [ ] 테스트
```

---

## 🚨 문제 해결 프롬프트

### 구현 중 에러 발생 시

```
[기능명] 구현 중 다음 에러가 발생했습니다:

에러 메시지:
[에러 메시지 붙여넣기]

발생 시점:
[언제 발생했는지 설명]

시도한 해결 방법:
1. [시도 1]
2. [시도 2]

docs/Architecture/Deep_Analysis_Report.md의 [관련 섹션]을 참조하여 문제를 해결해주세요.

추가 요청사항:
- 근본 원인 분석
- 재발 방지 방안
- 비슷한 문제가 발생할 수 있는 다른 부분 점검
```

---

### 성능 이슈 발생 시

```
[기능명] 구현 후 다음 성능 이슈가 발생했습니다:

증상:
[느려진 부분, 에러율 증가 등]

측정 데이터:
- 응답 시간: [Before] → [After]
- 쿼리 수: [Before] → [After]
- 에러율: [Before] → [After]

docs/Architecture/Deep_Analysis_Report.md의 [관련 섹션]을 참조하여 성능을 최적화해주세요.

목표:
- 응답 시간: [목표값] 이하
- 쿼리 수: [목표값] 이하
- 에러율: [목표값]% 이하
```

---

## 📚 참고 자료

- **심층 분석 리포트**: [Deep_Analysis_Report.md](./Deep_Analysis_Report.md)
- **프로젝트 문서**: `docs/` 디렉토리
- **Prisma 스키마**: `app/prisma/schema.prisma`
- **API Routes**: `app/src/app/api/`
- **UI 컴포넌트**: `app/src/components/`

---

## 💡 팁

1. **단계적 접근**: 한 번에 하나의 프롬프트만 실행하세요.
2. **테스트 우선**: 구현 전에 테스트 케이스를 먼저 작성하세요.
3. **문서화**: 각 단계 완료 후 변경 사항을 문서화하세요.
4. **코드 리뷰**: 중요한 변경사항은 팀원의 리뷰를 받으세요.
5. **점진적 배포**: Canary 배포로 리스크를 최소화하세요.
