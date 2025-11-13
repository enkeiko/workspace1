---
description: Convert a ready idea into a SpecKit specification by automatically running /speckit.specify and moving the idea to _completed/.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

This command automates the conversion of a ready idea into a SpecKit specification. It's essentially a convenience wrapper that:
1. Reads the idea from `ready/`
2. Runs `/speckit.specify` with the appropriate description
3. Moves the idea to `_completed/` upon success

**Flow:**

1. **Identify the idea file**:
   - If `$ARGUMENTS` contains a filename or slug → Use that specific file
   - If `$ARGUMENTS` is empty → Find the most recently modified file in `ready/`
   - If multiple files exist → List them and ask user to choose

2. **Read the ready idea file**:
   - Path: `1-planning/ideas/ready/{slug}.md`
   - Extract:
     - 한 줄 요약 (for SpecKit command)
     - User Stories
     - 핵심 기능
     - 기존 시스템 관계 (Q2 answer)
   - Verify it's actually ready (confidence >= 70%, summary filled)

3. **Prepare SpecKit command**:
   - Build the feature description from the "한 줄 요약"
   - If 한 줄 요약 is too vague, enhance it with details from 핵심 기능
   - Format: `/speckit.specify "{한 줄 요약 with context}"`

4. **Execute SpecKit conversion**:
   - Run the `/speckit.specify` command (use SlashCommand tool)
   - Wait for SpecKit to complete:
     - Branch creation
     - Spec file generation
     - Checklist generation
   - Capture the feature number and branch name from SpecKit output

5. **Move idea to completed**:
   - Source: `1-planning/ideas/ready/{slug}.md`
   - Destination: `1-planning/ideas/_completed/{slug}.md`
   - Update the file metadata:
     ```yaml
     status: completed
     confidence: 100
     converted_to: "specs/{number}-{slug}/spec.md"
     converted_date: {today}
     branch: "{number}-{slug}"
     ```
   - Add completion note at the top:
     ```markdown
     > **✅ SpecKit으로 전환 완료**
     > - 전환일: {date}
     > - 브랜치: `{number}-{slug}`
     > - 스펙 파일: `resources/specs/{number}-{slug}/spec.md`
     ```

6. **Report success**:
   - Confirm conversion complete
   - Show branch name and spec file location
   - Suggest next steps (e.g., `/speckit.plan`)

## Validation Before Conversion

Check:
- [ ] File exists in `ready/` folder
- [ ] Confidence >= 70%
- [ ] 한 줄 요약 is present and clear
- [ ] User Stories are defined
- [ ] 핵심 기능 list exists

If any check fails → Report issue and exit without converting

## Execution Flow

1. Parse input to identify idea file
2. Read idea file from `ready/`
3. Validate readiness
4. Extract summary and key info
5. Build SpecKit command
6. Execute `/speckit.specify` (via SlashCommand tool)
7. Wait for SpecKit completion
8. Update idea file with completion info
9. Move file from `ready/` to `_completed/`
10. Report success

## Example Interaction

```
사용자: /ideakit.convert competitor-analysis

AI:
## 🔄 SpecKit으로 전환 중...

**아이디어**: competitor-analysis
**신뢰도**: 75%
**요약**: 네이버 플레이스 경쟁업체 자동 분석 및 비교

---

### Step 1: SpecKit 명령 실행

실행 중: `/speckit.specify "네이버 플레이스 경쟁업체 자동 분석 (검색 순위, 리뷰 수, 평점 비교)"`

[... SpecKit 실행 과정 ...]

---

### Step 2: 아이디어 완료 처리

**파일 이동**:
- From: `1-planning/ideas/ready/competitor-analysis.md`
- To: `1-planning/ideas/_completed/competitor-analysis.md`

---

## ✅ 전환 완료!

**생성된 브랜치**: `002-competitor-analysis`
**스펙 파일**: `resources/specs/002-competitor-analysis/spec.md`
**체크리스트**: `resources/specs/002-competitor-analysis/checklists/requirements.md`

### 다음 단계:

1. **스펙 검토**: 생성된 spec.md 파일을 확인하세요
2. **계획 수립**: `/speckit.plan`을 실행해서 구현 계획을 세우세요
3. **작업 시작**: 계획이 완료되면 구현을 시작하세요

---

**아이디어 탐색 → SpecKit 전환이 성공적으로 완료되었습니다! 🎉**
```

## Error Handling

### File Not Found

```markdown
## ❌ 파일을 찾을 수 없습니다

`1-planning/ideas/ready/competitor-analysis.md` 파일이 존재하지 않습니다.

### 확인사항:
1. 파일이 `exploring/` 폴더에 있나요?
   → `/ideakit.ready {slug}`를 먼저 실행하세요

2. 파일명이 정확한가요?
   → ready 폴더의 파일 목록을 확인하세요

사용 가능한 ready 아이디어:
- review-automation (신뢰도: 80%)
- seo-recommender (신뢰도: 72%)
```

### Not Ready

```markdown
## ⚠️ SpecKit 전환 준비가 안 됨

**현재 신뢰도**: 50% (70% 필요)

**부족한 부분**:
- [ ] 요약 섹션 미작성
- [ ] User Stories 미정의

### 해결 방법:
1. `/ideakit.continue {slug}`로 남은 질문 완료
2. `/ideakit.ready {slug}`로 ready 상태 확인
3. 그 다음 `/ideakit.convert {slug}` 재시도
```

## Important Notes

- **SlashCommand tool**: Use this to invoke `/speckit.specify` from within this command
- **Wait for completion**: Don't move to _completed/ until SpecKit successfully finishes
- **Preserve history**: The idea file in _completed/ serves as historical record
- **Metadata updates**: Add conversion info (date, branch, spec location)
- **Error handling**: If SpecKit fails, don't move the file - keep it in ready/
- **User feedback**: Provide clear next steps after successful conversion

## Integration with SpecKit

This command acts as a bridge between IdeaKit and SpecKit:

```
IdeaKit workflow:
/ideakit.start → /ideakit.continue → /ideakit.ready → /ideakit.convert
                                                              ↓
                                                        [SpecKit takes over]
                                                              ↓
                                                    /speckit.plan → /speckit.implement
```

## Completion Metadata Format

Add this at the top of the completed file:

```markdown
> **✅ SpecKit으로 전환 완료**
> - 전환일: 2025-11-11
> - 브랜치: `002-competitor-analysis`
> - 스펙 파일: `resources/specs/002-competitor-analysis/spec.md`
> - 최종 신뢰도: 75%
```

And update YAML at bottom:

```yaml
feature_id: 002-competitor-analysis
status: completed
confidence: 100
priority: medium
estimated_hours: unknown
tags: [competitor-analysis, naver-place, automation]
projects: [place-crawler]
converted_to: "resources/specs/002-competitor-analysis/spec.md"
converted_date: 2025-11-11
branch: "002-competitor-analysis"
```
