# Place_Keywords_maker

> **네이버 플레이스 대표키워드 자동 생성기**

---

## 📌 프로젝트 개요

네이버 플레이스의 최적 대표키워드를 AI 기반으로 자동 생성하는 도구입니다.

**실제 코드 위치**: `../../Place_Keywords_maker/`

---

## 🏗️ 아키텍처

### 3단계 파이프라인

```
[V1 크롤러] → [L1 데이터 수집] → [L2 AI 분석] → [L3 최종 조합]
```

#### L1: 데이터 수집 및 정렬
- **입력**: V1 크롤러 JSON (`data/input/places-advanced/`)
- **처리**:
  - 주소 파싱 (si/gu/dong/station)
  - 키워드 요소 분류
  - 완성도 평가 (115점 만점)
- **출력**: `data/output/l1/*.json`
- **지침서**: `work instruction/l1.md`

#### L2: AI 분석 및 목표키워드 설정
- **입력**: L1 출력 데이터
- **처리**:
  - 네이버 API 검색량 조회
  - AI 키워드 우선순위 분석
  - 경쟁도 평가
- **출력**: `data/output/l2/*.json`
- **지침서**: `work instruction/l2.md`

#### L3: 최종 키워드 조합
- **입력**: L2 목표키워드
- **처리**:
  - 점수 계산 (검색량, 경쟁도, 관련성)
  - 순위 결정
  - SEO 전략 생성
- **출력**: `data/output/l3/*.json`
- **지침서**: `work instruction/l3.md`

---

## 🛠️ 기술 스택

- **런타임**: Node.js
- **크롤러**: Playwright
- **AI**: OpenAI, Anthropic
- **외부 API**: 네이버 검색광고 API
- **데이터**: JSON

---

## 🚀 실행 방법

### CLI

```bash
cd ../../Place_Keywords_maker

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

# 도움말
node src/main.js help
```

### GUI

```bash
cd ../../Place_Keywords_maker
node src/gui-server.js

# 브라우저: http://localhost:3000
```

---

## 📂 파일 구조

```
Place_Keywords_maker/
├── src/
│   ├── l1-processor.js      # L1 로직
│   ├── l2-processor.js      # L2 로직
│   ├── l3-processor.js      # L3 로직
│   ├── logger.js            # 로깅 시스템
│   ├── main.js              # CLI 진입점
│   ├── gui-server.js        # GUI 서버
│   └── place-scraper.js     # 크롤러 (V1 통합)
│
├── data/
│   ├── input/               # 입력 데이터 (읽기 전용)
│   │   ├── places-advanced/ # 크롤러 JSON
│   │   ├── current_keywords.json
│   │   └── manual_notes.json
│   │
│   └── output/              # 출력 데이터 (쓰기 가능)
│       ├── l1/
│       ├── l2/
│       └── l3/
│
└── work instruction/        # 지침서
    ├── l1.md                # L1 프로세스 규칙
    ├── l2.md                # L2 AI 분석 규칙
    └── l3.md                # L3 키워드 조합 규칙
```

---

## 🔍 주요 기능

### L1 기능
- ✅ V1 크롤러 통합 (직접 크롤링 가능)
- ✅ 완성도 평가 시스템 (115점 만점)
- ✅ 실시간 진행률 로그
- ✅ 주소 자동 파싱
- ✅ 키워드 요소 자동 분류

### L2 기능
- ✅ 네이버 API 연동
- ✅ AI 키워드 분석 (OpenAI/Anthropic)
- ✅ 검색량 자동 조회
- ✅ 경쟁도 평가
- ✅ CSV 리포트 생성

### L3 기능
- ✅ 최종 점수 계산
- ✅ 순위 자동 결정
- ✅ SEO 전략 문서 생성
- ✅ 실행 가이드 생성
- ✅ 어뷰징 체크

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

프로젝트 루트의 `local.config.yml` 참조

---

## 📊 완성도 평가 기준 (L1)

### 115점 만점 시스템

#### 필수 요소 (60점)
- 카테고리: 20점
- 메뉴 정보: 20점 (3개 이상)
- 대표 메뉴: 20점

#### 중요 요소 (30점)
- 현재 키워드: 15점
- 수동 타겟 키워드: 15점

#### 보조 요소 (15점)
- 지역(si): 5점
- 지역(gu): 5점
- 지역(dong): 3점
- 지역(station): 2점

#### 추가 요소 (10점)
- 리뷰 통계: 3점
- 블로그 리뷰: 3점
- 이미지: 2점
- 편의시설: 2점

### 등급 기준
- **HIGH**: 90점 이상
- **MEDIUM**: 70-89점
- **LOW**: 70점 미만

---

## 🚨 에러 코드

### L1 에러
- `E_L1_001`: 크롤러 JSON이 없습니다
- `E_L1_002`: JSON 파싱 실패
- `E_L1_003`: 필수 필드 누락
- `E_L1_004`: 주소 파싱 실패

### L2 에러
- `E_L2_001`: 네이버 API 호출 실패
- `E_L2_002`: AI API 호출 실패
- `E_L2_003`: 검색량 데이터 없음
- `E_L2_006`: API 키 미설정

### L3 에러
- `E_L3_001`: 목표키워드가 없습니다
- `E_L3_002`: 점수 계산 실패
- `E_L3_003`: L2 출력 파일 없음

자세한 내용: `../../rules/@ERROR_CODES.md`

---

## 📚 문서

### 프로젝트 문서
- **이 문서**: `projects/place-keywords-maker/README.md`
- **지침서**: `../../Place_Keywords_maker/work instruction/`

### 워크스페이스 문서
- **AI 가이드**: `../../CLAUDE.md`
- **아키텍처**: `../../rules/@ARCHITECTURE.md`
- **컨벤션**: `../../rules/@CONVENTIONS.md`
- **에러 코드**: `../../rules/@ERROR_CODES.md`

---

## 🔗 관련 프로젝트

- **Place_Crawler**: 네이버 플레이스 크롤러 (V1 데이터 소스)
- 실제 코드: `../../Place_Crawler/`
- 문서: `../place-crawler/README.md`

---

## 📝 개발 이력

| 날짜 | 버전 | 변경 사항 |
|------|------|----------|
| 2025-10-23 | 2.0 | V1 크롤러 통합, 완성도 평가 시스템 |
| 2025-10-21 | 1.0 | L1/L2/L3 파이프라인 구축 |

---

## 🤝 기여

### 규칙 준수
- `../../rules/@CONVENTIONS.md` 따르기
- `../../rules/@ERROR_CODES.md` 참조
- 완전한 코드 작성 (TODO 금지)

### 새 기능 추가
1. `../../backlog/ideas/` 에 아이디어 작성
2. AI와 Q&A로 요구사항 명확화
3. `../../backlog/ready/` 로 이동
4. Issues + Features 자동 생성
5. 실제 구현

---

**버전**: 2.0
**실제 코드**: `../../Place_Keywords_maker/`
**업데이트**: 2025-10-28
