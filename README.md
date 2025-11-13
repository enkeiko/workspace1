# 🚀 Workspace

> **네이버 플레이스 관련 프로젝트 통합 워크스페이스**

---

## 📁 프로젝트

### 1. [Place_Keywords_maker](Place_Keywords_maker/)
네이버 플레이스 대표키워드 자동 생성기

```bash
cd Place_Keywords_maker
node src/main.js l1
```

### 2. [Place_Crawler](Place_Crawler/)
네이버 플레이스 크롤러 (V1)

```bash
cd Place_Crawler/V1
node ultimate-scraper.js 1768171911
```

### 3. [Project Outline](Project%20Outline/)
프로젝트 개요 자료

---

## 📚 문서 시스템

이 워크스페이스는 **DocsCode** 아키텍처를 사용합니다.

### 📖 모든 문서 및 AI 시스템

**위치**: [`docscode/`](docscode/)

```
docscode/
├── CLAUDE.md              # AI 통합 가이드 (최우선!)
├── README.md              # DocsCode 사용법
├── STRUCTURE_EXPLAINED.md # 구조 상세 설명
│
├── rules/                 # 개발 규칙
├── templates/             # 문서 템플릿
├── workflows/             # 개발 프로세스
│
├── backlog/               # 요청사항 관리
├── issues/                # 실행 가능한 이슈
├── features/              # 완전한 기능 문서
├── analysis/              # 영향도 분석
│
└── projects/              # 프로젝트 문서
    ├── place-keywords-maker/
    └── place-crawler/
```

---

## 🎯 빠른 시작

### AI와 작업하기

```
1. AI 가이드 읽기
   cat docscode/CLAUDE.md

2. 프로젝트 이해하기
   cat docscode/projects/place-keywords-maker/README.md

3. AI에게 요청
   "Place_Keywords_maker의 L1에 완성도 평가 추가해줘"
```

### 새 기능 개발

```
[사용자 요청]
    ↓
[Backlog 생성] docscode/backlog/ideas/
    ↓
[AI Q&A로 명확화] docscode/backlog/exploring/
    ↓
[준비 완료] docscode/backlog/ready/
    ↓
[Issues + Features 자동 생성]
    ├─ docscode/issues/
    └─ docscode/features/
    ↓
[실제 코드 작성] Place_Keywords_maker/src/
```

---

## 📋 주요 문서

### 필수 문서 (꼭 읽기!)
- **[docscode/CLAUDE.md](docscode/CLAUDE.md)** - AI 통합 가이드 ⭐
- **[docscode/README.md](docscode/README.md)** - DocsCode 사용법
- **[docscode/STRUCTURE_EXPLAINED.md](docscode/STRUCTURE_EXPLAINED.md)** - 구조 설명

### 규칙 문서
- **[docscode/rules/@ARCHITECTURE.md](docscode/rules/@ARCHITECTURE.md)** - 시스템 아키텍처
- **[docscode/rules/@CONVENTIONS.md](docscode/rules/@CONVENTIONS.md)** - 코딩 컨벤션
- **[docscode/rules/@ERROR_CODES.md](docscode/rules/@ERROR_CODES.md)** - 에러 코드

### 프로젝트 문서
- **[docscode/projects/place-keywords-maker/README.md](docscode/projects/place-keywords-maker/README.md)**
- **[docscode/projects/place-crawler/README.md](docscode/projects/place-crawler/README.md)**

---

## 🛠️ 개발 명령어

### Place_Keywords_maker

```bash
cd Place_Keywords_maker

# L1: 데이터 수집
node src/main.js l1

# L1 + 크롤링
node src/main.js l1 1768171911

# L2: AI 분석
node src/main.js l2

# L3: 최종 조합
node src/main.js l3

# 전체 파이프라인
node src/main.js start

# GUI 서버
node src/gui-server.js
```

### Place_Crawler

