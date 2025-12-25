# 📰 한국 뉴스 커뮤니티

> AI·자동화·바이브코딩 & 자영업·네이버 플레이스 뉴스 자동 수집 + 커뮤니티 시스템

하루 4회 (07:00 / 12:00 / 18:00 / 23:00) 자동 업데이트되는 한국 뉴스 수집 및 커뮤니티 플랫폼입니다.

## ✨ 주요 기능

### 📡 뉴스 자동 수집
- **RSS 피드 수집**: ZDNet Korea, 블로터, ITWorld Korea 등 주요 IT 미디어
- **웹 스크래핑**: Velog, Brunch 등 블로그 플랫폼
- **카테고리 자동 분류**: AI/자동화 vs 자영업/네이버 플레이스
- **스코어링**: 실용성, 수익 직결 가능성, 확장 가능성

### 💬 커뮤니티 기능
- 익명 닉네임 기반 댓글
- 로그인 없이 참여 가능 (쿠키 기반 UUID)
- 좋아요/추천 기능
- 댓글 정렬 (최신순/추천순)
- 사용자 기사 제출 (관리자 승인 후 게시)

### 📤 출력 포맷
- 카카오톡용 텍스트 (`kakao_output.txt`)
- 뉴스레터 HTML (`web_output.html`)
- Markdown (`web_output.md`)

## 🛠 기술 스택

- **Backend**: Node.js + TypeScript + Express
- **Database**: SQLite (better-sqlite3)
- **Scheduler**: node-cron
- **Frontend**: Vanilla HTML/CSS/JS
- **데이터 수집**: axios, cheerio, rss-parser

## 🚀 시작하기

### 1. 의존성 설치

```bash
cd korean-news-community
npm install
```

### 2. 환경 설정

```bash
cp env.example .env
```

`.env` 파일을 열어 설정을 수정하세요:

```env
# 필수 설정
PORT=4000
NODE_ENV=development
DATABASE_PATH=./data/news.db
ADMIN_SECRET=your-secret-key-here

# 네이버 검색 API (필수)
# https://developers.naver.com/apps/#/register 에서 발급
NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret

# OpenRouter API (선택사항 - AI 요약 기능용)
# https://openrouter.ai/keys 에서 발급
OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxxxxxx
AI_MODEL=google/gemini-2.0-flash-exp:free
```

**현재 상태:**
- ✅ 네이버 API 키: 설정됨
- ⚠️ OpenRouter API 키: 필요 (AI 요약 기능 사용 시)

### 3. 데이터베이스 초기화

```bash
npm run migrate
```

### 4. 개발 서버 실행

**Windows에서 한글 깨짐 방지:**
```powershell
# 방법 1: UTF-8 인코딩 설정 후 실행 (권장)
npm run dev:utf8

# 방법 2: 직접 실행 (한글이 깨질 수 있음)
npm run dev
```

**Linux/Mac:**
```bash
npm run dev
```

서버는 `http://localhost:4000`에서 실행됩니다.

### 5. 수동 뉴스 수집

**Windows에서 한글 깨짐 방지:**
```powershell
# 방법 1: UTF-8 인코딩 설정 후 실행 (권장)
npm run collect:utf8

# 방법 2: 직접 실행 (한글이 깨질 수 있음)
npm run collect
```

**Linux/Mac:**
```bash
npm run collect
```

### 6. 프로덕션 빌드 & 실행

```bash
npm run build
npm start
```

## 📁 디렉토리 구조

```
korean-news-community/
├── src/
│   ├── config/           # 설정 파일
│   ├── database/         # DB 스키마 및 레포지토리
│   ├── collectors/       # 뉴스 수집기
│   │   ├── rss-collector.ts
│   │   └── web-scraper.ts
│   ├── processors/       # 필터/스코어러/요약기
│   │   ├── filter.ts
│   │   ├── scorer.ts
│   │   └── summarizer.ts
│   ├── community/        # 커뮤니티 기능
│   │   ├── spam-filter.ts
│   │   └── index.ts
│   ├── formatters/       # 출력 포맷터
│   ├── routes/           # API 라우트
│   │   ├── api.ts
│   │   └── admin.ts
│   ├── cron/             # 스케줄러
│   └── index.ts          # 서버 엔트리포인트
├── public/               # 프론트엔드 정적 파일
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── output/               # 생성된 출력 파일
├── data/                 # SQLite 데이터베이스
└── package.json
```

