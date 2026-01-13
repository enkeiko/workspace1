import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

// 세션 시간 설정
const SESSION_MAX_AGE_DEFAULT = 30 * 60; // 30분 (기본)
const SESSION_MAX_AGE_KEEP_LOGIN = 7 * 24 * 60 * 60; // 7일 (로그인 유지)

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        keepLoggedIn: { label: "Keep Logged In", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("이메일과 비밀번호를 입력해주세요.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("등록되지 않은 이메일입니다.");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("비밀번호가 일치하지 않습니다.");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          keepLoggedIn: credentials.keepLoggedIn === "true",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_DEFAULT, // 기본 30분
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        // 로그인 상태 유지 옵션 저장
        if ((user as { keepLoggedIn?: boolean }).keepLoggedIn) {
          token.keepLoggedIn = true;
          token.maxAge = SESSION_MAX_AGE_KEEP_LOGIN;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      // 세션 만료 시간 설정
      if (token.keepLoggedIn) {
        session.expires = new Date(
          Date.now() + SESSION_MAX_AGE_KEEP_LOGIN * 1000
        ).toISOString();
      }
      return session;
    },
  },
  // JWT 만료 시간을 동적으로 설정
  jwt: {
    maxAge: SESSION_MAX_AGE_KEEP_LOGIN, // JWT 최대 시간은 7일로 설정
  },
};
