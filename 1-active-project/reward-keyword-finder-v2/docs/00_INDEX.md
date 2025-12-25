# 리워드 키워드 메이커 V2 - 개발 지침문서 세트

> **프로젝트명**: 네이버 플레이스 키워드 탐색 프로그램 V2
> **목적**: MID/URL을 통해 네이버 플레이스 5위 안에 들어가는 키워드를 최대한 많이 찾기
> **문서 버전**: 1.0.0
> **최종 수정**: 2025-12-16

---

## 문서 구성

| 번호 | 문서명 | 용도 | 대상 |
|------|--------|------|------|
| 01 | [SPEC.md](./01_SPEC.md) | 기능 명세서 | PM, 개발자 |
| 02 | [KEYWORD_RULES.md](./02_KEYWORD_RULES.md) | 키워드 조합 원칙 | 개발자, QA |
| 03 | [DATA_SCHEMA.md](./03_DATA_SCHEMA.md) | 데이터 구조 정의 | 개발자 |
| 04 | [INTEGRATION.md](./04_INTEGRATION.md) | place-keywords-maker-v2 연동 가이드 | 개발자 |
| 05 | [API_REFERENCE.md](./05_API_REFERENCE.md) | 내부 API 명세 | 개발자 |
| 06 | [TECH_RECOMMENDATION.md](./06_TECH_RECOMMENDATION.md) | 기술 스택 및 아키텍처 추천 | 개발자, 아키텍트 |

---

## 프로젝트 개요

### 핵심 목표
```
MID/URL 입력 → 1차 키워드 자동 수집 → 조합 생성 → 순위 검증 → 5위 이내 키워드 출력
```

### 기존 시스템 (V1) vs 신규 시스템 (V2)

| 항목 | V1 (현재) | V2 (목표) |
|------|----------|----------|
| 키워드 입력 | 수동 (TXT 파일) | 자동 수집 + 수동 |
| 키워드 분류 | 없음 | 5분류 체계 |
| 조합 원칙 | 단순 카테시안 곱 | Tier 기반 우선순위 |
| 예상 키워드 수 | 50개 | 200~500개 |
| 플랫폼 | .NET WinForms | Node.js (place-keywords-maker-v2 연동) |

### 개발 우선순위

```
Phase 1: 키워드 자동 수집 연동 (P0)
├─ place-keywords-maker-v2 데이터셋 활용
├─ 5분류 키워드 체계 적용
└─ 조합 원칙 엔진 구현

Phase 2: 업종별 마스터 DB (P1)
├─ 주요 업종 키워드 사전 구축
└─ 카테고리 자동 매핑

Phase 3: 완전 자동화 (P2)
├─ MID만 입력하면 전체 프로세스 자동 실행
└─ 결과 리포트 자동 생성
```

---

## 관련 프로젝트

| 프로젝트 | 경로 | 역할 |
|---------|------|------|
| Reward_keyword_maker_1 | `2-projects/Reward_keyword_maker_1/` | V1 (현재 운영 버전) |
| place-keywords-maker-v2 | `2-projects/place-keywords-maker-v2/` | 키워드 수집 엔진 |

---

## 빠른 시작

1. [SPEC.md](./01_SPEC.md)에서 전체 기능 명세 확인
2. [KEYWORD_RULES.md](./02_KEYWORD_RULES.md)에서 조합 원칙 숙지
3. [TECH_RECOMMENDATION.md](./06_TECH_RECOMMENDATION.md)에서 기술 스택 결정
4. [INTEGRATION.md](./04_INTEGRATION.md)에서 연동 방법 확인
5. 개발 시작

---

*문서 작성: 2025-12-16*
