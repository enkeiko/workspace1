# 📚 전체 문서 인덱스 (Guidebook 중심)

**작성일**: 2025-11-14
**목적**: 네이버 플레이스 SEO 자동화 프로젝트의 모든 문서를 Guidebook v1.1 중심으로 연결

---

## 🎯 문서 계층 구조

```
📖 전략 프레임워크 (최상위)
    └─ 42ment Guidebook v1.1 (네이버 플레이스 SEO 전략)
         │
         ├─ 기획 문서 (1-planning/)
         │   ├─ SpecKit 문서 (구현 요구사항)
         │   └─ IdeaKit 문서 (아이디어 구체화)
         │
         └─ 구현 문서 (2-projects/)
             ├─ 기술 스펙 (L1/L2/L3 파이프라인)
             ├─ API 문서
             └─ 코드 레벨 문서
```

---

## 📖 1. 전략 문서 (Strategy Layer)

### 중심 문서: Guidebook v1.1

**위치**: `2-projects/place-keywords-maker-v2/docs/architecture/251113_Guidebook_v1.1_full.md`

**내용**:
- A. 전략 프레임 (Relevance · Popularity · Trust)
- B. 상호명 · 카테고리 전략
- C. 키워드 전략 (C-Sys: Meta 수집 → 매핑 → 효율지수 → Improver)
- D. 내부 콘텐츠 전략 (D-Sys: Intro/News/Visual)
- E. 외부 콘텐츠 + 리뷰 전략 (E-Sys)
- Appendix A: BlogGuide Module
- Appendix B: System Layer Summary

**역할**:
- 네이버 플레이스 SEO의 **"왜(Why)"**와 **"무엇을(What)"** 정의
- 모든 구현의 철학적 기반
- 42ment 브랜드스튜디오의 SEO 노하우 집약

---

## 📋 2. 기획 문서 (Planning Layer)

### 2.1 워크스페이스 루트

| 문서 | 위치 | 역할 | Guidebook 연결 |
|------|------|------|---------------|
| **워크스페이스 README** | `README.md` | 전체 프로젝트 구조 설명 | 전략 → 기획 → 구현 흐름 |
| **정리 계획** | `docs/ops/WORKSPACE_CONSOLIDATION_PLAN.md` | 워크스페이스 정리 | - |

### 2.2 IdeaKit (아이디어 구체화)

**위치**: `1-planning/ideas/`

| 상태 | 폴더 | 설명 | Guidebook 연결 |
|------|------|------|---------------|
| 진행중 | `exploring/` | AI 대화 진행 중 (30-70%) | 전략 검증 단계 |
| 준비됨 | `ready/` | SpecKit 전환 준비 (70%+) | 전략 → 스펙 전환 |
| 완료됨 | `_completed/` | 전환 완료 | 스펙 생성 완료 |

**Guidebook과의 관계**:
- Guidebook의 전략을 구체적인 기능 아이디어로 전환하는 단계
- 예: "C-Sys 키워드 자동화"라는 전략 → "키워드 조합 매트릭스 자동 생성" 아이디어

### 2.3 SpecKit (스펙 문서)

**위치**: `1-planning/specs/`

#### 📁 001-naver-place-seo-automation (최초 버전)

| 문서 | 역할 | Guidebook 연결 |
|------|------|---------------|
| `spec.md` | 기능 요구사항 정의 | Guidebook 전략 → 기능 요구사항 |
| `plan.md` | 구현 계획 | 전략 → 설계 |
| `tasks.md` | 작업 분해 | 구현 단위 |

**Guidebook 매핑**:
- User Story 1 (데이터 수집) → C-Sys-0 (Meta 수집)
- User Story 2 (AI 분석) → C-Sys-2, C-Sys-3 (효율지수, Improver)
- User Story 3 (최종 전략) → D-Sys (콘텐츠 생성)

#### 📁 001-v1-quick-start (빠른 시작 버전)

| 문서 | 역할 |
|------|------|
| `spec.md` | 최소 기능 스펙 |
| `quickstart.md` | 빠른 시작 가이드 |
| `data-model.md` | 데이터 모델 |

