# 🆘 문제 해결 가이드

Place Keywords Maker V2 사용 중 발생할 수 있는 일반적인 문제와 해결 방법입니다.

---

## 📦 설치 관련 문제

### 1. "Module not found" 에러

**증상**:
```
Error: Cannot find module 'puppeteer'
```

**원인**: 의존성이 설치되지 않음

**해결**:
```bash
# 프로젝트 루트에서 실행
npm install

# 캐시 문제 시
npm cache clean --force
npm install
```

---

### 2. Node.js 버전 에러

**증상**:
```
Error: The engine "node" is incompatible with this module
```

**원인**: Node.js 버전이 18 미만

**해결**:
```bash
# Node.js 버전 확인
node --version

# 18 미만이면 업데이트 필요
# https://nodejs.org/에서 최신 버전 설치
```

---

### 3. 권한 에러 (Linux/Mac)

**증상**:
```
Error: EACCES: permission denied
```

**해결**:
```bash
# npm 전역 디렉토리 권한 수정
sudo chown -R $USER /usr/local/lib/node_modules

# 또는 nvm 사용 권장
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
```

---

## ⚙️ 환경 설정 문제

### 4. .env 파일 인식 안됨

**증상**:
```
Warning: NAVER_CLIENT_ID is not defined
```

**원인**: .env 파일이 없거나 잘못된 위치

**해결**:
```bash
# .env.example에서 복사
cp .env.example .env

# 파일 위치 확인 (프로젝트 루트에 있어야 함)
ls -la .env

# 내용 확인
cat .env
```

**올바른 .env 예시**:
```env
NAVER_CLIENT_ID=your_client_id
NAVER_CLIENT_SECRET=your_secret
AI_API_KEY=your_key
```

---

### 5. 네이버 API 키 에러

**증상**:
```
Error: 401 Unauthorized - Invalid client credentials
```

**원인**: 잘못된 API 키 또는 등록되지 않은 키

**해결**:
1. [네이버 개발자 센터](https://developers.naver.com/) 접속
2. 애플리케이션 등록 확인
3. Client ID/Secret 확인
4. `.env` 파일에 정확히 입력

**Mock 모드로 테스트**:
```bash
npm run l1 -- --mock
```

---

## 🚀 실행 관련 문제

### 6. L1 파이프라인 중단

**증상**:
```
[ERROR] Timeout: Page did not load within 30s
```

**원인**: 네트워크 지연 또는 페이지 로딩 실패

**해결**:
```bash
# 타임아웃 시간 증가 (src/config/default.yml)
crawler:
  timeout: 60000  # 30초 → 60초

# 재시도 횟수 증가
crawler:
  retries: 5      # 기본 3 → 5
```

---

### 7. "Chromium not found" 에러

**증상**:
```
Error: Could not find Chromium
```

**원인**: Puppeteer Chromium 다운로드 실패

**해결**:
```bash
# Puppeteer 재설치
npm uninstall puppeteer
npm install puppeteer

# 또는 시스템 Chrome 사용
# src/config/default.yml 수정
crawler:
  executablePath: '/usr/bin/google-chrome'  # Chrome 경로
```

**Chrome 경로 찾기**:
- **Mac**: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- **Linux**: `/usr/bin/google-chrome`
- **Windows**: `C:\Program Files\Google\Chrome\Application\chrome.exe`

---

### 8. 메모리 부족 에러

**증상**:
```
FATAL ERROR: Reached heap limit Allocation failed
```

**원인**: 대량 데이터 처리 시 메모리 부족

**해결**:
```bash
# Node.js 메모리 증가
NODE_OPTIONS=--max-old-space-size=4096 npm run l1

# 배치 크기 줄이기 (src/config/default.yml)
batch_size: 10  # 기본 50 → 10
```

---

### 9. GUI 웹 대시보드가 열리지 않음

**증상**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**원인**: 포트 3000이 이미 사용 중

**해결**:
```bash
# 다른 포트 사용
PORT=3001 npm run gui

# 또는 기존 프로세스 종료 (Mac/Linux)
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID [PID번호] /F
```

---

## 🤖 AI 분석 문제

### 10. AI API 응답 느림

**증상**: L2 파이프라인이 5분 이상 소요

**원인**: API 요청 과부하 또는 네트워크 지연

**해결**:
```bash
# 배치 크기 줄이기
# src/pipelines/l2-pipeline.js 수정
const BATCH_SIZE = 5;  # 기본 10 → 5

# 타임아웃 증가
ai:
  timeout: 120000  # 60초 → 120초
```

---

### 11. AI API 키 에러

**증상**:
```
Error: 401 - Invalid API key
```

**해결**:
1. `.env` 파일에서 `AI_API_KEY` 확인
2. API 키 유효성 검증
3. 무료 할당량 확인

---

## 📂 데이터 파일 문제

### 12. 출력 파일이 생성되지 않음

**증상**: `data/output/` 폴더가 비어있음

**원인**:
- 파이프라인 실행 실패
- 권한 문제

**해결**:
```bash
# 출력 디렉토리 생성
mkdir -p data/output

# 권한 확인 (Linux/Mac)
chmod 755 data/output

# 로그 확인
cat logs/l1-[timestamp].log
```

---

### 13. JSON 파싱 에러

**증상**:
```
SyntaxError: Unexpected token } in JSON
```

**원인**: 손상된 JSON 파일

**해결**:
```bash
# JSON 유효성 검사
cat data/output/collected_data_l1.json | jq .

# 파일 재생성
rm data/output/collected_data_l1.json
npm run l1
```

---

## 🧪 테스트 문제

### 14. 테스트 실패

**증상**:
```
FAIL tests/unit/PlaceCrawler.test.js
```

**해결**:
```bash
# 캐시 정리 후 재실행
npm test -- --clearCache

# 특정 테스트만 실행
npm test -- PlaceCrawler.test.js

# 디버그 모드
npm test -- --verbose
```

---

## 🔍 디버깅 팁

### 로그 레벨 변경

```yaml
# src/config/default.yml
logging:
  level: debug  # info → debug
```

### 상세 로그 출력

```bash
DEBUG=* npm run l1
```

### 네트워크 요청 확인

```bash
# Puppeteer 헤드리스 모드 비활성화
# src/modules/crawler/PlaceCrawler.js
headless: false  # 브라우저 창 표시
```

---

## 📞 추가 지원

### 문제가 해결되지 않나요?

1. **로그 수집**:
   ```bash
   # 최근 로그 복사
   cat logs/l1-*.log > issue-log.txt
   ```

2. **GitHub Issue 작성**:
   - 이슈 제목: `[BUG] 문제 요약`
   - 본문 포함 사항:
     - 문제 상황 설명
     - 재현 방법
     - 에러 로그 (`issue-log.txt`)
     - 환경 정보 (OS, Node.js 버전)

3. **Issue 링크**:
   → [GitHub Issues](https://github.com/enkeiko/workspace1/issues)

---

## ✅ 자주 확인할 사항

실행 전 체크리스트:

- [ ] Node.js 18 이상 설치됨
- [ ] `npm install` 완료
- [ ] `.env` 파일 존재 및 설정 완료
- [ ] `data/input/`, `data/output/` 디렉토리 존재
- [ ] 네트워크 연결 정상
- [ ] 디스크 공간 충분 (최소 1GB)

---

**문서 버전**: 1.0
**최종 업데이트**: 2025-11-14
**관련 문서**: [GETTING_STARTED.md](GETTING_STARTED.md) | [docs/FAQ.md](docs/FAQ.md)
