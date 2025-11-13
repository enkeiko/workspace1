# 🎯 Workspace - AI 통합 가이드

> **DocsCode 기반 멀티 프로젝트 워크스페이스**
>
> AI가 여러 프로젝트를 자동으로 관리하고, 완전한 문서를 생성하는 통합 개발 환경

---

## 📌 워크스페이스 개요

### 프로젝트 구성
이 워크스페이스는 네이버 플레이스 관련 도구들의 통합 환경입니다:

1. **Place_Keywords_maker** - 플레이스 대표키워드 자동 생성기
   - 파이프라인: V1 크롤링 → L1 (데이터 수집) → L2 (AI 분석) → L3 (최종 조합)
   - 기술: Node.js, Playwright, AI APIs

2. **Place_Crawler** - 네이버 플레이스 크롤러
   - V1: Playwright 기반 고급 크롤러
   - Doc: 크롤러 문서

3. **향후 추가 프로젝트** - 확장 가능한 구조

---

## 🎯 AI 작업 원칙

### 1. 문서 우선순위 (중요!)

AI는 다음 순서로 문서를 참조합니다:

```
1️⃣ 최우선: docscode/CLAUDE.md (이 파일)
    └─ 전체 워크스페이스 규칙 및 정책

2️⃣ 프로젝트별 규칙
    ├─ docscode/rules/@ARCHITECTURE.md
    ├─ docscode/rules/@CONVENTIONS.md
    └─ docscode/rules/@RULES_*.md

3️⃣ 프로젝트 문서
    ├─ docscode/projects/{project}/README.md
    └─ docscode/projects/{project}/**/*.md

4️⃣ 작업 지침
    ├─ docscode/workflows/*.md
    └─ docscode/templates/*.md

5️⃣ 참고 자료
    ├─ docscode/backlog/ready/*.md
    ├─ docscode/features/**/*.md
    └─ docscode/cross-project/**/*.md

6️⃣ 아카이브 (최저 우선순위)
    └─ docscode/_archive/**/*
```

### 2. 작업 방식 규칙

#### ✅ 허용되는 작업 (자동 진행)

**파일 수정:**
- ✅ `*/src/**/*` - 프로젝트 소스 코드 수정
- ✅ `*/data/output/**/*` - 출력 데이터 생성
- ✅ `docscode/backlog/**/*` - Backlog 관리
- ✅ `docscode/issues/**/*` - 이슈 생성
- ✅ `docscode/features/**/*` - 기능 문서 생성
- ✅ `docscode/analysis/**/*` - 분석 문서 생성
- ✅ `docscode/rules/**/*` - 규칙 문서 추가/수정
- ✅ `docscode/templates/**/*` - 템플릿 추가/수정
- ✅ `docscode/workflows/**/*` - 워크플로우 문서 추가/수정

**도구 사용:**
- ✅ TodoWrite - 작업 진행 상황 추적
- ✅ Read, Write, Edit - 파일 조작
- ✅ Bash - 명령 실행 (안전한 명령만)
- ✅ Glob, Grep - 파일 검색

#### ⚠️ 사용자 확인 필요

**프로젝트 설정 변경:**
- ⚠️ `package.json` 수정
- ⚠️ `local.config.yml` 수정
- ⚠️ `.gitignore` 수정
- ⚠️ 새로운 npm 패키지 설치
- ⚠️ 환경 변수 변경

**데이터 삭제:**
- ⚠️ `data/input/**/*` 삭제
- ⚠️ 프로젝트 폴더 삭제
- ⚠️ `_archive/**/*` 삭제

#### ❌ 절대 금지

**위험한 작업:**
- ❌ `data/input/**/*` 직접 수정 (읽기만 허용)
- ❌ `.git/` 폴더 수정
- ❌ `node_modules/` 수정
- ❌ 시스템 파일 삭제
- ❌ 외부 API 키 노출 (로그, 문서 등)

**코드 품질:**
- ❌ TODO 주석으로 불완전한 코드 작성
- ❌ 에러 무시 (모든 에러는 로그 + 복구 시도)
- ❌ 하드코딩된 경로 (local.config.yml 사용)
- ❌ console.log 남발 (logger 사용)

---

## 📂 워크스페이스 구조

### 최상위 구조

