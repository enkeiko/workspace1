# 🚀 DocsCode 빠른 시작 가이드

> **실전 사용법: AI와 함께 기능 개발하기**

---

## 🎯 DocsCode란?

**한 문장 요약**: AI에게 자연어로 요청하면, 완전한 문서와 코드를 자동으로 생성해주는 시스템

**전통 방식 vs DocsCode**:

```
전통 방식:
개발자: "쿠폰 기능 만들어야지"
→ 직접 설계 문서 작성 (30분)
→ 직접 코드 작성 (2시간)
→ 직접 테스트 작성 (30분)
→ 총 3시간

DocsCode 방식:
개발자: "장바구니에 쿠폰 기능 추가해줘"
→ AI와 Q&A (5분)
→ AI가 문서 + 코드 자동 생성 (5분)
→ 검토 및 실행 (10분)
→ 총 20분 ⚡ (9배 빠름!)
```

---

## 📋 시나리오 1: 새 기능 추가하기

### 상황
Place_Keywords_maker의 L1 프로세스에 **완성도 평가 시스템**을 추가하고 싶습니다.

### Step 1: AI에게 요청 (자연어)

```
"Place_Keywords_maker의 L1 프로세스에 완성도 평가 시스템을 추가하고 싶어.

work instruction/l1.md에 나온 115점 만점 평가 시스템이야:
- 필수 요소 60점 (카테고리, 메뉴, 대표메뉴)
- 중요 요소 30점 (현재 키워드, 수동 타겟)
- 보조 요소 15점 (지역 정보)
- 추가 요소 10점 (리뷰, 이미지 등)

먼저 Backlog로 만들어서 요구사항 명확화부터 시작하자."
```

### Step 2: AI가 자동으로 작업

#### 2-1. Backlog 생성 (IDEAS)

AI가 자동으로 생성:
```
docscode/backlog/ideas/l1-completeness-scoring.md
```

**내용:**
```markdown
# Backlog: L1 완성도 평가 시스템

**상태**: IDEAS
**신뢰도**: 20%

## 요약
Place_Keywords_maker의 L1에 115점 만점 완성도 평가 추가

## 목적
데이터 품질을 점수화하여 HIGH/MEDIUM/LOW 등급 자동 분류

## 요구사항
- 115점 만점 평가 시스템
- 4개 카테고리 (필수/중요/보조/추가)
- 등급 자동 결정 (HIGH: 90+, MEDIUM: 70-89, LOW: <70)
```

#### 2-2. AI가 질문 시작 (EXPLORING)

```
AI: "완성도 평가를 몇 단계에서 실행할까요?"
User: "L1 처리 마지막에 한 번만 실행"

AI: "평가 결과를 어디에 저장할까요?"
User: "data/output/l1/data_collected_l1.json에 completeness 필드 추가"

AI: "로그에 표시할까요?"
User: "네, 각 매장별 점수와 등급을 INFO 레벨로 출력"
```

→ Backlog 이동:
```
docscode/backlog/exploring/l1-completeness-scoring.md
신뢰도: 60% → 90%
```

#### 2-3. READY 상태 도달

모든 질문에 답변 완료:
```
docscode/backlog/ready/l1-completeness-scoring.md
신뢰도: 95%
```

### Step 3: Issues + Features 생성

```
User: "이제 Issues와 Features 둘 다 생성해줘"
```

AI가 자동 생성:

#### 3-1. Analysis (영향도 분석)

```
docscode/analysis/l1-completeness-scoring/
├── impact.md              # Place_Keywords_maker만 영향
├── side-effects.md        # L2, L3에 영향 없음
├── dependencies.md        # 의존성 없음 (독립 실행)
└── test-scenarios.md      # 15개 테스트 시나리오
```

#### 3-2. Issues (실행 가능한 이슈)

```
docscode/issues/l1-completeness-scoring/
├── 001-place-keywords-maker.md  # 완전한 코드 포함
└── execution-plan.md             # 실행 계획
```

**001-place-keywords-maker.md 내용:**
```markdown
# Issue: L1 완성도 평가 시스템 추가

## 파일 수정
`Place_Keywords_maker/src/l1-processor.js`

## 구현 코드

```javascript
/**
 * 데이터 완성도 평가 (115점 만점)
 */
