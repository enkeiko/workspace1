# Place Keywords Maker V2 - 문서 인덱스

이 디렉토리는 프로젝트의 모든 문서를 카테고리별로 정리합니다.

**최근 업데이트**: 2025-12-10 (문서 구조 재정리)

## 📁 문서 구조

```
docs/
├── README.md                    # 📖 이 파일 (문서 인덱스)
├── architecture/                # 🏗️ 아키텍처 문서
├── implementation/              # 🔧 구현 가이드
├── data-specs/                  # 📊 데이터 스펙
├── investigations/              # 🔍 조사 및 디버그 문서
├── guides/                      # 📚 사용 가이드
└── progress/                    # 📈 진행 상황
```

## 빠른 시작
프로젝트 루트의 [README.md](../README.md)와 [SPEC.md](../SPEC.md)를 먼저 확인하세요.

---

## 🏗️ Architecture (아키텍처)

시스템 아키텍처 및 파이프라인 상세 설명 (통합된 place-crawler 문서)

### [architecture/](architecture/)

1. **[overview.md](architecture/overview.md)** (453줄)
   - 시스템 개요 및 핵심 목표
   - 3단계 L1/L2/L3 프로세스 소개
   - 전체 워크플로우

2. **[l1-pipeline.md](architecture/l1-pipeline.md)** (765줄)
   - L1: 데이터 수집 및 정렬
   - 8단계 상세 프로세스
   - 완성도 평가 (115점 만점)
   - 입출력 스키마

3. **[l2-analysis.md](architecture/l2-analysis.md)** (750줄)
   - L2: AI 분석 및 목표키워드 설정
   - 네이버 검색량 조회 연동
   - 키워드 5대 분류 체계
   - 단기/장기, 메인/서브 전략

4. **[l3-strategy.md](architecture/l3-strategy.md)** (554줄)
   - L3: 최종 대표키워드 조합
   - 스코어링 알고리즘
   - 우선순위 결정 로직
   - 최종 출력 형식

5. **[251113_Guidebook_v1.1_full.md](architecture/251113_Guidebook_v1.1_full.md)** - 42ment SEO 가이드북 v1.1
   - Relevance·Popularity·Trust 프레임워크
   - 키워드 자동화 구조 (C-Sys)
   - 내부/외부 콘텐츠 전략

---

## 🔧 Implementation (구현 가이드)

실제 구현을 위한 상세 가이드와 로드맵입니다.

### [implementation/](implementation/)

1. **[L1_CRAWLING_ENHANCEMENT_GUIDE.md](implementation/L1_CRAWLING_ENHANCEMENT_GUIDE.md)** ⭐ (~1,200줄)
   - 가이드북 v1.1 기반 데이터 수집 전략
   - Apollo State 완전 파싱 구현
   - AddressParser/KeywordClassifier 상세 설계
   - 완성도 115점 만점 평가 시스템
   - 테스트 전략 및 Mock 데이터

2. **[IMPLEMENTATION_ROADMAP.md](implementation/IMPLEMENTATION_ROADMAP.md)** ⭐ (~800줄)
   - 4주 구현 로드맵
   - Week별 상세 Task 분해
   - Day별 구현 가이드
   - 테스트 코드 예시
   - 완료 기준 체크리스트

3. **[COLLECTOR_V04_IMPLEMENTATION_GUIDE.md](implementation/COLLECTOR_V04_IMPLEMENTATION_GUIDE.md)** - V04 크롤러 구현 가이드
4. **[COLLECTOR_V04_MIGRATION_GUIDE.md](implementation/COLLECTOR_V04_MIGRATION_GUIDE.md)** - V04 마이그레이션 가이드
5. **[COLLECTOR_V04_TECHNICAL_DESIGN.md](implementation/COLLECTOR_V04_TECHNICAL_DESIGN.md)** - V04 기술 설계

---

## 📊 Data Specs (데이터 스펙)

데이터 구조, 수집, 저장 관련 명세입니다.

### [data-specs/](data-specs/)

1. **[DATA_SPECIFICATION.md](data-specs/DATA_SPECIFICATION.md)** - 데이터 명세 총괄
2. **[DATA_COLLECTION_SPEC.md](data-specs/DATA_COLLECTION_SPEC.md)** - 데이터 수집 스펙
3. **[DATA_COLLECTION_STORAGE_GUIDE.md](data-specs/DATA_COLLECTION_STORAGE_GUIDE.md)** ⭐ (~1,100줄)
   - 증분 업데이트 시스템
   - 병렬 크롤링 (동시 3개)
   - 2단계 캐싱 (메모리 + 파일)
   - 계층적 저장 구조
   - 스키마 검증 및 트랜잭션

4. **[DATA_STRUCTURE_DIAGRAM.txt](data-specs/DATA_STRUCTURE_DIAGRAM.txt)** - 데이터 구조 다이어그램
5. **[NEW_DATA_STRUCTURE.md](data-specs/NEW_DATA_STRUCTURE.md)** - 신규 데이터 구조
6. **[SEARCH_RESULTS_DATA_STRUCTURE_REPORT.md](data-specs/SEARCH_RESULTS_DATA_STRUCTURE_REPORT.md)** - 검색 결과 데이터 구조

---

## 🔍 Investigations (조사 및 디버그)

기능 조사, 버그 수정, 디버깅 과정 문서입니다.

### [investigations/](investigations/)