```
workspace/
│
├── 🎯 AI 설정 영역 (AI 학습용)
│   ├── CLAUDE.md                    ← 이 파일 (최우선)
│   ├── local.config.yml             ← 프로젝트 경로 매핑
│   ├── rules/                       ← 전체 규칙
│   ├── templates/                   ← 문서 템플릿
│   └── workflows/                   ← 개발 프로세스
│
├── 📝 문서 생성 영역 (AI 자동 생성)
│   ├── backlog/                     ← 요청사항 관리
│   │   ├── ideas/                   ← 초기 아이디어 (10-30%)
│   │   ├── exploring/               ← 탐색 중 (30-90%)
│   │   └── ready/                   ← 구현 준비 (90%+)
│   │
│   ├── requests/                    ← 초기 요청 보관
│   ├── analysis/                    ← 영향도 분석
│   ├── issues/                      ← 실행 가능한 이슈
│   └── features/                    ← 완전한 기능 문서
│
├── 📚 지식 베이스 (프로젝트 정보)
│   ├── projects/                    ← 프로젝트별 문서
│   │   ├── place-keywords-maker/
│   │   ├── place-crawler/
│   │   └── [future-projects]/
│   │
│   ├── cross-project/               ← 공통 영역
│   │   ├── policies/                ← 비즈니스 정책
│   │   ├── shared-models/           ← 공통 데이터 모델
│   │   └── integrations/            ← 프로젝트 간 통합
│   │
│   ├── catalog/                     ← 기능 카탈로그
│   │   ├── features/                ← 기능별 YAML
│   │   └── matrix/                  ← 프로젝트-기능 매트릭스
│   │
│   └── indexes/                     ← 빠른 검색
│       ├── features/
│       ├── projects/
│       └── topics/
│
├── 🗂️ 실제 프로젝트 (코드 - 워크스페이스 루트)
│   ├── Place_Keywords_maker/        ← 키워드 생성기 (실제 코드)
│   ├── Place_Crawler/               ← 크롤러 (실제 코드)
│   ├── Project Outline/             ← 프로젝트 개요
│   └── [future-projects]/           ← 미래 프로젝트
│
└── 📦 기타
    ├── data/                        ← 공용 데이터
    ├── _archive/                    ← 레거시 보관
    └── node_modules/                ← NPM 패키지

⚠️ 중요: 실제 프로젝트 코드는 워크스페이스 루트에 유지됩니다.
          projects/ 폴더는 문서만 보관합니다!
```

---

## 🔄 개발 워크플로우

### 워크플로우 1: 새 기능 개발

```
[사용자 요청]
    ↓
    "장바구니에 쿠폰 추가해줘"
    ↓
┌──────────────────────────────────────┐
│ 1. Backlog 생성 (IDEA)               │
│    backlog/ideas/cart-coupon.md      │
│    신뢰도: 20%                        │
│    AI: 자동으로 템플릿 적용            │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ 2. AI Q&A (EXPLORING)                │
│    AI가 질문하며 요구사항 명확화       │
│    → backlog/exploring/로 이동        │
│    신뢰도: 60% → 90%                  │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ 3. READY 상태                         │
│    backlog/ready/cart-coupon.md      │
│    신뢰도: 95%                        │
│    구현 가능한 완전한 요구사항         │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ 4. 사용자 선택                        │
│    "Issues, Features, 둘 다?"        │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ 5. ANALYSIS 자동 생성                 │
│    - 영향받는 프로젝트 분석            │
│    - 부작용 체크                      │
│    - 작업 순서 결정                   │
│    - 테스트 시나리오 생성              │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ 6. ISSUES 자동 생성                   │
│    - 프로젝트별 실행 가능한 이슈       │
│    - 완전한 코드 예시 포함            │
│    - 단계별 실행 방법                 │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ 7. FEATURES 자동 생성 (4계층)         │
│    - 00-domain/ (비즈니스 로직)       │
│    - 10-interface/ (UI/API/DB)       │
│    - 20-implementation/ (코드)       │
│    - 30-validation/ (테스트)         │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ 8. 개발자가 실제 구현                 │
│    Issues 보고 코드 작성              │
│    Features 참고하여 아키텍처 이해    │
└──────────────────────────────────────┘
```

### 워크플로우 2: 프로젝트 간 통합

```
[크로스 프로젝트 요청]
    ↓
1. cross-project/ 폴더에서 공통 정책 확인
2. catalog/matrix/ 에서 영향받는 프로젝트 확인
3. 각 프로젝트별 이슈 생성
4. 통합 테스트 시나리오 작성
```

---

## 📋 코드 작성 규칙

### 1. 완전한 코드 작성

**❌ 나쁜 예:**
```javascript
function applyDiscount(cart, coupon) {
  // TODO: 쿠폰 유효성 검사
  // TODO: 할인 적용
}
```

**✅ 좋은 예:**
```javascript
function applyDiscount(cart, coupon) {
  // 쿠폰 유효성 검사
  if (!coupon || !coupon.isValid()) {
    throw new Error('E_COUPON_001: 유효하지 않은 쿠폰');
  }

  // 중복 사용 체크
  if (cart.hasCoupon()) {
    throw new Error('E_COUPON_002: 쿠폰은 1개만 사용 가능');
  }

  // 할인 적용
  const discount = calculateDiscount(cart.total, coupon);
  cart.applyDiscount(discount);
  cart.attachCoupon(coupon);

  return cart;
}
```

