# 표준 폴더 구조(제안)

- root
  - src/                # 애플리케이션 소스
  - public/             # 정적 자원(프런트엔드)
  - shared/             # 공용 스키마/템플릿/프롬프트
  - scripts/            # 실행/배포/검증 스크립트
  - docs/               # 문서(설계/가이드/리포트)
    - refactoring/
    - ops/
  - clients/            # 브랜드/고객 단위 I/O
    - {brand}/
      - intake.json
      - collector.json
      - analysis.json
      - improved.json
      - inputs/
      - outputs/
      - archives/
  - tests/              # 단위/통합 테스트(있다면)
  - .vscode/            # 에디터 설정(선택)
  - package.json        # 의존성/스크립트 정의
  - README.md           # 프로젝트 개요+링크

정착 방법
- 기존 프로젝트는 위 구조로 단계적 이동(심볼릭 링크/프록시 스크립트로 과도기 지원)
- 문서의 상세는 docs/ 하위로 모으고 개별 README는 개요/링크만 유지