## 📊 데이터베이스 스키마

### articles (기사)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER | PK |
| category | TEXT | 'ai-vibe' or 'local-biz' |
| title | TEXT | 제목 |
| summary | TEXT | 요약 |
| original_url | TEXT | 원문 URL |
| total_score | REAL | 종합 점수 |
| action_idea | TEXT | 적용 아이디어 |
| like_count | INTEGER | 좋아요 수 |
| comment_count | INTEGER | 댓글 수 |

### comments (댓글)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER | PK |
| article_id | INTEGER | FK → articles |
| user_uuid | TEXT | 사용자 UUID |
| nickname | TEXT | 닉네임 |
| content | TEXT | 내용 |
| like_count | INTEGER | 좋아요 수 |

### submissions (제출)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER | PK |
| user_uuid | TEXT | 제출자 UUID |
| category | TEXT | 카테고리 |
| title | TEXT | 제목 |
| url | TEXT | URL |
| status | TEXT | 'pending' / 'approved' / 'rejected' |

## 🔌 API 엔드포인트

### 공개 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/articles | 기사 목록 |
| GET | /api/articles/popular | 인기 기사 |
| GET | /api/articles/featured | 주요 기사 |
| GET | /api/articles/:id | 기사 상세 |
| POST | /api/articles/:id/like | 좋아요 토글 |
| GET | /api/articles/:id/comments | 댓글 목록 |
| POST | /api/articles/:id/comments | 댓글 작성 |
| POST | /api/submissions | 기사 제출 |
| GET | /api/user | 사용자 정보 |

### 관리자 API

모든 관리자 API는 `Authorization: Bearer {ADMIN_SECRET}` 헤더 필요

| 메서드 | 경로 | 설명 |
|--------|------|------|
| DELETE | /api/admin/articles/:id | 기사 삭제 |
| DELETE | /api/admin/comments/:id | 댓글 삭제 |
| GET | /api/admin/submissions/pending | 대기 제출 목록 |
| POST | /api/admin/submissions/:id/approve | 제출 승인 |
| POST | /api/admin/submissions/:id/reject | 제출 거부 |
| POST | /api/admin/collect | 수동 수집 |
| GET | /api/admin/stats | 통계 |

## ⏰ 스케줄러

하루 4회 자동 업데이트:
- **07:00** (오전)
- **12:00** (점심)
- **18:00** (저녁)
- **23:00** (밤)

모든 시간은 KST (Asia/Seoul) 기준입니다.

## 🔐 보안 기능

- **Rate Limiting**: API 요청 제한
- **XSS 방지**: 사용자 입력 이스케이프
- **스팸 필터**: 차단 단어 및 패턴 감지
- **Helmet**: 보안 헤더 설정
- **CORS**: 허용 도메인 제한

## 📝 운영 가이드

### 모니터링

```bash
# 최근 수집 로그 확인
curl -H "Authorization: Bearer YOUR_SECRET" http://localhost:4000/api/admin/logs

# 통계 확인
curl -H "Authorization: Bearer YOUR_SECRET" http://localhost:4000/api/admin/stats
```

### 수동 수집

```bash
# CLI로 실행
npm run collect

# API로 실행
curl -X POST -H "Authorization: Bearer YOUR_SECRET" http://localhost:4000/api/admin/collect
```

### 스팸 단어 관리

```bash
# 차단 단어 추가
curl -X POST -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"word":"스팸단어"}' \
  http://localhost:4000/api/admin/spam/words
```

## 🚀 배포

### PM2 사용

```bash
npm run build
pm2 start dist/index.js --name news-community
pm2 save
```

### Docker (예정)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
COPY public ./public
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## 🔮 확장 계획

- [ ] 네이버/카카오 OAuth 로그인
- [ ] PostgreSQL 지원
- [ ] 푸시 알림
- [ ] RSS 피드 제공
- [ ] AI 기반 요약 (GPT API 연동)
- [ ] 관리자 대시보드 UI

## 📄 라이선스

MIT License

---

Made with ❤️ for Korean News Community

