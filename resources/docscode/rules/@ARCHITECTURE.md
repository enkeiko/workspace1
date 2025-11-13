# 🏗️ 워크스페이스 아키텍처

> **DocsCode 기반 멀티 프로젝트 통합 구조**

---

## 📌 전체 시스템 개요

이 워크스페이스는 **네이버 플레이스 생태계**의 여러 도구를 통합 관리하는 환경입니다.

### 핵심 원칙

1. **AI-First Design** - AI가 효율적으로 작업할 수 있는 구조
2. **Document-Driven Development** - 문서 먼저, 코드는 그 다음
3. **Multi-Project Orchestration** - 여러 프로젝트를 하나의 시스템으로
4. **Progressive Refinement** - 점진적 개선 프로세스

---

## 🏛️ 3계층 아키텍처

### Layer 1: AI 설정 및 규칙 (Meta Layer)

**목적**: AI가 학습하고 따라야 할 규칙 정의

```
rules/                    # 전체 규칙
├── @ARCHITECTURE.md      # 이 파일
├── @CONVENTIONS.md       # 코딩 컨벤션
├── @ERROR_CODES.md       # 에러 코드 정의
└── @RULES_*.md           # 워크플로우별 규칙

templates/                # 문서 템플릿
├── request.template.md
├── backlog.template.md
├── issue.template.md
├── analysis/             # 분석 템플릿 (4개)
└── feature/              # 기능 문서 템플릿 (4계층 × 9파일)

workflows/                # 개발 프로세스
├── backlog-lifecycle.md
├── new-feature-development.md
└── cross-project-integration.md
```

**특징:**
- 읽기 전용 (AI가 학습)
- 버전 관리 필수
- 팀 전체 합의 필요

### Layer 2: 문서 생성 (Working Layer)

**목적**: AI가 자동 생성하는 작업 문서

```
backlog/                  # 요청사항 관리
├── ideas/                # 아이디어 단계 (10-30%)
├── exploring/            # 탐색 단계 (30-90%)
└── ready/                # 구현 준비 (90%+)

analysis/                 # 영향도 분석
└── {feature}/
    ├── impact.md         # 영향받는 프로젝트/파일
    ├── side-effects.md   # 부작용 체크리스트
    ├── dependencies.md   # 의존성 및 순서
    └── test-scenarios.md # 테스트 시나리오

issues/                   # 실행 가능한 이슈
└── {feature}/
    ├── 001-{project}.md  # 프로젝트별 이슈
    └── execution-plan.md # 실행 계획

features/                 # 완전한 기능 문서 (4계층)
└── {feature}/
    ├── 00-domain/        # 비즈니스 로직
    ├── 10-interface/     # UI/API/DB
    ├── 20-implementation/ # 구현 가이드
    └── 30-validation/    # 테스트 및 검증
```

**특징:**
- 읽기/쓰기 모두 가능
- AI가 자동 생성
- Git 커밋 대상

### Layer 3: 지식 베이스 (Knowledge Layer)

**목적**: 프로젝트 정보 및 참고 자료

```
projects/                 # 프로젝트별 문서
├── place-keywords-maker/
│   ├── README.md
│   ├── architecture.md
│   └── api-reference.md
└── place-crawler/
    ├── README.md
    └── crawler-spec.md

cross-project/            # 공통 영역
├── policies/             # 비즈니스 정책
├── shared-models/        # 공통 데이터 모델
└── integrations/         # 프로젝트 간 통합

catalog/                  # 기능 카탈로그
├── features/             # 기능별 YAML
└── matrix/               # 프로젝트-기능 매트릭스

indexes/                  # 빠른 검색
├── features/
├── projects/
└── topics/
```

**특징:**
- 읽기 중심 (업데이트는 드묾)
- 참고 자료
- 검색 최적화

---

## 🔄 데이터 흐름

### 신규 기능 개발 플로우

```
[사용자 요청]
    ↓
1. REQUEST 생성
   requests/YYYYMMDD-{feature}.md
    ↓
2. BACKLOG (IDEAS)
   backlog/ideas/{feature}.md
   - 신뢰도: 10-30%
   - 템플릿 자동 적용
    ↓
3. AI Q&A (EXPLORING)
   backlog/exploring/{feature}.md
   - 신뢰도: 30-90%
   - 요구사항 명확화
    ↓
4. BACKLOG (READY)
   backlog/ready/{feature}.md
   - 신뢰도: 90%+
   - 구현 준비 완료
    ↓
5. ANALYSIS 자동 생성
   analysis/{feature}/*.md
   - 영향도 분석
   - 부작용 체크
   - 작업 순서
    ↓
6. ISSUES 자동 생성
   issues/{feature}/*.md
   - 프로젝트별 이슈
   - 완전한 코드 포함
    ↓
7. FEATURES 자동 생성
   features/{feature}/**/*.md
   - 4계층 구조
   - 9개 문서
    ↓
8. 개발자 구현
   실제 프로젝트 코드 작성
```

### 프로젝트 간 통합 플로우