evaluateCompleteness(placeData) {
  let score = 0;

  // 필수 요소 (60점)
  if (placeData.category) score += 20;
  if (placeData.menus && placeData.menus.length >= 3) score += 20;
  if (placeData.representativeMenu) score += 20;

  // 중요 요소 (30점)
  if (placeData.currentKeywords) score += 15;
  if (placeData.manualTargetKeywords) score += 15;

  // 보조 요소 (15점)
  if (placeData.location?.si) score += 5;
  if (placeData.location?.gu) score += 5;
  if (placeData.location?.dong) score += 3;
  if (placeData.location?.station) score += 2;

  // 추가 요소 (10점)
  if (placeData.reviewStats) score += 3;
  if (placeData.blogReviews) score += 3;
  if (placeData.images?.length > 0) score += 2;
  if (placeData.facilities) score += 2;

  // 등급 결정
  let grade = 'LOW';
  if (score >= 90) grade = 'HIGH';
  else if (score >= 70) grade = 'MEDIUM';

  return { score, grade };
}
```

## 호출 위치
`process()` 메서드 마지막에 추가:

```javascript
async process() {
  // ... 기존 L1 로직 ...

  // 완성도 평가
  collectedData.forEach(place => {
    const completeness = this.evaluateCompleteness(place);
    place.completeness = completeness;

    this.logger.info(
      `✅ ${place.name}: ${completeness.score}점 (${completeness.grade})`
    );
  });

  return result;
}
```

## 실행 방법
```bash
cd Place_Keywords_maker
node src/main.js l1
```

## 예상 출력
```
✅ 히도강남점: 95점 (HIGH)
✅ 맛있는집: 78점 (MEDIUM)
✅ 테스트식당: 65점 (LOW)
```
```

#### 3-3. Features (완전한 기능 문서)

```
docscode/features/l1-completeness-scoring/
├── 00-domain/                    # 비즈니스 로직
│   ├── business-logic.md
│   └── core-models.md
├── 10-interface/                 # 인터페이스
│   └── data-schema.md
├── 20-implementation/            # 구현
│   ├── processor-guide.md
│   └── logging-guide.md
├── 30-validation/                # 테스트
│   ├── test-plan.md
│   └── acceptance-criteria.md
└── meta.json                     # 메타데이터
```

### Step 4: 실제 코드 작성

개발자가 할 일:

```bash
# 1. Issues 확인
cd docscode/issues/l1-completeness-scoring
cat 001-place-keywords-maker.md

# 2. 코드 복사 & 붙여넣기
cd ../../Place_Keywords_maker
vim src/l1-processor.js
# (이슈의 코드를 복사해서 붙여넣기)

# 3. 실행
node src/main.js l1

# 4. 결과 확인
✅ 히도강남점: 95점 (HIGH)
✅ 맛있는집: 78점 (MEDIUM)
```

**완료! 🎉**

---

## 📋 시나리오 2: 버그 수정하기

### 상황
L1에서 주소 파싱이 실패하는 버그 발견

### Step 1: AI에게 보고

```
"L1 프로세스에서 '서울특별시' 형식의 주소를 파싱 못 하는 버그가 있어.
현재는 '서울'만 인식하는데, '서울특별시'도 인식하도록 수정해줘."
```

### Step 2: AI가 자동 처리

#### 2-1. Backlog (빠르게)

```
docscode/backlog/ideas/l1-address-parsing-fix.md
→ (간단한 버그라 바로 ready로)
docscode/backlog/ready/l1-address-parsing-fix.md
```

#### 2-2. Issues 생성

```
docscode/issues/l1-address-parsing-fix/
└── 001-place-keywords-maker.md
```

**내용:**
```markdown
# Bug Fix: 주소 파싱 개선

## 문제
'서울특별시' 인식 실패

## 해결책
정규식 패턴 수정:

```javascript
// Before
const siMatch = address.match(/^(서울|경기|인천)/);

// After
const siMatch = address.match(/^(서울특별시|서울|경기도|경기|인천광역시|인천)/);
```

## 테스트
```javascript
parseAddress('서울특별시 강남구') // ✅ { si: '서울' }
parseAddress('경기도 성남시')     // ✅ { si: '경기' }
```
```

### Step 3: 수정 & 테스트

```bash
# 코드 수정
vim Place_Keywords_maker/src/l1-processor.js

# 테스트
node src/main.js l1 1768171911
```

**완료! 🎉**

---

## 📋 시나리오 3: 프로젝트 간 통합 기능

### 상황
Place_Crawler와 Place_Keywords_maker를 연동하여 자동화하고 싶음

### Step 1: AI에게 요청

```
"Place_Crawler로 크롤링하면 자동으로 Place_Keywords_maker의 L1이 실행되도록 통합해줘.

크롤링 완료 → 자동으로 L1 실행 → 결과 알림
```

### Step 2: AI가 교차 프로젝트 분석

```
docscode/cross-project/integrations/
└── crawler-to-keywords-automation.md
```

### Step 3: Issues 생성 (두 프로젝트)

```
docscode/issues/crawler-keywords-integration/
├── 001-place-crawler.md       # 크롤러 수정
├── 002-place-keywords-maker.md # L1 수정
└── execution-plan.md           # 통합 실행 계획
```

**완료! 🎉**

---

## 🎯 핵심 사용 패턴

### Pattern 1: "먼저 Backlog로 시작"

```
✅ "XXX 기능 추가하고 싶어. 먼저 Backlog로 만들어서 요구사항 명확화하자"

❌ "XXX 기능 바로 만들어줘" (불명확 → 재작업 위험)
```

### Pattern 2: "완전한 코드로"

