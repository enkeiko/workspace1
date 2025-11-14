# Guidebook v1.1 전체 커버리지 역방향 분석

**작성일**: 2025-11-14
**목적**: Guidebook v1.1의 모든 섹션이 구현 문서에 반영되었는지 역방향 검증

---

## 📊 전체 요약

| 상태 | 개수 | 비율 |
|------|------|------|
| ✅ 완전 구현 | 9개 | 27% |
| 🔨 진행 중 | 10개 | 30% |
| 📋 계획됨 | 8개 | 24% |
| ⚠️ 누락/불명확 | 6개 | 18% |
| **총계** | **33개** | **100%** |

---

## ✅ 완전 구현된 섹션 (9개)

| Guidebook 섹션 | 구현 위치 | 참조 문서 |
|---------------|----------|----------|
| **A-1.1 적합도 (Relevance)** | L1 카테고리/메뉴/운영정보 수집 | [l1-pipeline.md](architecture/l1-pipeline.md) |
| **A-1.3 신뢰도 (Trust)** | L1 리뷰 수집 (영수증 리뷰 구분) | [l1-pipeline.md](architecture/l1-pipeline.md#step-2) |
| **B-2. 카테고리** | L1 카테고리 자동 추출 | `PlaceCrawler.js` |
| **B-3. NAP 관리** | L1 Step 1-3 데이터 통합 | [l1-pipeline.md](architecture/l1-pipeline.md#step-3) |
| **C-Sys-0 (지역)** | AddressParser 모듈 | `src/modules/processor/AddressParser.js` |
| **C-Sys-1 (매핑)** | L1 데이터 파싱 | `DataParser.js` + [l1-pipeline.md Step 5](architecture/l1-pipeline.md#5단계) |
| **C-4 (메뉴 키워드)** | L1 메뉴 데이터 수집 | `PlaceCrawler.js` |
| **D-3. 시각콘텐츠** | L1 이미지 수집/분류 | [l1-pipeline.md](architecture/l1-pipeline.md#step-2) |
| **E-2. 리뷰 전략 (수집)** | L1 리뷰 데이터 수집 | [l1-pipeline.md](architecture/l1-pipeline.md) |

---

## 🔨 진행 중인 섹션 (10개)

| Guidebook 섹션 | 구현 위치 | 현재 상태 | 참조 문서 |
|---------------|----------|----------|----------|
| **A-1.2 인기도 (Popularity)** | L2 검색량 조회, 리뷰 분석 | API 연동 진행중 | [l2-analysis.md](architecture/l2-analysis.md) |
| **C-Sys-0 (대상/의도/감성/시점)** | L2 AI 분석 | tone/time/meta 추출 로직 개발 중 | [l2-analysis.md](architecture/l2-analysis.md) |
| **C-Sys-2 (효율지수)** | L2 스코어링 알고리즘 | composite_score 계산 구현 중 | [l2-analysis.md Line 459](architecture/l2-analysis.md) |
| **C-Sys-3 (Improver)** | L2 AI 키워드 추천 | analyzeRelevance 함수 구현 중 | [l2-analysis.md Line 354](architecture/l2-analysis.md) |
| **C-4 (소개문 삽입)** | L3 Intro 생성 | 템플릿 개발 중 | [l3-strategy.md](architecture/l3-strategy.md) |
| **C-4 (소식 삽입)** | L3 News 생성 | 템플릿 개발 중 | [l3-strategy.md](architecture/l3-strategy.md) |
| **D-1. 소개문 (Intro)** | L3 콘텐츠 생성 | 6단계 템플릿 개발 중 | [l3-strategy.md Line 434](architecture/l3-strategy.md) |
| **D-2. 소식 (News)** | L3 콘텐츠 생성 | 블로그/SNS 포스팅 로직 개발 중 | [l3-strategy.md Line 434](architecture/l3-strategy.md) |
| **D-Sys 자동화 흐름** | L1→L2→L3 파이프라인 | 부분적 구현 | [overview.md](architecture/overview.md) |
| **C-Sys-1 (클러스터링)** | L2 유사어 클러스터링 | AI 분석 통합 중 | [l2-analysis.md](architecture/l2-analysis.md) |

---

## 📋 계획됨 (구현 예정) (8개)

| Guidebook 섹션 | 계획된 구현 | 우선순위 | 비고 |
|---------------|-----------|---------|------|
| **C-Sys-0 (keyword_meta_taxonomy.yaml)** | `data/input/keyword_taxonomy.yaml` 파일 생성 | 🔴 High | Guidebook 핵심 데이터 구조 |
| **C-Sys-2 (경쟁도 계산)** | 상권 내 동일 업종 매장 수 조회 | 🟡 Medium | 효율지수 공식 완성 필요 |
| **D-2 (소식 스케줄링)** | 월 2회 자동 게시 시스템 | 🟢 Low | 수동 운영 가능 |
| **D-3 (이미지 리네이밍)** | `지역_메뉴_속성_번호.jpg` 자동 변환 | 🟢 Low | 파일 관리 개선 |
| **E-1. 외부 콘텐츠 (SNS)** | SNS 자동 포스팅 시스템 | 🟡 Medium | E-Sys 1차 구현 |
| **E-2. 리뷰 답글 템플릿** | 키워드 포함 답글 자동 생성 | 🟡 Medium | D-Sys 확장 |
| **E-Sys-1~4** | External Sync Engine 전체 | 🟡 Medium | 4단계 파이프라인 |
| **C-4 (이미지 캡션)** | 지역+메뉴 조합 캡션 생성 | 🟢 Low | L1 이미지 분류 확장 |

---

## ⚠️ 누락 또는 불명확한 섹션 (6개)

### 1. **A-0. 원칙** (Guidebook Line 10)
- **내용**: "적합도>인기도", "자연스러움 우선", "스태핑 금지"
- **현황**: 개념적 원칙으로 특정 구현 위치 없음
- **제안**: ✅ **원칙으로만 존재** (구현 불필요, SPEC.md에 원칙 섹션 추가 권장)

### 2. **B-1. 상호명** (Guidebook Line 47)
- **내용**: "브랜드명 + 지역명 조합 원칙"
- **현황**: Guidebook에 언급되나 구현 문서에 명시적 매핑 없음
- **제안**: 🔴 **매핑 필요** - L1 Step 5 `classifyKeywordElements` 함수의 `brand` 추출 로직과 연결

### 3. **C-1. 구성 요소** (Guidebook Line 73)
- **내용**: "지역 + 메뉴 + 속성 + 상황"
- **현황**: 개념적 설명, 구체적 구현은 C-Sys-0/1에 분산
- **제안**: ✅ **개념 정의** (구현은 C-Sys-0/1에 포함됨, 매핑 명시 권장)

### 4. **C-2. Fact 기반 규칙** (Guidebook Line 79)
- **내용**: "NAP 유지", "자연스러운 삽입", "검증 가능한 정보만"
- **현황**: 원칙으로만 존재, 특정 코드 로직 없음
- **제안**: 🟡 **검증 로직 추가 권장** - L3 콘텐츠 생성 시 Fact-checking 단계 추가

### 5. **D-0. 원칙** (Guidebook Line 135)
- **내용**: "자연스러운 문맥", "브랜드 이미지 일관성"
- **현황**: 원칙으로만 존재
- **제안**: ✅ **원칙으로만 존재** (L3 템플릿에 가이드라인 주석 추가 권장)

### 6. **Appendix A — BlogGuide Module** (Guidebook Line 277+)
- **내용**: 업체 기본정보, 대표키워드, 해시태그, Pipeline, Data Flow
- **현황**: L3 출력 형식 정의이나 명시적 매핑 없음
- **제안**: 🔴 **출력 스펙 문서화 필요** - `docs/architecture/output-format.md` 생성 권장

---

## 🎯 핵심 발견 사항

### ✅ 강점
1. **C-Sys (키워드 자동화)** 전체가 L1/L2에 체계적으로 매핑됨
2. **L1 파이프라인**이 Guidebook의 데이터 수집 요구사항을 완전히 반영
3. **용어 통일**이 GUIDEBOOK_MAPPING.md를 통해 명확히 정리됨
4. **구현 문서에 Guidebook 용어 추가** 완료 (l1/l2/l3-pipeline.md)

### ⚠️ 개선 필요
1. **원칙(Principles) 섹션** (A-0, D-0, C-2)이 구현 문서에 명시되지 않음
   - 제안: SPEC.md 또는 README.md에 "설계 원칙" 섹션 추가
2. **E-Sys (외부 동기화)** 전체가 미구현 상태
   - 제안: E-Sys 구현 로드맵 및 우선순위 명확화
3. **Appendix (출력 형식)** 매핑 누락
   - 제안: L3 출력 데이터 스펙 문서 생성
4. **keyword_meta_taxonomy.yaml** 파일이 계획만 되고 미생성
   - 제안: 우선적으로 YAML 템플릿 파일 생성

---

## 📝 권장 액션 아이템

### 🔴 High Priority (즉시 필요)

#### 1. **keyword_meta_taxonomy.yaml 파일 생성**
- **위치**: `data/input/keyword_meta_taxonomy.yaml`
- **내용**: 지역/대상/의도/감성/시점 분류 체계 정의
- **이유**: C-Sys-0의 핵심 데이터 구조

#### 2. **B-1 상호명 매핑 명시**
- **위치**: GUIDEBOOK_MAPPING.md 또는 l1-pipeline.md
- **내용**: `extractBrandName` 함수와 B-1 원칙 연결
- **이유**: Guidebook 섹션 완전 커버리지 달성

#### 3. **출력 형식 문서 생성**
- **위치**: `docs/architecture/output-format.md`
- **내용**: Appendix A의 출력 데이터 구조 (업체 기본정보, 대표키워드, 해시태그 등)
- **이유**: Guidebook의 BlogGuide Module 섹션 구현 명확화

### 🟡 Medium Priority (2주 내)

#### 4. **원칙(Principles) 통합 문서**
- **위치**: SPEC.md 또는 README.md
- **내용**: A-0, D-0, C-2의 원칙을 "설계 원칙" 섹션으로 정리
- **이유**: 전략적 원칙이 구현 문서에 명시되지 않음

#### 5. **E-Sys 구현 로드맵**
- **위치**: `docs/architecture/e-sys-roadmap.md`
- **내용**: E-Sys-1~4 구현 계획 및 우선순위
- **이유**: 외부 콘텐츠 자동화 누락 해소

#### 6. **경쟁도 계산 로직 구현**
- **위치**: `src/modules/processor/CompetitionAnalyzer.js`
- **내용**: 상권 내 동일 업종 매장 수 조회 및 경쟁도 점수화
- **이유**: C-Sys-2 효율지수 공식 완성

### 🟢 Low Priority (1개월 내)

#### 7. **Fact-checking 검증 로직**
- **위치**: L3 파이프라인 콘텐츠 생성 단계
- **내용**: C-2 Fact 기반 규칙 자동 검증
- **이유**: 콘텐츠 품질 보증

#### 8. **이미지 자동 리네이밍**
- **위치**: `src/modules/processor/ImageRenamer.js`
- **내용**: `지역_메뉴_속성_번호.jpg` 형식 자동 변환
- **이유**: D-3 시각콘텐츠 관리 개선

---

## 📈 커버리지 개선 로드맵

### Phase 1: 핵심 누락 해소 (1주)
- ✅ keyword_meta_taxonomy.yaml 생성
- ✅ B-1 상호명 매핑 명시
- ✅ 출력 형식 문서 생성

**목표**: 27% → **85%** 완전 구현

### Phase 2: 원칙 및 E-Sys 계획 (2주)
- ✅ 원칙 통합 문서 작성
- ✅ E-Sys 로드맵 수립
- ✅ 경쟁도 계산 로직 구현

**목표**: 85% → **95%** 완전 구현

### Phase 3: 품질 개선 (1개월)
- ✅ Fact-checking 검증 로직
- ✅ 이미지 자동 리네이밍
- ✅ 소식 스케줄링 시스템

**목표**: 95% → **100%** 완전 구현

---

## 🔍 검증 체크리스트

이 문서를 기반으로 다음을 확인할 수 있습니다:

- [ ] Guidebook의 모든 섹션(A~E)이 구현 문서에 매핑되었는가?
- [ ] 누락된 섹션에 대한 구체적 제안이 제시되었는가?
- [ ] 우선순위가 명확히 정의되었는가?
- [ ] 커버리지 개선 로드맵이 실행 가능한가?

---

**문서 버전**: 1.0
**분석 완료일**: 2025-11-14
**다음 리뷰 일정**: 2025-11-21 (Phase 1 완료 후)
