# Place Keywords Maker V2 - 문서

이 디렉토리는 프로젝트의 상세 문서를 포함합니다.

## 📚 문서 구조

### 빠른 시작
프로젝트 루트의 [README.md](../README.md)와 [SPEC.md](../SPEC.md)를 먼저 확인하세요.

### 상세 아키텍처 문서

#### [architecture/](architecture/)
시스템 아키텍처 및 파이프라인 상세 설명 (통합된 place-crawler 문서)

1. **[overview.md](architecture/overview.md)** (453줄)
   - 시스템 개요 및 핵심 목표
   - 3단계 L1/L2/L3 프로세스 소개
   - 전체 워크플로우

2. **[l1-pipeline.md](architecture/l1-pipeline.md)** (765줄)
   - L1: 데이터 수집 및 정렬
   - 8단계 상세 프로세스
   - 완성도 평가 (115점 만점)
   - 입출력 스키마

3. **[l2-analysis.md](architecture/l2-analysis.md)** (750줄)
   - L2: AI 분석 및 목표키워드 설정
   - 네이버 검색량 조회 연동
   - 키워드 5대 분류 체계
   - 단기/장기, 메인/서브 전략

4. **[l3-strategy.md](architecture/l3-strategy.md)** (554줄)
   - L3: 최종 대표키워드 조합
   - 스코어링 알고리즘
   - 우선순위 결정 로직
   - 최종 출력 형식

---

## 📖 문서 읽는 순서

### 🚀 신규 사용자
```
1. 프로젝트 개요 파악
   → ../README.md (빠른 시작)
   → ../SPEC.md (전체 스펙 요약)

2. 아키텍처 이해
   → architecture/overview.md (시스템 개요)
   → architecture/l1-pipeline.md (데이터 수집 이해)

3. 실행 및 테스트
   → ../README.md의 "빠른 시작" 섹션
   → npm run gui 실행
```

### 🔧 개발자
```
1. 구현 세부사항
   → architecture/l1-pipeline.md (현재 구현됨)
   → architecture/l2-analysis.md (구현 예정)
   → architecture/l3-strategy.md (구현 예정)

2. 코드 탐색
   → ../src/modules/ (실제 구현)
   → ../tests/ (테스트 코드)

3. 기여
   → ../SPEC.md의 "개발 가이드" 섹션
```

### 📋 기획자/PM
```
1. 비즈니스 이해
   → architecture/overview.md (시스템 목표)
   → architecture/l2-analysis.md (키워드 전략)

2. 출력물 확인
   → architecture/l1-pipeline.md (수집 데이터)
   → architecture/l3-strategy.md (최종 결과물)
```

---

## 🔄 문서 통합 이력

**2025-11-14**: place-crawler 프로젝트 문서 통합
- `place-crawler/Doc/master.md` → `architecture/overview.md`
- `place-crawler/Doc/l1.md` → `architecture/l1-pipeline.md`
- `place-crawler/Doc/l2.md` → `architecture/l2-analysis.md`
- `place-crawler/Doc/l3.md` → `architecture/l3-strategy.md`

**통합 사유**:
- place-crawler는 문서만 존재 (코드 없음)
- V2가 실제 구현체
- 중복 제거 및 단일 진실 공급원(Single Source of Truth) 확립

---

## 📝 문서 기여 가이드

문서 수정 시:
1. **SPEC.md**: 요약 정보 업데이트 (개발자 빠른 참조용)
2. **architecture/*.md**: 상세 정보 업데이트 (Deep Dive)
3. 변경사항을 Git 커밋 메시지에 명확히 기록

**문서 계층**:
```
README.md (Quick Start)
   ↓
SPEC.md (Overview + Summary)
   ↓
docs/architecture/*.md (Detailed Specification)
```

---

## 🔗 관련 링크

- [프로젝트 README](../README.md)
- [통합 SPEC](../SPEC.md)
- [소스 코드](../src/)
- [테스트](../tests/)
- [워크스페이스 루트](../../README.md)

---

**Last Updated**: 2025-11-14
**Total Lines**: 2,522 (architecture 문서)
**Origin**: place-crawler 프로젝트 통합
