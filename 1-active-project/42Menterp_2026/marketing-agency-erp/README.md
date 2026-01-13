# 마케팅 대행사 성과 관리 시스템

1인 마케팅 대행사를 위한 통합 성과 및 정산 관리 시스템

## 🚀 빠른 시작

### 1. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 입력하세요:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/marketing_agency_db?schema=public"

# 파일 저장 경로
FILE_STORAGE_PATH="./storage"
```

### 2. 데이터베이스 설정

PostgreSQL 데이터베이스를 생성하고 Prisma 마이그레이션을 실행하세요:

```bash
# Prisma Client 생성
npm run db:generate

# 데이터베이스 마이그레이션 (Prisma 스키마가 있는 경우)
npm run db:migrate

# 또는 데이터베이스에 직접 푸시 (스키마만 있는 경우)
npm run db:push
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📋 구현된 기능

### 완료된 모듈 (9개)

1. ✅ 고객 관리
2. ✅ 매장 관리
3. ✅ 상품 관리
4. ✅ 견적서 관리
5. ✅ 주문 관리
6. ✅ 정산 관리
7. ✅ 상담 관리
8. ✅ 작업 관리
9. ✅ 문서 관리

### 남은 작업

- 알림 시스템 (우선순위: 중간)

## 🛠️ 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript
- **데이터베이스**: PostgreSQL + Prisma ORM
- **UI**: React + Tailwind CSS + shadcn/ui
- **폼 검증**: Zod
- **아이콘**: Lucide React

## 📁 프로젝트 구조

```
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── [module]/          # 페이지 라우트
│   └── layout.tsx         # 루트 레이아웃
├── components/            # React 컴포넌트
│   ├── ui/               # UI 컴포넌트
│   ├── layout/          # 레이아웃 컴포넌트
│   └── shared/          # 공유 컴포넌트
├── lib/                   # 유틸리티 및 설정
│   ├── prisma/          # Prisma 클라이언트
│   ├── services/        # 비즈니스 로직
│   └── utils/           # 유틸리티 함수
├── prisma/               # Prisma 스키마
└── docs/                 # 문서
```

## 📝 주요 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start

# Prisma Client 생성
npm run db:generate

# 데이터베이스 마이그레이션
npm run db:migrate

# Prisma Studio (데이터베이스 GUI)
npm run db:studio
```

## ⚠️ 주의사항

1. **데이터베이스 설정 필수**: PostgreSQL 데이터베이스를 먼저 생성하고 `.env.local`에 연결 정보를 설정해야 합니다.

2. **Prisma 스키마**: `prisma/schema.prisma` 파일이 필요합니다. 데이터베이스 설계 문서(`docs/03-database-design.md`)를 참고하여 생성하세요.

3. **파일 저장소**: 문서 업로드 기능을 사용하려면 `FILE_STORAGE_PATH`에 지정된 디렉토리가 존재해야 합니다.

## 📚 문서

- [프로젝트 개요](docs/01-project-overview.md)
- [시스템 아키텍처](docs/02-system-architecture.md)
- [데이터베이스 설계](docs/03-database-design.md)
- [개발 환경 설정](docs/06-development-setup.md)

## 📄 라이선스

Private

