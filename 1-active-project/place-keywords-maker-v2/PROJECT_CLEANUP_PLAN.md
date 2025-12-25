# Place Keywords Maker V2 - 프로젝트 정리 계획

작성일: 2025-12-10

## 1. 현황 분석

### 1.1 프로젝트 개요
- **이름**: place-keywords-maker-v2
- **버전**: V2.1 (진행 중)
- **목적**: 네이버 플레이스 SEO 자동화 시스템
- **Node 버전**: >=18.0.0

### 1.2 디렉토리 구조
```
2-projects/place-keywords-maker-v2/
├── src/                           # 소스 코드
│   ├── modules/                   # 핵심 모듈
│   ├── gui/                       # GUI (server.js, app.html)
│   ├── database/                  # DB 관련
│   ├── pipelines/                 # L1/L2/L3 파이프라인
│   ├── utils/                     # 유틸리티
│   └── config/                    # 설정 파일
├── docs/                          # 문서 (10+ 파일)
├── data/                          # 데이터 및 결과물
├── tests/                         # 테스트 코드
├── legacy/                        # 레거시 코드
├── node_modules/                  # npm 패키지
├── logs/                          # 로그 파일
└── [루트에 산재된 파일들]         # 28개 test/debug 파일 등
```

### 1.3 주요 문제점

#### ❌ 문제 1: 루트 디렉토리 혼잡 (28개 test/debug 파일)
**파일 목록**:
```
test-*.js (16개):
- test-all-competitors.js
- test-apollo-inspect-detail.js
- test-apollo-keywordlist.js
- test-crawler-v04.js
- test-diningcode-collection.js
- test-diningcode-debug2.js
- test-home-dom-reviews.js
- test-home-reviews.js
- test-html-source.js
- test-keywords-result.json
- test-quick-add.js
- test-quick-simple.js
- test-representative-keywords.js
- test-scroll-reviews.js
- test-search-rank.js
- test-single-place.js
- test-v04-crawl.js

debug-*.js (12개):
- debug-apollo-1716.js
- debug-apollo-state.js
- debug-competitors.js
- debug-diningcode-html.js
- debug-diningcode-similar.js
- debug-mobile-page.js
- debug-network.js
- debug-related-links.js
- debug-script-data.js
- debug-search-results.js
- debug-similar-section.js
- debug-visitor-reviews.js

기타 임시 파일:
- add-scroll.py, add-scroll.cjs, add-scroll-simple.cjs
- analyze-graphql.js, analyze-menu-dom.js
- check-stores.js
- extract-menus-improved.js
- extract-search-results-demo.js
- SearchRankCrawler-FIXED.js
```

**결과 파일** (15개 PNG, JSON):
```
- debug-*-result.json (3개)
- debug-*.png (5개)
- test-*.png (1개)
- test-*-result.json (2개)
- apollo-state-full.json
```

#### ❌ 문제 2: 문서 파일 분산
**루트에 있는 문서** (10개):
```
- AGENTS.md
- DATA_COLLECTION_SPEC.md
- DATA_STRUCTURE_DIAGRAM.txt
- DININGCODE_COMPETITOR_FIX.md
- GUI_사용가이드.md
- IMPLEMENTATION_PROGRESS.md
- INVESTIGATION_README.md
- INVESTIGATION_SUMMARY.md
- QUICK_START_FIX_GUIDE.md
- SEARCH_RESULTS_DATA_STRUCTURE_REPORT.md
- SEARCHRANKCRAWLER_FIX_SUMMARY.md
```

**docs/ 폴더 내 문서** (12개):
```
docs/
├── architecture/ (4개)
│   ├── 251113_Guidebook_v1.1_full.md
│   ├── l1-pipeline.md
│   ├── l2-analysis.md
│   └── l3-strategy.md
├── COLLECTOR_V04_*.md (3개)
├── DATA_*.md (2개)
├── IMPLEMENTATION_ROADMAP.md
├── L1_CRAWLING_ENHANCEMENT_GUIDE.md
└── README.md
```

#### ❌ 문제 3: 데이터 파일 정리 필요
```
data/
├── categories.json
├── output/
│   ├── *.json (10+ 파일)
│   └── l1/ (5개 JSON)
```

## 2. 정리 계획

### 2.1 우선순위

| 우선순위 | 작업 | 영향도 | 예상 시간 |
|---------|------|--------|----------|
| ⭐⭐⭐ | test/debug 파일 정리 | 높음 | 30분 |
| ⭐⭐ | 문서 통합 및 정리 | 중간 | 20분 |
| ⭐ | 데이터 파일 정리 | 낮음 | 10분 |

