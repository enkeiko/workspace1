# Workspace

개인 개발 워크스페이스 - 프로젝트 상태별 관리

---

## 폴더 구조

```
workspace/
├── .workspace/              # 설정, 템플릿, 스크립트
│   ├── guides/              # 전체 지침, 컨벤션
│   ├── ideas/               # 아이디어 탐색
│   ├── scripts/             # 공통 스크립트
│   │   └── claude/          # Claude 관련 스크립트
│   ├── shared/              # 공유 리소스
│   └── tools/               # 개발 도구
│
├── 1-active-project/        # 개발중/활성 프로젝트
│   ├── place-keywords-maker-v2/
│   ├── naver-place-seo-automation/
│   ├── naver-place-crawler/
│   ├── 42ment-erp/
│   ├── korean-news-community/
│   ├── naver_seo_autom_0.5_by_codex/
│   └── reward-keyword-finder-v2/
│
├── 2-done-project/          # 완료된 프로젝트
│   ├── marketing-agency-erp/
│   └── Reward_Keyword_makers/
│
├── 3-Sandbox/               # 실험/학습
│   ├── Ex1-my-blog/
│   └── Ex2-novel-agent/
│
└── 9-archive/               # 참고자료
    ├── references/          # 문서, 분석 자료
    ├── snippets/            # 재사용 코드
    └── backups/             # 과거 백업
```

---

## 번호별 용도

| 번호 | 폴더 | 목적 | 접근 빈도 |
|------|------|------|----------|
| - | `.workspace/` | 설정, 템플릿, 지침 | 가끔 |
| **1** | `1-active-project/` | 현재 활성 프로젝트 | 매일 |
| **2** | `2-done-project/` | 완료된 프로젝트 | 가끔 |
| **3** | `3-Sandbox/` | 실험, 학습, 예제 | 드물게 |
| **9** | `9-archive/` | 참고자료, 재사용 코드 | 필요시 |

---

## 프로젝트 목록

### 1-active-project (활성)

| 프로젝트 | 설명 | 기술 |
|---------|------|------|
| **place-keywords-maker-v2** | 네이버 플레이스 키워드 분석 | Node.js, Playwright |
| **naver-place-seo-automation** | SEO 자동화 도구 | Next.js |
| **naver-place-crawler** | 데이터 수집 도구 | Python, Playwright |
| **42ment-erp** | 브랜드스튜디오 ERP | Python, PyQt |
| **korean-news-community** | 뉴스 커뮤니티 | Node.js, Express |
| **naver_seo_autom_0.5_by_codex** | SEO 자동화 실험 | JavaScript |
| **reward-keyword-finder-v2** | 키워드 도구 재구현 | Node.js |
| **marketing-agency-erp** | 마케팅 대행사 ERP | Next.js, Prisma |

### 2-done-project (완료)

| 프로젝트 | 설명 | 기술 |
|---------|------|------|
| **Reward_Keyword_makers** | 키워드 도구 | C#, WinForms |

### 3-Sandbox (실험/학습)

| 프로젝트 | 설명 |
|---------|------|
| **Ex1-my-blog** | 블로그 예제 |
| **Ex2-novel-agent** | AI 소설 에이전트 예제 |

---

## 프로젝트 생명주기

```
아이디어 → .workspace/ideas/
    ↓
개발 시작 → 1-active-project/
    ↓
개발 완료 → 2-done-project/
    ↓
이전 버전 → 프로젝트/_prev/
```

**참고**: 과거 버전은 `9-archive/`가 아닌 해당 프로젝트 내부 `_prev/` 폴더에 보관

---

## 빠른 시작

### 개발중 프로젝트 실행
```bash
cd 1-active-project/place-keywords-maker-v2
npm install
npm run gui  # http://localhost:3000
```

### 새 프로젝트 시작
```bash
mkdir 1-active-project/my-new-project
cd 1-active-project/my-new-project
npm init
```

---

## 유지보수

### 프로젝트 상태 변경
```bash
# 개발 완료 시
mv 1-active-project/project-name 2-done-project/

# 실험 프로젝트로 변경
mv 1-active-project/project-name 3-Sandbox/
```

### 정리 규칙
- 이전 버전: 프로젝트 내부 `_prev/`에 보관
- 참고 자료: `9-archive/references/`
- 재사용 코드: `9-archive/snippets/`

---

**Last Updated**: 2025-12-26
**Structure**: 상태 기반 (active → done → archive)
