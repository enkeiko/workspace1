# 데이터베이스 설정 옵션

## 옵션 1: SQLite 사용 (가장 간단, 추천) ⭐

개발/테스트 목적이라면 SQLite가 가장 간단합니다. 별도 설치 없이 바로 사용 가능합니다.

### 장점
- ✅ 별도 설치 불필요
- ✅ 설정 간단
- ✅ 파일 기반 (백업 쉬움)

### 설정 방법

1. **Prisma 스키마 설정**
   - `prisma/schema.prisma`에서 `provider = "sqlite"`로 변경

2. **환경 변수**
   ```env
   DATABASE_URL="file:./dev.db"
   ```

3. **마이그레이션 실행**
   ```bash
   npm run db:push
   ```

---

## 옵션 2: PostgreSQL 설치 (프로덕션 준비)

실제 운영 환경과 동일한 환경이 필요하다면 PostgreSQL을 설치하세요.

### Windows 설치 방법

1. **PostgreSQL 다운로드**
   - https://www.postgresql.org/download/windows/
   - 또는 https://www.postgresql.org/download/windows/installer/ (자동 설치 프로그램)

2. **설치 과정**
   - 설치 프로그램 실행
   - 기본 포트: 5432
   - 비밀번호 설정 (기억해두세요!)

3. **데이터베이스 생성**
   ```bash
   # PostgreSQL 설치 후 pgAdmin 또는 명령줄 사용
   # pgAdmin에서:
   # 1. 서버 연결
   # 2. 데이터베이스 우클릭 → Create → Database
   # 3. 이름: marketing_agency_db
   ```

4. **환경 변수 설정**
   ```env
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/marketing_agency_db?schema=public"
   ```

---

## 옵션 3: Docker 사용 (고급)

Docker가 설치되어 있다면:

```bash
# PostgreSQL 컨테이너 실행
docker run --name marketing-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=marketing_agency_db -p 5432:5432 -d postgres

# 환경 변수
DATABASE_URL="postgresql://postgres:password@localhost:5432/marketing_agency_db?schema=public"
```

---

## 추천 순서

1. **개발/테스트**: SQLite 사용 (옵션 1) ⭐
2. **프로덕션 배포 전**: PostgreSQL 설치 (옵션 2)

---

## SQLite로 시작하는 방법 (가장 빠름)

1. Prisma 스키마를 SQLite용으로 생성
2. `.env.local`에 `DATABASE_URL="file:./dev.db"` 설정
3. `npm run db:push` 실행
4. `npm run dev` 실행

**완료!** 바로 테스트할 수 있습니다.

