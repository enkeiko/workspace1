# Guidebook v1.1 ↔ 기술 구현 매핑 가이드

**작성일**: 2025-11-14
**목적**: 42ment Guidebook v1.1의 전략 프레임워크와 기술 구현(L1/L2/L3 파이프라인) 간 매핑 및 용어 통일

---

## 📋 용어 통일 테이블

| Guidebook 용어 | 기술 문서 용어 | 설명 | 구현 위치 |
|---------------|--------------|------|----------|
| **C-Sys-0** (Meta 수집) | L1 Step 1-3 (데이터 수집/통합) | keyword_meta_taxonomy.yaml 기반 지역/대상/의도/감성/시점 수집 | `src/modules/crawler/PlaceCrawler.js` |
| **C-Sys-1** (매핑) | L1 Step 4-5 (지역 파싱/키워드 분류) | 리뷰·메뉴·소식에서 자연어 추출 및 클러스터링 | `src/modules/processor/AddressParser.js`<br>`src/modules/processor/KeywordClassifier.js` |
| **C-Sys-2** (효율지수) | L2 검색량 조회 + 스코어링 | `Efficiency = log(검색량+1) / (경쟁도+1)` | `src/pipelines/l2-pipeline.js` |
| **C-Sys-3** (Improver) | L2 AI 키워드 추천 | tone/time/meta 기반 추천, 중복 차단, 문장화 | `src/modules/ai/` (진행중) |
| **완성도 평가** | CompletenessScore (0-100점) | 115점 만점 → 100점 환산 (기본정보 20, 메뉴 20, 리뷰 25 등) | `src/modules/parser/DataParser.js` |
| **NAP 관리** | Place 기본 정보 (Name/Address/Phone) | Collector → Analyzer로 정보 정합성 자동 검증 | L1 Step 1-2 |
| **대표키워드** | Primary Keywords (≤5개) | 최종 선정된 핵심 키워드 | L3 출력 `final_keywords.json` |
| **조합키워드** | Keyword Combinations | 지역 + 메뉴 + 속성 조합 | L2 키워드 매트릭스 |

---

## 🗺️ Guidebook 시스템 → 기술 구현 매핑

### A. 전략 프레임 (Relevance · Popularity · Trust)

