# Analyzer 리팩터링

## 입력/출력
- 입력: `clients/{brand}/intake.json`, `clients/{brand}/collector.json`
- 출력: `clients/{brand}/analysis.json`

## 기능
- 키워드 매핑(C-Sys) 초안: core/region/attributes 유지 및 정합성 점검
- Relevance/Popularity/Trust: 검증 불가 → `"unknown"` 표기
- 결측/오류 탐지: 필수 필드 누락, 사진 미보유 등

## 구현 메모
- 룰/가중치 기반 공식은 가이드북 근거 확보 전까지 보류
- 결과는 스키마의 `analysis.*`에 축적

