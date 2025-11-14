# place-keywords-maker-v2 문서 구조 분석

**작성일**: 2025-11-14
**목적**: Guidebook v1.1 중심으로 프로젝트 내 모든 문서의 역할과 연결 관계 명확화

---

## 📊 현재 문서 현황

### 문서 목록 (총 2,857줄)

| 문서 | 줄 수 | 역할 | Guidebook 연결 |
|------|-------|------|---------------|
| **README.md** | ~200 | 프로젝트 진입점, 빠른 시작 | 전체 개요 |
| **SPEC.md** | ~820 | 통합 기술 스펙 | L1/L2/L3 구현 스펙 |
| **docs/GUIDEBOOK_MAPPING.md** | ~290 | 전략↔구현 매핑 | ⭐ 핵심 연결 문서 |
| **docs/README.md** | ~130 | 문서 인덱스, 읽는 순서 | 문서 네비게이션 |
| **docs/architecture/251113_Guidebook_v1.1_full.md** | 310 | 전략 프레임워크 원본 | ⭐ 최상위 전략 |
| **docs/architecture/overview.md** | 453 | L1/L2/L3 프로세스 개요 | 파이프라인 개요 |
| **docs/architecture/l1-pipeline.md** | 765 | L1 데이터 수집 상세 | C-Sys-0, C-Sys-1 |
| **docs/architecture/l2-analysis.md** | 750 | L2 AI 분석 상세 | C-Sys-2, C-Sys-3 |
| **docs/architecture/l3-strategy.md** | 554 | L3 최종 전략 상세 | D-Sys, BlogGuide |

---

## 🗺️ Guidebook 섹션별 문서 매핑 (상세)

### A. 전략 프레임 (Relevance · Popularity · Trust)

| Guidebook 섹션 | 구현 문서 | 내용 | 상태 |
|---------------|----------|------|------|
| **A-0. 원칙** | overview.md 서문 | 데이터 기반 의사결정 원칙 | ✅ |
| **A-1. 3대 축** | - | 전략적 원칙만 (구현 대상 아님) | - |
| 1) 적합도(Relevance) | l1-pipeline.md | 카테고리/메뉴/운영정보 정확성 | ✅ |
| 2) 인기도(Popularity) | l2-analysis.md | 검색량 조회, 리뷰 분석 | 🔨 |
| 3) 신뢰도(Trust) | l1-pipeline.md | 리뷰 신뢰도 수집 | ✅ |