| Guidebook 섹션 | 기술 구현 | 구현 상태 | 참조 문서 |
|---------------|----------|----------|----------|
| **A-1. 3대 축 구조** | 전체 시스템 설계 기반 | ✅ 완료 | [SPEC.md](../SPEC.md#2-시스템-아키텍처) |
| 1) 적합도(Relevance) | L1 카테고리/메뉴/운영정보 수집 | ✅ 완료 | [l1-pipeline.md](architecture/l1-pipeline.md) |
| 2) 인기도(Popularity) | L2 검색량 조회, 리뷰 분석 | 🔨 진행중 | [l2-analysis.md](architecture/l2-analysis.md) |
| 3) 신뢰도(Trust) | L1 리뷰 수집 (영수증 리뷰 구분) | ✅ 완료 | [l1-pipeline.md](architecture/l1-pipeline.md#step-2) |

---

### B. 상호명 · 카테고리 전략

| Guidebook 섹션 | 기술 구현 | 구현 상태 | 참조 문서 |
|---------------|----------|----------|----------|
| **B-2. 카테고리** | L1 카테고리 자동 추출 | ✅ 완료 | `PlaceCrawler.js` |
| **B-3. NAP 관리** | L1 Step 1-3 데이터 통합 | ✅ 완료 | [l1-pipeline.md](architecture/l1-pipeline.md#step-3) |

---

### C. 키워드 전략 (C-Sys)

#### C-Sys-0 | Meta 수집

| Guidebook 요소 | 기술 구현 | 구현 파일 | 상태 |
|---------------|----------|----------|------|
| keyword_meta_taxonomy.yaml | `data/input/keyword_taxonomy.yaml` (예정) | - | ❌ 계획 |
| - 지역(Location) | L1 Step 4: AddressParser | `src/modules/processor/AddressParser.js` | ✅ 완료 |
| - 대상(Target) | L2 AI 분석에서 추출 | `src/modules/ai/` | 🔨 진행중 |
| - 의도(Intent) | L2 리뷰 분석에서 추출 | L2 파이프라인 | 🔨 진행중 |
| - 감성(Tone) | L2 리뷰 감성 분석 | L2 파이프라인 | 🔨 진행중 |
| - 시점(Time/Season) | 수동 입력 또는 자동 추출 | `manual_notes.json` | 🔨 진행중 |

#### C-Sys-1 | 매핑

| Guidebook 요소 | 기술 구현 | 구현 파일 | 상태 |
|---------------|----------|----------|------|
| 리뷰·메뉴·소식 자연어 추출 | L1 크롤링 데이터 파싱 | `DataParser.js` | ✅ 완료 |
| 유사어 클러스터링 | L2 AI 키워드 분석 | L2 파이프라인 | 🔨 진행중 |

#### C-Sys-2 | 효율지수

| Guidebook 요소 | 기술 구현 | 구현 파일 | 상태 |
|---------------|----------|----------|------|
| `Efficiency = log(검색량+1) / (경쟁도+1)` | L2 스코어링 알고리즘 | `src/pipelines/l2-pipeline.js` | 🔨 진행중 |
| 검색량 조회 | 네이버 검색 API 연동 | `src/modules/api/` | 🔨 진행중 |
| 경쟁도 계산 | 상권 내 동일 업종/키워드 매장 수 | L2 파이프라인 | ❌ 계획 |

#### C-Sys-3 | Improver 연동

| Guidebook 요소 | 기술 구현 | 구현 파일 | 상태 |
|---------------|----------|----------|------|
| tone/time/meta 기반 추천 | L2 AI 분석 | `src/modules/ai/` | 🔨 진행중 |
| 중복·스태핑 차단 | L2 키워드 검증 로직 | L2 파이프라인 | 🔨 진행중 |
| 조합키워드 문장화 | L2 키워드 매트릭스 생성 | [l2-analysis.md](architecture/l2-analysis.md#1단계) | 🔨 진행중 |

---

### C-4. 콘텐츠 삽입 규칙

| Guidebook 콘텐츠 | 기술 구현 | 구현 위치 | 상태 |
|-----------------|----------|----------|------|
| 소개문 (1-2회 자연 삽입) | L3 Intro 생성 | L3 파이프라인 | 🔨 진행중 |
| 소식 (시즌/상황/감성) | L3 News 생성 | L3 파이프라인 | 🔨 진행중 |
| 메뉴 (속성키워드) | L1 메뉴 데이터 수집 | `PlaceCrawler.js` | ✅ 완료 |
| 이미지 캡션 (지역+메뉴) | L1 이미지 분류 | `DataParser.js` | ✅ 완료 |

---

### D. 내부 콘텐츠 전략 (D-Sys)

| Guidebook 섹션 | 기술 구현 | 구현 상태 | 참조 문서 |
|---------------|----------|----------|----------|
| **D-1. 소개문 (Intro)** | L3 콘텐츠 생성 | 🔨 진행중 | [l3-strategy.md](architecture/l3-strategy.md) |
| - 분량: 1,200~2,000자 | 템플릿 기반 생성 | 🔨 진행중 | L3 파이프라인 |
| - 구조: 브랜드→서비스→이용가이드→위치→후기→마무리 | 6단계 템플릿 | 🔨 진행중 | L3 파이프라인 |
| **D-2. 소식 (News/Post)** | L3 콘텐츠 생성 | 🔨 진행중 | [l3-strategy.md](architecture/l3-strategy.md) |
| - 주기: 월 2회 | 스케줄링 시스템 | ❌ 계획 | - |
| **D-3. 시각콘텐츠 (Visual)** | L1 이미지 수집/분류 | ✅ 완료 | [l1-pipeline.md](architecture/l1-pipeline.md#step-2) |
| - 파일명: `지역_메뉴_속성_번호.jpg` | 자동 리네이밍 | ❌ 계획 | - |

**D-Sys 자동화 흐름**:
```
Analyzer (L1) → Improver (L2) → Intro/News/Visual 생성 (L3)
```

---

### E. 외부 콘텐츠 + 리뷰 전략 (E-Sys)

| Guidebook 섹션 | 기술 구현 | 구현 상태 | 참조 문서 |
|---------------|----------|----------|----------|
| **E-1. 외부 콘텐츠 (SNS/Short-form)** | 미구현 | ❌ 계획 | - |
| **E-2. 리뷰 전략** | L1 리뷰 데이터 수집 | ✅ 완료 | [l1-pipeline.md](architecture/l1-pipeline.md) |
| - 리뷰 답글 방향성 | L3 답글 템플릿 생성 | ❌ 계획 | - |

**E-Sys 엔진** (계획):
- E-Sys-1: SNS 텍스트/해시태그 입력
- E-Sys-2: tone/time/meta 자동 추출
- E-Sys-3: 소식 주제 추천, 소개문 보완
- E-Sys-4: KPI 추적 (브랜드 검색량, 클릭률, 리뷰 증가량)

---

## 📂 문서 구조 참조 맵

### 1. 전략 문서 (Guidebook 중심)
```
docs/architecture/251113_Guidebook_v1.1_full.md
├── A. 전략 프레임 (Relevance · Popularity · Trust)
├── B. 상호명 · 카테고리 전략
├── C. 키워드 전략 (C-Sys-0/1/2/3)
├── D. 내부 콘텐츠 전략 (D-Sys)
├── E. 외부 콘텐츠 + 리뷰 전략 (E-Sys)
└── Appendix A — BlogGuide Module
```

### 2. 기술 구현 문서
```
2-projects/place-keywords-maker-v2/
├── SPEC.md                          # 전체 시스템 아키텍처 및 통합 스펙
├── README.md                        # 프로젝트 개요 및 실행 가이드
└── docs/
    ├── GUIDEBOOK_MAPPING.md         # 🆕 본 문서 (전략↔구현 매핑)
    ├── README.md                    # 문서 인덱스
    └── architecture/
        ├── overview.md              # L1/L2/L3 프로세스 개요
        ├── l1-pipeline.md           # L1 데이터 수집 (765줄)
        ├── l2-analysis.md           # L2 AI 분석 (750줄)
        ├── l3-strategy.md           # L3 최종 전략 (554줄)
        └── 251113_Guidebook_v1.1_full.md  # 전략 프레임워크 원본
```

---

## 🔄 데이터 파이프라인 vs Guidebook 시스템

### Guidebook 파이프라인
```
Collector → Analyzer → SEOImprover → BlogGuide → External Sync(E-Sys)
```

### 기술 구현 파이프라인
```
L1 (데이터 수집)
  └─ Collector + Analyzer 역할
       ↓
L2 (AI 분석 + 검색량 조회)
  └─ SEOImprover 역할
       ↓
L3 (최종 전략 + 콘텐츠 생성)
  └─ BlogGuide 역할 (일부)
       ↓
E-Sys (외부 동기화) ← 미구현
```

---

## 🎯 빠른 참조 가이드

### "C-Sys-2 효율지수 계산 로직은 어디 있나요?"
➡️ **L2 파이프라인** ([l2-analysis.md](architecture/l2-analysis.md)) 참조
➡️ 구현 파일: `src/pipelines/l2-pipeline.js` (진행중)

### "NAP 관리는 어떻게 구현되나요?"
➡️ **L1 Step 1-3** ([l1-pipeline.md](architecture/l1-pipeline.md#step-1)) 참조
➡️ 구현 파일: `src/modules/crawler/PlaceCrawler.js` + `src/modules/parser/DataParser.js`

### "tone/time/meta 기반 키워드 추천은 어디서 구현되나요?"
➡️ **C-Sys-3 Improver** 연동 (L2 AI 분석)
➡️ 구현 파일: `src/modules/ai/` (진행중)

### "소개문 자동 생성은 어떻게 하나요?"
➡️ **D-Sys → L3 파이프라인** ([l3-strategy.md](architecture/l3-strategy.md)) 참조
➡️ Guidebook 규칙: [D-1. 소개문](architecture/251113_Guidebook_v1.1_full.md#d-1-소개문-intro)

---

## 📌 핵심 원칙

1. **전략은 Guidebook, 구현은 L1/L2/L3**
   - Guidebook = "무엇을(What)" + "왜(Why)"
   - 기술 문서 = "어떻게(How)" + "어디서(Where)"

2. **용어는 Guidebook 우선, 괄호로 기술 용어 병기**
   - 예: "C-Sys-1 매핑 (L1 Step 4-5 키워드 분류)"

3. **문서 참조 시 상대 경로 사용**
   - 예: `[l1-pipeline.md](architecture/l1-pipeline.md)`

---

**문서 버전**: 1.0
**최종 업데이트**: 2025-11-14
**관리자**: Claude Code
