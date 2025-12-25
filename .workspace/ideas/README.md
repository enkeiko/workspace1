# 💡 IdeaKit - 아이디어 구체화 도구

**목적**: 불명확한 아이디어를 AI와 대화하며 구체화한 후, SpecKit으로 자동 전환

---

## 📁 폴더 구조

```
ideas/
├── exploring/          # AI 대화 진행 중 (신뢰도 30-70%)
├── ready/              # SpecKit 전환 준비 완료 (신뢰도 70%+)
├── _completed/         # SpecKit으로 전환됨
└── _templates/         # 템플릿 모음
```

---

## 🚀 사용 방법

### 1. 불명확한 아이디어가 있을 때

#### Step 1: 아이디어 파일 생성
```
사용자: "고객 리뷰를 자동으로 수집하고 분석하는 기능이 필요해"

AI: ideas/exploring/review-automation.md 생성
    (템플릿 기반으로 자동 생성)
```

#### Step 2: AI와 대화하며 구체화
```
AI: "Q1: 이 기능의 주요 사용자는 누구인가요?"
사용자: "네이버 플레이스 매장 운영자"

AI: "Q2: 기존 시스템과의 관계는?"
사용자: "Place_Keywords_maker L2에 통합하고 싶어"

AI: "Q3: 필수 기능 vs 선택 기능은?"
사용자: "필수는 리뷰 수집과 키워드 추출, 선택은 감정 분석"

... (계속 대화)
```

#### Step 3: 신뢰도 70% 도달 → ready로 이동
```
AI: "신뢰도가 70%에 도달했습니다. ready 폴더로 이동합니다."
    mv ideas/exploring/review-automation.md ideas/ready/
```

#### Step 4: SpecKit으로 전환
```
사용자: /speckit.specify "네이버 플레이스 리뷰 자동 수집 및 키워드 추출"

AI:
  1. 002-review-automation 브랜치 생성
  2. specs/002-review-automation/spec.md 생성
  3. ideas/ready/review-automation.md → ideas/_completed/로 이동
```

---

## 📋 신뢰도 레벨 가이드

| 레벨 | 위치 | 상태 | 설명 |
|------|------|------|------|
| **30%** | exploring/ | 초기 | 막연한 아이디어, 많은 질문 필요 |
| **50%** | exploring/ | 진행 중 | 핵심 요구사항 파악 중 |
| **70%** | ready/ | 준비 완료 | SpecKit 전환 가능 |
| **100%** | _completed/ | 완료 | SpecKit으로 전환됨 |

---

## 🎯 언제 IdeaKit을 사용하나?

### ✅ IdeaKit 사용 (불명확할 때)
- ❓ "뭔가 자동화하고 싶은데 정확히 뭘 해야 할지 모르겠어"
- ❓ "여러 방법이 있는데 어떤 게 최선일까?"
- ❓ "기술적으로 가능한지 모르겠어"
- ❓ "기존 시스템과 어떻게 통합할지 고민 중"

### ⏭️ SpecKit 바로 사용 (명확할 때)
- ✅ "L1 프로세서에 에러 처리 추가해줘"
- ✅ "GUI에 다크 모드 추가"
- ✅ "데이터베이스 마이그레이션 스크립트 작성"

---

## 📖 실제 예시

### 예시 1: 불명확한 아이디어 → IdeaKit

**초기 요청**:
```
사용자: "경쟁업체 분석 기능이 필요해"
```

**AI 대화 (exploring/)**:
```markdown
# 💡 아이디어: 경쟁업체 분석

## 🎯 초기 아이디어
"경쟁업체 분석 기능이 필요해"

## 🔍 AI 대화

### Q1: 어떤 데이터를 수집하나요?
**A**: 네이버 플레이스 검색 순위, 리뷰 수, 평점

### Q2: 몇 개 업체를 비교?
**A**: 동일 카테고리 + 같은 지역 내 상위 10개

### Q3: 어떤 형태로 보여주나요?
**A**: 표로 정리, 차트로 시각화

### Q4: 얼마나 자주 업데이트?
**A**: 주 1회 자동 업데이트

### Q5: 기존 시스템과의 관계는?
**A**: L1 크롤러 확장, 새로운 L4 단계 추가

신뢰도: 30% → 70%
```

**SpecKit 전환**:
```
/speckit.specify "네이버 플레이스 경쟁업체 자동 분석 및 비교"
```

---

### 예시 2: 명확한 요구사항 → SpecKit 바로

**요청**:
```
사용자: "L1 프로세서에 재시도 로직 추가해줘. 실패 시 3회까지 exponential backoff로"
```

**AI 응답**:
```
명확한 요구사항이므로 SpecKit 바로 사용합니다.

/speckit.specify "L1 프로세서 재시도 로직 추가"
```

---

## 🔧 AI 사용 가이드 (Claude용)

### AI가 IdeaKit 파일을 만들 때

```markdown
1. exploring/ 폴더에 파일 생성
2. 템플릿 기반으로 구조 생성
3. 사용자 요청을 "초기 아이디어" 섹션에 기록
4. 명확화 질문 시작 (Q1부터)
```

### AI가 질문할 내용 (순서대로)

