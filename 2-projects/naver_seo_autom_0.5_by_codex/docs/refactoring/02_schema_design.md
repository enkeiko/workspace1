# 통합 스키마 설계 개요

## 스키마 목적
- Collector/Analyzer/Improver/Generator 전 단계를 하나의 JSON Schema로 연결
- 데이터 정합성/일관성 확보, 테스트/유효성 검증 기반 마련

## 최상위 섹션
- `meta`: 스키마 버전, 생성 시각
- `client`: 브랜드/플레이스/비즈니스(이름/전화/주소/카테고리/영업/웹/운영)
- `keywords`: core/region/attributes
- `assets`: photos/menus
- `ops`: 운영(선택)
- `analysis`: relevance/popularity/trust/이슈/결측/NAP 불일치
- `improvements`: 키워드 제안/소개문/뉴스 캘린더/리뷰 템플릿/비주얼 제안
- `provenance`: 단계별 생성 출처

## 설계 원칙
- 검증 불가한 지표는 수치 대신 `"unknown"` 명시
- 주소는 `raw`를 기본으로 하고 세부 정규화 필드는 선택
- 추후 스키마 확장을 위해 `required`는 핵심만 최소 설정

## 실제 스키마
- 파일: `shared/schema.json` (JSON Schema 2020-12)
- 각 필드 타입/배열/객체 정의 포함

## 적용 방식
- 각 단계에서 스키마의 기본 템플릿을 인스턴스 형태로 구성하고, 출력 파일(`collector.json`, `analysis.json`, `improved.json`)을 스키마 구조에 맞춰 작성
- 필요 시 ajv 등으로 정합성 검증(추후)

