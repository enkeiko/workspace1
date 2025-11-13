# 9-archive: 과거 시스템 보관

**목적**: 현재 사용하지 않지만 참고용으로 보관

---

## 📁 보관 내용

```
9-archive/
├── docscode/           # 구 DocsCode 시스템
├── notes/              # 구 프로젝트 노트
└── src/                # 고아 파일들
```

---

## 📚 DocsCode

### 개요
**기간**: ~2025-11-10
**이유**: IdeaKit으로 대체 (단순화)

**특징**:
- AI 기반 문서 중심 개발
- 18개 폴더 구조
- IDEAS → EXPLORING → READY 워크플로우

**보관 이유**:
- 참고용 템플릿
- 워크플로우 아이디어
- 나중에 필요할 수 있는 규칙 문서

### 주요 문서
- `docscode/CLAUDE.md` - AI 통합 가이드
- `docscode/rules/@ARCHITECTURE.md` - 4계층 아키텍처
- `docscode/templates/` - 문서 템플릿

---

## 📝 Notes

### 개요
**내용**: 구 프로젝트 개요 자료

**보관 이유**:
- 초기 기획 아이디어
- 과거 의사결정 기록

---

## 💾 src/

### 개요
**내용**: 고아 파일들 (config.py 등)

**보관 이유**:
- 혹시 모를 복구용
- 마이그레이션 참고

---

## ⚠️ 주의사항

### 이 폴더의 파일들은:
- ❌ 현재 프로젝트에서 사용하지 않음
- ❌ 의존성 없음 (삭제해도 무방)
- ✅ 참고용으로만 보관
- ✅ 언제든 삭제 가능

### 삭제 고려 시점:
- 6개월 이상 참조 안 함
- 디스크 공간 필요
- 워크스페이스 정리 필요

---

## 📖 참고 방법

### DocsCode 템플릿 참고
```bash
# 템플릿 복사
cp 9-archive/docscode/templates/backlog.template.md \
   1-planning/ideas/_templates/new-template.md
```

### 과거 규칙 참고
```bash
# 규칙 문서 읽기
cat 9-archive/docscode/rules/@ARCHITECTURE.md
```

---

## 🗑️ 완전 삭제 방법

**필요 시 실행** (복구 불가능):

```bash
# Windows
Remove-Item -Recurse -Force 9-archive

# Linux/Mac
rm -rf 9-archive
```

---

## 📊 보관 이력

| 날짜 | 항목 | 이유 |
|------|------|------|
| 2025-11-11 | docscode/ | IdeaKit으로 대체 |
| 2025-11-11 | notes/ | 정리 완료 |
| 2025-11-11 | src/ | 사용하지 않음 |

---

**Last Updated**: 2025-11-11
**Status**: 보관 (참고용)