### 2.2 상세 계획

#### Phase 1: test/debug 파일 정리 ⭐⭐⭐

**목표**: 루트 디렉토리를 깔끔하게 만들기

**작업**:
1. `tests/manual/` 디렉토리 생성
2. 모든 `test-*.js` 파일 → `tests/manual/`로 이동
3. `tests/debug/` 디렉토리 생성
4. 모든 `debug-*.js` 파일 → `tests/debug/`로 이동
5. `tests/results/` 디렉토리 생성
6. 모든 결과 파일 (PNG, JSON) → `tests/results/`로 이동
7. 임시 파일들 정리:
   - `add-scroll.*` → `tests/manual/` 또는 삭제
   - `analyze-*.js` → `tests/debug/`
   - `SearchRankCrawler-FIXED.js` → 검토 후 삭제 또는 보관

**정리 후 구조**:
```
tests/
├── unit/                    # Jest 단위 테스트 (기존)
├── integration/             # 통합 테스트 (기존)
├── manual/                  # 수동 테스트 스크립트 (NEW)
│   ├── test-*.js (16개)
│   ├── add-scroll.*
│   └── ...
├── debug/                   # 디버그 스크립트 (NEW)
│   ├── debug-*.js (12개)
│   ├── analyze-*.js
│   └── ...
└── results/                 # 테스트 결과물 (NEW)
    ├── *.json
    └── *.png
```

#### Phase 2: 문서 통합 및 정리 ⭐⭐

**목표**: 문서 구조 명확화 및 중복 제거

**작업**:
1. 루트의 문서 분류:
   - **유지**: README.md, SPEC.md
   - **이동**: 나머지 → `docs/`

2. `docs/` 재구조화:
```
docs/
├── README.md                           # 문서 인덱스 (NEW)
├── architecture/                       # 아키텍처 문서 (기존)
│   ├── 251113_Guidebook_v1.1_full.md
│   ├── l1-pipeline.md
│   ├── l2-analysis.md
│   ├── l3-strategy.md
│   └── overview.md
├── implementation/                     # 구현 가이드 (NEW)
│   ├── COLLECTOR_V04_IMPLEMENTATION_GUIDE.md
│   ├── COLLECTOR_V04_MIGRATION_GUIDE.md
│   ├── COLLECTOR_V04_TECHNICAL_DESIGN.md
│   ├── L1_CRAWLING_ENHANCEMENT_GUIDE.md
│   └── IMPLEMENTATION_ROADMAP.md
├── data-specs/                         # 데이터 스펙 (NEW)
│   ├── DATA_COLLECTION_SPEC.md
│   ├── DATA_COLLECTION_STORAGE_GUIDE.md
│   ├── DATA_SPECIFICATION.md
│   ├── DATA_STRUCTURE_DIAGRAM.txt
│   ├── NEW_DATA_STRUCTURE.md
│   └── SEARCH_RESULTS_DATA_STRUCTURE_REPORT.md
├── investigations/                     # 조사 및 디버그 문서 (NEW)
│   ├── INVESTIGATION_README.md
│   ├── INVESTIGATION_SUMMARY.md
│   ├── DININGCODE_COMPETITOR_FIX.md
│   └── SEARCHRANKCRAWLER_FIX_SUMMARY.md
├── guides/                             # 사용 가이드 (NEW)
│   ├── GUI_사용가이드.md
│   ├── QUICK_START_FIX_GUIDE.md
│   └── AGENTS.md
└── progress/                           # 진행 상황 (NEW)
    └── IMPLEMENTATION_PROGRESS.md
```

3. `docs/README.md` 생성 (문서 인덱스)

#### Phase 3: 데이터 파일 정리 ⭐

**목표**: 데이터 구조 명확화

**작업**:
1. `data/output/` 정리:
   - 날짜별 폴더 구조 검토
   - 오래된 테스트 결과 정리

2. `.gitignore` 업데이트:
   - `data/output/` 제외 (결과물)
   - `tests/results/` 제외
   - `logs/` 제외

### 2.3 실행 계획

#### Step 1: 백업 생성
```bash
# 전체 프로젝트 백업 (안전장치)
git add -A
git commit -m "chore: pre-cleanup backup"
```

