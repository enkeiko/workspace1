# 수정 지시서 #001

> 이 문서의 수정 사항을 순서대로 구현해주세요.
> 완료 후 각 항목에 체크해주세요.

---

## 1. [Critical] 루트 페이지 리다이렉트 구현

**파일:** `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app\src\app\page.tsx`

**현재 상태:** Next.js 기본 템플릿 ("To get started, edit the page.tsx file")

**수정 내용:** 전체 파일을 아래 코드로 교체

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  
  if (session) {
    redirect("/stores");
  } else {
    redirect("/login");
  }
}
```

**참고:** `authOptions`가 `@/lib/auth`에 없으면 해당 파일도 생성 필요

- [x] 완료 (구현됨 - `/dashboard`로 리다이렉트)

---

## 2. [Critical] 인증 미들웨어 추가

**파일:** `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app\src\middleware.ts` (신규 생성)

**수정 내용:** 파일 생성 후 아래 코드 입력

```ts
export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/(dashboard)/:path*",
    "/stores/:path*",
    "/orders/:path*",
    "/channels/:path*",
    "/settings/:path*",
  ],
};
```

- [x] 완료 (더 상세한 버전으로 구현됨)

---

## 3. [Major] authOptions 파일 확인/생성

**파일:** `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app\src\lib\auth.ts`

**확인:** 파일이 없거나 `authOptions`가 export 안 되어 있으면 생성

```ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};
```

- [x] 완료 (로그인 유지 기능 포함 구현됨)

---

## 4. [Major] prisma client 경로 확인

**파일:** `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app\src\lib\prisma.ts`

**확인:** 파일이 없으면 생성

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] 완료

---

## 5. [Minor] API 응답 형식 통일 - channels

**파일:** `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app\src\app\api\channels\route.ts`

**현재 상태:** 배열만 반환하는 것으로 추정

**수정 내용:** pagination 포함하도록 수정

```ts
// GET 응답을 아래 형식으로 변경
return NextResponse.json({
  channels: channels,
  pagination: {
    total: channels.length,
  },
});
```

- [ ] 완료

---

## 6. [Minor] 대시보드 통계 API 호출 수정

**파일:** `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app\src\app\(dashboard)\page.tsx`

**수정 위치:** line 61-62 부근

**현재 코드:**
```tsx
channelCount: Array.isArray(channelsData) ? channelsData.length : 0,
```

**수정 코드:**
```tsx
channelCount: channelsData.pagination?.total || 0,
```

- [ ] 완료

---

## 검증 체크리스트

수정 완료 후 아래 항목 테스트:

- [ ] `/` 접속 시 로그인 페이지로 리다이렉트
- [ ] 로그인 후 `/stores`로 이동
- [ ] 로그인 없이 `/stores` 직접 접속 시 로그인 페이지로 리다이렉트
- [ ] 대시보드 통계 카드 숫자 정상 표시

---

## 완료 보고

모든 수정 완료 후 아래 형식으로 보고:

```
## 수정 완료 보고

- [x] 1. 루트 페이지 리다이렉트
- [x] 2. 미들웨어 추가
- [x] 3. authOptions 생성
- [x] 4. prisma client 확인
- [x] 5. channels API 수정
- [x] 6. 대시보드 통계 수정

### 추가 변경 사항
- (있으면 기록)

### 발생한 이슈
- (있으면 기록)
```

