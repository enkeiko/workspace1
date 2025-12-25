# 🔍 LikeReward 사이트 역공학 분석 문서

> 분석 대상: https://www.likereward.co.kr/admin  
> 분석 일자: 2025년 12월 10일  
> 분석자: 20년차 역공학 엔지니어

---

## 📋 목차

1. [개요](#개요)
2. [기술 스택 분석](#기술-스택-분석)
3. [라우팅 구조](#라우팅-구조)
4. [페이지별 상세 분석](#페이지별-상세-분석)
5. [UI/UX 디자인 시스템](#uiux-디자인-시스템)
6. [API 구조](#api-구조)
7. [클론 개발 가이드](#클론-개발-가이드)

---

## 📌 개요

### 사이트 정보
| 항목 | 값 |
|------|-----|
| **사이트명** | LIKE (LikeReward) |
| **URL** | https://www.likereward.co.kr/admin |
| **용도** | 리워드 마케팅 관리 플랫폼 |
| **접근 제어** | 로그인 필수 |
| **사용자 유형** | 대행사, 광고주 |

### 핵심 기능
- 공지사항 관리
- 유저(회원) 관리
- 마케팅 미션 관리
- 포인트 내역 관리

### 지원 마케팅 유형
| 유형 | 설명 |
|------|------|
| 네이버쇼핑 | 네이버 쇼핑 트래픽 |
| 네이버플레이스 | 네이버 플레이스 순위 |
| 일반미션 | 일반 미션형 마케팅 |
| 오늘의집 | 오늘의집 플랫폼 |
| 네비게이션 | 네비게이션 앱 마케팅 |
| 카카오맵 | 카카오맵 순위 |
| 블로그배포 | 블로그 포스팅 배포 |
| 최적블로그 | 최적화된 블로그 마케팅 |

---

## 🛠 기술 스택 분석

### Frontend
| 기술 | 버전/세부사항 |
|------|-------------|
| **jQuery** | 3.6.0 |
| **jQuery UI** | 1.13.2 |
| **폰트** | Noto Sans KR (Google Fonts) |
| **스타일** | 커스텀 CSS |

### Backend
| 기술 | 추정 근거 |
|------|----------|
| **서버** | PHP/ASP (`.apsl` 확장자) |
| **인증** | 세션 기반 |

### 리소스 경로
```
/Form/_adm/css/jquery-ui.css
/Form/_adm/css/login.css
/Form/_adm/js/easing.js
/Form/_adm/js/common.js
/Form/_adm/images/logInLogo.png
/Conn/js/jquery.form.js
/Conn/js/global.func.js
```

---

## 🗂 라우팅 구조

```
https://www.likereward.co.kr/admin/
├── /login.apsl                 # 로그인 페이지
├── /notice.apsl                # 공지사항
├── /newmember.apsl             # 유저리스트 (사용자관리)
├── /marketing_list.apsl        # 마케팅 리스트
└── /point.apsl (추정)          # 포인트 내역
```

### URL 파라미터 패턴
```
?MCODE=020100&MNAME=newmember&BCODE=
?MCODE=020200&MNAME=marketing_list&BCODE=
```

---

## 📄 페이지별 상세 분석

### 1. 로그인 페이지 (`/login.apsl`)

**UI 구성:**
- 브랜드: "LIKE" (노란색/금색)
- 심플한 카드형 로그인 폼
- 필드:
  - ID (text)
  - Password (password)
- 로그인 버튼 (노란색)

**디자인 특징:**
- 흰색 배경
- 노란색 테두리 카드
- 중앙 정렬

---

### 2. 공지사항 페이지 (`/notice.apsl`)

**UI 구성:**
| 영역 | 구성요소 |
|------|---------|
| 테이블 | 번호, 제목, 조회수, 등록일 |
| 페이지네이션 | 이전, 페이지번호, 다음 |

**테이블 컬럼:**
- 번호
- 제목 (링크)
- 조회수 (예: 254회)
- 등록일 (예: 2024-09-13 16:54:02)

---

### 3. 유저리스트 페이지 (`/newmember.apsl`)

**필터 시스템:**
| 필터 | 옵션 |
|------|------|
| 검색 필터 | 전체, 등록인, 소속, 이름, 아이디 |
| 페이지당 | 10건, 50건, 100건, 500건 |
| 유형 필터 | 전체, 광고주 |

**기능:**
- 검색
- 전체보기
- 신규 등록
- 페이지네이션

---

### 4. 마케팅 리스트 페이지 (`/marketing_list.apsl`)

**필터 시스템:**

| 필터 | 옵션 |
|------|------|
| **마케팅 유형** | 네이버 쇼핑, 네이버 플레이스, 일반미션, 오늘의집, 네비게이션, 카카오맵, 블로그배포, 최적블로그 |
| **검색 필터** | 등록인, 소속, 대행사, 광고주, 상품명, 상품링크, 원부MID, 단품MID, 메모 |
| **페이지당** | 10건, 50건, 100건, 500건 |
| **상태 필터** | 전체, 대기, 진행, 수정, 불가, 종료 |

**테이블 컬럼:**
| 컬럼 | 설명 |
|------|------|
| 체크박스 | 일괄 선택 |
| 등록인 | 등록자 |
| 소속 | 소속 정보 |
| 등록일 | 등록 일시 |
| 최종수정일 | 마지막 수정 일시 |
| 미션상태 | 대기/진행/수정/불가/종료 |
| 대행사 | 대행사 정보 |
| 광고주 | 광고주 정보 |
| 상품링크 | 상품 URL |
| 상품명 | 상품 이름 |
| 원부MID | 원부 MID |
| 단품MID | 단품 MID |
| 메인키워드 | 주요 키워드 |
| 40위 이내 키워드 | 40위권 키워드 |
| 일유입 | 일일 유입량 |
| 실행일 수 | 총 실행 일수 |
| 시작일 | 미션 시작일 |
| 종료일 | 미션 종료일 |
| 메모 | 메모 |
| 관리 | 수정/삭제 등 |

**버튼:**
- 엑셀등록
- 엑셀 다운로드
- 신규등록

---

### 5. 포인트 내역 페이지 (`/point.apsl` 추정)

- 포인트 충전/사용 내역 관리

---

## 🎨 UI/UX 디자인 시스템

### 레이아웃 구조

```
┌──────────────────────────────────────────────────────────────────┐
│                         Header (Banner)                          │
│  [로고]  [공지사항] [유저리스트] [마케팅리스트] [포인트내역] [로그아웃]│
├──────────────────────────────────────────────────────────────────┤
│                      마케팅 현황 Bar                              │
│  네이버쇼핑 0 | 네이버플레이스 0 | 일반미션 0 | 오늘의집 0 | ...  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                        Main Content                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  필터 영역                                                  │  │
│  │  [유형 ▼] [검색필터 ▼] [페이지당 ▼] [검색어] [검색] [전체]  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  상태 필터                                                  │  │
│  │  [전체] [대기] [진행] [수정] [불가] [종료]                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                      데이터 테이블                          │  │
│  │  ┌───┬───────┬───────┬───────┬───────┬───────┬──────────┐  │  │
│  │  │ ☐ │등록인 │ 소속  │등록일 │ 상태  │ ... │   관리   │  │  │
│  │  ├───┼───────┼───────┼───────┼───────┼───────┼──────────┤  │  │
│  │  │   │       │       │       │       │       │          │  │  │
│  │  └───┴───────┴───────┴───────┴───────┴───────┴──────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [이전] [1] [2] [3] [다음]                                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [엑셀등록] [엑셀다운로드] [신규등록]                        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 컬러 팔레트

```css
/* Primary - 노란색/금색 */
--primary-yellow: #F5B800;
--primary-gold: #E5A800;

/* Text */
--text-dark: #333333;
--text-light: #666666;

/* Background */
--bg-white: #FFFFFF;
--bg-light: #F5F5F5;

/* Border */
--border-color: #E0E0E0;
--border-yellow: #F5B800;

/* Status */
--status-wait: #FFC107;     /* 대기 - 노란색 */
--status-progress: #28A745; /* 진행 - 녹색 */
--status-modify: #17A2B8;   /* 수정 - 청록색 */
--status-error: #DC3545;    /* 불가 - 빨간색 */
--status-complete: #6C757D; /* 종료 - 회색 */
```

### 컴포넌트 스타일

**로그인 버튼:**
```css
background-color: #F5B800;
color: white;
border: none;
border-radius: 4px;
padding: 12px 20px;
width: 100%;
```

**카드:**
```css
background: white;
border: 2px solid #F5B800;
border-radius: 8px;
padding: 30px;
```

**드롭다운:**
```css
border: 1px solid #E0E0E0;
border-radius: 4px;
padding: 8px 12px;
```

**테이블:**
```css
border-collapse: collapse;
width: 100%;

th {
  background-color: #F5F5F5;
  padding: 12px;
  border: 1px solid #E0E0E0;
}

td {
  padding: 10px;
  border: 1px solid #E0E0E0;
}
```

---

## 🌐 API 구조

### 인증 API
```
POST /admin/login.apsl
  Body: { ID, password }
  Response: Session Cookie
```

### 공지사항 API
```
GET /admin/notice.apsl
GET /admin/notice_view.apsl?no={id}
```

### 유저 API
```
GET  /admin/newmember.apsl?MCODE=020100&MNAME=newmember
POST /admin/newmember_add.apsl
PUT  /admin/newmember_edit.apsl?id={id}
DELETE /admin/newmember_delete.apsl?id={id}
```

### 마케팅 API
```
GET  /admin/marketing_list.apsl?MCODE=020200&MNAME=marketing_list
POST /admin/marketing_add.apsl
PUT  /admin/marketing_edit.apsl?id={id}
DELETE /admin/marketing_delete.apsl?id={id}
GET  /admin/marketing_excel_download.apsl
POST /admin/marketing_excel_upload.apsl
```

### 포인트 API
```
GET /admin/point.apsl
```

---

## 🚀 클론 개발 가이드

### 추천 기술 스택

```bash
# Next.js 프로젝트 생성
npx create-next-app@latest likereward-clone --typescript --tailwind --app --src-dir

# 필수 패키지
npm install zustand axios react-hook-form zod @hookform/resolvers
npm install @tanstack/react-table date-fns xlsx
npm install lucide-react
```

### 폴더 구조

```
likereward-clone/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx           # Admin 레이아웃
│   │   │   ├── notice/
│   │   │   │   └── page.tsx
│   │   │   ├── users/
│   │   │   │   └── page.tsx
│   │   │   ├── marketing/
│   │   │   │   └── page.tsx
│   │   │   └── points/
│   │   │       └── page.tsx
│   │   └── api/
│   │       └── auth/
│   │           └── route.ts
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   └── AdminLayout.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Dropdown.tsx
│   │   │   └── Pagination.tsx
│   │   └── forms/
│   │       ├── LoginForm.tsx
│   │       ├── UserForm.tsx
│   │       └── MarketingForm.tsx
│   │
│   ├── lib/
│   │   ├── api.ts
│   │   └── utils.ts
│   │
│   └── types/
│       └── index.ts
│
├── middleware.ts
└── tailwind.config.ts
```

### 개발 우선순위

1. **Phase 1: 기본 설정**
   - [ ] 프로젝트 초기화
   - [ ] 로그인 페이지
   - [ ] Admin 레이아웃 (Header + StatusBar)

2. **Phase 2: 공지사항**
   - [ ] 목록 페이지
   - [ ] 상세 보기

3. **Phase 3: 유저 관리**
   - [ ] 유저 목록
   - [ ] 필터/검색
   - [ ] CRUD 기능

4. **Phase 4: 마케팅 관리**
   - [ ] 마케팅 목록
   - [ ] 다양한 필터
   - [ ] 엑셀 업로드/다운로드
   - [ ] CRUD 기능

5. **Phase 5: 포인트 관리**
   - [ ] 포인트 내역 조회

---

## 📊 세 사이트 비교

| 항목 | RewardPop | 10k | LikeReward |
|------|-----------|-----|------------|
| **디자인** | 모던/그라데이션 | Bootstrap 스타일 | 심플/노란색 |
| **메인 컬러** | 보라색→파란색 | 청록색(Teal) | 노란색/금색 |
| **레이아웃** | 좌측 사이드바 | 좌측 사이드바 + 상단 | 상단 네비게이션 |
| **기술** | Next.js | MPA (PHP) | MPA (ASP/PHP) |
| **주요 기능** | 광고 주문 | 미션/키워드 | 리워드 마케팅 |
| **마케팅 유형** | 네이버/카카오 | 쇼핑/플레이스/블로그 | 8가지 유형 |

---

*이 문서는 역공학 분석을 통해 작성되었습니다.*
*분석 일자: 2025년 12월 10일*




