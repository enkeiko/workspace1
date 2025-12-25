# 📋 프로젝트 상태 요약

> **최종 업데이트**: 2025-12-05

## ✅ 완성된 기능

| 항목 | 상태 | 비고 |
|------|------|------|
| 뉴스 자동 수집 (RSS) | ✅ | 5개 소스 정상 작동 |
| 네이버 API 수집 | ✅ | 뉴스 + 블로그 검색 (160개) |
| 규칙 기반 요약 | ✅ | 400자 확장, 품질 개선 |
| AI 필터 모듈 | ⚠️ | 비활성화 (무료 모델 제한) |
| 키워드 필터링 | ✅ | 임계값 4로 강화 |
| 커뮤니티 (댓글/좋아요) | ✅ | 익명 기반 |
| 하루 4회 자동 업데이트 | ✅ | Cron 스케줄러 작동 |
| 분리된 MD 파일 출력 | ✅ | ai-vibe-news.md, local-biz-news.md |
| 포트 변경 | ✅ | 3000 → 4000 |
| UTF-8 인코딩 | ✅ | 한글 정상 출력 |

## 📁 파일 위치

```
C:\Users\Nk Ko\Cusor_P\korean-news-community\
├── .env                    ← API 키 설정 (UTF-8 인코딩)
├── env.example             ← 설정 예제 파일
├── output\
│   ├── ai-vibe-news.md     ← 🔵 AI 뉴스
│   ├── local-biz-news.md   ← 🟢 자영업 뉴스
│   ├── kakao_output.txt    ← 카카오톡용
│   ├── web_output.html     ← 웹용 HTML
│   └── web_output.md       ← 웹용 Markdown
├── data\
│   └── news.db             ← SQLite 데이터베이스
└── src\                    ← 소스 코드
```

## 🚀 실행 명령어

### 개발 서버 시작 (UTF-8 인코딩)
```powershell
cd "C:\Users\Nk Ko\Cusor_P\korean-news-community"
.\run-dev.ps1
```
**사이트**: http://localhost:4000

### 수동 뉴스 수집 (UTF-8 인코딩)
```powershell
.\run-collect.ps1
```

### 기본 명령어 (한글 깨질 수 있음)
```powershell
npm run dev        # 개발 서버
npm run collect    # 뉴스 수집
```

### 데이터베이스 마이그레이션
```powershell
npm run migrate
```

## 🔑 API 키 설정

### ✅ 네이버 검색 API (설정 완료)
- **Client ID**: `SKFeTvzmnBGWYMGRgWJV`
- **Client Secret**: `6Sy6RHsTCz`
- **상태**: 정상 작동 중

### ⚠️ OpenRouter API (선택사항 - 현재 비활성화)
- **용도**: AI 기반 기사 분류 및 품질 평가
- **상태**: 비활성화 (무료 모델 제한으로 규칙 기반 사용 중)
- **설정**: `.env` 파일의 `USE_AI_FILTER=false`
- **발급**: https://openrouter.ai/keys (유료 모델 사용 시 크레딧 필요)

## 📊 수집 현황

### 정상 작동 중인 RSS 소스
- ✅ 한국경제 IT (50개)
- ✅ 매일경제 IT (50개)
- ✅ 벤처스퀘어 (30개)
- ✅ Byline Network (20개)
- ✅ 테크니들 (9개)

### 수집 실패 소스 (URL 변경됨)
- ❌ ZDNet Korea (404)
- ❌ 블로터 (404)
- ❌ ITWorld Korea (404)
- ❌ 디지털타임스 (404)
- ❌ 전자신문 (XML 파싱 오류)

### 웹 스크래핑
- ⚠️ Velog (0개 수집)
- ⚠️ Brunch (리다이렉트 오류)

## 🗄️ 데이터베이스

- **타입**: SQLite
- **위치**: `./data/news.db`
- **스키마**: 
  - `articles` (기사)
  - `comments` (댓글)
  - `submissions` (사용자 제출)

## ⏰ 자동 업데이트 스케줄

하루 4회 자동 수집 (KST 기준):
- **07:00** (오전)
- **12:00** (점심)
- **18:00** (저녁)
- **23:00** (밤)

## 🔧 주요 설정

### Rate Limiting
- **윈도우**: 15분 (900,000ms)
- **최대 요청**: 100회

### 스팸 필터
- **차단 단어**: 스팸, 광고, 홍보, 성인, 카지노
- **설정**: `.env` 파일의 `SPAM_WORDS`

## 📝 최근 개선사항 (2025-12-05)

### ✅ 완료
1. ✅ 포트 변경 (3000 → 3002)
2. ✅ 한글 인코딩 수정 (UTF-8 스크립트 추가)
3. ✅ 기사 요약 품질 개선 (400자 확장)
4. ✅ 링크 개선 (제목에 링크 포함)
5. ✅ 필터링 로직 강화 (임계값 3 → 4)
6. ✅ AI 기반 기사 선정 모듈 추가 (구현 완료, 현재 비활성화)
7. ✅ "적용 아이디어/팁" 섹션 제거

## 📝 다음 단계

### 우선순위 높음
1. [ ] 실패한 RSS 소스 URL 업데이트 (ZDNet, 블로터, ITWorld 등)
2. [ ] Velog/Brunch 스크래핑 로직 개선
3. [ ] OpenRouter 유료 모델 사용 고려 (AI 필터 활성화)

### 우선순위 중간
4. [ ] 관리자 대시보드 UI 개발
5. [ ] 댓글 알림 기능
6. [ ] RSS 피드 제공

### 우선순위 낮음
7. [ ] OAuth 로그인 (네이버/카카오)
8. [ ] PostgreSQL 마이그레이션
9. [ ] 푸시 알림

## 🐛 알려진 이슈

1. ~~**한글 인코딩**~~: ✅ 해결 (run-dev.ps1, run-collect.ps1 사용)
2. **RSS 404 오류**: 일부 소스의 RSS URL이 변경됨 (ZDNet, 블로터, ITWorld, 디지털타임스)
3. **AI 필터 비활성화**: OpenRouter 무료 모델 제한으로 규칙 기반 사용 중
4. **전자신문 XML 파싱 오류**: RSS 피드 형식 문제

## 📞 문제 해결

### 수집이 안 될 때
```powershell
# 로그 확인
npm run collect

# 데이터베이스 확인
npm run migrate
```

### 서버가 시작되지 않을 때
```powershell
# 포트 확인
netstat -ano | findstr :3000

# .env 파일 확인
Get-Content .env
```

---

**프로젝트 경로**: `C:\Users\Nk Ko\Cusor_P\korean-news-community`



