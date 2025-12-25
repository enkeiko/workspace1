# 워크스페이스 통합 및 정리 계획

> 작성일: 2025-01-14
> 목적: 중복/유사 프로젝트 정리, 표준 폴더 구조 확립, Git 재정리, 문서 통합

---

## 📋 목차

1. [중복 분석 및 자동화 분류](#1-중복-분석-및-자동화-분류)
2. [표준 폴더 구조 및 리팩토링 계획](#2-표준-폴더-구조-및-리팩토링-계획)
3. [Git 버전 관리 재정리 가이드](#3-git-버전-관리-재정리-가이드)
4. [통합 문서 생성 계획](#4-통합-문서-생성-계획)
5. [유지보수 규칙 테이블](#5-유지보수-규칙-테이블)

---

## 1. 중복 분석 및 자동화 분류

### 1.1 즉시 삭제 대상 (자동화 스크립트)

#### 🗑️ 완전 중복 프로젝트
```
❌ 2-projects/place-keywords-maker-v2 copy/
   - 이유: place-keywords-maker-v2와 100% 동일
   - 용량: ~200MB (node_modules 포함)
   - 조치: 삭제

❌ 2-projects/place-crawler/
   - 이유: 빈 껍데기 (문서만 4개)
   - 실제 코드: 9-archive에만 존재
   - 조치: 삭제 또는 9-archive로 이동
```

#### 🗑️ 임시/불필요 파일
```
❌ TEST_ADD.txt (3 bytes)
❌ NUL (412 bytes, Windows 오류 파일)
❌ README_CONSOLIDATED.md (238 bytes, 빈 파일)
❌ $root/ (빈 폴더)
```

#### 자동화 스크립트 (PowerShell)
```powershell
# cleanup-duplicates.ps1

$workspace = "C:\Users\Nk Ko\Documents\workspace"

# 1. 임시 파일 삭제
Write-Host "🗑️ 임시 파일 삭제 중..." -ForegroundColor Yellow
Remove-Item "$workspace\TEST_ADD.txt" -ErrorAction SilentlyContinue
Remove-Item "$workspace\NUL" -ErrorAction SilentlyContinue
Remove-Item "$workspace\README_CONSOLIDATED.md" -ErrorAction SilentlyContinue
Remove-Item "$workspace\`$root" -Recurse -Force -ErrorAction SilentlyContinue

# 2. v2 copy 백업 후 삭제
Write-Host "📦 place-keywords-maker-v2 copy 백업 중..." -ForegroundColor Yellow
$backupPath = "$workspace\9-archive\2025-01-14-manual-backup"
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
Move-Item "$workspace\2-projects\place-keywords-maker-v2 copy" `
          "$backupPath\place-keywords-maker-v2-backup" -ErrorAction Stop

# 3. 빈 place-crawler 삭제
Write-Host "🗑️ 빈 place-crawler 폴더 삭제 중..." -ForegroundColor Yellow
Remove-Item "$workspace\2-projects\place-crawler" -Recurse -Force

# 4. 아카이브 node_modules 삭제
Write-Host "🧹 아카이브 node_modules 정리 중..." -ForegroundColor Yellow
Get-ChildItem "$workspace\9-archive" -Directory -Recurse -Filter "node_modules" |
    Remove-Item -Recurse -Force

Write-Host "✅ 정리 완료! 예상 절감 용량: ~215MB" -ForegroundColor Green
```

### 1.2 통합 필요한 폴더

#### 📁 specs/ → 1-planning/specs/
```
현재 위치: workspace/specs/002-42ment-erp/
목표 위치: workspace/1-planning/specs/002-42ment-erp/

이유: 모든 스펙 문서를 1-planning에 집중
```

#### 📁 src/ → 2-projects/naver-place-seo/
```
현재 위치: workspace/src/ (crawler, gui-server.js 등)
목표 위치: workspace/2-projects/naver-place-seo/src/

이유: 루트에 프로젝트 코드 배치는 부적절
```

#### 📁 docs/ → 0-workspace/docs/
```
현재 위치: workspace/docs/ (WORKSPACE_AUDIT.md 등)
목표 위치: workspace/0-workspace/docs/

이유: 워크스페이스 전역 문서는 0-workspace에 집중
```

#### 📁 data/ → 각 프로젝트로 분산
```
현재: workspace/data/ (어느 프로젝트 것인지 불명확)
목표:
  - 2-projects/place-keywords-maker-v2/data/
  - 2-projects/42ment-erp/data/
  - 또는 0-workspace/shared/data/ (공용 데이터)

이유: 프로젝트별 데이터 격리
```

#### 자동화 스크립트 (PowerShell)
```powershell
# consolidate-folders.ps1

$workspace = "C:\Users\Nk Ko\Documents\workspace"

# 1. specs 통합
Write-Host "📁 specs 폴더 통합 중..." -ForegroundColor Cyan
if (Test-Path "$workspace\specs\002-42ment-erp") {
    Move-Item "$workspace\specs\002-42ment-erp" `
              "$workspace\1-planning\specs\002-42ment-erp"
    Remove-Item "$workspace\specs" -Recurse -Force
}

# 2. src 이동
Write-Host "📁 src 폴더 이동 중..." -ForegroundColor Cyan
if (Test-Path "$workspace\src") {
    New-Item -ItemType Directory -Path "$workspace\2-projects\naver-place-seo" -Force | Out-Null
    Move-Item "$workspace\src" "$workspace\2-projects\naver-place-seo\src"
}

# 3. docs 이동
Write-Host "📁 docs 폴더 통합 중..." -ForegroundColor Cyan
if (Test-Path "$workspace\docs") {
    Move-Item "$workspace\docs\*" "$workspace\0-workspace\docs\" -Force
    Remove-Item "$workspace\docs" -Recurse -Force
}

# 4. data 분산 (수동 확인 필요)
Write-Host "⚠️ data 폴더는 내용 확인 후 수동 이동 필요" -ForegroundColor Yellow

Write-Host "✅ 폴더 통합 완료!" -ForegroundColor Green
```

### 1.3 프로젝트 분류 결과

#### ✅ 유지할 활성 프로젝트
```
2-projects/
├── 42ment-erp/                    [Python] ERP 시스템
├── place-keywords-maker-v2/       [Node.js] 네이버 플레이스 SEO
└── naver-place-seo/               [Node.js] 루트 src/ 이동
```

#### 📦 아카이브로 이동
```
9-archive/
├── place-keywords-maker-v1/       참고용
├── place-crawler-v1/              참고용
└── docscode/                      과거 문서
```

#### ❌ 완전 삭제
```
- place-keywords-maker-v2 copy/
- place-crawler/ (빈 껍데기)
- naver_seo_autom_0.5_by_codex/ (조사 후)
```

---

## 2. 표준 폴더 구조 및 리팩토링 계획

### 2.1 최종 워크스페이스 구조

```
workspace/
│
├── 0-workspace/              # 공통 리소스 & 설정
│   ├── shared/
│   │   ├── templates/       # 재사용 가능한 템플릿
│   │   ├── utils/           # 공통 유틸리티
│   │   └── data/            # 공용 데이터 (선택)
│   ├── docs/                # 워크스페이스 전역 문서
│   │   ├── ops/             # 운영 문서
│   │   └── guides/          # 가이드
│   └── config/              # 전역 설정
│       ├── .editorconfig
│       └── .gitignore-template
│
├── 1-planning/               # 기획 단계
│   ├── ideas/               # IdeaKit (아이디어)
│   │   ├── exploring/
│   │   ├── ready/
│   │   └── _completed/
│   ├── specs/               # SpecKit (스펙)
│   │   ├── 001-naver-place-seo/
│   │   └── 002-42ment-erp/
│   └── docs/                # 기획 관련 문서
│
├── 2-projects/               # 실행 코드 (활성)
│   ├── 42ment-erp/
│   │   ├── src/
│   │   ├── data/
│   │   ├── tests/
│   │   ├── docs/
│   │   ├── README.md
│   │   └── requirements.txt
│   │
│   ├── place-keywords-maker-v2/
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   ├── pipelines/
│   │   │   ├── utils/
│   │   │   ├── gui/
│   │   │   └── config/
│   │   ├── data/
│   │   │   ├── input/
│   │   │   └── l1-output/
│   │   ├── tests/
│   │   ├── docs/
│   │   ├── SPEC.md
│   │   ├── README.md
│   │   └── package.json
│   │
│   └── naver-place-seo/      # src/ 이동
│       ├── src/
│       ├── data/
│       ├── README.md
│       └── package.json
│
├── 9-archive/                # 과거 코드 (참고용)
│   ├── 2025-01-14-manual-backup/
│   ├── place-keywords-maker-v1/
│   └── docscode/
│
├── .claude/                  # Claude 설정
├── .specify/                 # SpecKit 설정
├── .gitignore
└── README.md                 # 워크스페이스 메인 README
```

### 2.2 프로젝트별 표준 구조

#### Node.js 프로젝트 템플릿
```
project-name/
├── src/
│   ├── modules/          # 핵심 비즈니스 로직
│   ├── utils/            # 유틸리티
│   ├── config/           # 설정
│   └── index.js          # 진입점
├── public/               # 정적 파일 (웹)
├── data/
│   ├── input/
│   └── output/
├── tests/
│   ├── unit/
│   └── integration/
├── docs/                 # 프로젝트 문서
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── SPEC.md              # 상세 스펙 (선택)
```

#### Python 프로젝트 템플릿
```
project-name/
├── src/
│   ├── modules/
│   ├── utils/
│   ├── config/
│   └── main.py
├── data/
│   ├── input/
│   └── output/
├── tests/
├── docs/
├── .env.example
├── .gitignore
├── requirements.txt
├── README.md
└── SPEC.md
```

### 2.3 리팩토링 단계별 계획

#### Phase 1: 구조 정리 (1일)
```
1. ✅ 중복 파일/폴더 삭제
2. ✅ 폴더 통합 (specs, src, docs, data)
3. ✅ 아카이브 최적화 (node_modules 제거)
```

#### Phase 2: 표준화 적용 (1일)
```
1. 각 프로젝트에 표준 구조 적용
2. README.md 업데이트
3. .gitignore 표준화
4. package.json/requirements.txt 정리
```

#### Phase 3: 문서화 (1일)
```
1. 통합 README 작성
2. 각 프로젝트 SPEC.md 정리
3. 운영 가이드 작성
```

#### Phase 4: Git 정리 (1일)
```
1. 불필요한 staged 파일 처리
2. 브랜치 전략 수립
3. 커밋 히스토리 정리
4. main 브랜치로 머지
```

---

## 3. Git 버전 관리 재정리 가이드

### 3.1 현재 Git 상태 분석

```
브랜치:
* 002-42ment-erp  (현재)
  dev
  main

문제점:
- main 브랜치가 비어있거나 오래됨
- 기능 브랜치(002-42ment-erp)에서 작업 중
- 대규모 삭제(AD) 파일들이 staged 상태
```

### 3.2 Git 재정리 단계별 가이드

#### Step 1: 현재 작업 커밋 (정리 전 스냅샷)

```bash
# 1. 현재 staged 상태 확인
git status

# 2. 워크스페이스 정리 전 커밋
git add -A
git commit -m "chore: pre-consolidation snapshot

- 워크스페이스 정리 전 상태 저장
- 중복 프로젝트 및 불필요 파일 포함
- 다음 커밋에서 대규모 정리 예정
"

# 3. 백업 브랜치 생성
git branch backup-before-consolidation
```

#### Step 2: 워크스페이스 정리 (스크립트 실행)

```bash
# 1. 정리 스크립트 실행
powershell -ExecutionPolicy Bypass -File cleanup-duplicates.ps1
powershell -ExecutionPolicy Bypass -File consolidate-folders.ps1

# 2. 변경사항 확인
git status

# 3. 정리 커밋
git add -A
git commit -m "chore: workspace consolidation

✅ 삭제:
- place-keywords-maker-v2 copy (중복)
- place-crawler (빈 껍데기)
- 임시 파일 (TEST_ADD.txt, NUL 등)
- 아카이브 node_modules (~215MB 절감)

🔄 통합:
- specs/002-42ment-erp → 1-planning/specs/
- src/ → 2-projects/naver-place-seo/src/
- docs/ → 0-workspace/docs/

📁 최종 구조:
- 활성 프로젝트: 3개
- 표준 폴더 구조 적용
- 문서 중복 제거
"
```

#### Step 3: 브랜치 전략 수립 및 적용

**권장 브랜치 전략: Git Flow 간소화 버전**

```
main              (안정 배포)
  ├── dev         (개발 통합)
  │   ├── feature/xxx
  │   └── fix/xxx
  └── hotfix/xxx  (긴급 수정)
```

**적용 스크립트:**

```bash
# 1. main 브랜치 업데이트
git checkout main
git merge 002-42ment-erp --no-ff -m "merge: workspace consolidation from 002-42ment-erp"

# 2. dev 브랜치 업데이트
git checkout dev
git merge main --ff

# 3. 기능 브랜치 정리
git branch -d 002-42ment-erp  # 머지 완료 후

# 4. 브랜치 확인
git branch -a
```

#### Step 4: .gitignore 표준화

**통합 .gitignore (루트)**

```gitignore
# OS
.DS_Store
Thumbs.db
desktop.ini

# 임시 파일
*.tmp
*.temp
*.swp
*~
TEST_*.txt
NUL

# IDE
.vscode/
.idea/
*.suo
*.user

# 의존성
node_modules/
venv/
.venv/
__pycache__/

# 환경 변수
.env
.env.local
*.local.yml

# 빌드 결과
dist/
build/
*.pyc
*.pyo

# 데이터
data/input/*
!data/input/.gitkeep
data/output/*
!data/output/.gitkeep
data/cache/
data/logs/

# 로그
logs/
*.log

# 백업/임시
*.bak
*.backup
*copy/
* copy/
$root/

# 프로젝트 특화
.coverage
.pytest_cache/
jest-coverage/
```

#### Step 5: 커밋 메시지 규칙

**Conventional Commits 채택**

```
형식: <타입>(<범위>): <제목>

<본문>

<푸터>
```

**타입:**
- `feat`: 새 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅 (기능 변경 없음)
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드, 설정 등

**예시:**

```bash
# 좋은 예
git commit -m "feat(place-keywords): add Apollo State parser

- V1의 Apollo State 완전 파싱 로직 통합
- 블로그 리뷰 전문 수집 지원
- 이미지 자동 분류 기능 추가

Closes #42
"

# 나쁜 예
git commit -m "update"
git commit -m "fix bug"
```

#### Step 6: Git 히스토리 정리 (선택사항)

**⚠️ 주의: 공유 브랜치에서는 절대 하지 말 것!**

```bash
# 1. 최근 N개 커밋을 하나로 합치기
git rebase -i HEAD~5

# 2. 에디터에서 pick을 squash로 변경
# pick abc123 commit 1
# squash def456 commit 2
# squash ghi789 commit 3

# 3. 강제 푸시 (로컬 전용!)
git push origin branch-name --force
```

### 3.3 Git 운영 규칙

#### 브랜치 생성 규칙

```bash
# 기능 개발
git checkout -b feature/키워드-분류-모듈 dev

# 버그 수정
git checkout -b fix/gui-sse-연결-오류 dev

# 긴급 수정
git checkout -b hotfix/data-손실-방지 main
```

#### PR/MR 규칙

1. **제목**: `[타입] 간단 설명`
2. **본문**:
   - 변경 사항
   - 이유
   - 테스트 방법
3. **체크리스트**:
   - [ ] 테스트 통과
   - [ ] 문서 업데이트
   - [ ] 코드 리뷰 완료

#### 머지 규칙

```bash
# feature → dev: squash merge
git checkout dev
git merge --squash feature/xxx
git commit -m "feat: xxx"

# dev → main: merge commit (히스토리 보존)
git checkout main
git merge dev --no-ff
```

---

## 4. 통합 문서 생성 계획

### 4.1 통합 README.md (워크스페이스 루트)

**목표**: 워크스페이스 전체 개요 제공

```markdown
# 워크스페이스 개요

> 네이버 플레이스 SEO 자동화 및 42ment ERP 통합 개발 환경

## 🎯 워크스페이스 구조

이 워크스페이스는 **IdeaKit + SpecKit** 기반으로 설계되었습니다.

### 폴더 구조
```
0-workspace/    공통 리소스 & 설정
1-planning/     아이디어 → 스펙 전환
2-projects/     활성 프로젝트 (실행 코드)
9-archive/      과거 프로젝트 (참고용)
```

## 📦 활성 프로젝트

| 프로젝트 | 언어 | 설명 | 문서 |
|---------|------|------|------|
| **place-keywords-maker-v2** | Node.js | 네이버 플레이스 SEO 자동화 | [README](2-projects/place-keywords-maker-v2/README.md) |
| **42ment-erp** | Python | ERP 시스템 | [README](2-projects/42ment-erp/README.md) |
| **naver-place-seo** | Node.js | 플레이스 크롤러 | [README](2-projects/naver-place-seo/README.md) |

## 🚀 빠른 시작

### 1. Place Keywords Maker V2
```bash
cd 2-projects/place-keywords-maker-v2
npm install
npm run gui
```

### 2. 42ment ERP
```bash
cd 2-projects/42ment-erp
pip install -r requirements.txt
python src/main.py
```

## 📚 문서

- [워크스페이스 정리 계획](docs/ops/WORKSPACE_CONSOLIDATION_PLAN.md)
- [변경 이력](docs/ops/WORKSPACE_CHANGES.md)
- [유지보수 규칙](#5-유지보수-규칙-테이블)

## 🔧 개발 워크플로우

1. **아이디어 단계**: `1-planning/ideas/exploring/`
2. **스펙 작성**: `/speckit.specify`
3. **개발**: `2-projects/`에 프로젝트 생성
4. **완료**: 문서화 후 `1-planning/ideas/_completed/`

## 📖 추가 자료

- [Git 운영 규칙](#3-git-버전-관리-재정리-가이드)
- [프로젝트 표준 구조](#2-표준-폴더-구조-및-리팩토링-계획)
```

### 4.2 프로젝트별 README 통합

#### place-keywords-maker-v2/README.md (강화 버전)

**추가할 섹션:**

```markdown
## 📊 V1 vs V2 비교

| 항목 | V1 | V2 |
|------|----|----|
| GUI | 4탭 (monolithic) | 4탭 (modular) ✅ |
| 데이터 수집 | Apollo State ✅ | 통합 중 🔨 |
| 코드 구조 | Monolithic | Modular ✅ |
| 테스트 | 없음 | Jest 70% ✅ |

## 🗂️ 관련 문서

- [상세 스펙](SPEC.md)
- [V1 참고 코드](../../9-archive/place-keywords-maker-v1/)
- [변경 이력](../../docs/ops/WORKSPACE_CHANGES.md)

## 🔗 관련 프로젝트

- [naver-place-seo](../naver-place-seo/) - 크롤러 라이브러리
```

### 4.3 통합 운영 매뉴얼

**위치**: `0-workspace/docs/guides/OPERATIONS.md`

```markdown
# 운영 매뉴얼

## 새 프로젝트 시작하기

1. IdeaKit으로 아이디어 탐색
2. SpecKit으로 스펙 작성
3. 프로젝트 생성:
   ```bash
   cd 2-projects
   mkdir my-new-project
   cd my-new-project
   # 템플릿 복사
   cp -r ../../0-workspace/shared/templates/node-project/* .
   ```
4. Git 초기화:
   ```bash
   git checkout -b feature/my-new-project dev
   ```

## 프로젝트 아카이브하기

1. 프로젝트 정리:
   ```bash
   npm run clean  # 또는 make clean
   rm -rf node_modules
   ```
2. 아카이브로 이동:
   ```bash
   mv 2-projects/old-project 9-archive/$(date +%Y-%m-%d)-old-project
   ```
3. Git 커밋:
   ```bash
   git add -A
   git commit -m "chore: archive old-project"
   ```

## 정기 유지보수

### 주간
- [ ] 의존성 업데이트 확인
- [ ] 불필요한 로그 파일 삭제
- [ ] 브랜치 정리

### 월간
- [ ] 아카이브 node_modules 정리
- [ ] 문서 업데이트
- [ ] 백업 확인
```

### 4.4 통합 규칙 문서

**위치**: `0-workspace/docs/STANDARDS.md`

```markdown
# 개발 표준 및 규칙

## 코드 스타일

### JavaScript/Node.js
- ESLint: Airbnb 스타일 가이드
- Prettier: 2 spaces, single quotes
- JSDoc: 모든 public 함수

### Python
- PEP 8 준수
- Black formatter
- Type hints 사용

## 네이밍 규칙

### 파일명
- kebab-case: `user-service.js`
- PascalCase (클래스): `UserService.js`
- lowercase (폴더): `user-service/`

### 변수명
- camelCase: `userName`, `isValid`
- UPPER_SNAKE_CASE (상수): `MAX_RETRY`, `API_URL`

### 함수명
- 동사로 시작: `getUser()`, `createOrder()`, `validateInput()`

## 프로젝트 구조

모든 프로젝트는 다음 구조를 따릅니다:

```
project/
├── src/         # 소스 코드
├── tests/       # 테스트
├── docs/        # 문서
├── data/        # 데이터
├── README.md    # 프로젝트 소개
└── SPEC.md      # 상세 스펙 (선택)
```

## 테스트 규칙

- 모든 public 함수는 테스트 필수
- 커버리지 목표: 70% 이상
- 테스트 파일명: `*.test.js` or `test_*.py`

## 문서화 규칙

### README.md 필수 섹션
1. 프로젝트 소개
2. 설치 방법
3. 사용법
4. 개발 가이드
5. 라이선스

### SPEC.md (선택)
- 상세 기능 명세
- API 문서
- 데이터 스키마
```

---

## 5. 유지보수 규칙 테이블

### 5.1 프로젝트 관리 규칙

| 항목 | 규칙 | 주기 | 담당 |
|------|------|------|------|
| **의존성 업데이트** | `npm audit fix` 또는 `pip list --outdated` | 주간 | 개발자 |
| **보안 취약점** | `npm audit` 또는 `safety check` | 주간 | 개발자 |
| **테스트 실행** | `npm test` 또는 `pytest` | 커밋 전 | 개발자 |
| **린트 검사** | `npm run lint` 또는 `flake8` | 커밋 전 | 개발자 |
| **문서 업데이트** | 기능 변경 시 README/SPEC 수정 | 즉시 | 개발자 |

### 5.2 Git 운영 규칙

| 항목 | 규칙 | 예시 | 비고 |
|------|------|------|------|
| **브랜치명** | `<타입>/<설명>` | `feature/apollo-parser` | kebab-case |
| **커밋 메시지** | Conventional Commits | `feat(gui): add SSE log` | 타입 필수 |
| **PR 제목** | `[타입] 설명` | `[Feat] Apollo State 파싱` | 한글 가능 |
| **브랜치 수명** | 1주 이내 | - | 장기화 금지 |
| **main 보호** | 직접 커밋 금지 | dev → main만 허용 | PR 필수 |

### 5.3 문서 관리 규칙

| 문서 타입 | 위치 | 업데이트 시점 | 형식 |
|----------|------|--------------|------|
| **워크스페이스 README** | `/README.md` | 프로젝트 추가/삭제 시 | Markdown |
| **프로젝트 README** | `2-projects/*/README.md` | 기능 변경 시 | Markdown |
| **상세 스펙** | `2-projects/*/SPEC.md` | 아키텍처 변경 시 | Markdown |
| **운영 가이드** | `0-workspace/docs/guides/` | 프로세스 변경 시 | Markdown |
| **변경 이력** | `docs/ops/WORKSPACE_CHANGES.md` | 주요 변경 시 | Markdown |

### 5.4 폴더 정리 규칙

| 폴더 | 정리 주기 | 대상 | 방법 |
|------|----------|------|------|
| **node_modules/** | 월간 | 미사용 프로젝트 | `rm -rf node_modules && npm install` |
| **data/logs/** | 주간 | 30일 이상 로그 | `find . -name "*.log" -mtime +30 -delete` |
| **data/cache/** | 주간 | 전체 | `rm -rf data/cache/*` |
| **9-archive/** | 분기 | node_modules | `find 9-archive -name "node_modules" -exec rm -rf {} +` |
| **임시 파일** | 즉시 | `*.tmp`, `*.bak` | `.gitignore`에 추가 |

### 5.5 백업 규칙

| 항목 | 주기 | 방법 | 보관 기간 |
|------|------|------|----------|
| **전체 워크스페이스** | 월간 | Git remote + 외부 저장소 | 1년 |
| **프로젝트 데이터** | 주간 | `data/` 폴더 압축 | 3개월 |
| **데이터베이스** | 일간 | 덤프 파일 생성 | 1개월 |
| **환경 변수** | 변경 시 | `.env.example` 업데이트 | 영구 |

### 5.6 코드 리뷰 규칙

| 항목 | 규칙 | 체크리스트 |
|------|------|-----------|
| **리뷰어 수** | 최소 1명 | - |
| **리뷰 시간** | 24시간 이내 | - |
| **필수 확인** | ✅ 테스트 통과<br>✅ 린트 통과<br>✅ 문서 업데이트<br>✅ Breaking change 명시 | - |
| **승인 조건** | 모든 체크리스트 통과 | - |

### 5.7 이슈 관리 규칙

| 이슈 타입 | 라벨 | 우선순위 | 처리 시간 |
|----------|------|----------|----------|
| **버그 (Critical)** | `bug`, `critical` | P0 | 24시간 |
| **버그 (Normal)** | `bug` | P1 | 1주 |
| **기능 요청** | `enhancement` | P2 | 2주 |
| **문서 개선** | `documentation` | P3 | 1개월 |
| **질문** | `question` | - | 즉시 응답 |

### 5.8 릴리즈 규칙

| 버전 타입 | 조건 | 예시 | 비고 |
|----------|------|------|------|
| **Major (X.0.0)** | Breaking change | 1.0.0 → 2.0.0 | 문서 필수 |
| **Minor (0.X.0)** | 새 기능 | 1.1.0 → 1.2.0 | 호환성 유지 |
| **Patch (0.0.X)** | 버그 수정 | 1.1.1 → 1.1.2 | 빠른 배포 |

---

## 6. 실행 체크리스트

### Phase 1: 즉시 실행 (30분)

- [ ] 백업 브랜치 생성: `git branch backup-before-consolidation`
- [ ] `cleanup-duplicates.ps1` 실행
- [ ] Git 커밋: `pre-consolidation snapshot`

### Phase 2: 폴더 정리 (1시간)

- [ ] `consolidate-folders.ps1` 실행
- [ ] specs/ 통합 확인
- [ ] src/ 이동 확인
- [ ] docs/ 통합 확인
- [ ] Git 커밋: `workspace consolidation`

### Phase 3: 문서 작성 (2시간)

- [ ] 통합 README.md 작성
- [ ] 프로젝트별 README 업데이트
- [ ] STANDARDS.md 작성
- [ ] OPERATIONS.md 작성
- [ ] Git 커밋: `docs: consolidate workspace documentation`

### Phase 4: Git 정리 (1시간)

- [ ] .gitignore 업데이트
- [ ] main 브랜치로 머지
- [ ] dev 브랜치 업데이트
- [ ] 기능 브랜치 삭제
- [ ] Git 커밋: `chore: finalize git structure`

### Phase 5: 검증 (30분)

- [ ] 모든 프로젝트 실행 테스트
- [ ] 문서 링크 확인
- [ ] Git 히스토리 확인
- [ ] 디스크 용량 확인 (~215MB 절감)

---

## 7. 자동화 스크립트 모음

### 전체 실행 스크립트 (all-in-one.ps1)

```powershell
# all-in-one.ps1
# 워크스페이스 통합 전체 자동화 스크립트

param(
    [switch]$DryRun = $false
)

$workspace = "C:\Users\Nk Ko\Documents\workspace"
$timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$logFile = "$workspace\consolidation-$timestamp.log"

function Write-Log {
    param($Message, $Color = "White")
    $logMessage = "$(Get-Date -Format 'HH:mm:ss') $Message"
    Write-Host $logMessage -ForegroundColor $Color
    Add-Content -Path $logFile -Value $logMessage
}

Write-Log "🚀 워크스페이스 통합 시작" "Cyan"

# Phase 1: 백업
Write-Log "📦 Phase 1: Git 백업 생성" "Yellow"
if (-not $DryRun) {
    git branch "backup-$timestamp"
    Write-Log "   ✅ 백업 브랜치 생성: backup-$timestamp" "Green"
}

# Phase 2: 삭제
Write-Log "🗑️ Phase 2: 중복 파일 삭제" "Yellow"
$deleteTargets = @(
    "TEST_ADD.txt",
    "NUL",
    "README_CONSOLIDATED.md",
    "`$root"
)
foreach ($target in $deleteTargets) {
    $path = Join-Path $workspace $target
    if (Test-Path $path) {
        if (-not $DryRun) {
            Remove-Item $path -Recurse -Force
        }
        Write-Log "   ✅ 삭제: $target" "Green"
    }
}

# Phase 3: 통합
Write-Log "🔄 Phase 3: 폴더 통합" "Yellow"
# specs
if (Test-Path "$workspace\specs") {
    if (-not $DryRun) {
        Move-Item "$workspace\specs\*" "$workspace\1-planning\specs\" -Force
        Remove-Item "$workspace\specs" -Recurse -Force
    }
    Write-Log "   ✅ specs 통합 완료" "Green"
}

# Phase 4: Git 커밋
Write-Log "📝 Phase 4: Git 커밋" "Yellow"
if (-not $DryRun) {
    git add -A
    git commit -m "chore: workspace consolidation - automated cleanup

$(Get-Content $logFile -Raw)
"
}

Write-Log "✅ 워크스페이스 통합 완료!" "Green"
Write-Log "📊 로그 파일: $logFile" "Cyan"
```

---

## 8. 문의 및 지원

- **문서 위치**: `docs/ops/WORKSPACE_CONSOLIDATION_PLAN.md`
- **이슈 리포트**: GitHub Issues
- **운영 가이드**: `0-workspace/docs/guides/OPERATIONS.md`

---

_마지막 업데이트: 2025-01-14_
_작성자: Claude Code + User_
