# 📁 워크스페이스 구조 설명

> **실제 코드 vs 문서의 위치 명확화**

---

## 🎯 핵심 개념

### ✅ 올바른 구조 이해

```
workspace/ (루트)
│
├── Place_Keywords_maker/      ← 실제 프로젝트 코드 (여기!)
│   ├── src/                   ← 실제 JavaScript 코드
│   ├── data/                  ← 입력/출력 데이터
│   ├── work instruction/      ← 지침서
│   └── package.json
│
├── Place_Crawler/             ← 실제 프로젝트 코드 (여기!)
│   ├── V1/                    ← 크롤러 코드
│   │   ├── ultimate-scraper.js
│   │   └── batch-scraper.js
│   └── Doc/
│
├── projects/                  ← 프로젝트 문서 (코드 아님!)
│   ├── place-keywords-maker/  ← README, 아키텍처 문서만
│   │   └── README.md          ← 프로젝트 설명 문서
│   └── place-crawler/         ← README, 크롤러 스펙 문서만
│       └── README.md          ← 프로젝트 설명 문서
│
└── (DocsCode 시스템 폴더들)
    ├── rules/
    ├── templates/
    ├── backlog/
    └── features/
```

---

## 📋 위치 비교표

| 항목 | 위치 | 설명 |
|------|------|------|
| **실제 코드** | `Place_Keywords_maker/` | 워크스페이스 루트 |
| **실제 코드** | `Place_Crawler/` | 워크스페이스 루트 |
| **프로젝트 문서** | `projects/place-keywords-maker/` | README, 아키텍처 문서 |
| **프로젝트 문서** | `projects/place-crawler/` | README, 크롤러 스펙 |

---

## 🚫 잘못된 이해 (X)

```
❌ 코드가 projects/ 안에 있다?
   projects/
   └── place-keywords-maker/
       └── src/  ← 여기에 코드 없음!
```

---

## ✅ 올바른 이해 (O)

```
✅ 코드는 워크스페이스 루트에 있다!
   workspace/
   ├── Place_Keywords_maker/  ← 실제 코드 여기!
   │   └── src/
   │
   └── projects/              ← 문서만!
       └── place-keywords-maker/
           └── README.md
```

---

## 📝 각 폴더의 역할

### 1. `Place_Keywords_maker/` (워크스페이스 루트)

**역할**: 실제 프로젝트 코드

**내용**:
```
Place_Keywords_maker/
├── src/                    ← JavaScript 코드
│   ├── l1-processor.js
│   ├── l2-processor.js
│   ├── l3-processor.js
│   └── main.js
├── data/                   ← 실제 데이터
│   ├── input/
│   └── output/
├── work instruction/       ← 지침서
│   ├── l1.md
│   ├── l2.md
│   └── l3.md
└── package.json
```

**실행 방법**:
```bash
cd Place_Keywords_maker
node src/main.js l1
```

### 2. `projects/place-keywords-maker/` (DocsCode 문서)

**역할**: 프로젝트 **설명 문서**만

**내용**:
```
projects/place-keywords-maker/
└── README.md              ← 프로젝트 설명
    ├─ 프로젝트 개요
    ├─ 아키텍처 설명
    ├─ 사용 방법
    ├─ 에러 코드
    └─ 실제 코드 위치: ../../Place_Keywords_maker/
```

**목적**:
- AI가 프로젝트를 이해하기 위한 문서
- 새 팀원이 프로젝트를 빠르게 파악
- 아키텍처 및 규칙 설명

---

## 🔗 상대 경로 이해

### projects/ 문서에서 실제 코드 참조

```markdown
# projects/place-keywords-maker/README.md

**실제 코드 위치**: ../../Place_Keywords_maker/

실행 방법:
```bash
cd ../../Place_Keywords_maker
node src/main.js l1
```
```

**경로 설명**:
- `../../` = 워크스페이스 루트로 이동
- `Place_Keywords_maker/` = 실제 프로젝트 폴더

---

## 🎯 Why? 왜 이렇게 구조화?

### 실제 코드를 루트에 두는 이유

1. **기존 프로젝트 유지**: 이미 있는 프로젝트를 그대로 사용
2. **개발 편의성**: 익숙한 경로 유지 (`cd Place_Keywords_maker`)
3. **독립 실행 가능**: DocsCode 없이도 프로젝트 독립 실행