1. **[INVESTIGATION_README.md](investigations/INVESTIGATION_README.md)** - 조사 개요
2. **[INVESTIGATION_SUMMARY.md](investigations/INVESTIGATION_SUMMARY.md)** - 조사 요약
3. **[DININGCODE_COMPETITOR_FIX.md](investigations/DININGCODE_COMPETITOR_FIX.md)** - 다이닝코드 경쟁업체 수집 수정
4. **[SEARCHRANKCRAWLER_FIX_SUMMARY.md](investigations/SEARCHRANKCRAWLER_FIX_SUMMARY.md)** - 검색 랭크 크롤러 수정

---

## 📚 Guides (사용 가이드)

프로젝트 사용법과 도구 가이드입니다.

### [guides/](guides/)

1. **[GUI_사용가이드.md](guides/GUI_사용가이드.md)** - GUI 웹 인터페이스 사용법
   - 4탭 구조 (단일/배치 수집, L1 결과, 실시간 로그)
   - API 사용법
   - SSE 실시간 로그

2. **[QUICK_START_FIX_GUIDE.md](guides/QUICK_START_FIX_GUIDE.md)** - 빠른 시작 및 문제 해결
3. **[AGENTS.md](guides/AGENTS.md)** - Agent 시스템 가이드

---

## 📈 Progress (진행 상황)

프로젝트 진행 상황과 변경 이력입니다.

### [progress/](progress/)

1. **[IMPLEMENTATION_PROGRESS.md](progress/IMPLEMENTATION_PROGRESS.md)** - 구현 진행 상황 트래킹

---

## 📖 문서 읽는 순서

### 🚀 신규 사용자
1. [../README.md](../README.md) - 프로젝트 메인 문서 읽기
2. [architecture/overview.md](architecture/overview.md) - 전체 구조 이해
3. [guides/QUICK_START_FIX_GUIDE.md](guides/QUICK_START_FIX_GUIDE.md) - 빠른 시작
4. [guides/GUI_사용가이드.md](guides/GUI_사용가이드.md) - GUI 사용법

### 🔧 개발자 (구현)
1. [implementation/IMPLEMENTATION_ROADMAP.md](implementation/IMPLEMENTATION_ROADMAP.md) - 일정 확인
2. [implementation/L1_CRAWLING_ENHANCEMENT_GUIDE.md](implementation/L1_CRAWLING_ENHANCEMENT_GUIDE.md) - L1 구현
3. [data-specs/DATA_COLLECTION_STORAGE_GUIDE.md](data-specs/DATA_COLLECTION_STORAGE_GUIDE.md) - 데이터 처리
4. [architecture/l1-pipeline.md](architecture/l1-pipeline.md) - 파이프라인 상세

### 🔍 문제 해결
1. [guides/QUICK_START_FIX_GUIDE.md](guides/QUICK_START_FIX_GUIDE.md) - 일반적인 문제
2. [investigations/](investigations/) - 특정 기능 디버깅 참고

### 📋 기획자/PM
1. [architecture/overview.md](architecture/overview.md) - 시스템 목표
2. [architecture/l2-analysis.md](architecture/l2-analysis.md) - 키워드 전략
3. [architecture/l3-strategy.md](architecture/l3-strategy.md) - 최종 결과물

---

## 🔄 문서 변경 이력

### 2025-12-10: 문서 구조 재정리
- ✅ 문서 카테고리별 분류 완료
  - `architecture/` - 아키텍처 문서
  - `implementation/` - 구현 가이드
  - `data-specs/` - 데이터 스펙
  - `investigations/` - 조사/디버그
  - `guides/` - 사용 가이드
  - `progress/` - 진행 상황
- ✅ 루트 문서 정리 (README.md, SPEC.md, PROJECT_CLEANUP_PLAN.md만 유지)
- ✅ 문서 인덱스 업데이트 (이 파일)

### 2025-11-14: place-crawler 프로젝트 문서 통합
- `place-crawler/Doc/master.md` → `architecture/overview.md`
- `place-crawler/Doc/l1.md` → `architecture/l1-pipeline.md`
- `place-crawler/Doc/l2.md` → `architecture/l2-analysis.md`
- `place-crawler/Doc/l3.md` → `architecture/l3-strategy.md`

**통합 사유**: 중복 제거 및 단일 진실 공급원(Single Source of Truth) 확립

---

## 📝 문서 작성 규칙

### 파일명 규칙
- **대문자 스네이크 케이스**: `DATA_SPECIFICATION.md`
- **명확한 주제**: 파일명만 봐도 내용을 파악 가능
- **버전 표기**: 필요시 `_V04`, `_v1.1` 등 표기

### 문서 계층
```
README.md (Quick Start)
   ↓
SPEC.md (Overview + Summary)
   ↓
docs/
  ├── architecture/*.md (System Design)
  ├── implementation/*.md (How to Build)
  ├── data-specs/*.md (Data Structures)
  ├── investigations/*.md (Debug & Fix)
  └── guides/*.md (How to Use)
```

---

## 🔗 관련 링크

- [프로젝트 README](../README.md) - 메인 문서
- [통합 SPEC](../SPEC.md) - 전체 스펙
- [프로젝트 정리 계획](../PROJECT_CLEANUP_PLAN.md) - 2025-12-10 정리 계획
- [소스 코드](../src/) - 실제 구현
- [테스트](../tests/) - 테스트 코드
- [워크스페이스 루트](../../README.md) - 워크스페이스

---

**Last Updated**: 2025-12-10
**Total Docs**: 20+ 문서 (architecture 4개, implementation 5개, data-specs 6개, investigations 4개, guides 3개, progress 1개)
**Origin**: place-crawler 프로젝트 통합 + V2.1 강화