```bash
cd Place_Crawler/V1

# 단일 크롤링
node ultimate-scraper.js 1768171911

# 배치 크롤링
node batch-scraper.js
```

---

## ⚙️ 설정

### 환경 변수

```bash
# Windows PowerShell
$env:OPENAI_API_KEY="sk-..."
$env:ANTHROPIC_API_KEY="sk-ant-..."
$env:NAVER_CLIENT_ID="your_id"
$env:NAVER_CLIENT_SECRET="your_secret"
```

### 설정 파일

**[local.config.yml](local.config.yml)** - 프로젝트 경로 및 API 키 설정

---

## 📊 워크스페이스 구조

```
workspace/
│
├── Place_Keywords_maker/      ← 실제 프로젝트 코드
├── Place_Crawler/             ← 실제 프로젝트 코드
├── Project Outline/           ← 프로젝트 개요
│
├── docscode/                  ← DocsCode 문서 시스템
│   ├── CLAUDE.md              ← AI 가이드 (시작점!)
│   ├── rules/                 ← 개발 규칙
│   ├── templates/             ← 문서 템플릿
│   ├── backlog/               ← AI 생성 결과물
│   ├── issues/                ← 실행 가능한 이슈
│   ├── features/              ← 완전한 기능 문서
│   └── projects/              ← 프로젝트 문서
│
├── data/                      ← 공용 데이터
├── local.config.yml           ← 설정 파일
└── .gitignore                 ← Git 제외 설정
```

---

## 🎓 학습 경로

### 1단계: 기본 이해 (30분)
1. 이 README 읽기 (5분)
2. [docscode/CLAUDE.md](docscode/CLAUDE.md) 읽기 (15분)
3. [docscode/STRUCTURE_EXPLAINED.md](docscode/STRUCTURE_EXPLAINED.md) 읽기 (10분)

### 2단계: 실습 (1시간)
1. 프로젝트 실행해보기 (20분)
2. 간단한 기능으로 Backlog 체험 (30분)
3. AI와 대화하며 문서 생성 (10분)

### 3단계: 실전 (계속)
1. 실제 기능 개발
2. 워크플로우 학습
3. 템플릿 커스터마이징

---

## 💡 주요 특징

### ✨ AI-First 개발
- AI가 완전한 문서 자동 생성 (5-10분)
- 자연어 요청 → 실행 가능한 코드
- 매번 프로젝트 설명 불필요

### 📝 Document-Driven
- 코드 작성 전 문서 먼저
- 템플릿 기반 일관된 품질
- 완전한 코드 (TODO 없음)

### 🔄 Progressive Refinement
- IDEAS (10-30%) → EXPLORING (30-90%) → READY (90%+)
- AI Q&A로 점진적 명확화
- 불완전한 요구사항 방지

---

## 🚀 신규 프로젝트 추가

```bash
# 1. 프로젝트 폴더 생성 (워크스페이스 루트)
mkdir New_Project

# 2. 프로젝트 코드 작성
cd New_Project
# ... 개발 ...

# 3. 프로젝트 문서 생성
mkdir docscode/projects/new-project
cat > docscode/projects/new-project/README.md <<EOF
# New_Project
**실제 코드 위치**: ../../New_Project/
EOF

# 4. local.config.yml 업데이트
# projects 섹션에 추가

# 5. 즉시 사용 가능!
```

---

## 📞 문의

- **개발자**: Nk Ko
- **워크스페이스**: C:\Users\Nk Ko\Documents\workspace
- **문서 시스템**: [docscode/](docscode/)

---

## 🎉 시작하기

```bash
# 1. AI 가이드 읽기
cat docscode/CLAUDE.md

# 2. 프로젝트 실행
cd Place_Keywords_maker
node src/main.js l1

# 3. AI와 대화
"새로운 기능 추가하고 싶어!"
```

---

**DocsCode로 AI와 함께 효율적인 개발을! 🚀**

**시작점**: [docscode/CLAUDE.md](docscode/CLAUDE.md)