```
[크로스 프로젝트 요청]
    ↓
1. cross-project/policies/ 확인
   공통 정책 검토
    ↓
2. catalog/matrix/ 확인
   영향받는 프로젝트 파악
    ↓
3. 각 프로젝트별 ISSUES 생성
   issues/{feature}/001-{project-a}.md
   issues/{feature}/002-{project-b}.md
    ↓
4. cross-project/integrations/ 문서화
   통합 가이드 작성
    ↓
5. 통합 테스트 시나리오 생성
   analysis/{feature}/test-scenarios.md
```

---

## 📦 프로젝트별 아키텍처

### Place_Keywords_maker

**목적**: 네이버 플레이스 대표키워드 자동 생성

**아키텍처**: 3단계 파이프라인

```
[V1 크롤러] → [L1 데이터 수집] → [L2 AI 분석] → [L3 최종 조합]
```

**L1: 데이터 수집 및 정렬**
- 입력: V1 크롤러 JSON (`data/input/places-advanced/`)
- 처리:
  - 주소 파싱 (si/gu/dong/station)
  - 키워드 요소 분류
  - 완성도 평가 (115점 만점)
- 출력: `data/output/l1/*.json`

**L2: AI 분석 및 목표키워드 설정**
- 입력: L1 출력 데이터
- 처리:
  - 네이버 API 검색량 조회
  - AI 키워드 우선순위 분석
  - 경쟁도 평가
- 출력: `data/output/l2/*.json`

**L3: 최종 키워드 조합**
- 입력: L2 목표키워드
- 처리:
  - 점수 계산 (검색량, 경쟁도, 관련성)
  - 순위 결정
  - SEO 전략 생성
- 출력: `data/output/l3/*.json`

**기술 스택:**
- Node.js
- Playwright (크롤링)
- AI APIs (OpenAI/Anthropic)
- 네이버 API

### Place_Crawler

**목적**: 네이버 플레이스 데이터 크롤링

**아키텍처**: Playwright 기반 Apollo State 파싱

```
[Playwright 브라우저]
    ↓
[네이버 플레이스 모바일 접속]
    ↓
[window.__APOLLO_STATE__ 추출]
    ↓
[JSON 파싱 및 구조화]
    ↓
[FULL.json 저장]
```

**주요 기능:**
- Apollo State 파싱
- 메뉴/리뷰/이미지 수집
- 봇 탐지 우회 (30초 대기)
- 배치 크롤링 지원

**기술 스택:**
- Node.js
- Playwright
- Chromium

---

## 🎯 4계층 Features 아키텍처

모든 기능 문서는 4계층 구조를 따릅니다:

### 00-domain (비즈니스 로직)

**목적**: 프레임워크 독립적인 순수 비즈니스 규칙

**파일:**
- `business-logic.md` - 비즈니스 규칙 및 정책
- `core-models.md` - 핵심 데이터 모델

**예시:**
```
쿠폰 적용 규칙:
- 1개 장바구니당 1개 쿠폰만
- 할인율 최대 50%
- 유효기간 체크 필수
```

**특징:**
- 기술 스택 무관
- 장기 유지 가능
- 재사용성 높음

### 10-interface (인터페이스)

**목적**: 외부 세계와의 접점 정의

**파일:**
- `ui-design.md` - 사용자 인터페이스
- `api-spec.md` - API 엔드포인트
- `db-schema.md` - 데이터베이스 스키마

**예시:**
```
POST /api/cart/coupon
Request: { couponCode: string }
Response: { discount: number, appliedCoupon: Coupon }
```

**특징:**
- 계약(Contract) 중심
- 변경 영향도 큼
- 버전 관리 필수

### 20-implementation (구현)

**목적**: 실제 코드 작성 가이드

**파일:**
- `component-guide.md` - 프론트엔드 컴포넌트
- `service-guide.md` - 백엔드 서비스
- `migration-guide.md` - DB 마이그레이션

**예시:**
```javascript
// src/services/coupon-service.js
class CouponService {
  async applyCoupon(cartId, couponCode) {
    // 완전한 구현 코드
  }
}
```

**특징:**
- 기술 스택 의존적
- 완전한 코드 포함 (TODO 없음)
- 실행 가능

### 30-validation (검증)

**목적**: 올바르게 구현되었는지 확인

**파일:**
- `test-plan.md` - 테스트 계획
- `acceptance-criteria.md` - 인수 기준

**예시:**
```
✅ 쿠폰 중복 사용 불가
✅ 만료된 쿠폰 거부
✅ 할인율 50% 초과 시 에러
```

**특징:**
- 체크리스트 중심
- 자동화 테스트 가능
- QA 기준

---

## 🔗 프로젝트 간 통합

### 통합 패턴

#### 1. 공유 데이터 모델

**위치**: `cross-project/shared-models/`

**예시:**
```yaml
# place-model.yaml
PlaceModel:
  id: string
  name: string
  category: string
  address: Address
  menus: Menu[]
```

**사용:**
- Place_Crawler에서 생성
- Place_Keywords_maker에서 소비

#### 2. 공통 정책

**위치**: `cross-project/policies/`

