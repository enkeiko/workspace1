# Repository Guidelines

## Project Scope / 문서 범위
- This guide applies **only to `2-projects/place-keywords-maker-v2/`** ? 다른 CLI나 서브프로젝트 동작에는 영향이 없습니다.
- 루트에는 별도 가이드를 두지 않습니다. 이 프로젝트 작업 시에만 참고하세요.

## Project Structure & Module Organization / 프로젝트 구조
- `src/modules/`: crawler/parser/processor 모듈.
- `src/pipelines/`: L1~L3 진입점 (`l1-pipeline.js` 등) 오케스트레이션.
- `src/utils/`: 공통 유틸리티 (`CircuitBreaker`, retry, logger 등).
- `src/gui/`: 로컬 UI. `data/`: 입력/출력/로그 저장.

## Build, Test, Development Commands / 명령어
- 설치: `npm install`
- 파이프라인: `npm run l1 | l2 | l3` (각 단계 실행)
- GUI: `npm run gui`
- 린트: `npm run lint` (ESLint)
- 통합 스모크: 루트에서 `node test-pipeline.js` 실행 시 L1~L3 전 흐름 검증.

## Coding Style & Naming / 스타일7네이밍
- ES modules, 2-space indent, async/await 우선. 로깅은 제공 로거 사용.
- 파일명: PascalCase 모듈/클래스(`L1Processor.js`), kebab-case 파이프라인(`l1-pipeline.js`), 테스트 `*.test.js`.
- 설정은 YAML(`src/config/default.yml`), 비밀은 `.env`/`local.config.yml`에만 저장 — 커믵 금지.

## Testing Guidelines / 테스트 가이드
- Jest 설정 `jest.config.js`, 전역 커버리지 70% 목표. 테스트 위치: `tests/unit`, `tests/integration`.
- 우선 보강: 네트워크 실패 재시도, 파싱 에지 케이싱, 캐시 만루7중복 호출.
- E2E: 루트 `node test-pipeline.js` 또는 단cc4별 `npm run l1|l2|l3` 후 `data/output`7`data/logs` 확인.

## Commit & PR / 커벽7PR
- Conventional Commits(`feat`, `fix`, `docs`, `test`, `chore`), 필요 시 scope(`feat(parser): ...`).
- PR: 변경 의도7브레이킹 여부, 필수 설정/데이터, 테스트 결과(`npm test`, Jest 커버리지) 명시. 변경은 이 프로젝트 폴더에 한정.

## Security & Config / 보안7설정
- `.env.example`을 `.env`로 복사하고 `local.config.yml` 생성 후 실행; 자격 증명은 로컬에만 보관.
- `data/output`7`data/logs` 원본은 리뷰에 노출하지 말고, 재현은 `data/input`의 정제된 픽시처 사용.
