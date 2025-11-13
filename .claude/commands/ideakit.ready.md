---
description: Move an idea from exploring/ to ready/ when it reaches 70%+ confidence and is ready for SpecKit conversion.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

This command moves an idea file from `exploring/` to `ready/` when it has reached sufficient clarity (70%+ confidence) and is ready to be converted into a SpecKit specification.

**Flow:**

1. **Identify the idea file**:
   - If `$ARGUMENTS` contains a filename or slug → Use that specific file
   - If `$ARGUMENTS` is empty → Find the most recently modified file in `exploring/` with confidence >= 70%
   - If multiple qualifying files exist → List them and ask user to choose

2. **Validate readiness**:
   - Read the idea file from `exploring/`
   - Check:
     - Confidence level >= 70%
     - Summary section is filled (한 줄 요약, User Stories, 핵심 기능)
     - Q1-Q5 are answered
   - If not ready → Inform user of what's missing and suggest `/ideakit.continue` to complete it

3. **Update idea file**:
   - Change status from "EXPLORING" to "READY"
   - Update confidence to actual level (70%, 75%, 80%, etc.)
   - Add "SpecKit 전환 준비" section if not already present:
     ```markdown
     ## 🚀 SpecKit 전환 준비

     **신뢰도**: {current_confidence}%
     **준비 완료**: {date}

     ### SpecKit 명령어 (복사해서 사용)
     ```
     /speckit.specify "{한 줄 요약}"
     ```

     ### 예상 브랜치명
     `{number}-{slug}`

     ### 연관 프로젝트
     {Based on Q2 answer, check relevant projects}
     ```

4. **Move the file**:
   - Source: `1-planning/ideas/exploring/{slug}.md`
   - Destination: `1-planning/ideas/ready/{slug}.md`
   - Use file system move operation (not copy+delete)

5. **Report completion**:
   - Confirm the move
   - Show the SpecKit command ready to use
   - Explain next steps

## Validation Checklist

Before moving to `ready/`, verify:

- [ ] Confidence >= 70%
- [ ] Q1 (주요 사용자) answered
- [ ] Q2 (기존 시스템 관계) answered
- [ ] Q3 (필수/선택 기능) answered
- [ ] Q4 (기술 제약) answered
- [ ] Q5 (우선순위) answered
- [ ] 요약 섹션 작성됨:
  - [ ] 한 줄 요약
  - [ ] User Stories (최소 3개)
  - [ ] 핵심 기능
  - [ ] 기술 스택
- [ ] 파일에 명백한 TODO나 빈 섹션이 없음

## Execution Flow

1. Parse input to identify idea file
2. Read idea file from `exploring/`
3. Validate readiness (confidence, completeness)
4. If not ready → Report what's missing, exit
5. If ready → Update file metadata
6. Move file from `exploring/` to `ready/`
7. Report success with next steps

## Example Interaction

```
사용자: /ideakit.ready competitor-analysis

AI:
## ✅ 아이디어 준비 완료!

**파일 이동**:
- From: `1-planning/ideas/exploring/competitor-analysis.md`
- To: `1-planning/ideas/ready/competitor-analysis.md`

**신뢰도**: 75%
**상태**: EXPLORING → READY

---

### 🚀 다음 단계: SpecKit으로 전환

아래 명령어를 복사해서 사용하세요:

```
/speckit.specify "네이버 플레이스 경쟁업체 자동 분석 및 비교 (검색 순위, 리뷰, 평점)"
```

이 명령어는:
1. 새로운 feature 브랜치 생성 (예: `002-competitor-analysis`)
2. `resources/specs/002-competitor-analysis/spec.md` 생성
3. `1-planning/ideas/ready/competitor-analysis.md`를 `_completed/`로 자동 이동

---

### 📋 준비된 내용 요약

**주요 사용자**: 네이버 플레이스 매장 운영자
**핵심 기능**:
- 동일 지역/카테고리 경쟁업체 자동 수집
- 검색 순위, 리뷰 수, 평점 비교
- 주간 자동 업데이트

**예상 프로젝트**: place-crawler (L1 확장)

준비되셨으면 위의 `/speckit.specify` 명령어를 실행해주세요!
```

## Error Handling

### Not Ready Yet

```markdown
## ⚠️ 아직 준비되지 않았습니다

**현재 신뢰도**: 50%
**필요 신뢰도**: 70% 이상

### 부족한 부분:
- [ ] Q4 (기술 제약) 미답변
- [ ] Q5 (우선순위) 미답변
- [ ] 요약 섹션 미작성

### 다음 단계:
`/ideakit.continue competitor-analysis`를 실행해서 나머지 질문에 답변해주세요.
```

### Multiple Files Found

```markdown
## 🤔 여러 개의 준비된 아이디어가 있습니다

다음 중 어떤 아이디어를 ready로 이동할까요?

1. **competitor-analysis** (신뢰도: 75%)
   - "네이버 플레이스 경쟁업체 자동 분석"

2. **review-automation** (신뢰도: 80%)
   - "고객 리뷰 자동 수집 및 키워드 추출"

선택하시려면:
- `/ideakit.ready competitor-analysis`
- `/ideakit.ready review-automation`
```

## Important Notes

- **Confidence threshold**: Must be >= 70% to move to ready/
- **Completeness check**: All core questions (Q1-Q5) must be answered
- **Summary required**: The 요약 section must be filled
- **File move**: Use proper file system move, not copy+delete
- **User guidance**: Provide the exact `/speckit.specify` command they should use next
- **Absolute paths**: Always use full paths for file operations
- **Status update**: Update both the header status and YAML metadata