**예시:**
```markdown
# crawling-policy.md

## 크롤링 간격
- 최소: 5초
- 권장: 10초
- 봇 탐지 시: 30초 대기

## 재시도 정책
- 최대 3회
- 지수 백오프
```

#### 3. 통합 워크플로우

**위치**: `workflows/cross-project-integration.md`

**프로세스:**
1. `cross-project/integrations/` 문서 확인
2. 각 프로젝트별 이슈 생성
3. 통합 테스트 시나리오 작성
4. 순차 또는 병렬 구현
5. 통합 테스트 실행

---

## 📊 메타데이터 시스템

### meta.json 구조

모든 feature는 `meta.json` 포함:

```json
{
  "feature": "cart-coupon",
  "title": "장바구니 쿠폰 적용",
  "projects": ["place-keywords-maker"],
  "status": "ready",
  "confidence": 95,
  "created": "2025-10-28",
  "updated": "2025-10-28",
  "author": "AI",
  "tags": ["coupon", "cart", "discount"],
  "dependencies": ["cart-management"],
  "related_features": ["payment-discount"],
  "priority": "high",
  "estimated_hours": 8
}
```

### 메타데이터 활용

**검색 최적화:**
```bash
# 특정 프로젝트 관련 기능 검색
grep -r '"projects": \["place-keywords-maker"\]' features/*/meta.json
```

**통계 생성:**
- 프로젝트별 기능 수
- 상태별 분포 (ideas/exploring/ready)
- 예상 소요 시간 합계

---

## 🚀 확장성 설계

### 신규 프로젝트 추가

**단계:**
1. 프로젝트 폴더 생성: `workspace/{new-project}/`
2. 문서 생성: `projects/{new-project}/README.md`
3. 설정 업데이트: `local.config.yml`
4. 인덱스 생성: `indexes/projects/{new-project}.md`

**자동 적용:**
- 템플릿 시스템
- Backlog 워크플로우
- 4계층 Features 구조

### 신규 워크플로우 추가

**단계:**
1. 워크플로우 문서 작성: `workflows/{new-workflow}.md`
2. 규칙 정의: `rules/@RULES_{NEW_WORKFLOW}.md`
3. 템플릿 생성 (필요 시): `templates/{new-template}.md`
4. CLAUDE.md 업데이트

---

## 🔍 검색 및 인덱싱

### 인덱스 구조

```
indexes/
├── features/
│   └── by-project.md       # 프로젝트별 기능 목록
│   └── by-status.md        # 상태별 기능 목록
│   └── by-priority.md      # 우선순위별 목록
│
├── projects/
│   └── place-keywords-maker.md
│   └── place-crawler.md
│
└── topics/
    └── crawling.md         # 크롤링 관련 문서
    └── keyword-analysis.md # 키워드 분석 관련
```

### AI 검색 우선순위

```
1. indexes/ (빠른 참조)
2. rules/ (규칙 확인)
3. projects/{project}/README.md (프로젝트 개요)
4. features/ (기능 문서)
5. backlog/ready/ (구현 대기)
6. _archive/ (레거시)
```

---

## 📋 아키텍처 결정 기록 (ADR)

### ADR-001: DocsCode 구조 채택

**날짜**: 2025-10-28
**상태**: 승인

**컨텍스트:**
- 여러 프로젝트 관리 필요
- AI 자동화 요구
- 문서 품질 향상

**결정:**
- DocsCode 아키텍처 채택
- 3계층 구조 (Meta, Working, Knowledge)
- 4계층 Features (Domain, Interface, Implementation, Validation)

**결과:**
- AI 작업 효율 3-4배 향상
- 문서 자동 생성 시간 5-10분
- 프로젝트 간 통합 용이

### ADR-002: Backlog 생명주기 도입

**날짜**: 2025-10-28
**상태**: 승인

**컨텍스트:**
- 불완전한 요구사항으로 인한 재작업
- AI가 막연한 요청을 처리 못 함

**결정:**
- 3단계 Backlog (IDEAS → EXPLORING → READY)
- 신뢰도 기준 (10-30% → 30-90% → 90%+)
- Q&A 기반 점진적 refinement

**결과:**
- 요구사항 명확도 향상
- 재작업 감소
- AI와 협업 효율 증가

---

## 🔧 기술 스택

### 공통
- **문서 형식**: Markdown, YAML, JSON
- **버전 관리**: Git
- **AI**: Claude (Anthropic)

### Place_Keywords_maker
- **런타임**: Node.js
- **크롤러**: Playwright
- **AI API**: OpenAI, Anthropic, 네이버 API
- **데이터**: JSON

### Place_Crawler
- **런타임**: Node.js
- **브라우저 자동화**: Playwright
- **파서**: Custom Apollo State Parser

---

## 📚 참고 자료

- `rules/@CONVENTIONS.md` - 코딩 컨벤션
- `rules/@ERROR_CODES.md` - 에러 코드
- `workflows/new-feature-development.md` - 신규 기능 개발
- `workflows/backlog-lifecycle.md` - Backlog 관리

---

**버전**: 1.0.0
**업데이트**: 2025-10-28
**작성자**: AI (Claude)
