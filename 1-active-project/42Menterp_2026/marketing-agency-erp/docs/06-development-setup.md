# 개발 환경 설정 가이드

## 1. 필수 소프트웨어 설치

### 1.1 Node.js
- **버전**: Node.js 18.x 이상 (LTS 버전 권장)
- **다운로드**: [nodejs.org](https://nodejs.org/)
- **설치 확인**:
  ```bash
  node --version
  npm --version
  ```

### 1.2 PostgreSQL
- **버전**: PostgreSQL 14 이상
- **다운로드**: [postgresql.org](https://www.postgresql.org/download/)
- **설치 확인**:
  ```bash
  psql --version
  ```

### 1.3 Git
- **버전**: Git 2.x 이상
- **다운로드**: [git-scm.com](https://git-scm.com/)
- **설치 확인**:
  ```bash
  git --version
  ```

### 1.4 코드 에디터 (선택사항)
- **VS Code**: [code.visualstudio.com](https://code.visualstudio.com/)
- **추천 확장 프로그램**:
  - ESLint
  - Prettier
  - Prisma
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features

## 2. 프로젝트 초기 설정

### 2.1 프로젝트 생성

#### Next.js 프로젝트 생성
```bash
npx create-next-app@latest marketing-agency-system --typescript --tailwind --app --no-src-dir
cd marketing-agency-system
```

#### 프로젝트 구조 확인
```
marketing-agency-system/
├── app/
├── public/
├── package.json
└── ...
```

### 2.2 필수 패키지 설치

#### 핵심 패키지
```bash
# Prisma ORM
npm install prisma @prisma/client

# 폼 관리
npm install react-hook-form @hookform/resolvers zod

# 날짜 처리
npm install date-fns

# Excel 다운로드
npm install xlsx

# PDF 생성
npm install pdfkit

# 차트
npm install recharts

# UI 컴포넌트
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toast

# 유틸리티
npm install clsx tailwind-merge

# 아이콘
npm install lucide-react
```

#### 개발 의존성
```bash
# 타입 정의
npm install -D @types/node @types/react @types/react-dom

# 코드 품질
npm install -D eslint eslint-config-next prettier

# Prisma CLI
npm install -D prisma
```

### 2.3 shadcn/ui 설정

#### 초기화
```bash
npx shadcn-ui@latest init
```

#### 필수 컴포넌트 설치
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form
npx shadcn-ui@latest add select
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add card
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add calendar
npx shadcn-ui@latest add popover
```

## 3. 데이터베이스 설정

### 3.1 PostgreSQL 데이터베이스 생성

#### 데이터베이스 생성
```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE marketing_agency_db;

# 사용자 생성 (선택사항)
CREATE USER marketing_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE marketing_agency_db TO marketing_user;

# 종료
\q
```

### 3.2 Prisma 설정

#### Prisma 초기화
```bash
npx prisma init
```

#### `.env` 파일 설정
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/marketing_agency_db?schema=public"

# NextAuth (향후)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# 파일 저장 경로 (MVP)
FILE_STORAGE_PATH="./storage"
```

### 3.3 Prisma 스키마 작성

#### `prisma/schema.prisma` 파일 생성
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 스키마는 docs/03-database-design.md 참고
```

### 3.4 마이그레이션 실행

#### 초기 마이그레이션
```bash
# 마이그레이션 파일 생성
npx prisma migrate dev --name init

# Prisma Client 생성
npx prisma generate
```

#### 데이터베이스 확인
```bash
# Prisma Studio 실행 (GUI로 데이터 확인)
npx prisma studio
```

## 4. 환경 변수 설정

### 4.1 `.env.local` 파일 생성
프로젝트 루트에 `.env.local` 파일 생성:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/marketing_agency_db?schema=public"

# NextAuth (향후)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# 파일 저장 경로
FILE_STORAGE_PATH="./storage"

# 앱 설정
APP_NAME="마케팅 대행사 관리 시스템"
APP_URL="http://localhost:3000"
```

### 4.2 `.env.example` 파일 생성
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/marketing_agency_db?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# 파일 저장 경로
FILE_STORAGE_PATH="./storage"

# 앱 설정
APP_NAME="마케팅 대행사 관리 시스템"
APP_URL="http://localhost:3000"
```

### 4.3 환경 변수 타입 정의

#### `types/env.d.ts` 파일 생성
```typescript
declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    NEXTAUTH_URL: string;
    NEXTAUTH_SECRET: string;
    FILE_STORAGE_PATH: string;
    APP_NAME: string;
    APP_URL: string;
  }
}
```

## 5. 프로젝트 구조 생성

### 5.1 디렉토리 구조 생성
```bash
# lib 디렉토리
mkdir -p lib/prisma lib/services lib/validators lib/utils lib/hooks lib/constants

# components 디렉토리
mkdir -p components/ui components/layout components/customers components/stores components/orders components/dashboard components/shared

# types 디렉토리
mkdir -p types

# storage 디렉토리
mkdir -p storage/documents storage/invoices storage/reports

# prisma 디렉토리
mkdir -p prisma/migrations
```

### 5.2 기본 파일 생성

#### `lib/prisma/client.ts`
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

#### `lib/utils/cn.ts`
```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## 6. 개발 서버 실행

### 6.1 개발 서버 시작
```bash
npm run dev
```

### 6.2 브라우저에서 확인
- 브라우저에서 `http://localhost:3000` 접속
- Next.js 기본 페이지 확인

### 6.3 핫 리로드
- 코드 수정 시 자동으로 페이지 새로고침
- 에러 발생 시 에러 메시지 표시

## 7. 코드 품질 도구 설정

### 7.1 ESLint 설정

#### `.eslintrc.json` 파일 생성
```json
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "rules": {
    "react/no-unescaped-entities": "off",
    "@typescript-eslint/no-unused-vars": "warn"
  }
}
```

### 7.2 Prettier 설정

#### `.prettierrc` 파일 생성
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid"
}
```

#### `.prettierignore` 파일 생성
```
node_modules
.next
out
dist
build
coverage
*.log
.env*
```

### 7.3 package.json 스크립트 추가
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

## 8. Git 설정

### 8.1 .gitignore 파일 확인
```gitignore
# Dependencies
node_modules
/.pnp
.pnp.js

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local
.env

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Prisma
prisma/migrations/*.sql

# Storage
/storage/*
!/storage/.gitkeep
```

### 8.2 Git 저장소 초기화
```bash
git init
git add .
git commit -m "Initial commit"
```

## 9. 개발 워크플로우

### 9.1 기능 개발 프로세스
1. **브랜치 생성**
   ```bash
   git checkout -b feature/customer-management
   ```

2. **코드 작성**
   - 컴포넌트 작성
   - API 라우트 작성
   - 서비스 로직 작성

3. **테스트**
   - 로컬에서 테스트
   - Prisma Studio로 데이터 확인

4. **커밋**
   ```bash
   git add .
   git commit -m "feat: 고객 관리 기능 추가"
   ```

5. **푸시**
   ```bash
   git push origin feature/customer-management
   ```

### 9.2 데이터베이스 마이그레이션 프로세스
1. **스키마 수정**
   - `prisma/schema.prisma` 파일 수정

2. **마이그레이션 생성**
   ```bash
   npx prisma migrate dev --name add_new_field
   ```

3. **Prisma Client 재생성**
   ```bash
   npx prisma generate
   ```

4. **마이그레이션 확인**
   - Prisma Studio에서 확인
   - 애플리케이션에서 테스트

## 10. 트러블슈팅

### 10.1 일반적인 문제

#### 문제: Prisma Client를 찾을 수 없음
**해결책**:
```bash
npx prisma generate
```

#### 문제: 데이터베이스 연결 실패
**해결책**:
1. PostgreSQL 서비스가 실행 중인지 확인
2. `.env.local`의 `DATABASE_URL` 확인
3. 데이터베이스 사용자 권한 확인

#### 문제: 포트 3000이 이미 사용 중
**해결책**:
```bash
# 다른 포트 사용
npm run dev -- -p 3001
```

### 10.2 의존성 문제

#### 문제: 패키지 설치 실패
**해결책**:
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

#### 문제: TypeScript 에러
**해결책**:
```bash
# TypeScript 재설치
npm install -D typescript @types/node @types/react @types/react-dom
```

## 11. 추가 도구 (선택사항)

### 11.1 데이터베이스 GUI 도구
- **pgAdmin**: PostgreSQL 관리 도구
- **DBeaver**: 범용 데이터베이스 도구
- **TablePlus**: 모던 데이터베이스 도구

### 11.2 API 테스트 도구
- **Postman**: API 테스트
- **Insomnia**: API 테스트
- **Thunder Client**: VS Code 확장

### 11.3 개발 도구
- **React DevTools**: React 컴포넌트 디버깅
- **Redux DevTools**: 상태 관리 디버깅 (필요시)

## 12. 다음 단계

### 12.1 기본 구조 확인
1. 프로젝트가 정상적으로 실행되는지 확인
2. 데이터베이스 연결 확인
3. Prisma Studio로 스키마 확인

### 12.2 첫 번째 기능 개발
1. 고객 관리 기능부터 시작
2. API 라우트 작성
3. UI 컴포넌트 작성
4. 통합 테스트

### 12.3 문서 참고
- 프로젝트 개요: `docs/01-project-overview.md`
- 데이터베이스 설계: `docs/03-database-design.md`
- API 명세서: `docs/04-api-specification.md`
- UI 설계: `docs/05-ui-design.md`