```
필수 질문 (최소):
Q1: 주요 사용자?
Q2: 기존 시스템과의 관계?
Q3: 필수 vs 선택 기능?
Q4: 기술 제약?
Q5: 우선순위?

추가 질문 (필요 시):
Q6: 예상 어려움?
Q7: 성공 기준?
Q8: 데이터 모델?
Q9: UI/UX 고려사항?
Q10: 보안/성능 요구사항?
```

### 신뢰도 판단 기준

```yaml
30%: 초기 아이디어만 있음
50%: Q1-Q3 답변 완료
70%: Q1-Q5 답변 완료 + 요약 작성
100%: SpecKit으로 전환 완료
```

---

## 📊 IdeaKit vs SpecKit 선택 플로우차트

```
[아이디어 발생]
    ↓
[요구사항이 명확한가?]
    ↓
YES → SpecKit 바로 사용
    /speckit.specify "명확한 기능 설명"

NO → IdeaKit 사용
    ↓
    [ideas/exploring/ 파일 생성]
    ↓
    [AI와 Q&A 대화]
    ↓
    [신뢰도 70% 도달]
    ↓
    [ideas/ready/로 이동]
    ↓
    [SpecKit으로 전환]
    /speckit.specify "구체화된 기능 설명"
```

---

## 🎓 팁 및 베스트 프랙티스

### 1. 너무 빨리 SpecKit으로 가지 말기
- ❌ 나쁨: 30% 신뢰도에서 바로 전환
- ✅ 좋음: 70% 이상에서 전환

### 2. Q&A는 대화식으로
- ❌ 나쁨: 모든 질문을 한 번에
- ✅ 좋음: 하나씩 답변하며 점진적으로

### 3. 요약 섹션이 핵심
- SpecKit으로 전환 시 이 부분을 사용
- User Stories 명확히 작성
- 기술 스택 구체적으로

### 4. 파일명 규칙
```
{기능명-kebab-case}.md

예시:
- review-automation.md
- competitor-analysis.md
- customer-management.md
```

---

## 🔗 연관 도구

| 도구 | 용도 | 언제 사용 |
|------|------|-----------|
| **IdeaKit** | 아이디어 구체화 | 불명확할 때 |
| **SpecKit** | 스펙 문서 생성 | 명확할 때 |
| **Claude Code** | 코드 작성 | 스펙 완료 후 |

---

## 📂 파일 이동 규칙

```
ideas/exploring/
    ↓ (신뢰도 70% 도달)
ideas/ready/
    ↓ (SpecKit 전환)
ideas/_completed/
```

---

## 🚀 Quick Start

### 방법 1: IdeaKit 슬래시 명령어 사용 (권장)

```bash
# 1. 새 아이디어 시작
/ideakit.start 네이버 플레이스 경쟁업체를 자동으로 분석하고 싶어

# 2. Q&A를 통해 구체화 (여러 번 반복)
/ideakit.continue 네이버 플레이스 매장 운영자들이 사용할 거예요
/ideakit.continue 기존 place-crawler L1을 확장하는 거예요
/ideakit.continue ...

# 3. 신뢰도 70% 도달 후 ready로 이동
/ideakit.ready competitor-analysis

# 4. SpecKit으로 자동 전환
/ideakit.convert competitor-analysis
```

### 방법 2: 수동으로 파일 관리

```
1. 사용자: "{막연한 아이디어}"
2. AI: ideas/exploring/{기능명}.md 생성
3. AI & 사용자: Q&A 대화
4. AI: 신뢰도 70% 도달 → ready/로 이동
5. 사용자: /speckit.specify "{구체화된 설명}"
6. AI: specs/로 자동 전환
```

### 예시 실행 (슬래시 명령어):

```
사용자: /ideakit.start 네이버 플레이스 경쟁업체를 자동으로 분석하고 싶어

AI:
## 💡 아이디어 탐색 시작
파일 생성: ideas/exploring/competitor-analysis.md
현재 신뢰도: 30%

### Q1: 이 기능의 주요 사용자는 누구인가요?

---

사용자: /ideakit.continue 네이버 플레이스 매장 운영자

AI:
## 📝 답변 저장 완료
Q1 답변: "네이버 플레이스 매장 운영자"
현재 신뢰도: 30% → 40%

### Q2: 기존 시스템과의 관계는?

---

[... Q3, Q4, Q5 반복 ...]

---

AI: "신뢰도 70% 달성!"

사용자: /ideakit.ready competitor-analysis

AI: ✅ ready/로 이동 완료!

사용자: /ideakit.convert competitor-analysis

AI: 🎉 002-competitor-analysis 브랜치 생성 완료!
```

---

## 📞 문의 및 피드백

IdeaKit 개선 아이디어가 있다면 자유롭게 제안해주세요!

---

## 🛠️ 사용 가능한 명령어

| 명령어 | 설명 | 예시 |
|--------|------|------|
| `/ideakit.start` | 새로운 아이디어 탐색 시작 | `/ideakit.start 고객 리뷰 자동 분석` |
| `/ideakit.continue` | 현재 아이디어 Q&A 계속 | `/ideakit.continue 매장 운영자들이 사용해요` |
| `/ideakit.ready` | 아이디어를 ready 폴더로 이동 | `/ideakit.ready competitor-analysis` |
| `/ideakit.convert` | SpecKit으로 자동 전환 | `/ideakit.convert competitor-analysis` |

---

**Last Updated**: 2025-11-11
**Version**: 1.1.0
**Status**: Active - Slash Commands Available ✅
