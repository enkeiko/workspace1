# Changelog

All notable changes to Place Keywords Maker V2 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- L2 AI 키워드 분석 파이프라인 완성
- L3 최종 전략 생성 파이프라인 완성
- GUI 웹 대시보드 고도화
- Mock 모드 구현 (API 키 없이 테스트)

---

## [2.0.0] - 2025-11-14

### Added - 신규 기능
- **Guidebook v1.1 통합**: 42ment Guidebook v1.1 전략 프레임워크 기반 구현
- **문서 체계 정비**:
  - `GUIDEBOOK_MAPPING.md` - 전략↔구현 매핑 문서
  - `GUIDEBOOK_COVERAGE_ANALYSIS.md` - 커버리지 분석
  - `GETTING_STARTED.md` - 5분 퀵스타트 가이드
  - `TROUBLESHOOTING.md` - 문제 해결 가이드
  - `PM_DOCUMENTATION_REVIEW.md` - PM 레벨 문서 분석
- **L1 파이프라인 완성**:
  - Puppeteer 기반 네이버 플레이스 크롤러
  - Circuit Breaker 패턴 적용
  - Exponential Backoff 재시도 로직
  - 데이터 파싱 및 정규화
  - 완성도 평가 (0-100점)
- **아키텍처 문서화**:
  - L1/L2/L3 파이프라인 상세 문서 (총 2,500+ 줄)
  - 전략 프레임워크 통합
  - 용어 통일 (C-Sys, D-Sys, E-Sys ↔ L1/L2/L3)

### Changed - 변경 사항
- **모듈화 아키텍처**: V1 단일 파일 → V2 모듈 분리 구조
  - `src/modules/crawler/` - 크롤링 모듈
  - `src/modules/parser/` - 파싱 모듈
  - `src/modules/processor/` - 처리 모듈
- **설정 파일 분리**: 하드코딩 → YAML + .env 환경 변수
- **로깅 개선**: console.log → 구조화된 logger (레벨별 분리)
- **에러 처리 강화**: 기본 try-catch → Circuit Breaker + 재시도

### Deprecated - 폐기 예정
- V1 단일 파일 구조 (place-crawler/V1/)

### Removed - 제거됨
- `DOCUMENTATION_STRUCTURE.md` - 일회성 분석 문서 (GUIDEBOOK_COVERAGE_ANALYSIS.md에 통합)

### Fixed - 버그 수정
- 크롤링 타임아웃 처리 개선
- 메모리 누수 방지 (배치 처리 최적화)

### Security - 보안
- API 키 환경 변수 분리 (.env 파일)
- .gitignore에 민감 정보 파일 추가

---

## [1.0.0] - 2025-10-22

### Added
- 초기 릴리스 (V1)
- 기본 네이버 플레이스 크롤링 기능
- 단일 파일 구조

### Known Issues
- 모듈화 부재
- 테스트 없음
- 에러 처리 미흡
- 설정 하드코딩

---

## [0.5.0] - 2025-10-15 (Beta)

### Added
- 프로토타입 버전
- 기본 개념 검증 (PoC)

---

## 버전 히스토리 요약

| 버전 | 날짜 | 주요 변경 | 상태 |
|------|------|----------|------|
| **2.0.0** | 2025-11-14 | Guidebook 통합, 모듈화, 문서화 | ✅ Current |
| 1.0.0 | 2025-10-22 | 초기 릴리스 (V1) | 📦 Archived |
| 0.5.0 | 2025-10-15 | 프로토타입 (Beta) | 📦 Archived |

---

## 다음 마일스톤

### v2.1.0 (예정: 2025-12-01)
- [ ] L2 파이프라인 완성
- [ ] Mock 모드 구현
- [ ] 테스트 커버리지 70% 달성
- [ ] GUI 대시보드 베타 버전

### v2.2.0 (예정: 2025-12-15)
- [ ] L3 파이프라인 완성
- [ ] 네이버 검색 API 연동
- [ ] 배치 처리 기능 강화

### v3.0.0 (예정: 2026-Q1)
- [ ] E-Sys (외부 콘텐츠 동기화) 구현
- [ ] AI Improver 고도화
- [ ] 멀티 매장 분석 지원

---

## 기여 가이드

버전 관리 규칙:
- **Major (X.0.0)**: Breaking changes, 아키텍처 대변경
- **Minor (x.X.0)**: 새로운 기능 추가, 하위 호환성 유지
- **Patch (x.x.X)**: 버그 수정, 문서 업데이트

커밋 메시지 컨벤션:
- `feat:` - 새로운 기능
- `fix:` - 버그 수정
- `docs:` - 문서 변경
- `refactor:` - 코드 리팩토링
- `test:` - 테스트 추가/수정
- `chore:` - 빌드 프로세스, 도구 변경

---

**관리 정책**:
- 이 파일은 릴리스마다 업데이트됩니다
- 모든 사용자 영향이 있는 변경 사항은 반드시 기록
- 날짜 형식: YYYY-MM-DD

**문서 버전**: 1.0
**최종 업데이트**: 2025-11-14
