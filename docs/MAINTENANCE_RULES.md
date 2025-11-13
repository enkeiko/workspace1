# 유지보수 규칙(단일 표)

| 구분 | 규칙 | 설명/근거 |
|---|---|---|
| 구조 | 표준 폴더 강제 | src/public/shared/scripts/docs/clients/tests/.vscode 최소 유지 |
| 문서 | README 최소화 | 각 프로젝트 README는 개요/실행/링크만, 상세는 docs/로 이동 |
| 스키마 | 단일 schema.json | 모든 I/O는 shared/schema.json 준수, Ajv로 검증 |
| 브랜치 | main/dev/feat/* | 안정/통합/기능 브랜치 분리, PR 필수 |
| 커밋 | Conventional | feat/fix/docs/chore/refactor 형식 권장 |
| 태그 | SemVer | 파이프라인/스키마 변경 시 태깅 및 릴리스 노트 |
| 데이터 | 아카이브 | clients/{brand}/archives/{ISO}로 산출물 보관 |
| 자동화 | scripts/** | normalize-taxonomy, run-all, validate, report, archive 표준화 |
| 품질 | Lint/Test | 가능한 범위 내 linters/tests 적용, E2E(mock) 유지 |
| 보안 | Fileless 회피 | in-process 실행 우선, 외부 스폰 최소화 |

