# Place Keywords Maker V2.1

네이버 플레이스 SEO 자동화 시스템 - 가이드북 기반 L1 크롤링 강화 버전

## 🎯 V2.1 주요 개선 사항 (2025-11-14)

### 신규 기능
- ✨ **42ment SEO 가이드북 v1.1 통합**: Relevance·Popularity·Trust 프레임워크 완전 적용
- ✨ **Apollo State 완전 파싱**: 메뉴/리뷰/이미지 상세 수집
- ✨ **지역 정밀 파싱**: AddressParser (시/구/동/역/상권 추출)
- ✨ **키워드 5가지 자동 분류**: core/location/menu/attribute/sentiment
- ✨ **완성도 115점 만점 평가**: 기존 100점 → 115점 시스템
- ✨ **2단계 캐싱 시스템**: 메모리 + 파일 캐시
- ✨ **증분 업데이트**: 변경된 데이터만 재수집

### V2.0 대비 개선점

### V1 대비 개선점

| 영역 | V1 | V2 |
|------|----|----|
| **구조** | 단일 파일 (monolithic) | 모듈화 (crawler, parser, processor 분리) |
| **테스트** | 테스트 없음 | Jest + 70% 커버리지 목표 |
| **에러 처리** | 기본 try-catch | Circuit Breaker + Exponential Backoff |
| **설정** | 하드코딩 | YAML + .env 분리 |
| **로깅** | console.log | 구조화된 logger (레벨별) |

### 주요 기능

**L1 파이프라인 (강화)**:
- ✅ **8단계 데이터 수집**: 소스 스캔 → 크롤링 → 통합 → 지역 파싱 → 키워드 분류 → 평가 → 정렬 → 저장
- ✅ **Apollo State 완전 파싱**: 메뉴 50개, 블로그 리뷰 10개(1500자+), 이미지 자동 분류
- ✅ **지역 정밀 파싱**: AddressParser (시/구/동/역/상권/건물)
- ✅ **키워드 5가지 분류**: core/location/menu/attribute/sentiment
- ✅ **완성도 115점 평가**: 7개 항목별 상세 점수 + HIGH/MEDIUM/LOW 등급

**데이터 관리**:
- ✅ **증분 업데이트**: 변경 감지 + 우선순위 큐
- ✅ **2단계 캐싱**: 메모리(L1) + 파일(L2), TTL 1시간
- ✅ **계층적 저장**: 연도/월별 분류 + 인덱스 + 아카이브
- ✅ **스키마 검증**: Ajv 기반 데이터 무결성 체크
- ✅ **트랜잭션**: 롤백 지원

**안정성**:
- ✅ **모듈화 아키텍처**: 재사용 가능한 독립 모듈
- ✅ **에러 복원력**: Circuit Breaker 패턴으로 장애 전파 방지
- ✅ **재시도 로직**: Exponential Backoff로 API 부하 분산

**향후 계획**:
- 🔨 **L2 파이프라인**: AI 기반 키워드 분석 (개발 예정)
- 🔨 **L3 파이프라인**: 최종 SEO 전략 생성 (개발 예정)

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

## 📊 완성도 평가 기준 (115점 만점)

| 항목 | 배점 | 기준 |
|------|------|------|
| **기본 정보** | 20점 | ID, 이름, 카테고리, 주소, 전화번호, 소개문(1200자+) |
| **메뉴** | 20점 | 10개 이상 + 가격 정보 80% + 이미지 50% + 추천 메뉴 |
| **리뷰** | 25점 | 총 100개 이상 + 텍스트 리뷰 50개 + 블로그 리뷰 5개(1500자+) + 영수증 인증 10개 |
| **이미지** | 15점 | 20개 이상 + 고해상도(1200×800) + 5가지 카테고리 분류 |
| **편의시설** | 10점 | 편의시설 5개 + 결제수단 3개 + 주차 정보 |
| **키워드** | 15점 | 5가지 키워드 요소(core/location/menu/attribute/sentiment) |
| **수동 데이터** | 10점 | 현재 키워드 보유 + 수동 메모 |

**등급 분류**:
- **HIGH**: 90점 이상
- **MEDIUM**: 60-89점
- **LOW**: 60점 미만

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

