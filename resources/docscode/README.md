# 🚀 Workspace - DocsCode 기반 멀티 프로젝트 환경

> **AI와 함께하는 효율적인 개발 워크스페이스**

---

## 📌 개요

이 워크스페이스는 **DocsCode 아키텍처**를 기반으로 여러 프로젝트를 통합 관리하는 환경입니다.

### 주요 프로젝트

1. **Place_Keywords_maker** - 네이버 플레이스 대표키워드 자동 생성기
2. **Place_Crawler** - 네이버 플레이스 크롤러
3. (향후 추가 프로젝트...)

---

## 🎯 핵심 특징

### ✨ AI-First 설계
- AI가 자동으로 완전한 문서를 생성
- 자연어 요청 → 실행 가능한 이슈까지 5-10분

### 📝 Document-Driven Development
- 코드 작성 전 문서 먼저
- 템플릿 기반 자동 생성
- 일관된 품질 보장

### 🔄 Progressive Refinement
- IDEAS (10-30%) → EXPLORING (30-90%) → READY (90%+)
- AI Q&A로 점진적 명확화
- 불완전한 요구사항 방지

### 🏗️ 4계층 아키텍처
- **00-domain**: 비즈니스 로직 (기술 독립적)
- **10-interface**: UI/API/DB (계약)
- **20-implementation**: 실제 코드 (기술 의존적)
- **30-validation**: 테스트 및 검증

---

## 📂 워크스페이스 구조

```
workspace/
│
├── 🎯 AI 설정 (Meta Layer)
│   ├── CLAUDE.md              # AI 통합 가이드 ⭐ 가장 중요!
│   ├── local.config.yml       # 프로젝트 경로 설정
│   ├── rules/                 # 전체 규칙
│   │   ├── @ARCHITECTURE.md
│   │   ├── @CONVENTIONS.md
│   │   └── @ERROR_CODES.md
│   ├── templates/             # 문서 템플릿
│   └── workflows/             # 개발 프로세스
│
├── 📝 문서 생성 (Working Layer)
│   ├── backlog/               # 요청사항 관리
│   │   ├── ideas/
│   │   ├── exploring/
│   │   └── ready/
│   ├── analysis/              # 영향도 분석
│   ├── issues/                # 실행 가능한 이슈
│   └── features/              # 완전한 기능 문서
│
├── 📚 지식 베이스 (Knowledge Layer)
│   ├── projects/              # 프로젝트별 문서
│   ├── cross-project/         # 공통 영역
│   ├── catalog/               # 기능 카탈로그
│   └── indexes/               # 빠른 검색
│
├── 🗂️ 실제 프로젝트
│   ├── Place_Keywords_maker/
│   ├── Place_Crawler/
│   └── [future-projects]/
│
└── 📦 기타
    ├── data/
    ├── _archive/
    └── node_modules/
```

---

## 🚀 빠른 시작

### 1. 환경 설정

#### ① 필수 설치
```bash
# Node.js (이미 설치됨)
node --version

# Playwright (Place_Keywords_maker, Place_Crawler용)
cd Place_Keywords_maker
npm install playwright
npx playwright install chromium
```

#### ② 설정 파일 수정
```bash
# local.config.yml 파일 확인 및 수정
# - 프로젝트 경로가 올바른지 확인
# - API 키는 환경 변수로 설정 (권장)
```

#### ③ 환경 변수 설정 (선택)
```bash
# Windows PowerShell
$env:OPENAI_API_KEY="sk-..."
$env:NAVER_CLIENT_ID="your_id"
$env:NAVER_CLIENT_SECRET="your_secret"

# Windows CMD
set OPENAI_API_KEY=sk-...
set NAVER_CLIENT_ID=your_id
```

### 2. 프로젝트 실행

#### Place_Keywords_maker

```bash
cd Place_Keywords_maker

# L1: 데이터 수집
node src/main.js l1

# L1 + 크롤링
node src/main.js l1 1768171911

# 전체 파이프라인
node src/main.js start

# GUI 서버 실행
node src/gui-server.js
```

#### Place_Crawler

```bash
cd Place_Crawler/V1

# 단일 크롤링
node ultimate-scraper.js 1768171911

# 배치 크롤링
node batch-scraper.js
```

---

## 📖 사용 가이드

### 신규 기능 개발 프로세스

```
[1단계] 자연어 요청
    ↓
    "장바구니에 쿠폰 추가해줘"
    ↓
[2단계] Backlog 생성 (IDEAS)
    backlog/ideas/cart-coupon.md
    신뢰도: 20%
    ↓
[3단계] AI와 Q&A (EXPLORING)
    AI: "쿠폰 중복 사용 가능한가요?"
    User: "아니요, 1개만"
    → 신뢰도: 60% → 90%
    ↓
[4단계] READY 상태
    backlog/ready/cart-coupon.md
    신뢰도: 95%
    ↓
[5단계] 사용자 선택
    "Issues, Features, 둘 다?"
    ↓
[6-8단계] AI 자동 생성
    - analysis/cart-coupon/ (영향도 분석)
    - issues/cart-coupon/ (실행 가능한 이슈)
    - features/cart-coupon/ (4계층 문서)
    ↓
[9단계] 개발자 구현
    실제 코드 작성
```