```
✅ "완전한 코드로 작성해줘 (TODO 없이)"

❌ "대충 구조만 짜줘" (불완전한 코드 → 직접 채워야 함)
```

### Pattern 3: "Issues와 Features 선택"

```
- Issues만: 빠른 구현 (코드만 필요)
- Features만: 아키텍처 이해 (문서만 필요)
- 둘 다: 완전한 개발 (코드 + 문서)
```

### Pattern 4: "work instruction 참조"

```
✅ "work instruction/l1.md의 규칙대로 구현해줘"

→ AI가 프로젝트별 지침서를 따름
```

---

## 🔄 완전한 워크플로우

```
[1] 자연어 요청
    ↓
    "XXX 기능 추가하고 싶어"
    ↓
[2] Backlog (IDEAS)
    docscode/backlog/ideas/xxx.md
    신뢰도: 20%
    ↓
[3] AI Q&A (EXPLORING)
    AI: 질문 → User: 답변
    docscode/backlog/exploring/xxx.md
    신뢰도: 60% → 90%
    ↓
[4] READY
    docscode/backlog/ready/xxx.md
    신뢰도: 95%
    ↓
[5] Analysis
    docscode/analysis/xxx/
    ├─ impact.md
    ├─ side-effects.md
    └─ test-scenarios.md
    ↓
[6] Issues
    docscode/issues/xxx/
    └─ 001-project.md (완전한 코드)
    ↓
[7] Features (선택)
    docscode/features/xxx/
    ├─ 00-domain/
    ├─ 10-interface/
    ├─ 20-implementation/
    └─ 30-validation/
    ↓
[8] 실제 구현
    Place_Keywords_maker/src/
    (Issues의 코드 복사 & 실행)
    ↓
[9] 완료! 🎉
```

---

## 💡 실전 팁

### Tip 1: 프로젝트 지침서 활용

```
"Place_Keywords_maker의 work instruction/l1.md에 나온 규칙대로..."
```

→ AI가 프로젝트별 규칙 자동 준수

### Tip 2: 단계별 진행

```
"먼저 Backlog로 만들고 → Q&A로 명확화 → 그 다음 Issues 생성"
```

→ 급하게 바로 구현 금지!

### Tip 3: 완전한 코드 요청

```
"TODO 주석 없이 실행 가능한 완전한 코드로 작성해줘"
```

→ 복사 & 붙여넣기만으로 실행 가능

### Tip 4: 에러 코드 활용

```
"E_L1_001 에러가 발생했어. 해결 방법 알려줘"
```

→ AI가 docscode/rules/@ERROR_CODES.md 참조하여 해결책 제시

### Tip 5: 프로젝트 문서 참조

```
"Place_Keywords_maker의 아키텍처를 먼저 이해하고 싶어"
```

→ AI가 docscode/projects/place-keywords-maker/README.md 읽고 설명

---

## 📚 자주 사용하는 명령어

### 문서 확인

```bash
# AI 가이드
cat docscode/CLAUDE.md

# 프로젝트 문서
cat docscode/projects/place-keywords-maker/README.md

# Backlog 확인
ls docscode/backlog/ready/

# Issues 확인
ls docscode/issues/
```

### AI와 대화

```
# 새 기능
"XXX 기능 추가하고 싶어. Backlog로 시작하자"

# 버그 수정
"XXX 버그가 있어. 수정해줘"

# 프로젝트 이해
"Place_Keywords_maker의 L1 프로세스 설명해줘"

# 에러 해결
"E_L1_001 에러 발생. 어떻게 해결하지?"
```

---

## 🎉 시작하기

### 1분 테스트

```
User: "Place_Keywords_maker의 L1 프로세스를 설명해줘"

AI: [docscode/CLAUDE.md 읽음]
    [docscode/projects/place-keywords-maker/README.md 읽음]
    [Place_Keywords_maker/work instruction/l1.md 읽음]

    "L1은 데이터 수집 및 정렬 프로세스입니다..."
```

### 5분 실습

```
User: "로그에 진행률 표시 기능을 추가하고 싶어. Backlog로 시작하자"

AI: [Backlog 생성]
    [Q&A 진행]
    [Issues 생성]
    "완료! docscode/issues/progress-bar-logging/ 확인하세요"

User: [Issues 확인 → 코드 복사 → 실행]
```

---

## 🔗 관련 문서

- **[CLAUDE.md](CLAUDE.md)** - AI 통합 가이드
- **[STRUCTURE_EXPLAINED.md](STRUCTURE_EXPLAINED.md)** - 구조 설명
- **[rules/@CONVENTIONS.md](rules/@CONVENTIONS.md)** - 코딩 규칙
- **[workflows/new-feature-development.md](workflows/new-feature-development.md)** - 개발 워크플로우

---

**지금 바로 시작하세요! 🚀**

```
"Place_Keywords_maker의 L1에 XXX 기능 추가하고 싶어. Backlog로 시작하자!"
```
