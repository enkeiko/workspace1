# 42ment ERP - Backend API

광고대행사 관리 시스템 백엔드 API

## 🚀 시작하기

### 필수 요구사항
- Node.js 18+
- PostgreSQL 14+
- npm 또는 yarn

### 설치

```bash
# 패키지 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어서 DATABASE_URL 등 설정

# Prisma 마이그레이션
npm run prisma:migrate

# Prisma Client 생성
npm run prisma:generate
```

### 실행

```bash
# 개발 모드 (nodemon)
npm run dev

# 프로덕션 모드
npm start

# Prisma Studio (DB 관리 GUI)
npm run prisma:studio
```

## 📁 프로젝트 구조

```
src/
├── config/         # 설정 파일
├── controllers/    # 비즈니스 로직
├── middleware/     # 미들웨어
├── routes/         # API 라우트
├── services/       # 서비스 계층
├── utils/          # 유틸리티 함수
├── validators/     # 요청 검증
├── app.js          # Express 앱
└── server.js       # 서버 진입점
```

## 🔐 인증

Phase 1에서는 간단한 하드코딩된 인증을 사용합니다:
- Username: `admin`
- Password: `admin123`

로그인 후 JWT 토큰을 받아 Authorization 헤더에 포함:
```
Authorization: Bearer {token}
```

## 📚 API 문서

API 명세서: `/1-planning/specs/003-ad-agency-management/api/api-specification.md`

Base URL: `http://localhost:3000/v1`

### 주요 엔드포인트

- `POST /v1/auth/login` - 로그인
- `GET /v1/clients` - 고객 목록
- `GET /v1/quotes` - 견적서 목록
- `GET /v1/orders` - 주문 목록
- `GET /v1/invoices` - 세금계산서 목록

## 🧪 테스트

```bash
npm test
```

## 📝 License

MIT