### projects/ 폴더를 따로 두는 이유

1. **AI 학습용**: AI가 빠르게 프로젝트 개요 파악
2. **문서 집중화**: 여러 프로젝트 문서를 한 곳에 모음
3. **검색 최적화**: `projects/`에서 모든 프로젝트 문서 검색 가능

---

## 💡 실제 사용 예시

### 시나리오 1: 코드 수정

```bash
# 실제 코드 수정
cd Place_Keywords_maker
vim src/l1-processor.js
node src/main.js l1
```

### 시나리오 2: 프로젝트 이해

```bash
# 문서 읽기
cat projects/place-keywords-maker/README.md

# AI에게 질문
"Place_Keywords_maker의 L1 프로세스는 어떻게 동작해?"
→ AI가 projects/place-keywords-maker/README.md 읽고 답변
```

### 시나리오 3: 신규 기능 개발

```
1. AI에게 요청
   "Place_Keywords_maker의 L1에 완성도 평가 추가"

2. AI가 문서 읽기
   - projects/place-keywords-maker/README.md
   - Place_Keywords_maker/work instruction/l1.md

3. Backlog 생성
   backlog/ideas/l1-completeness-scoring.md

4. 코드 생성 위치
   Place_Keywords_maker/src/l1-processor.js (실제 코드)
```

---

## 📊 전체 구조 다이어그램

```
📁 C:\Users\Nk Ko\Documents\workspace\
│
├── 🔧 실제 프로젝트 코드 (여기서 개발)
│   ├── 📦 Place_Keywords_maker/
│   │   ├── src/ ← 실제 코드
│   │   └── data/
│   └── 📦 Place_Crawler/
│       └── V1/ ← 실제 코드
│
├── 📚 DocsCode 시스템 (AI 자동화)
│   ├── 🎯 CLAUDE.md
│   ├── 📋 rules/
│   ├── 📝 templates/
│   ├── 🔄 workflows/
│   ├── 📊 backlog/
│   ├── 📄 issues/
│   ├── 📖 features/
│   └── 🔍 analysis/
│
└── 📖 프로젝트 문서 (AI 학습용)
    └── projects/
        ├── place-keywords-maker/
        │   └── README.md ← 프로젝트 설명
        └── place-crawler/
            └── README.md ← 프로젝트 설명
```

---

## ✅ 체크리스트

### 실제 코드 위치 확인

```bash
# Place_Keywords_maker 코드
ls Place_Keywords_maker/src/
# 출력: l1-processor.js, l2-processor.js, ...

# Place_Crawler 코드
ls Place_Crawler/V1/
# 출력: ultimate-scraper.js, batch-scraper.js, ...
```

### 문서 위치 확인

```bash
# 프로젝트 문서
ls projects/place-keywords-maker/
# 출력: README.md

ls projects/place-crawler/
# 출력: README.md
```

---

## 🚀 신규 프로젝트 추가 시

### 올바른 방법

```bash
# 1. 워크스페이스 루트에 프로젝트 폴더 생성
mkdir New_Project

# 2. 프로젝트 코드 작성
cd New_Project
# ... 코드 작성 ...

# 3. 프로젝트 문서 생성
mkdir ../projects/new-project
cat > ../projects/new-project/README.md <<EOF
# New_Project
**실제 코드 위치**: ../../New_Project/
EOF

# 4. local.config.yml 업데이트
# projects:
#   new-project:
#     path: ~/workspace/New_Project
```

---

## 📝 요약

| 질문 | 답변 |
|------|------|
| 실제 코드는 어디? | `Place_Keywords_maker/`, `Place_Crawler/` (워크스페이스 루트) |
| 프로젝트 문서는 어디? | `projects/place-keywords-maker/`, `projects/place-crawler/` |
| 코드를 수정하려면? | `cd Place_Keywords_maker` 후 수정 |
| 프로젝트를 이해하려면? | `cat projects/place-keywords-maker/README.md` 읽기 |
| AI는 어디를 참조? | 1) CLAUDE.md → 2) projects/ → 3) 실제 코드 |

---

**핵심**: 실제 코드는 루트에, 문서는 `projects/`에! 🎯