**Guidebook 연결**: L1 파이프라인 최소 구현

#### 📁 001-v2-with-guidebook (Guidebook 통합 버전) ⭐

| 문서 | 역할 | Guidebook 연결 |
|------|------|---------------|
| `spec.md` | **Guidebook 기반** 기능 스펙 | ✅ 직접 참조 |
| `plan.md` | Guidebook 기반 구현 계획 | C-Sys, D-Sys, E-Sys 구현 |
| `tasks.md` | Guidebook 시스템별 작업 분해 | - |

**이 스펙의 특징**:
- Guidebook v1.1의 C-Sys/D-Sys/E-Sys를 **직접** 구현 대상으로 삼음
- 전략 프레임워크와 1:1 대응

#### 📁 002-42ment-erp (ERP 시스템)

| 문서 | 역할 | Guidebook 연결 |
|------|------|---------------|
| `spec.md` | ERP 기능 스펙 | Guidebook 자동화의 운영 관리 |
| `data-model.md` | 데이터베이스 설계 | - |

**Guidebook 연결**: E-Sys-4 (KPI 추적) 지원

---

## 🚀 3. 구현 문서 (Implementation Layer)

### 3.1 프로젝트: place-keywords-maker-v2

**위치**: `2-projects/place-keywords-maker-v2/`

#### 최상위 문서

| 문서 | 역할 | Guidebook 연결 |
|------|------|---------------|
| **README.md** | 프로젝트 개요 및 빠른 시작 | 전체 파이프라인 |
| **SPEC.md** | 통합 기술 스펙 | L1/L2/L3 → C-Sys/D-Sys |

#### docs/ (상세 문서)

| 문서 | 역할 | Guidebook 연결 |
|------|------|---------------|
| **GUIDEBOOK_MAPPING.md** 🆕 | 전략 ↔ 구현 매핑 | ⭐ 핵심 연결 문서 |
| `README.md` | 문서 인덱스 | 문서 네비게이션 |

#### docs/architecture/ (아키텍처 문서)

| 문서 | 역할 | Guidebook 연결 |
|------|------|---------------|
| **251113_Guidebook_v1.1_full.md** | 전략 프레임워크 원본 | ⭐ 최상위 전략 |
| `overview.md` | L1/L2/L3 개요 | Guidebook 파이프라인 구현 |
| `l1-pipeline.md` (765줄) | L1 데이터 수집 상세 | C-Sys-0, C-Sys-1 구현 |
| `l2-analysis.md` (750줄) | L2 AI 분석 상세 | C-Sys-2, C-Sys-3 구현 |
| `l3-strategy.md` (554줄) | L3 최종 전략 상세 | D-Sys 구현 |

---

## 🗺️ Guidebook → 문서 매핑 테이블

| Guidebook 시스템 | 기획 문서 | 구현 문서 | 코드 위치 | 상태 |
|------------------|----------|----------|----------|------|
| **A. 전략 프레임** | 001-naver-place-seo-automation | overview.md | - | ✅ 문서화 |
| **B. NAP 관리** | 001-v1-quick-start/data-model.md | l1-pipeline.md#step-3 | `PlaceCrawler.js` | ✅ 구현 |
| **C-Sys-0 (Meta 수집)** | 001-v2-with-guidebook/spec.md | l1-pipeline.md#step-1-3 | `PlaceCrawler.js` | ✅ 구현 |
| **C-Sys-1 (매핑)** | 001-v2-with-guidebook/spec.md | l1-pipeline.md#step-4-5 | `AddressParser.js`<br>`KeywordClassifier.js` | ✅ 구현 |
| **C-Sys-2 (효율지수)** | 001-v2-with-guidebook/spec.md | l2-analysis.md | `l2-pipeline.js` | 🔨 진행중 |
| **C-Sys-3 (Improver)** | 001-v2-with-guidebook/plan.md | l2-analysis.md | `src/modules/ai/` | 🔨 진행중 |
| **C-4 (콘텐츠 삽입)** | 001-v2-with-guidebook/spec.md | l3-strategy.md | `l3-pipeline.js` | 🔨 진행중 |
| **D-1 (소개문)** | 001-v2-with-guidebook/spec.md | l3-strategy.md | `l3-pipeline.js` | 🔨 진행중 |
| **D-2 (소식)** | 001-v2-with-guidebook/spec.md | l3-strategy.md | `l3-pipeline.js` | 🔨 진행중 |
| **D-3 (시각콘텐츠)** | 001-v1-quick-start/spec.md | l1-pipeline.md#step-2 | `DataParser.js` | ✅ 구현 |
| **D-Sys (자동화 흐름)** | 001-v2-with-guidebook/plan.md | l3-strategy.md | - | 🔨 진행중 |
| **E-1 (외부 콘텐츠)** | - | - | - | ❌ 계획 |
| **E-2 (리뷰 전략)** | 001-naver-place-seo-automation | l1-pipeline.md#step-2 | `PlaceCrawler.js` | ✅ 구현 (수집) |
| **E-Sys (외부 동기화)** | - | - | - | ❌ 계획 |
| **BlogGuide Module** | - | - | - | 🔨 진행중 |

