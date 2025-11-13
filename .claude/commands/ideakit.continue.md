---
description: Continue clarifying an existing idea by answering the next question in the exploration process.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

This command continues the clarification process for an idea that's currently in the `exploring/` folder. The user provides their answer to the current question, and you guide them to the next step.

**Flow:**

1. **Identify which idea to continue**:
   - If `$ARGUMENTS` contains a filename or slug → Use that specific file
   - If `$ARGUMENTS` is empty or only contains an answer → Find the most recently modified file in `exploring/`
   - If multiple files exist and no clear indication → Ask user which idea to continue

2. **Read the current idea file**:
   - Path: `1-planning/ideas/exploring/{slug}.md`
   - Determine:
     - Current confidence level
     - Last answered question (Q1, Q2, Q3, etc.)
     - What the next question should be

3. **Process user's answer**:
   - Read the user's response from `$ARGUMENTS` (or from previous message context)
   - Update the idea file:
     - Fill in the answer for the last asked question
     - If applicable, check relevant boxes in the "명확화 진행 상황" section
     - Update confidence level based on progress

4. **Determine next action**:

   **If confidence < 70%**:
   - Ask the next question (Q2, Q3, Q4, Q5, etc.)
   - Update confidence:
     - Q1 answered: 40%
     - Q1-Q3 answered: 50%
     - Q1-Q5 answered: 60%

   **If confidence >= 70%**:
   - Fill in the "요약" section:
     - 한 줄 요약
     - User Stories (3-5개)
     - 핵심 기능
     - 기술 스택 (예상)
     - 데이터 흐름
   - Update status in metadata
   - Inform user that the idea is ready to move to `ready/` folder
   - Suggest using `/ideakit.ready {slug}` to move it

5. **Save progress**:
   - Write updated content back to the idea file
   - Report progress to user

6. **Present next question** (if confidence < 70%):
   - Use friendly, conversational Korean
   - Provide examples or context to help user answer
   - One question at a time

## Confidence Level Guidelines

| Questions Answered | Confidence | Status |
|-------------------|------------|--------|
| Initial idea only | 30% | Just started |
| Q1 | 40% | Understanding user |
| Q1-Q3 | 50% | Understanding scope |
| Q1-Q5 | 60% | Understanding technical needs |
| Q1-Q5 + Summary | 70% | Ready for SpecKit |
| Q6-Q7 | 80%+ | Extra clarity |

## Question Sequence

**Core Questions (Q1-Q5)** - Always ask these:
1. 주요 사용자는 누구인가요?
2. 기존 시스템과의 관계는?
3. 필수 기능 vs 선택 기능은?
4. 기술 제약 및 요구사항은?
5. 우선순위 및 일정은?

**Optional Questions (Q6-Q7)** - Ask if needed for clarity:
6. 예상되는 어려움은?
7. 성공 기준은 무엇인가요?

**Advanced Questions (Q8-Q10)** - Rarely needed:
8. 데이터 모델?
9. UI/UX 고려사항?
10. 보안/성능 요구사항?

## Execution Flow

1. Parse input to find idea file and user's answer
2. Read current idea file
3. Update file with user's answer
4. Calculate new confidence level
5. If confidence >= 70% → Generate summary, suggest moving to ready/
6. If confidence < 70% → Ask next question
7. Save updated file
8. Report progress to user

## Example Interaction

```
사용자: /ideakit.continue 네이버 플레이스 매장 운영자들이 사용할 거예요

AI:
## 📝 답변 저장 완료

**파일**: `1-planning/ideas/exploring/competitor-analysis.md`
**Q1 답변**: "네이버 플레이스 매장 운영자"
**현재 신뢰도**: 30% → 40%

---

### Q2: 기존 시스템과의 관계는?

이 기능이:
- [ ] 새로운 독립 프로젝트인가요?
- [ ] 기존 프로젝트를 확장하는 건가요? (프로젝트명: ______)
- [ ] 여러 프로젝트를 통합하는 건가요?

어떤 경우에 해당하나요?
```

## Important Notes

- **Progressive updates**: Save file after each answer
- **One question at a time**: Don't overwhelm user
- **Context awareness**: Use previous answers to inform next questions
- **Smart suggestions**: When confidence reaches 70%, write a good summary automatically
- **User-friendly**: Use conversational Korean, provide examples
- **File location**: Always use absolute paths for file operations
- **Metadata updates**: Keep the YAML metadata at the bottom current

## Summary Generation (at 70% confidence)

When generating the summary section:

```markdown
## 🎯 요약

### 한 줄 요약
{Based on all answers, create one concise sentence describing the feature}

### User Stories
1. 사용자는 {Q1 사용자}로서 {Q3 필수기능}을 할 수 있다
2. 사용자는 {액션}을 통해 {목적}을 달성한다
3. 사용자는 {상황}에서 {기능}을 사용한다

### 핵심 기능
{Extract from Q3}

### 기술 스택
{Extract from Q4, or suggest based on context}

### 데이터 흐름 (간단히)
```
입력 → {Q2 기존시스템} → 처리 → 출력
```
```
