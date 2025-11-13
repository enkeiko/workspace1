# Workspace: 네이버 플레이스 SEO 자동화

통합 모노레포 워크스페이스 - 네이버 플레이스 검색 최적화 도구 개발 및 관리

---

## 📁 프로젝트 구조 (번호순 정렬)

```
workspace/
│
├── .claude/                    # Claude Code 설정 (루트)
├── .specify/                   # SpecKit 설정 (루트)
│
├── 0-workspace/                # ⚙️ 공통 리소스 및 도구
│   ├── shared/                 # 공통 리소스
│   │   ├── configs/
│   │   ├── templates/
│   │   └── utils/
│   │
│   └── tools/                  # 개발 도구
│       └── scripts/
│
├── 1-planning/                 # 📋 기획 및 설계
│   ├── ideas/                  # 💡 IdeaKit - 아이디어 구체화
│   │   ├── exploring/          # AI 대화 진행 중 (30-70%)
│   │   ├── ready/              # SpecKit 전환 준비 (70%+)
│   │   ├── _completed/         # 전환 완료
│   │   └── _templates/         # 템플릿
│   │
│   ├── specs/                  # 🔧 SpecKit - 스펙 문서
│   │   └── 001-v1-quick-start/
│   │       ├── spec.md
│   │       ├── plan.md
│   │       └── tasks.md
│   │
│   └── docs/                   # 📚 아키텍처 문서
│       ├── architecture/
│       ├── api/
│       └── guides/
│
├── 2-projects/                 # 🚀 실행 코드
│   ├── place-keywords-maker-v1/  # ✅ v1.0.0
│   ├── place-keywords-maker-v2/  # 🔨 dev
│   └── place-crawler/            # ✅ stable
│
├── 9-archive/                  # 📦 과거 시스템 보관
│   ├── docscode/
│   ├── notes/
│   └── src/
│
├── .git/                       # Git 저장소
├── .gitignore
└── README.md                   # 이 파일
```

---

## 🎯 번호별 용도

| 번호 | 폴더 | 목적 | 우선순위 |
|------|------|------|----------|
| **0** | workspace | 설정/리소스 (개발 환경) | ⭐⭐⭐⭐ 최우선 |
| **1** | planning | 기획/설계 (코드 작성 전) | ⭐⭐⭐ 높음 |
| **2** | projects | 실행 코드 (실제 개발) | ⭐⭐ 중요 |
| **9** | archive | 과거 시스템 (참고) | 참고용 |

---

## 💡 개발 워크플로우

### 순서대로 진행

```
0️⃣ 0-workspace/
   설정, 공통 리소스 준비 (개발 환경)
   ↓
1️⃣ 1-planning/
   불명확한 아이디어 → IdeaKit
   명확한 요구사항 → SpecKit
   ↓
2️⃣ 2-projects/
   spec에 따라 코드 작성
```

### 상세 워크플로우

#### A. 불명확한 아이디어 → IdeaKit
```bash
사용자: "경쟁업체 분석 기능이 필요해"
   ↓
AI: 1-planning/ideas/exploring/competitor-analysis.md 생성
   ↓
AI & 사용자: Q&A 대화 (30% → 70%)
   ↓
AI: 1-planning/ideas/ready/로 이동
   ↓
사용자: /speckit.specify "네이버 플레이스 경쟁업체 자동 분석"
   ↓
AI: 1-planning/specs/002-competitor-analysis/ 생성
```

#### B. 명확한 요구사항 → SpecKit 바로
```bash
사용자: /speckit.specify "L1 프로세서 재시도 로직 추가"
   ↓
AI: 1-planning/specs/003-retry-logic/ 생성
   ↓
사용자: /speckit.plan
   ↓
사용자: /speckit.implement
   ↓
2-projects/place-keywords-maker-v2/에 코드 작성
```

---

## 🚀 프로젝트 개요

### Place Keywords Maker V1
**위치**: [2-projects/place-keywords-maker-v1/](2-projects/place-keywords-maker-v1/)
**상태**: ✅ 완료
**기술**: JavaScript (Node.js 18+), Playwright, Winston, Express

**기능**:
- L1: 네이버 플레이스 데이터 크롤링
- L2: AI 키워드 분석
- L3: 최종 SEO 전략
- GUI: Express 웹 서버

**실행**:
```bash
cd 2-projects/place-keywords-maker-v1
node src/main.js l1
```

---

### Place Keywords Maker V2
**위치**: [2-projects/place-keywords-maker-v2/](2-projects/place-keywords-maker-v2/)
**상태**: 🔨 개발 중
**기술**: JavaScript (Node.js 18+), Playwright, Winston, Jest

