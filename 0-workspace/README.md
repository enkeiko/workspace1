# 0-workspace: 워크스페이스 리소스

**목적**: 설정, 공통 리소스, 개발 도구 (개발 환경 최우선)

---

## 📁 폴더 구조

```
0-workspace/
├── shared/             # 공통 리소스
│   ├── configs/        # 공통 설정 템플릿
│   ├── templates/      # 코드 템플릿
│   └── utils/          # 공통 유틸리티
│
└── tools/              # 개발 도구
    └── scripts/        # 자동화 스크립트

Note: .claude/ 및 .specify/ 설정은 워크스페이스 루트에 위치
```

---

## 🔧 shared/ - 공통 리소스

### configs/
여러 프로젝트에서 공유하는 설정 파일

```bash
shared/configs/
└── local.config.example.yml    # 설정 템플릿
```

**사용법**:
```bash
# 프로젝트에서 복사
cp ../0-workspace/shared/configs/local.config.example.yml local.config.yml
```

### templates/
재사용 가능한 코드 템플릿

```bash
shared/templates/
├── node-module-template/
└── test-template/
```

### utils/
공통 유틸리티 함수

```bash
shared/utils/
├── retry.js
├── logger.js
└── validator.js
```

**사용법**:
```javascript
// 프로젝트에서 참조
const retry = require('../../0-workspace/shared/utils/retry.js');
```

---

## 🛠️ tools/ - 개발 도구

### scripts/
자동화 스크립트 모음

```bash
tools/scripts/
├── new-project.ps1         # 새 프로젝트 생성
├── sync-configs.ps1        # 설정 동기화
└── clean-workspace.ps1     # 정리
```

**실행**:
```bash
# Windows
powershell -ExecutionPolicy Bypass -File 0-workspace/tools/scripts/new-project.ps1

# Linux/Mac
./0-workspace/tools/scripts/new-project.sh
```

---

## ⚙️ 워크스페이스 설정 (루트)

### .claude/
Claude Code 슬래시 커맨드 및 설정 (워크스페이스 루트)

```bash
.claude/
├── commands/
│   ├── speckit.specify.md
│   ├── speckit.plan.md
│   └── ...
└── settings.local.json
```

### .specify/
SpecKit 템플릿 및 스크립트 (워크스페이스 루트)

```bash
.specify/
├── templates/
│   ├── spec-template.md
│   └── plan-template.md
├── scripts/
└── memory/
```

---

## 📖 사용 가이드

### 1. 공통 설정 사용
```bash
# 프로젝트에서
cd 2-projects/my-project
cp ../0-workspace/shared/configs/local.config.example.yml local.config.yml
# 설정 수정
```

### 2. 공통 유틸 사용
```javascript
// my-project/src/index.js
const { exponentialBackoff } = require('../../0-workspace/shared/utils/retry.js');

await exponentialBackoff(async () => {
  // 재시도 로직
}, 3);
```

### 3. 스크립트 실행
```bash
# 새 프로젝트 생성
cd 0-workspace/tools/scripts
powershell ./new-project.ps1 -ProjectName "my-new-project"
```

---

## 🔗 관련 폴더

- 기획 문서: `../1-planning/`
- 프로젝트: `../2-projects/`
- 아카이브: `../9-archive/`

---

## 📝 참고

### 공통 리소스 추가 시
```bash
# 1. shared/ 아래 추가
0-workspace/shared/utils/new-util.js

# 2. 프로젝트에서 참조
const newUtil = require('../../0-workspace/shared/utils/new-util.js');
```

### 도구 추가 시
```bash
# 1. tools/scripts/ 아래 추가
0-workspace/tools/scripts/new-tool.ps1

# 2. 실행 권한 부여 (Linux/Mac)
chmod +x 0-workspace/tools/scripts/new-tool.sh
```

---

**Last Updated**: 2025-11-11
