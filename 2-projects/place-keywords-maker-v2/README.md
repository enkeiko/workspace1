# Place Keywords Maker V2

네이버 플레이스 SEO 자동화 시스템 - **42ment Guidebook v1.1** 기반 구현

📎 **전략 프레임워크**: [Guidebook v1.1](docs/architecture/251113_Guidebook_v1.1_full.md) | **전략↔구현**: [GUIDEBOOK_MAPPING.md](docs/GUIDEBOOK_MAPPING.md) | **전체 문서**: [인덱스](../../DOCUMENTATION_INDEX.md)

---

## 🚀 빠른 시작

5분 안에 첫 번째 키워드 분석을 실행하세요!

→ **[시작하기 (5분 퀵스타트)](GETTING_STARTED.md)**

### 주요 명령어
```bash
npm install              # 설치
npm run l1               # L1 파이프라인 실행
npm run l2               # L2 파이프라인 실행
npm run l3               # L3 파이프라인 실행
npm test                 # 테스트 실행
```

---

## 📖 역할별 가이드

시작하기 전에 역할에 맞는 문서를 선택하세요:

### 🆕 신규 사용자
- **첫 방문이신가요?** → [GETTING_STARTED.md](GETTING_STARTED.md) (5분 퀵스타트)
- **문제 발생 시** → [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **변경 이력** → [CHANGELOG.md](CHANGELOG.md)

### 🔧 개발자
- **시스템 아키텍처** → [docs/architecture/overview.md](docs/architecture/overview.md)
- **전략↔구현 매핑** → [GUIDEBOOK_MAPPING.md](docs/GUIDEBOOK_MAPPING.md)
- **통합 스펙** → [SPEC.md](SPEC.md)
- **테스트 가이드** → [Testing](#-테스트) (아래 섹션)

### 📋 기획자/PM
- **전략 프레임워크** → [Guidebook v1.1](docs/architecture/251113_Guidebook_v1.1_full.md)
- **커버리지 분석** → [GUIDEBOOK_COVERAGE_ANALYSIS.md](docs/GUIDEBOOK_COVERAGE_ANALYSIS.md)
- **PM 문서 리뷰** → [PM_DOCUMENTATION_REVIEW.md](docs/PM_DOCUMENTATION_REVIEW.md)

### 💡 기여자
- **기여 가이드** → CONTRIBUTING.md (작성 예정)
- **이슈 제기** → [GitHub Issues](https://github.com/enkeiko/workspace1/issues)

---

## 🆘 도움이 필요하신가요?

### 자주 발생하는 문제
→ [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 14가지 일반적인 문제 해결법

### 자주 묻는 질문
→ docs/FAQ.md (작성 예정)

### 문의하기
→ [GitHub Issues](https://github.com/enkeiko/workspace1/issues)

---

## 🎯 V2 주요 개선 사항

### V1 대비 개선점

| 영역 | V1 | V2 |
|------|----|----|
| **구조** | 단일 파일 (monolithic) | 모듈화 (crawler, parser, processor 분리) |
| **테스트** | 테스트 없음 | Jest + 70% 커버리지 목표 |
| **에러 처리** | 기본 try-catch | Circuit Breaker + Exponential Backoff |
| **설정** | 하드코딩 | YAML + .env 분리 |
| **로깅** | console.log | 구조화된 logger (레벨별) |

### 주요 기능

- ✅ **L1 파이프라인**: 네이버 플레이스 데이터 크롤링 및 완성도 평가
- ✅ **모듈화 아키텍처**: 재사용 가능한 독립 모듈
- ✅ **에러 복원력**: Circuit Breaker 패턴으로 장애 전파 방지
- ✅ **재시도 로직**: Exponential Backoff로 API 부하 분산
- 🔨 **L2 파이프라인**: AI 기반 키워드 분석 (개발 중)
- 🔨 **L3 파이프라인**: 최종 SEO 전략 생성 (개발 중)

## 📦 설치

```bash
cd 2-projects/place-keywords-maker-v2
npm install
```

## ⚙️ 설정

### 1. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열어 API 키 입력:

```env
NAVER_CLIENT_ID=your_client_id_here
NAVER_CLIENT_SECRET=your_client_secret_here
AI_API_KEY=your_ai_api_key_here
```

### 2. 설정 파일 수정 (선택)

[src/config/default.yml](src/config/default.yml)에서 크롤러 타임아웃, 재시도 횟수 등을 조정할 수 있습니다.

## 🚀 사용법

### L1 파이프라인 실행

```bash
npm run l1
```

### 테스트 실행

```bash
# 전체 테스트
npm test

# Watch 모드
npm run test:watch

# 커버리지
npm run test:coverage
```

## 📁 프로젝트 구조

```
place-keywords-maker-v2/
├── src/
│   ├── modules/
│   │   ├── crawler/           # 크롤링 모듈
│   │   │   └── PlaceCrawler.js
│   │   ├── parser/            # 데이터 파싱
│   │   │   └── DataParser.js
│   │   ├── processor/         # 파이프라인 처리
│   │   │   └── L1Processor.js
│   │   ├── ai/                # AI 분석 (L2)
│   │   └── api/               # 네이버 API (L3)
│   │
│   ├── pipelines/             # 파이프라인 진입점
│   │   ├── l1-pipeline.js
│   │   ├── l2-pipeline.js
│   │   └── l3-pipeline.js
│   │
│   ├── utils/                 # 유틸리티
│   │   ├── CircuitBreaker.js  # 장애 전파 방지
│   │   ├── retry.js           # 재시도 로직
│   │   └── logger.js          # 로깅
│   │
│   └── config/
│       └── default.yml        # 기본 설정
│
├── tests/
│   ├── unit/                  # 단위 테스트
│   └── integration/           # 통합 테스트
│
├── data/
│   ├── input/                 # 입력 데이터
│   ├── output/                # 출력 결과
│   └── cache/                 # 캐시
│
├── package.json
├── jest.config.js
├── .env.example
└── README.md
```

## 🔧 개발

### 모듈 설명

#### PlaceCrawler
네이버 플레이스 페이지 크롤링
- Puppeteer 기반
- Circuit Breaker 적용
- Exponential Backoff 재시도

#### DataParser
크롤링 데이터 파싱 및 정규화
- HTML 정리
- 데이터 검증
- 완성도 계산 (0-100점)

#### L1Processor
L1 파이프라인 오케스트레이션
- 크롤링 → 파싱 → 평가
- 배치 처리 지원
- 결과 JSON 저장

## 📊 완성도 평가 기준

| 항목 | 가중치 | 기준 |
|------|--------|------|
| 기본 정보 | 20% | 이름, 카테고리, 주소 |
| 메뉴 | 15% | 1개 이상 |
| 사진 | 15% | 5개 이상 |
| 리뷰 | 25% | 10개 이상 |
| 영업 시간 | 10% | 존재 여부 |
| 설명 | 15% | 50자 이상 |

## 🧪 테스트

```bash
# 단위 테스트만
npm test -- tests/unit

# 특정 파일
npm test -- PlaceCrawler.test.js

# 커버리지 (70% 이상 목표)
npm run test:coverage
```

## 📈 로드맵

- [x] L1 파이프라인 기본 구조
- [x] Circuit Breaker 패턴
- [x] Exponential Backoff
- [ ] L2 AI 키워드 분석
- [ ] L3 최종 전략 생성
- [ ] GUI 웹 대시보드
- [ ] Mock 모드 구현

## 📝 참고 문서

### 프로젝트 문서
- [SPEC.md](SPEC.md) - 통합 스펙 (요약본)
- [docs/](docs/) - 상세 아키텍처 문서
  - [시스템 개요](docs/architecture/overview.md) - L1/L2/L3 프로세스 소개
  - [L1 파이프라인](docs/architecture/l1-pipeline.md) - 데이터 수집 상세 (765줄)
  - [L2 분석](docs/architecture/l2-analysis.md) - AI 키워드 분석 (750줄)
  - [L3 전략](docs/architecture/l3-strategy.md) - 최종 전략 수립 (554줄)

### 워크스페이스 문서
- [워크스페이스 README](../../README.md)
- [Spec 문서](../../1-planning/specs/001-naver-place-seo-automation/spec.md)
- [Plan 문서](../../1-planning/specs/001-naver-place-seo-automation/plan.md)

### 통합 이력
**2025-11-14**: place-crawler 프로젝트 문서 통합
- place-crawler/Doc/*.md → docs/architecture/*.md
- 총 2,522줄의 상세 문서 통합
- place-crawler → 9-archive/place-crawler-* 보관

## 🤝 기여

이슈 및 PR 환영합니다.

## 📄 라이선스

MIT
