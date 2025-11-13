# 2-projects: 실행 코드 영역

**목적**: 실제 실행 가능한 프로젝트 코드

---

## 📁 프로젝트 목록

```
2-projects/
├── place-keywords-maker-v1/    # V1 (완료)
├── place-keywords-maker-v2/    # V2 (개발 중)
└── place-crawler/              # 독립 크롤러
```

---

## 🚀 프로젝트 개요

### Place Keywords Maker V1
**상태**: ✅ 완료
**기술**: JavaScript (Node.js 18+), Playwright, Winston, Express

**기능**:
- L1: 네이버 플레이스 데이터 크롤링
- L2: AI 키워드 분석
- L3: 최종 SEO 전략
- GUI: Express 웹 서버

**실행**:
```bash
cd place-keywords-maker-v1
node src/main.js l1
```

---

### Place Keywords Maker V2
**상태**: 🔨 개발 중
**기술**: JavaScript (Node.js 18+), Playwright, Winston, Jest

**개선 사항**:
- 모듈화 (crawler/, parsers/, processors/)
- 테스트 (Jest 80% 커버리지)
- 에러 처리 (Exponential backoff, Circuit breaker)
- 설정 관리 (YAML + .env)

**개발**:
```bash
cd place-keywords-maker-v2
npm install
npm test
npm run l1
```

---

### Place Crawler
**상태**: 독립 프로젝트
**용도**: 네이버 플레이스 크롤러 단독 사용

**실행**:
```bash
cd place-crawler
# 사용법은 프로젝트 내 README 참고
```

---

## 📋 프로젝트 추가 가이드

새 프로젝트 추가 시:

```bash
# 1. 폴더 생성
mkdir 2-projects/new-project

# 2. 기본 구조
cd 2-projects/new-project
npm init -y

# 3. 스펙 문서 연결
# 1-planning/specs/{번호}-new-project/ 참고
```

---

## 🔗 관련 문서

- 설정/리소스: `../0-workspace/`
- 기획 문서: `../1-planning/`
- 공통 리소스: `../0-workspace/shared/`
- 개발 도구: `../0-workspace/tools/`

---

**Last Updated**: 2025-11-11
