# Docs 구조 정리 제안

## 목표
- 문서 유형별 분리로 탐색 비용 최소화
- 현재/계획/레거시 문서의 버전 구분 명확화
- 진행 로그(보고서/이슈)와 설계 문서를 분리

## 현재 구조 관찰
- 최상위에 모듈 설계(10~17), 도메인 흐름(00~03), 로드맵/마이그레이션/PRD가 혼재
- PRD가 단일 파일과 버전 폴더로 분산됨
- 진행/이슈 리포트는 progress 폴더에 따로 존재

## 제안 구조 (폴더 기준)
```
docs/
  00-index.md
  01-overview/
  02-domain/
  03-requirements/
    PRD_42Ment_ERP_2026.md
    PRD_42Ment_ERP_MVP_v2.md
    PRD_v3.0/
  04-data/
  05-modules/
  06-ui-ux/
  07-roadmap/
  08-migration/
  90-progress/
  98-ai/
  99-archive/
```

## 이동 매핑 (추천)
- docs/00-executive-summary.md -> docs/01-overview/00-executive-summary.md
- docs/01-business-flow.md -> docs/02-domain/01-business-flow.md
- docs/02-data-model.md -> docs/04-data/02-data-model.md
- docs/03-public-order-portal.md -> docs/02-domain/03-public-order-portal.md
- docs/10-supplier-module.md -> docs/05-modules/10-supplier-module.md
- docs/11-purchase-order-module.md -> docs/05-modules/11-purchase-order-module.md
- docs/12-profit-analysis-module.md -> docs/05-modules/12-profit-analysis-module.md
- docs/13-payment-module.md -> docs/05-modules/13-payment-module.md
- docs/14-customer-pricing-module.md -> docs/05-modules/14-customer-pricing-module.md
- docs/17-audit-log-module.md -> docs/05-modules/17-audit-log-module.md
- docs/15-dashboard-design.md -> docs/06-ui-ux/15-dashboard-design.md
- docs/16-pdf-generation.md -> docs/06-ui-ux/16-pdf-generation.md
- docs/90-implementation-roadmap.md -> docs/07-roadmap/90-implementation-roadmap.md
- docs/MVP-implementation-plan.md -> docs/07-roadmap/MVP-implementation-plan.md
- docs/91-migration-guide.md -> docs/08-migration/91-migration-guide.md
- docs/PRD_42Ment_ERP_2026.md -> docs/03-requirements/PRD_42Ment_ERP_2026.md
- docs/PRD_42Ment_ERP_MVP_v2.md -> docs/03-requirements/PRD_42Ment_ERP_MVP_v2.md
- docs/PRD_v3.0/ -> docs/03-requirements/PRD_v3.0/
- docs/CLAUDE_CODE_견적서_구현_명령.md -> docs/98-ai/CLAUDE_CODE_견적서_구현_명령.md
- docs/progress/* -> docs/90-progress/*

## 운영 규칙 제안
- 기준 문서: docs/03-requirements/PRD_42Ment_ERP_2026.md
- MVP 스코프: docs/03-requirements/PRD_42Ment_ERP_MVP_v2.md
- 레거시/참고: docs/03-requirements/PRD_v3.0/
- 새 문서: {NN}-{topic}.md 형식 유지, 도메인-데이터-모듈-UI/UX-로드맵 순으로 배치
- 중복 내용은 상위 문서에 요약하고 상세는 하위(모듈/데이터) 문서로 링크

## 00-index.md 구성 제안
- 전체 문서 맵(폴더별 링크)
- 현재 기준 문서(Primary PRD, MVP PRD)
- 진행 리포트 최신 링크
- 변경 이력/최근 업데이트

## 정리 순서(작업 절차)
1. 00-index.md 생성
2. 폴더 생성
3. 파일 이동
4. 내부 링크 업데이트 (문서 내 상대경로)
5. progress 폴더 내 파일명 정리

## 빠른 정리 제안
- progress/Untitled -> 의미 있는 이름으로 변경 또는 docs/99-archive로 이동
- 중복된 설명(예: 로드맵/계획)은 07-roadmap 폴더로 통합

```
위 구조는 기존 번호 체계를 유지하면서 문서 유형별로 이동만 하는 방식이라 리스크가 낮습니다.
필요하면 “폴더만 먼저 만들고, 이동은 단계적으로”도 가능합니다.
```
