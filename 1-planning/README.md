# 1-planning: 기획 및 설계 영역

**목적**: 코드 작성 전 모든 기획, 설계, 아이디어 구체화

📎 **전략 기반**: [42ment Guidebook v1.1](../2-projects/place-keywords-maker-v2/docs/architecture/251113_Guidebook_v1.1_full.md) - 모든 기획의 전략적 기반
📎 **문서 체계**: [전체 문서 인덱스](../DOCUMENTATION_INDEX.md) - Guidebook 중심 문서 구조

---

## 📁 폴더 구조

```
1-planning/
├── ideas/              # 💡 IdeaKit - 아이디어 구체화
│   ├── exploring/      # AI 대화 진행 중 (30-70%)
│   ├── ready/          # SpecKit 전환 준비 (70%+)
│   ├── _completed/     # 전환 완료
│   └── _templates/     # 템플릿
│
├── specs/              # 🔧 SpecKit - 스펙 문서
│   └── 001-v1-quick-start/
│       ├── spec.md
│       ├── plan.md
│       ├── tasks.md
│       └── data-model.md
│
└── docs/               # 📚 아키텍처 문서
    ├── architecture/
    ├── api/
    └── guides/
```

---

## 🎯 워크플로우

### 1단계: 아이디어 구체화 (IdeaKit)
```
불명확한 아이디어
    ↓
ideas/exploring/ 파일 생성
    ↓
AI와 Q&A 대화
    ↓
신뢰도 70% 도달
    ↓
ideas/ready/로 이동
```

### 2단계: 스펙 문서 생성 (SpecKit)
```
ideas/ready/ 완료
    ↓
/speckit.specify 실행
    ↓
specs/{번호}-{기능명}/ 생성
    ↓
spec.md → plan.md → tasks.md
```

### 3단계: 문서화
```
스펙 완료
    ↓
docs/ 아키텍처 문서 작성
    ↓
코드 작성 준비 완료
```

---

## 📖 주요 문서

### IdeaKit
- [IdeaKit 가이드](ideas/README.md)
- [아이디어 템플릿](ideas/_templates/idea-template.md)

### SpecKit
- [001-v1-quick-start 스펙](specs/001-v1-quick-start/spec.md)

### 문서
- 아키텍처 개요: `docs/architecture/overview.md`
- API 문서: `docs/api/`

---

## 🚀 빠른 시작

### 새로운 아이디어 시작
```bash
# 1. 불명확한 아이디어
사용자: "경쟁업체 분석 기능이 필요해"

# 2. AI가 ideas/exploring/ 파일 생성
AI: 1-planning/ideas/exploring/competitor-analysis.md 생성

# 3. AI와 대화로 구체화
... Q&A 진행 ...

# 4. SpecKit으로 전환
/speckit.specify "네이버 플레이스 경쟁업체 자동 분석"
```

---

**Last Updated**: 2025-11-11