### 2. 에러 코드 체계

모든 에러는 코드화하여 관리합니다:

**형식:** `E_{MODULE}_{NUMBER}: 설명`

**예시:**
- `E_L1_001`: 크롤러 JSON이 없습니다
- `E_L2_001`: 네이버 API 호출 실패
- `E_COUPON_001`: 유효하지 않은 쿠폰

**에러 문서:** `rules/@ERROR_CODES.md` 참조

### 3. 로깅 규칙

**진행률 표시:**
```javascript
logger.info(`[5/10] ████████░░ 50% 데이터 처리 중`);
```

**단계별 로그:**
```javascript
logger.info('✅ [10:30:00] 데이터 수집 완료');
logger.warn('⚠️  [10:30:05] 현재 키워드 파일 없는 매장 3개');
logger.error('❌ [10:30:10] API 호출 실패', { error });
```

### 4. 파일 경로 규칙

**❌ 하드코딩:**
```javascript
const path = 'C:/Users/Nk Ko/Documents/workspace/Place_Keywords_maker';
```

**✅ 설정 파일 사용:**
```javascript
const config = require('../local.config.yml');
const path = config.projects['place-keywords-maker'].path;
```

---

## 🔧 프로젝트별 규칙

### Place_Keywords_maker

**핵심 지침:**
- `work instruction/l1.md` - L1 프로세스 규칙 (최우선)
- `work instruction/l2.md` - L2 AI 분석 규칙
- `work instruction/l3.md` - L3 키워드 조합 규칙

**파일 구조:**
```
Place_Keywords_maker/
├── src/
│   ├── l1-processor.js      # L1 데이터 수집
│   ├── l2-processor.js      # L2 AI 분석
│   ├── l3-processor.js      # L3 최종 조합
│   ├── logger.js            # 로깅 시스템
│   └── main.js              # CLI 진입점
├── data/
│   ├── input/               # 입력 데이터 (읽기 전용)
│   └── output/              # 출력 데이터 (쓰기 가능)
└── work instruction/        # 지침서
```

**실행 명령:**
```bash
# L1 실행
node src/main.js l1

# L1 + 크롤링
node src/main.js l1 1768171911

# 전체 파이프라인
node src/main.js start
```

### Place_Crawler

**핵심 기능:**
- V1: Playwright 기반 고급 크롤러
- Apollo State 파싱
- 봇 탐지 우회

**주의사항:**
- 크롤링 간격 5초 이상 유지
- 봇 탐지 시 30초 대기

---

## 📊 TodoWrite 활용

모든 작업은 TodoWrite 도구로 추적합니다:

**형식:**
```json
{
  "content": "작업 설명 (명령형)",
  "status": "pending | in_progress | completed",
  "activeForm": "작업 진행형"
}
```

**예시:**
```json
[
  {
    "content": "L1 완성도 평가 시스템 구현",
    "status": "in_progress",
    "activeForm": "완성도 평가 시스템 구현 중"
  },
  {
    "content": "진행률 로그 추가",
    "status": "pending",
    "activeForm": "진행률 로그 추가 중"
  }
]
```

**규칙:**
- ✅ 작업 시작 전 TodoWrite로 계획 수립
- ✅ 작업 완료 즉시 상태 업데이트
- ✅ 동시에 1개 작업만 in_progress
- ✅ 작업 완료 후 즉시 completed로 변경

---

## 🎯 템플릿 시스템

### 사용 가능한 템플릿

모든 문서는 `templates/` 폴더의 템플릿에서 생성됩니다:

1. **requests/request.template.md** - 기능 요청
2. **backlog.template.md** - Backlog 아이템
3. **issue.template.md** - 이슈 문서
4. **analysis/** - 분석 문서 (4개)
5. **feature/** - 기능 문서 (9개, 4계층)

### 템플릿 사용 규칙

**AI가 템플릿을 적용할 때:**
1. 적절한 템플릿 선택
2. 플레이스홀더 채우기
3. 프로젝트 특화 섹션 조정
4. 메타데이터 추가 (meta.json)

---

## 🔍 검색 및 참조

### AI가 정보를 찾는 순서

1. **빠른 참조:** `indexes/` 폴더 확인
2. **규칙 확인:** `rules/` 폴더 읽기
3. **프로젝트 문서:** `projects/{project}/` 검색
4. **기능 문서:** `features/` 검색
5. **Backlog:** `backlog/ready/` 확인
6. **아카이브:** `_archive/` (최후 수단)

### 검색 팁

- 기능 검색: `indexes/features/` 먼저
- 프로젝트 정보: `projects/{project}/README.md`
- 에러 코드: `rules/@ERROR_CODES.md`
- 워크플로우: `workflows/*.md`

---

## 🚀 신규 프로젝트 추가 가이드

### 단계별 프로세스

```
1. 프로젝트 폴더 생성
   workspace/{project-name}/

2. 프로젝트 문서 생성
   projects/{project-name}/
   ├── README.md           # 프로젝트 개요
   ├── architecture.md     # 아키텍처
   └── conventions.md      # 컨벤션

3. local.config.yml 업데이트
   projects:
     {project-name}:
       path: ~/workspace/{project-name}
       type: frontend | backend | tool
       framework: react | django | nodejs

4. 기능 카탈로그 추가
   catalog/features/{feature}.yaml

5. 인덱스 업데이트
   indexes/projects/{project-name}.md
```

---

## 💡 베스트 프랙티스

### 1. 문서 우선 개발

**코드 작성 전:**
- Backlog 생성 (ideas → exploring → ready)
- Analysis 문서 작성 (영향도 분석)
- Feature 문서 작성 (4계층 구조)

**그 다음 코드 작성**

### 2. 점진적 Refinement

**아이디어 → 구현:**
- IDEA (10-30%): 막연한 요청
- EXPLORING (30-90%): Q&A로 명확화
- READY (90%+): 구현 가능한 수준

**급하게 바로 구현하지 마세요!**

### 3. AI와 협업

**효율적인 요청:**
```
❌ "쿠폰 기능 만들어줘"
✅ "장바구니에 쿠폰 적용 기능을 추가하고 싶어.
    먼저 Backlog로 만들어서 요구사항 명확화부터 시작하자."
```

### 4. 메타데이터 활용

모든 기능 문서는 `meta.json` 포함:
```json
{
  "feature": "cart-coupon",
  "projects": ["place-keywords-maker"],
  "status": "ready",
  "confidence": 95,
  "created": "2025-10-28",
  "tags": ["coupon", "cart", "discount"]
}
```

---

## 📚 참고 자료

### 핵심 문서
- `rules/@ARCHITECTURE.md` - 시스템 아키텍처
- `rules/@CONVENTIONS.md` - 코딩 컨벤션
- `workflows/new-feature-development.md` - 신규 기능 개발
- `workflows/backlog-lifecycle.md` - Backlog 관리

### 프로젝트 문서
- `projects/place-keywords-maker/README.md`
- `projects/place-crawler/README.md`

### 템플릿
- `templates/` - 모든 템플릿 보관

---

## 🔐 보안 규칙

### API 키 관리

**❌ 절대 금지:**
```javascript
const apiKey = 'sk-1234567890abcdef'; // 하드코딩
```

**✅ 환경 변수 사용:**
```javascript
const apiKey = process.env.OPENAI_API_KEY;
```

**✅ 설정 파일 사용 (.gitignore 등록):**
```yaml
# local.config.yml (Git 제외)
api_keys:
  openai: sk-xxx
  naver_client_id: xxx
```

### 민감 정보 로깅 금지

**❌ 금지:**
```javascript
logger.info('API Key:', apiKey);
logger.info('User password:', password);
```

**✅ 안전:**
```javascript
logger.info('API 호출 성공');
logger.debug('Token length:', token.length); // 토큰 자체는 로그 안 함
```

---

## 📝 변경 이력

| 날짜 | 버전 | 변경 사항 |
|------|------|----------|
| 2025-10-28 | 1.0.0 | DocsCode 기반 워크스페이스 구조 구축 |

---

## ❓ FAQ

### Q1: 왜 DocsCode 구조를 사용하나요?
**A**: AI가 여러 프로젝트를 자동으로 관리하고, 완전한 문서를 생성할 수 있도록 최적화된 구조입니다.

### Q2: 기존 프로젝트는 어떻게 되나요?
**A**: 기존 프로젝트는 그대로 유지되며, `projects/` 폴더에 문서만 추가합니다.

### Q3: 모든 폴더를 다 사용해야 하나요?
**A**: 아니요. 필요한 폴더만 사용하면 됩니다. 핵심은 `rules/`, `templates/`, `workflows/`, `backlog/` 입니다.

### Q4: 새 프로젝트 추가는 어떻게 하나요?
**A**: "신규 프로젝트 추가 가이드" 섹션을 참고하세요.

---

## 🎓 학습 리소스

### 시작하기
1. 이 문서(CLAUDE.md) 정독
2. `rules/@ARCHITECTURE.md` 읽기
3. `workflows/new-feature-development.md` 실습
4. 간단한 기능으로 Backlog → Features 프로세스 체험

### 고급 주제
- 프로젝트 간 통합 (`cross-project/`)
- 기능 카탈로그 시스템 (`catalog/`)
- 인덱스 최적화 (`indexes/`)

---

**DocsCode로 AI와 함께 효율적인 개발을! 🚀**
