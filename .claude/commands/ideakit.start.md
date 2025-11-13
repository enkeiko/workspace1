---
description: Start exploring a new unclear idea by creating an idea file and guiding clarification through AI conversation.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

The text the user typed after `/ideakit.start` in the triggering message is the initial unclear idea. Assume you always have it available in this conversation even if `$ARGUMENTS` appears literally below. Do not ask the user to repeat it unless they provided an empty command.

Given that initial idea, do this:

1. **Validate if IdeaKit is needed**:
   - Ask yourself: "Is this idea clear enough to go directly to SpecKit?"
   - If the idea has clear requirements, known scope, and defined functionality → **SKIP IdeaKit, suggest using `/speckit.specify` instead**
   - If the idea is vague, has multiple possible approaches, or needs exploration → **Continue with IdeaKit**

2. **Generate a short slug name** (2-4 words, kebab-case):
   - Extract key concepts from the initial idea
   - Create a concise, descriptive name
   - Examples:
     - "경쟁업체 분석 기능이 필요해" → "competitor-analysis"
     - "고객 리뷰를 자동으로 수집하고 싶어" → "review-automation"
     - "SEO 키워드 추천 시스템" → "seo-keyword-recommender"

3. **Check for existing idea files**:
   - Look in `1-planning/ideas/exploring/` for files with the same slug
   - Look in `1-planning/ideas/ready/` for files with the same slug
   - If exists → Ask user if they want to continue the existing idea or create a new one with a different name

4. **Create new idea file**:
   - Path: `1-planning/ideas/exploring/{slug}.md`
   - Use the template from `1-planning/ideas/_templates/idea-template.md`
   - Fill in:
     - `{기능명}`: Short descriptive name in Korean
     - `{날짜}`: Today's date (2025-11-11)
     - `{사용자가 처음 말한 내용을 여기에 기록}`: Copy exact user input from $ARGUMENTS
   - Keep all other template sections as-is (empty Q&A, unchecked checkboxes, etc.)
   - Set initial metadata:
     ```yaml
     status: exploring
     confidence: 30
     priority: medium
     estimated_hours: unknown
     ```

5. **Start clarification conversation**:
   - Present the first question (Q1) from the template
   - Use a friendly, conversational tone in Korean
   - Format:
     ```markdown
     ## 💡 아이디어 파일 생성 완료

     **파일 위치**: `1-planning/ideas/exploring/{slug}.md`
     **현재 신뢰도**: 30%

     이제 AI와 대화하며 아이디어를 구체화해보겠습니다.

     ---

     ### Q1: 이 기능의 주요 사용자는 누구인가요?

     예를 들어:
     - 네이버 플레이스 매장 운영자
     - 일반 소비자
     - 마케팅 담당자
     - 기타 (구체적으로 설명해주세요)
     ```

6. **Wait for user response** and continue the clarification workflow in the next interaction.

## Guidelines

- **Conversational approach**: Ask one question at a time, not all at once
- **Korean language**: All communication should be in Korean
- **Progressive disclosure**: Start with broad questions (user, purpose) before diving into technical details
- **Confidence tracking**: Update the confidence level as more questions are answered
  - 30%: Initial idea only (Q1 not answered)
  - 40%: Q1 answered
  - 50%: Q1-Q3 answered
  - 60%: Q1-Q5 answered
  - 70%: Q1-Q5 answered + summary written
  - 80%+: Additional Q6-Q7 answered
- **No rushing**: Don't try to complete all questions in one session
- **Save progress**: Update the idea file after each user response

## Execution Flow

1. Parse user input (initial idea)
   - If empty → ERROR "아이디어 설명을 입력해주세요"
2. Check if idea is clear enough
   - If clear → Suggest `/speckit.specify` instead
   - If unclear → Continue
3. Generate slug name
4. Check for existing files
5. Create idea file in `exploring/` folder
6. Present Q1 to user
7. Wait for response

## Example

```
사용자: /ideakit.start 네이버 플레이스 경쟁업체를 자동으로 분석하고 싶어

AI:
## 💡 아이디어 탐색 시작

**파일 생성**: `1-planning/ideas/exploring/competitor-analysis.md`
**현재 신뢰도**: 30%

막연한 아이디어를 함께 구체화해보겠습니다!

---

### Q1: 이 기능의 주요 사용자는 누구인가요?

예를 들어:
- 네이버 플레이스 매장 운영자
- 마케팅 에이전시
- 개인 사업자
- 기타

어떤 분들이 이 기능을 사용하실까요?
```

## Important Notes

- **DO NOT** ask all questions at once
- **DO NOT** try to complete the entire clarification in one response
- **DO** save the file after each interaction
- **DO** update confidence level progressively
- **DO** use friendly, conversational Korean
- **DO** validate if SpecKit would be more appropriate before starting IdeaKit