### V2.0 (완료)
- [x] L1 파이프라인 기본 구조
- [x] Circuit Breaker 패턴
- [x] Exponential Backoff
- [x] 모듈화 아키텍처
- [x] 기본 테스트 프레임워크

### V2.1 (진행 중 - 4주 계획)
- [ ] **Week 1**: Apollo State 완전 파싱 + 메뉴/리뷰/이미지 수집
- [ ] **Week 2**: AddressParser + KeywordClassifier + 115점 평가
- [ ] **Week 3**: StorageManager + CacheManager + 검증 시스템
- [ ] **Week 4**: GUI 연동 + 테스트 + 문서화

👉 자세한 일정은 [IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md) 참조

### V2.2 (향후)
- [ ] L2 AI 키워드 분석
- [ ] L3 최종 전략 생성
- [ ] GUI 웹 대시보드 고도화
- [ ] Mock 모드 구현

## 📝 참고 문서

### 🎯 V2.1 구현 가이드 (신규)
- **[L1 크롤링 강화 가이드](docs/L1_CRAWLING_ENHANCEMENT_GUIDE.md)** ⭐
  - 가이드북 v1.1 기반 데이터 수집 전략
  - Apollo State 완전 파싱 구현
  - AddressParser/KeywordClassifier 상세 설계
  - 완성도 115점 만점 평가 시스템
  - 테스트 전략 및 Mock 데이터

- **[데이터 수집/저장 최적화](docs/DATA_COLLECTION_STORAGE_GUIDE.md)** ⭐
  - 증분 업데이트 시스템
  - 병렬 크롤링 (동시 3개)
  - 2단계 캐싱 (메모리 + 파일)
  - 계층적 저장 구조
  - 스키마 검증 및 트랜잭션
  - 실시간 모니터링

- **[4주 구현 로드맵](docs/IMPLEMENTATION_ROADMAP.md)** ⭐
  - Week별 상세 Task 분해
  - Day별 구현 가이드
  - 테스트 코드 예시
  - 트러블슈팅 가이드
  - 완료 기준 체크리스트

### 📚 기반 문서
- **[42ment SEO 가이드북 v1.1](docs/architecture/251113_Guidebook_v1.1_full.md)** 🔥
  - Relevance·Popularity·Trust 프레임워크
  - 키워드 자동화 구조 (C-Sys)
  - 내부/외부 콘텐츠 전략
  - BlogGuide 모듈
- **[키워드 메타 분류 체계](docs/architecture/keyword_meta_taxonomy.yaml)**
  - Location/Target/Intent/Tone/Time 체계

### 📖 아키텍처 문서
- [SPEC.md](SPEC.md) - V2 통합 스펙
- [시스템 개요](docs/architecture/overview.md) - L1/L2/L3 프로세스
- [L1 파이프라인](docs/architecture/l1-pipeline.md) - 데이터 수집 상세 (765줄)
- [L2 분석](docs/architecture/l2-analysis.md) - AI 키워드 분석 (750줄)
- [L3 전략](docs/architecture/l3-strategy.md) - 최종 전략 수립 (554줄)

### 📁 워크스페이스 문서
- [워크스페이스 README](../../README.md)
- [Spec 문서](../../1-planning/specs/001-naver-place-seo-automation/spec.md)
- [Plan 문서](../../1-planning/specs/001-naver-place-seo-automation/plan.md)

### 📅 변경 이력
**2025-11-14 (V2.1)**:
- 🎯 L1 크롤링 강화 가이드 작성 (~1,200줄)
- 🎯 데이터 수집/저장 최적화 가이드 작성 (~1,100줄)
- 🎯 4주 구현 로드맵 작성 (~800줄)
- ✅ 42ment SEO 가이드북 v1.1 통합
- ✅ 키워드 메타 분류 체계 통합

**2025-11-14 (V2.0)**:
- place-crawler/Doc/*.md → docs/architecture/*.md
- 총 2,522줄의 상세 문서 통합
- place-crawler → 9-archive/place-crawler-* 보관

## 🤝 기여

이슈 및 PR 환영합니다.

## 📄 라이선스

MIT