### AI와 대화하기

#### ✅ 좋은 예

```
"Place_Keywords_maker의 L1 프로세스에
완성도 평가 시스템을 추가하고 싶어.

먼저 Backlog로 만들어서 요구사항을
명확히 하자."
```

#### ❌ 나쁜 예

```
"쿠폰 기능 만들어줘"
```

---

## 📚 핵심 문서

### 시작하기
1. **[CLAUDE.md](CLAUDE.md)** - AI 통합 가이드 (⭐ 필독!)
2. **[rules/@ARCHITECTURE.md](rules/@ARCHITECTURE.md)** - 시스템 아키텍처
3. **[rules/@CONVENTIONS.md](rules/@CONVENTIONS.md)** - 코딩 컨벤션

### 워크플로우
- **workflows/new-feature-development.md** - 신규 기능 개발
- **workflows/backlog-lifecycle.md** - Backlog 관리
- **workflows/cross-project-integration.md** - 프로젝트 간 통합

### 프로젝트 문서
- **projects/place-keywords-maker/README.md**
- **projects/place-crawler/README.md**

---

## 🛠️ 주요 명령어

### Place_Keywords_maker

```bash
# 도움말
node src/main.js help

# L1 (데이터 수집)
node src/main.js l1
node src/main.js l1 1768171911

# L2 (AI 분석)
node src/main.js l2

# L3 (최종 조합)
node src/main.js l3

# 전체 파이프라인
node src/main.js start

# GUI
node src/gui-server.js
```

### Place_Crawler

```bash
# 단일 크롤링
cd V1
node ultimate-scraper.js {placeId}

# 배치 크롤링
node batch-scraper.js
```

---

## 🔧 문제 해결

### 자주 발생하는 오류

#### E_L1_001: 크롤러 JSON이 없습니다
```bash
# 해결: 크롤링 실행
node src/main.js l1 1768171911
```

#### E_CRAWLER_004: 봇 탐지됨
```bash
# 해결: 헤드리스 모드 끄기
node src/main.js l1 1768171911 --headless=false
```

#### E_L2_006: API 키 미설정
```bash
# 해결: 환경 변수 설정
$env:OPENAI_API_KEY="sk-..."
```

더 많은 에러 코드: **[rules/@ERROR_CODES.md](rules/@ERROR_CODES.md)**

---

## 📊 프로젝트 상태

### Place_Keywords_maker
- **상태**: ✅ 운영 중
- **버전**: 2.0 (V1 통합)
- **주요 기능**: L1 (데이터 수집) ✅ | L2 (AI 분석) ✅ | L3 (최종 조합) ✅

### Place_Crawler
- **상태**: ✅ 운영 중
- **버전**: V1 (Apollo State Parser)
- **주요 기능**: 단일 크롤링 ✅ | 배치 크롤링 ✅

---

## 🚀 신규 프로젝트 추가

### 단계별 가이드

```
1. 프로젝트 폴더 생성
   workspace/{new-project}/

2. 프로젝트 문서 생성
   projects/{new-project}/
   ├── README.md
   ├── architecture.md
   └── conventions.md

3. local.config.yml 업데이트
   projects:
     {new-project}:
       path: ~/workspace/{new-project}
       type: frontend | backend | tool
       framework: react | django | nodejs

4. 인덱스 생성
   indexes/projects/{new-project}.md

5. CLAUDE.md 업데이트
   프로젝트 설명 및 규칙 추가
```

---

## 🤝 기여 가이드

### 규칙 준수
- **[rules/@CONVENTIONS.md](rules/@CONVENTIONS.md)** 따르기
- **[rules/@ERROR_CODES.md](rules/@ERROR_CODES.md)** 참조
- 완전한 코드 작성 (TODO 금지)

### Commit 메시지
```
feat: 새 기능 추가
fix: 버그 수정
docs: 문서 수정
refactor: 리팩토링
test: 테스트 추가
```

---

## 📝 라이선스

이 워크스페이스는 개인 프로젝트입니다.

---

## 📞 문의

- **개발자**: Nk Ko
- **워크스페이스**: C:\Users\Nk Ko\Documents\workspace

---

## 🎓 학습 리소스

### 시작하기
1. **CLAUDE.md** 정독
2. **rules/@ARCHITECTURE.md** 읽기
3. 간단한 기능으로 Backlog → Features 프로세스 체험

### 고급 주제
- 프로젝트 간 통합
- 기능 카탈로그 시스템
- 인덱스 최적화

---

**DocsCode로 AI와 함께 효율적인 개발을! 🚀**

**버전**: 1.0.0
**업데이트**: 2025-10-28
