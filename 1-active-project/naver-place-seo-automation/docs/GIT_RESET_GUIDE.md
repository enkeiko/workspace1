# Git 정리/재구성 가이드(단계별)

## 1) 로컬 안전 백업
- 전체 폴더 아카이브(zip) 또는 별도 드라이브로 복사
- 중요 산출물: clients/**/archives, docs/**, shared/schema.json, README_CONSOLIDATED.md

## 2) 브랜치 전략 수립
- 기본: `main`(안정) / `dev`(통합) / `feat/*`(기능) / `fix/*`(버그)
- 규칙: PR 필수, 리뷰 1인 이상, 커밋 메시지 컨벤션(예: Conventional Commits)

## 3) 중복 레포/폴더 통합
- 기준 프로젝트: naver_seo_autom_0.5_by_codex
- 레거시(v1/v2)는 `archive/*` 브랜치로 이동(히스토리 보존), 메인 라인에서는 제거

## 4) 히스토리 정리(옵션)
- 민감/대용량 파일 제거: `git filter-repo` 또는 `git filter-branch`
- 폴더 이동 기록 보전: `git mv` 사용, 대량 이동은 PR에서 문서화

## 5) 태그/릴리스
- 스키마 변경/파이프라인 변경 시 SemVer 태그(v0.5.0 → v0.6.0 등)
- 릴리스 노트: 변경 요약 + 마이그레이션 지침

## 6) 초기화 시퀀스(필요 시)
- 새로운 원격에 푸시: `git init` → `git remote add origin ...` → `git add .` → `git commit -m "chore: init consolidated repo"` → `git push -u origin main`
- 기존 원격 덮어쓰기 금지(충돌/손실 위험): 별도 저장소 권장

## 7) 추천 규칙(요약)
- 커밋: 작은 단위, 의미 있는 제목/본문, 이슈 링크
- 브랜치: `feat/`, `fix/`, `docs/`, `chore/`, `refactor/` 접두사
- PR: 체크리스트(테스트, 문서, 스키마 검증) 통과 후 머지