**문서 구조 평가**:
- ✅ 전략(Guidebook) → 구현(architecture/*.md) 분리 명확
- ⚠️ overview.md에 전략 원칙이 혼재 (Guidebook과 중복)

---

### B. 상호명 · 카테고리 전략

| Guidebook 섹션 | 구현 문서 | 내용 | 상태 |
|---------------|----------|------|------|
| **B-1. 상호명** | l1-pipeline.md | 브랜드명 수집 | ✅ |
| **B-2. 카테고리** | l1-pipeline.md | 카테고리 자동 추출 | ✅ |
| **B-3. NAP 관리** | l1-pipeline.md (Step 1-3) | Name/Address/Phone 수집 및 검증 | ✅ |

**문서 구조 평가**:
- ✅ l1-pipeline.md에 집중되어 있어 찾기 쉬움
- ✅ GUIDEBOOK_MAPPING.md에 명확히 참조됨

---

### C. 키워드 전략 (C-Sys)

#### C-Sys-0 | Meta 수집

| 요소 | 구현 문서 | 구현 위치 | 상태 |
|------|----------|----------|------|
| 지역(Location) | l1-pipeline.md | Step 4: AddressParser | ✅ |
| 대상(Target) | l2-analysis.md | AI 분석 단계 | 🔨 |
| 의도(Intent) | l2-analysis.md | 리뷰 분석 | 🔨 |
| 감성(Tone) | l2-analysis.md | 리뷰 감성 분석 | 🔨 |
| 시점(Time/Season) | - | 미구현 | ❌ |

**문서 구조 평가**:
- ⚠️ Meta 수집이 L1(지역)과 L2(대상/의도/감성)에 분산
- ⚠️ `keyword_meta_taxonomy.yaml` 파일이 언급되지만 실제 존재하지 않음
- 💡 제안: `docs/architecture/c-sys-meta-taxonomy.md` 신규 생성?

#### C-Sys-1 | 매핑

| 기능 | 구현 문서 | 구현 위치 | 상태 |
|------|----------|----------|------|
| 자연어 추출 | l1-pipeline.md | Step 2: 크롤링 | ✅ |
| 유사어 클러스터링 | l2-analysis.md | 키워드 조합 | 🔨 |

**문서 구조 평가**:
- ✅ L1(추출) → L2(클러스터링) 흐름 명확

#### C-Sys-2 | 효율지수

| 기능 | 구현 문서 | 구현 위치 | 상태 |
|------|----------|----------|------|
| 효율지수 계산 | l2-analysis.md | 스코어링 알고리즘 | 🔨 |
| 검색량 조회 | l2-analysis.md | 네이버 API 연동 | 🔨 |
| 경쟁도 계산 | - | 미구현 | ❌ |

**문서 구조 평가**:
- ✅ l2-analysis.md에 집중
- ⚠️ Guidebook의 `Efficiency = log(검색량+1) / (경쟁도+1)` 공식이 명시되지 않음

#### C-Sys-3 | Improver 연동

| 기능 | 구현 문서 | 구현 위치 | 상태 |
|------|----------|----------|------|
| tone/time/meta 기반 추천 | l2-analysis.md | AI 키워드 분석 | 🔨 |
| 중복·스태핑 차단 | l2-analysis.md | 검증 로직 | 🔨 |
| 문장화 | l2-analysis.md | 키워드 조합 | 🔨 |

**문서 구조 평가**:
- ✅ l2-analysis.md에 집중
- ⚠️ "Improver"라는 용어가 구현 문서에는 없음 (AI 분석으로 표현)

---

### C-4. 콘텐츠 삽입 규칙

| 콘텐츠 유형 | 구현 문서 | 구현 위치 | 상태 |
|-----------|----------|----------|------|
| 소개문 | l3-strategy.md | Intro 생성 | 🔨 |
| 소식 | l3-strategy.md | News 생성 | 🔨 |
| 메뉴 | l1-pipeline.md | 메뉴 수집 | ✅ |
| 이미지 캡션 | l1-pipeline.md | 이미지 분류 | ✅ |

**문서 구조 평가**:
- ✅ L1(데이터) → L3(콘텐츠 생성) 흐름
- ⚠️ 콘텐츠 삽입 "규칙"이 구현 문서에 명시되지 않음

---

### D. 내부 콘텐츠 전략 (D-Sys)

| Guidebook 섹션 | 구현 문서 | 내용 | 상태 |
|---------------|----------|------|------|
| **D-0. 원칙** | - | 전략 원칙만 | - |
| **D-1. 소개문 (Intro)** | l3-strategy.md | 1,200~2,000자 생성 | 🔨 |
| **D-2. 소식 (News)** | l3-strategy.md | 월 2회 생성 | 🔨 |
| **D-3. 시각콘텐츠 (Visual)** | l1-pipeline.md | 이미지 수집/분류 | ✅ |
| **D-Sys 자동화 흐름** | overview.md | 파이프라인 개요 | ✅ |

**문서 구조 평가**:
- ⚠️ D-Sys가 l3-strategy.md에 일부만 언급 (상세 부족)
- ⚠️ "BlogGuide 모듈"과의 관계 불명확
- 💡 제안: `docs/architecture/d-sys-content-generation.md` 신규 생성?

---

### E. 외부 콘텐츠 + 리뷰 전략 (E-Sys)

| Guidebook 섹션 | 구현 문서 | 내용 | 상태 |
|---------------|----------|------|------|
| **E-1. 외부 콘텐츠 (SNS)** | - | 미구현 | ❌ |
| **E-2. 리뷰 전략** | l1-pipeline.md | 리뷰 데이터 수집 | ✅ |
| **E-Sys 엔진** | - | 미구현 | ❌ |
| **E-Sys-4 KPI** | - | 미구현 | ❌ |

**문서 구조 평가**:
- ❌ E-Sys는 거의 미구현 상태
- ✅ 리뷰 수집만 l1-pipeline.md에 구현됨
- 💡 제안: 향후 `docs/architecture/e-sys-external-sync.md` 생성?

---

### Appendix A — BlogGuide Module

| 항목 | 구현 문서 | 내용 | 상태 |
|------|----------|------|------|
| 배포가이드 양식 | l3-strategy.md | 일부 언급 | 🔨 |
| 블로그 본문 생성 | l3-strategy.md | 1,200~1,800자 규격 | 🔨 |

**문서 구조 평가**:
- ⚠️ "BlogGuide Module"이라는 독립 섹션이 없음
- ⚠️ l3-strategy.md에 일부만 언급
- 💡 제안: L3와 BlogGuide의 관계를 명확히 문서화

---

### Appendix B — System Layer Summary

| 항목 | 구현 문서 | 내용 | 상태 |
|------|----------|------|------|
| Pipeline | overview.md | L1/L2/L3 파이프라인 | ✅ |
| Data Flow | overview.md | 데이터 흐름도 | ✅ |
| 기술 구현 매핑 | GUIDEBOOK_MAPPING.md | Guidebook ↔ 코드 매핑 | ✅ |

**문서 구조 평가**:
- ✅ overview.md + GUIDEBOOK_MAPPING.md로 잘 커버됨

---

## 🚨 발견된 문제점

### 1. 문서 중복 및 역할 혼재

| 문제 | 세부사항 |
|------|----------|
| **overview.md vs GUIDEBOOK_MAPPING.md** | 역할 중복 가능성 |
| - overview.md | L1/L2/L3 개요 + 일부 전략 원칙 |
| - GUIDEBOOK_MAPPING.md | Guidebook ↔ 구현 매핑 |
| **평가** | overview.md가 "개요"와 "매핑" 역할을 동시에 수행 중 |

### 2. 용어 불일치

| Guidebook 용어 | 구현 문서 용어 | 비고 |
|---------------|--------------|------|
| C-Sys-3 "Improver" | "AI 키워드 분석" | 용어 다름 |
| "효율지수" | "스코어링 알고리즘" | 개념 유사, 용어 다름 |
| "tone/time/meta" | 구현 문서에 명시 없음 | 개념 누락 |

### 3. 문서 누락

| 필요한 문서 | 이유 | Guidebook 연결 |
|-----------|------|---------------|
| **c-sys-meta-taxonomy.md** | Meta 수집 체계 명확화 | C-Sys-0 |
| **d-sys-content-generation.md** | D-Sys 상세 구현 | D-1, D-2, D-3 |
| **blogguide-module.md** | BlogGuide와 L3 관계 명확화 | Appendix A |

### 4. 참조 연결 부족

| 문제 | 세부사항 |
|------|----------|
| **Guidebook → 구현 문서** | Guidebook에서 구현 문서로 링크 있음 ✅ |
| **구현 문서 → Guidebook** | 구현 문서에서 Guidebook 참조 부족 ⚠️ |
| **구현 문서 간 참조** | l1/l2/l3 문서 간 상호 참조 부족 ⚠️ |

---

## 💡 제안: 문서 구조 재설계

### 현재 구조 (문제점 있음)

```
docs/
├── GUIDEBOOK_MAPPING.md (매핑)
├── README.md (인덱스)
└── architecture/
    ├── 251113_Guidebook_v1.1_full.md (전략)
    ├── overview.md (개요 + 일부 매핑)  ← 역할 혼재
    ├── l1-pipeline.md (L1 상세)
    ├── l2-analysis.md (L2 상세)
    └── l3-strategy.md (L3 상세)
```

### 제안하는 구조

```
docs/
├── GUIDEBOOK_MAPPING.md (⭐ 핵심 매핑 문서)
├── README.md (문서 인덱스)
│
└── architecture/
    ├── 251113_Guidebook_v1.1_full.md (⭐ 전략 프레임워크)
    │
    ├── 00-overview.md (파이프라인 개요만)
    │
    ├── pipelines/ (파이프라인 구현)
    │   ├── l1-pipeline.md (C-Sys-0, C-Sys-1)
    │   ├── l2-analysis.md (C-Sys-2, C-Sys-3)
    │   └── l3-strategy.md (D-Sys, BlogGuide)
    │
    └── systems/ (Guidebook 시스템별 상세)  ← 🆕 신규
        ├── c-sys-meta-taxonomy.md (C-Sys-0 상세)
        ├── c-sys-improver.md (C-Sys-3 상세)
        ├── d-sys-content.md (D-Sys 상세)
        └── e-sys-external.md (E-Sys 계획)
```

**장점**:
1. **명확한 분리**: 파이프라인(L1/L2/L3) vs 시스템(C-Sys/D-Sys/E-Sys)
2. **추적성 향상**: Guidebook 시스템별 상세 문서
3. **확장성**: E-Sys 등 미구현 시스템 문서 준비

---

## 🎯 우선순위별 개선 작업

### 🔥 High Priority (즉시 필요)

1. **overview.md 역할 재정의**
   - 현재: 개요 + 매핑 혼재
   - 제안: 순수 파이프라인 개요로 축소

2. **용어 통일**
   - "Improver" vs "AI 분석"
   - "효율지수" vs "스코어링"
   - 구현 문서에 Guidebook 용어 추가

3. **상호 참조 추가**
   - l1/l2/l3 문서 하단에 "다음 단계" 링크
   - 각 문서 상단에 Guidebook 섹션 참조

### ⚠️ Medium Priority (필요하지만 급하지 않음)

4. **c-sys-meta-taxonomy.md 생성**
   - C-Sys-0 Meta 수집 체계 상세 문서화

5. **d-sys-content.md 생성**
   - D-Sys 콘텐츠 생성 로직 상세 문서화

6. **BlogGuide 모듈 명확화**
   - L3와의 관계 정의
   - 독립 문서 또는 L3에 통합?

### 💡 Low Priority (향후 고려)

7. **e-sys-external.md 생성**
   - E-Sys 계획 문서 (미구현)

8. **architecture/ 폴더 재구성**
   - pipelines/ vs systems/ 분리

---

## 📋 액션 아이템

### 즉시 실행 (30분)
- [ ] overview.md에서 매핑 내용 제거 (GUIDEBOOK_MAPPING.md로 이동)
- [ ] l1/l2/l3 문서 상단에 Guidebook 섹션 참조 추가
- [ ] l1 → l2 → l3 문서 간 "다음 단계" 링크 추가

### 단기 (1-2시간)
- [ ] 용어 통일 (Improver, 효율지수 등)
- [ ] c-sys-meta-taxonomy.md 생성 (C-Sys-0 상세)
- [ ] d-sys-content.md 생성 (D-Sys 상세)

### 중기 (향후)
- [ ] BlogGuide 모듈 독립 문서 생성
- [ ] architecture/ 폴더 재구성 (pipelines/ vs systems/)

---

**작성자**: Claude Code
**Last Updated**: 2025-11-14
**Version**: 1.0