---

## 📖 역할별 읽는 순서

### 🎯 전략가 / 기획자

```
1. Guidebook 이해
   → 2-projects/place-keywords-maker-v2/docs/architecture/251113_Guidebook_v1.1_full.md
   (네이버 플레이스 SEO 전략 프레임워크)

2. 전략 → 구현 연결
   → 2-projects/place-keywords-maker-v2/docs/GUIDEBOOK_MAPPING.md
   (C-Sys, D-Sys, E-Sys가 어떻게 구현되는지)

3. 기획 문서
   → 1-planning/specs/001-v2-with-guidebook/spec.md
   (Guidebook 기반 기능 스펙)
```

### 💻 개발자

```
1. 전략 이해 (Why)
   → 2-projects/place-keywords-maker-v2/docs/architecture/251113_Guidebook_v1.1_full.md

2. 전략 → 구현 매핑 (What)
   → 2-projects/place-keywords-maker-v2/docs/GUIDEBOOK_MAPPING.md

3. 기술 스펙 (How)
   → 2-projects/place-keywords-maker-v2/SPEC.md (통합 스펙)
   → docs/architecture/l1-pipeline.md (L1 구현)
   → docs/architecture/l2-analysis.md (L2 구현)
   → docs/architecture/l3-strategy.md (L3 구현)

4. 코드 탐색
   → src/modules/ (실제 구현)
```

### 🚀 신규 사용자

```
1. 프로젝트 개요
   → README.md (워크스페이스 루트)
   → 2-projects/place-keywords-maker-v2/README.md

2. 전략 이해
   → 2-projects/place-keywords-maker-v2/docs/architecture/251113_Guidebook_v1.1_full.md
   (왜 이 프로젝트가 필요한지)

3. 빠른 시작
   → 1-planning/specs/001-v1-quick-start/quickstart.md
```

---

## 🔄 문서 업데이트 이력

**2025-11-14 (최신)**: Guidebook v1.1 중심 문서 정합
- `DOCUMENTATION_INDEX.md` 생성 (전체 문서 계층 구조)
- `GUIDEBOOK_MAPPING.md` 생성 (전략 ↔ 구현 매핑)
- Guidebook에 기술 참조 링크 추가
- 용어 통일 (C-Sys, D-Sys, E-Sys ↔ L1/L2/L3)

**2025-11-14**: place-crawler 문서 통합
- place-crawler/Doc/*.md → docs/architecture/*.md

---

## 🎯 문서 원칙

1. **단일 진실 공급원 (Single Source of Truth)**
   - 전략: Guidebook v1.1
   - 구현: SPEC.md + docs/architecture/*.md

2. **계층 구조**
   - 상위: Guidebook (Why + What)
   - 중위: SpecKit 문서 (What + How)
   - 하위: 기술 문서 (How + Where)

3. **상호 참조**
   - 모든 문서는 Guidebook을 참조
   - Guidebook은 구현 문서를 참조
   - 순환 참조 없이 명확한 방향성 유지

---

**문서 관리자**: Claude Code
**Last Updated**: 2025-11-14
**Version**: 1.0
