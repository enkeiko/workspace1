# Generator 빌드

## 출력 산출물
- `Guidebook.md`: 비즈니스/키워드/개선 요약
- `Deploy_Checklist.md`: 배포 전 확인 항목(결측 기반)
- `audit_report.json`: 점검 리포트(NAP/결측)

## 구현 메모
- 모든 출력은 텍스트/JSON으로 간단 생성(후속 템플릿 엔진 도입 가능)
- 스키마 버전과 생성 시각을 리포트에 포함
- 출력 디렉터리(`clients/{brand}/outputs/`) 미존재 시 자동 생성