**V2 개선사항**:
1. **모듈화**: crawler/ parsers/ processors/ 분리
2. **테스트**: Jest + 80% 커버리지
3. **에러 처리**: Exponential backoff, Circuit breaker
4. **설정**: YAML + .env
5. **타입 안전성**: 완전한 JSDoc
6. **성능**: 병렬 크롤링, Rate limiting

**제거**:
- 완성도 평가 시스템 (115점) → 필수 필드 검증

**개발**:
```bash
cd 2-projects/place-keywords-maker-v2
npm install
npm test
npm run l1
```

[V2 스펙 →](1-planning/specs/001-v1-quick-start/spec.md)

---

### Place Crawler
**위치**: [2-projects/place-crawler/](2-projects/place-crawler/)
**상태**: 독립 프로젝트
**용도**: 네이버 플레이스 크롤러 단독 사용

---

## 📋 빠른 시작

### 1. 새로운 아이디어 시작

#### 불명확한 경우
```bash
# 사용자
"고객 관리 시스템이 필요해"

# AI가 자동으로
cd 1-planning/ideas/exploring
# customer-management.md 생성 및 Q&A 진행
```

[IdeaKit 가이드 →](1-planning/ideas/README.md)

#### 명확한 경우
```bash
/speckit.specify "L1에 재시도 로직 추가"
/speckit.plan
/speckit.implement
```

### 2. V2 개발 환경 설정
```bash
cd 2-projects/place-keywords-maker-v2
npm install

# 설정 파일 복사
cp ../0-workspace/shared/configs/local.config.example.yml local.config.yml

# 환경 변수
cp .env.example .env
# .env 파일에 API 키 입력

# 테스트
npm test

# 실행
npm run l1
```

### 3. 공통 리소스 사용
```bash
# 설정 템플릿 복사
cp 0-workspace/shared/configs/template.yml my-project/

# 유틸리티 사용
node
> const retry = require('../0-workspace/shared/utils/retry.js')
```

---

## 📖 문서

### 기획 문서 (1-planning/)
- [IdeaKit 가이드](1-planning/ideas/README.md)
- [SpecKit 001](1-planning/specs/001-v1-quick-start/spec.md)
- [아키텍처 문서](1-planning/docs/)

### 프로젝트 문서 (2-projects/)
- [V1 README](2-projects/place-keywords-maker-v1/README.md)
- [V2 README](2-projects/place-keywords-maker-v2/README.md)
- [Crawler README](2-projects/place-crawler/README.md)

### 워크스페이스 (0-workspace/)
- [공통 리소스](0-workspace/shared/)
- [개발 도구](0-workspace/tools/)

### 아카이브 (9-archive/)
- [보관 내역](9-archive/README.md)

---

## 🎯 로드맵

### Phase 1: V2 모듈화 (진행 중)
- [x] V1 코드 분석
- [x] V2 스펙 문서 작성
- [x] workspace 정리 (번호순 구조)
- [x] IdeaKit 구축
- [ ] V2 프로젝트 구조 생성
- [ ] 핵심 모듈 구현
- [ ] 단위 테스트 작성

### Phase 2: V2 기능 완성
- [ ] L1 데이터 수집
- [ ] L2 AI 분석
- [ ] L3 전략 생성
- [ ] GUI 개선

### Phase 3: 배포
- [ ] 프로덕션 준비
- [ ] 사용자 가이드
- [ ] API 문서

---

## 📊 V1 vs V2 비교

| 항목 | V1 | V2 |
|------|----|----|
| **구조** | 단일 파일 (934줄) | 모듈화 (8개 모듈) |
| **테스트** | 불가능 | Jest + DI |
| **에러 처리** | 로깅만 | Retry + Circuit Breaker |
| **설정** | 하드코딩 | YAML + .env |
| **완성도 평가** | 115점 시스템 | 제거 (필수 필드만) |
| **타입 안전성** | 불완전 | 완전한 JSDoc |
| **병렬 처리** | 순차 | Promise.all |

---

## 🤝 기여 가이드

### 코드 스타일
- ESLint + Prettier
- JSDoc 타입 주석 필수
- 단위 테스트 작성 필수

### 커밋 메시지
```
feat: Add exponential backoff to crawler
fix: Handle null address in parser
docs: Update V2 architecture diagram
test: Add unit tests for AIClient
```

### 브랜치 전략
- `main` - 안정 버전
- `develop` - 개발
- `feature/*` - 기능 개발
- `fix/*` - 버그 수정

---

## 📄 라이선스

MIT License

---

## 📞 문의

프로젝트 관련 문의는 GitHub Issues를 이용해주세요.

---

**Last Updated**: 2025-11-11
**Version**: V2 Development
**Structure**: Monorepo (번호순 정렬)