#### Step 2: Phase 1 실행 (test/debug 파일)
```bash
# 디렉토리 생성
mkdir -p tests/manual tests/debug tests/results

# 파일 이동
mv test-*.js tests/manual/
mv debug-*.js tests/debug/
mv *.png *.json tests/results/  # 결과 파일만 선택 이동

# 임시 파일 정리
mv add-scroll.* tests/manual/
mv analyze-*.js tests/debug/
mv extract-*.js tests/debug/
mv check-stores.js tests/debug/
```

#### Step 3: Phase 2 실행 (문서)
```bash
# 디렉토리 생성
mkdir -p docs/{implementation,data-specs,investigations,guides,progress}

# 파일 이동
mv *_GUIDE.md docs/implementation/
mv DATA_*.md docs/data-specs/
mv INVESTIGATION_*.md docs/investigations/
mv GUI_*.md docs/guides/
mv IMPLEMENTATION_PROGRESS.md docs/progress/
```

#### Step 4: Phase 3 실행 (데이터)
```bash
# .gitignore 업데이트
echo "data/output/" >> .gitignore
echo "tests/results/" >> .gitignore
echo "logs/" >> .gitignore
```

#### Step 5: 정리 커밋
```bash
git add -A
git commit -m "chore: organize project structure

- Move test/debug files to tests/ subdirectories
- Reorganize documentation into docs/ categories
- Update .gitignore for output files
"
```

## 3. 정리 후 예상 구조

```
2-projects/place-keywords-maker-v2/
├── README.md                          # 프로젝트 메인 문서
├── SPEC.md                            # 통합 스펙
├── package.json
├── jest.config.js
├── .env.example
├── .gitignore
│
├── src/                               # 소스 코드 (변경 없음)
│   ├── modules/
│   ├── gui/
│   ├── database/
│   ├── pipelines/
│   ├── utils/
│   └── config/
│
├── docs/                              # 📁 문서 (재구조화)
│   ├── README.md                      # 문서 인덱스
│   ├── architecture/                  # 아키텍처
│   ├── implementation/                # 구현 가이드
│   ├── data-specs/                    # 데이터 스펙
│   ├── investigations/                # 조사 문서
│   ├── guides/                        # 사용 가이드
│   └── progress/                      # 진행 상황
│
├── tests/                             # 📁 테스트 (재구조화)
│   ├── unit/                          # Jest 단위 테스트
│   ├── integration/                   # 통합 테스트
│   ├── manual/                        # 🆕 수동 테스트 스크립트
│   ├── debug/                         # 🆕 디버그 스크립트
│   └── results/                       # 🆕 테스트 결과물
│
├── data/                              # 데이터
│   ├── categories.json
│   ├── input/
│   └── output/
│
├── legacy/                            # 레거시 코드
├── node_modules/                      # npm 패키지
└── logs/                              # 로그 (gitignore)
```

## 4. 효과

### 4.1 정리 전 vs 후

| 항목 | 정리 전 | 정리 후 | 개선 |
|------|---------|---------|------|
| 루트 파일 개수 | ~50개 | ~10개 | ✅ 80% 감소 |
| 문서 위치 | 분산 (루트 + docs) | 통합 (docs만) | ✅ 명확화 |
| 테스트 파일 | 루트 혼재 | tests/ 하위 분류 | ✅ 체계화 |
| 프로젝트 가독성 | 낮음 | 높음 | ✅ 향상 |

### 4.2 기대 효과
- ✅ 새로운 개발자 온보딩 시간 단축
- ✅ 파일 검색 및 네비게이션 개선
- ✅ 문서 관리 효율성 향상
- ✅ Git 히스토리 가독성 향상

## 5. 주의사항

### 5.1 보존해야 할 파일
- ✅ `src/` 전체 (소스 코드)
- ✅ `README.md`, `SPEC.md` (루트 문서)
- ✅ `package.json`, `jest.config.js` (설정)
- ✅ `tests/unit/`, `tests/integration/` (기존 테스트)

### 5.2 삭제 금지
- ❌ 어떤 파일도 삭제하지 않음
- ✅ 모든 파일은 이동만 수행
- ✅ 백업 커밋 생성 후 진행

### 5.3 테스트 필요
정리 후 다음 테스트 수행:
```bash
npm install      # 의존성 확인
npm test         # 테스트 실행
npm run gui      # GUI 실행 확인
```

## 6. 다음 단계

정리 완료 후:
1. ✅ `docs/README.md` 작성 (문서 인덱스)
2. ✅ 루트 `README.md` 업데이트 (새 구조 반영)
3. ✅ 팀원에게 변경사항 공유
4. ✅ V2.1 개발 재개

---

**작성자**: Claude
**검토 필요**: 프로젝트 리더
**예상 소요 시간**: 1시간
