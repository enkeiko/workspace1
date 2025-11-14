# 🚀 시작하기 (5분 퀵스타트)

Place Keywords Maker V2에 오신 것을 환영합니다!
이 가이드를 따라하면 **5분 안에** 첫 번째 키워드 분석을 실행할 수 있습니다.

---

## ✅ Prerequisites (사전 준비)

시작하기 전에 다음을 준비해주세요:

- **Node.js 18 이상** ([다운로드](https://nodejs.org/))
- **npm** (Node.js와 함께 설치됨)
- **네이버 API 키** (선택 사항 - Mock 모드로 테스트 가능)

---

## 📦 Step 1: 설치 (1분)

```bash
# 프로젝트 디렉토리로 이동
cd 2-projects/place-keywords-maker-v2

# 의존성 설치
npm install
```

**예상 시간**: 1분
**성공 확인**: `node_modules/` 폴더 생성됨

---

## ⚙️ Step 2: 환경 설정 (1분)

```bash
# 환경 변수 파일 생성
cp .env.example .env
```

`.env` 파일을 열어 다음을 설정합니다:

```env
# 네이버 API 키 (있으면 입력, 없으면 Mock 모드로 테스트 가능)
NAVER_CLIENT_ID=your_client_id_here
NAVER_CLIENT_SECRET=your_client_secret_here

# AI API 키 (선택 사항)
AI_API_KEY=your_ai_api_key_here
```

**Mock 모드 사용 시**: API 키 없이 테스트 데이터로 실행 가능 (Step 3 참조)

---

## 🎯 Step 3: 첫 번째 분석 실행 (3분)

### Option A: Mock 모드 (API 키 불필요)

```bash
npm run l1 -- --mock
```

### Option B: 실제 데이터 수집

```bash
npm run l1
```

**실행 결과**:
```
[INFO] L1 파이프라인 시작...
[INFO] 데이터 수집 중... (30초 소요)
[INFO] 완성도 평가 중...
[SUCCESS] L1 완료! 결과: data/output/collected_data_l1.json
```

**출력 파일 위치**:
- `data/output/collected_data_l1.json` - 수집된 데이터
- `logs/l1-[timestamp].log` - 실행 로그

---

## 📊 Step 4: 결과 확인

### CLI로 확인
```bash
cat data/output/collected_data_l1.json
```

### GUI로 확인 (권장)
```bash
npm run gui
```

브라우저에서 `http://localhost:3000` 열기

---

## 🎉 축하합니다!

첫 번째 키워드 분석을 완료했습니다! 🎊

### 다음 단계

| 단계 | 설명 | 소요 시간 |
|------|------|----------|
| **L2 분석** | AI 기반 키워드 추천 | 5분 |
| **L3 전략** | 최종 키워드 전략 생성 | 3분 |

```bash
# L2 실행
npm run l2

# L3 실행
npm run l3
```

---

## 📖 더 알아보기

### 사용 예제
→ [EXAMPLES.md](EXAMPLES.md) - 다양한 시나리오별 사용법

### 문제 해결
→ [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 자주 발생하는 문제 해결

### 아키텍처 이해
→ [docs/architecture/overview.md](docs/architecture/overview.md) - 시스템 구조

### 개발자 가이드
→ [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) - 코드 구조 및 API

---

## 🆘 도움이 필요하신가요?

### 자주 묻는 질문
→ [docs/FAQ.md](docs/FAQ.md)

### 문제 발생 시
→ [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### 이슈 제기
→ [GitHub Issues](https://github.com/enkeiko/workspace1/issues)

---

## ⚡ 빠른 참조

### 주요 명령어
```bash
npm run l1          # L1 파이프라인 실행
npm run l2          # L2 파이프라인 실행
npm run l3          # L3 파이프라인 실행
npm run gui         # GUI 웹 대시보드 실행
npm test            # 테스트 실행
npm run test:coverage  # 테스트 커버리지
```

### 디렉토리 구조
```
place-keywords-maker-v2/
├── data/
│   ├── input/       # 입력 데이터
│   └── output/      # 결과 파일
├── src/
│   ├── pipelines/   # L1/L2/L3 파이프라인
│   └── modules/     # 재사용 모듈
└── docs/            # 상세 문서
```

---

**문서 버전**: 1.0
**최종 업데이트**: 2025-11-14
**예상 완료 시간**: 5분
