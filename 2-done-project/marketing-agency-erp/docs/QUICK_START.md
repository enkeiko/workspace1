# 빠른 시작 가이드

## 실행 순서

### 1단계: 데이터베이스 준비 (가장 먼저!)

PostgreSQL이 설치되어 있고 데이터베이스가 생성되어 있어야 합니다.

```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE marketing_agency_db;

# 종료
\q
```

### 2단계: 환경 변수 파일 생성

프로젝트 루트에 `.env.local` 파일을 생성하세요:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/marketing_agency_db?schema=public"
FILE_STORAGE_PATH="./storage"
```

**중요**: `username`, `password`를 실제 PostgreSQL 사용자 정보로 변경하세요!

### 3단계: Prisma 스키마 생성

Prisma를 초기화하거나 스키마 파일을 생성하세요:

```bash
# Prisma 초기화 (스키마 파일이 없는 경우)
npx prisma init

# 또는 기존 스키마 파일이 있다면
# prisma/schema.prisma 파일을 확인하세요
```

**참고**: `docs/03-database-design.md` 파일에 전체 데이터베이스 설계가 있습니다.

### 4단계: Prisma Client 생성 및 마이그레이션

```bash
# Prisma Client 생성
npm run db:generate

# 데이터베이스에 스키마 적용
npm run db:push
# 또는 마이그레이션 사용
npm run db:migrate
```

### 5단계: 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요!

---

## 문제 해결

### "DATABASE_URL이 설정되지 않았습니다" 오류
→ `.env.local` 파일이 제대로 생성되었는지 확인하세요.

### "Prisma Client가 생성되지 않았습니다" 오류
→ `npm run db:generate` 명령어를 실행하세요.

### "테이블이 존재하지 않습니다" 오류
→ `npm run db:push` 또는 `npm run db:migrate`를 실행하세요.

---

## 체크리스트

실행 전 확인:

- [ ] PostgreSQL이 설치되어 있고 실행 중
- [ ] 데이터베이스 `marketing_agency_db`가 생성됨
- [ ] `.env.local` 파일이 생성되고 `DATABASE_URL`이 올바르게 설정됨
- [ ] `prisma/schema.prisma` 파일이 존재함
- [ ] `npm install`이 완료됨
- [ ] `npm run db:generate`가 완료됨
- [ ] `npm run db:push` 또는 `npm run db:migrate`가 완료됨

모든 항목이 체크되면 `npm run dev`로 실행하세요!

