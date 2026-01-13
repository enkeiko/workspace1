# 42ment ERP 프로젝트 컨텍스트 요약

> **최종 업데이트:** 2026-01-12
> **용도:** 다른 AI 채팅에서 이어서 작업할 때 참고

---

## 0. 작업 규칙 (필독)

### 파일 경로 표기
- **항상 전체 경로(full path)** 사용
- ❌ `FIX_REQUEST_001.md`
- ✅ `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\progress\FIX_REQUEST_001.md`

### 문서 저장 위치
- **진행사항 문서** (QA 보고서, 수정 지시서 등): `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\progress\`
- **소스코드 폴더에 문서 섞지 않기**

### 워크플로우
```
Claude Code (구현) → QA팀장 (검수) → FIX_REQUEST_00X.md 작성 → Claude Code (수정)
```

### 언어
- **한국어** 사용

---

## 1. 프로젝트 개요

**42ment** 광고대행사의 **네이버 플레이스 마케팅 발주 관리 시스템** ERP

### 핵심 비즈니스
- 네이버 플레이스에 등록된 매장(광고주)들의 리뷰/저장/길찾기/유입 마케팅 대행
- 여러 채널(피닉스, 말차, 히든 등)에 발주
- Google Sheets로 발주서 전송

---

## 2. 프로젝트 구조

```
C:\Users\enkei\workspace\1-active-project\42Menterp_2026\
├── app\                    ← 🔴 현재 개발 중인 Next.js 프로젝트
│   ├── src\
│   │   ├── app\           # App Router 페이지
│   │   ├── components\    # UI 컴포넌트 (shadcn/ui)
│   │   ├── lib\           # 유틸리티
│   │   └── types\         # 타입 정의
│   └── prisma\
│       └── schema.prisma  # DB 스키마
│
├── marketing-agency-erp\   ← 기존 프로젝트 (참고용)
├── 42ment-erp\             ← Python 버전 (참고용)
├── docs\                   
│   ├── progress\          ← 🔴 진행사항 문서
│   │   ├── QA_REPORT_001.md
│   │   ├── FIX_REQUEST_001.md
│   │   └── CONTEXT_SUMMARY.md
│   └── (기타 PRD 문서들)
└── PRD_42ment_ERP_v3.0.md  ← 🔴 최신 PRD (1,420줄)
```

---

## 3. 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend/Backend | Next.js 14+ (App Router) |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma |
| Auth | NextAuth.js |
| UI | shadcn/ui + Tailwind CSS |
| 외부 연동 | Google Sheets API |

---

## 4. 현재 구현 상태

### 완료된 것
- [x] Prisma 스키마 정의 (User, Store, Channel, Order 등)
- [x] 기본 페이지 구조 (dashboard, stores, orders, channels)
- [x] shadcn/ui 컴포넌트 설정
- [x] NextAuth 기본 설정

### 미완료 / 문제점
- [ ] 루트 페이지가 Next.js 기본 템플릿 상태 (Critical)
- [ ] 인증 미들웨어 없음 (Critical)
- [ ] API 응답 형식 불일치 (Minor)

---

## 5. 핵심 데이터 모델

```prisma
User       - 사용자 (SUPER_ADMIN, ADMIN, OPERATOR, VIEWER)
Store      - 매장 (mid, placeUrl, businessNo 등)
Channel    - 발주 채널 (피닉스, 말차, 히든 등)
ChannelSheet - 채널별 Google Sheets 설정
Order      - 발주 헤더
OrderItem  - 발주 상세 (매장별 키워드, 수량, 기간)
OrderExport - 발주서 출력 이력
StoreKeyword - 매장별 키워드
```

---

## 6. 작업 지시 방식

### 워크플로우
```
Claude Code (구현) → QA팀장 (검수) → FIX_REQUEST_00X.md → Claude Code (수정)
```

### Claude Code에 전달할 지시
```
C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\progress\FIX_REQUEST_001.md 파일을 읽고 
모든 수정 사항을 순서대로 구현해줘.
완료 후 각 항목에 체크하고, 마지막에 완료 보고 형식으로 알려줘.
```

---

## 7. 현재 대기 중인 작업

**파일:** `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\progress\FIX_REQUEST_001.md`

1. **[Critical]** 루트 페이지 리다이렉트 구현
2. **[Critical]** 인증 미들웨어 추가 (middleware.ts)
3. **[Major]** authOptions 파일 생성
4. **[Major]** prisma client 확인
5. **[Minor]** channels API 응답 형식 통일
6. **[Minor]** 대시보드 통계 API 호출 수정

---

## 8. 확정된 비즈니스 요구사항

| 항목 | 내용 |
|------|------|
| 고객:매장 | 1:N (한 고객이 여러 매장) |
| 주문:발주 | 1:N (한 주문에 여러 거래처 발주) |
| 비용 관리 | 기본단가 + 건별 수정 가능 |
| 발주 수량 | 주문과 다를 수 있음 (서비스/조정) |
| 부가세 | 기본 별도(10%) + 면세 옵션 |
| 입금 관리 | 과세(수동+엑셀+API), 면세(수동만) |
| 견적서 | PDF 저장 + 이미지로 발송 |
| 세금계산서 | 홈택스 엑셀 일괄 발급 |
| 연장 알림 | D-1, D-3 텔레그램 알림 |
| 발주서 출력 | Google Sheets 연동 |

---

## 9. 주요 문서 위치

| 문서 | 경로 |
|------|------|
| PRD v3.0 (최신) | `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\PRD_42ment_ERP_v3.0.md` |
| PRD v2.0 | `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\PRD_42Ment_ERP_MVP_v2.md` |
| QA 보고서 | `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\progress\QA_REPORT_001.md` |
| 수정 지시서 | `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\progress\FIX_REQUEST_001.md` |
| 컨텍스트 요약 | `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\progress\CONTEXT_SUMMARY.md` |

---

## 10. 다음 단계

1. **즉시:** FIX_REQUEST_001.md 수정 사항 구현
2. **이후:** 
   - Store CRUD 완성
   - Order 생성 플로우
   - Google Sheets 발주서 출력
   - 인증/권한 테스트

---

## 11. 중요 참고사항

- **기존 프로젝트** `marketing-agency-erp`는 별도 프로젝트임 (혼동 주의)
- **PRD v3.0**이 최신 기획서 (v2.0은 참고용)
- **QA 검수 후 수정 지시** 방식으로 진행
- **한국어** 사용
- **파일 경로는 항상 전체 경로로 표기**

---

**이 문서를 새 채팅에서 먼저 읽고 작업을 이어가세요.**

