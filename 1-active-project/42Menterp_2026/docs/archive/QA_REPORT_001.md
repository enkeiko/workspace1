# QA 보고서 #001 - 초기 검수

> **검수일:** 2026-01-12  
> **검수자:** QA/개발팀장  
> **대상:** 42ment ERP v3.0 (`C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app`)

---

## 🔴 Critical Issues (즉시 수정 필요)

### Issue #1: 루트 페이지가 Next.js 기본 템플릿

**현상:**
- `/` (루트 URL) 접속 시 "To get started, edit the page.tsx file" 표시
- 실제 대시보드는 `/dashboard`에 있음

**파일:** `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app\src\app\page.tsx`

**현재 코드:**
```tsx
export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center...">
      <h1>To get started, edit the page.tsx file.</h1>
      ...
    </div>
  );
}
```

**수정 방안 (권장):**
```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  
  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
```

**우선순위:** 🔴 Critical

---

### Issue #2: 대시보드 경로 비일관성

**현상:**
- 대시보드가 `(dashboard)` route group 안에 있음
- URL이 `/dashboard`가 아니라 `/`로 매핑되어야 하는지 불명확

**파일:** `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app\src\app\(dashboard)\page.tsx`

**확인 필요:**
- `(dashboard)`는 route group이므로 URL에 포함 안 됨
- 실제 접속 URL: `/` (루트 layout과 충돌)

**수정 방안:**
```
옵션 A: 루트 페이지를 리다이렉트로 변경 (권장)
옵션 B: (dashboard) 폴더를 dashboard로 변경하여 /dashboard URL 사용
```

**우선순위:** 🔴 Critical

---

## 🟡 Major Issues (주요 수정)

### Issue #3: 인증 미들웨어 부재

**현상:**
- `/dashboard`, `/stores`, `/orders` 등이 인증 없이 접근 가능할 수 있음
- NextAuth 설정은 있으나 middleware.ts 확인 필요

**확인 필요:** `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app\src\middleware.ts` 파일 존재 여부 및 설정

**수정 방안:**
```ts
// middleware.ts
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/(dashboard)/:path*", "/stores/:path*", "/orders/:path*", "/channels/:path*"]
};
```

**우선순위:** 🟡 Major

---

### Issue #4: 로그인 페이지 동작 확인 필요

**파일:** `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app\src\app\login\page.tsx`

**확인 필요:**
- NextAuth 설정 완료 여부
- 로그인 후 리다이렉트 동작
- 에러 핸들링

**우선순위:** 🟡 Major

---

## 🟢 Minor Issues (개선 사항)

### Issue #5: 대시보드 통계 API 응답 형식 불일치

**파일:** `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app\src\app\(dashboard)\page.tsx`

**현재 코드 (line 61-62):**
```tsx
channelCount: Array.isArray(channelsData) ? channelsData.length : 0,
```

**문제:**
- API 응답이 배열인지 객체인지 일관성 없음
- stores는 `pagination.total` 사용, channels는 배열 길이 사용

**수정 방안:**
- 모든 목록 API 응답 형식 통일 필요
```json
{
  "data": [...],
  "pagination": { "total": N }
}
```

**우선순위:** 🟢 Minor

---

### Issue #6: 하드코딩된 limit 값

**파일:** `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app\src\app\(dashboard)\page.tsx` (line 51-53)

**현재 코드:**
```tsx
fetch("/api/stores?limit=1"),
fetch("/api/channels"),
fetch("/api/orders?limit=5"),
```

**개선 사항:**
- 통계용 API와 목록 API 분리 권장
- 또는 `count` 전용 API 엔드포인트 추가

**우선순위:** 🟢 Minor

---

## ✅ 잘 된 부분

1. **Prisma 스키마** - PRD v3.0 기준 핵심 모델 정의 완료
2. **UI 컴포넌트** - shadcn/ui 기반 잘 구성됨
3. **대시보드 디자인** - 통계 카드 및 최근 발주 목록 깔끔함
4. **NextAuth 기반** - 인증 프레임워크 적용됨
5. **Google Sheets 연동 준비** - ChannelSheet 모델 정의됨

---

## 📋 수정 우선순위 체크리스트

### 즉시 수정 (Critical)
- [ ] Issue #1: 루트 페이지 리다이렉트 구현
- [ ] Issue #2: 라우팅 구조 정리

### 이번 주 내 수정 (Major)
- [ ] Issue #3: middleware.ts 인증 보호 추가
- [ ] Issue #4: 로그인 페이지 테스트

### 개선 (Minor)
- [ ] Issue #5: API 응답 형식 통일
- [ ] Issue #6: 통계 API 분리

---

## 다음 검수 대상

1. API 엔드포인트 전체 테스트
2. Store CRUD 동작 확인
3. Order 생성 플로우 테스트
4. Google Sheets 연동 테스트
5. 인증/권한 테스트

---

**검수 완료**


