# Quick Start Guide - Naver Place SEO Automation

**네이버 플레이스 SEO 자동화 도구 v1.0** - 빠른 시작 가이드

---

## 📋 목차

1. [설치 및 설정](#설치-및-설정)
2. [기본 사용법](#기본-사용법)
3. [전체 파이프라인 실행](#전체-파이프라인-실행)
4. [출력 결과 확인](#출력-결과-확인)
5. [문제 해결](#문제-해결)

---

## 설치 및 설정

### 1. 필수 요구사항

- **Node.js**: v18.0.0 이상
- **npm**: 패키지 관리
- **운영체제**: Windows / macOS / Linux

### 2. 패키지 설치

```bash
# 프로젝트 루트에서 실행
npm install

# Playwright 브라우저 설치
npx playwright install chromium
```

### 3. 설정 파일 확인

기본 설정이 이미 구성되어 있습니다:
- `local.config.yml` - 메인 설정 파일
- `.env.example` - API 키 템플릿 (선택사항)

**Mock Mode 활성화됨**: API 키 없이 바로 사용 가능!

---

## 기본 사용법

### L1: 데이터 수집

네이버 플레이스에서 업체 정보를 수집합니다.

```bash
# 단일 업체 처리
node src/main.js l1 --place-id 1768171911

# 여러 업체 처리 (place_ids.txt 사용)
node src/main.js l1

# 캐시 무시하고 재크롤링
node src/main.js l1 --place-id 1768171911 --force-refresh
```

**출력**:
- `data/output/l1/data_collected_l1.json` - 수집된 원본 데이터
- `data/output/l1/keyword_elements_l1.json` - 추출된 키워드 요소

### L2: AI 키워드 분석

L1 데이터를 분석하여 키워드 후보를 생성합니다.

```bash
# 기본 실행 (Mock AI 사용)
node src/main.js l2

# 특정 L1 디렉토리 지정
node src/main.js l2 --input data/output/l1/

# AI 분석 비활성화 (검색량만 사용)
node src/main.js l2 --no-ai
```

**출력**:
- `data/output/l2/target_keywords_l2.json` - 키워드 후보 및 분석 결과

### L3: 최종 전략 생성

키워드를 점수화하고 적용 가이드를 생성합니다.

```bash
# 기본 실행
node src/main.js l3

# 특정 L2 파일 지정
node src/main.js l3 --input data/output/l2/target_keywords_l2.json
```

**출력**:
- `data/output/l3/keyword_strategy.json` - 최종 전략 및 적용 가이드

---

## 전체 파이프라인 실행

### 단계별 실행 (권장)

```bash
# Step 1: 데이터 수집
npm run l1 -- --place-id YOUR_PLACE_ID

# Step 2: 키워드 분석
npm run l2

# Step 3: 전략 생성
npm run l3
```

### 테스트용 샘플 실행

```bash
# 샘플 데이터로 전체 파이프라인 테스트
node src/main.js l1 --place-id 1768171911 && \
node src/main.js l2 && \
node src/main.js l3
```

실행 시간: **약 10초** (Mock Mode)

---

## 출력 결과 확인

### CLI 출력 예시

```
✅ L3 Processing Complete!

📊 Results:
   Place 1768171911:
     Primary Keywords (5):
       1. 강남역 닭갈비 (score: 70.86, volume: 6466)
       2. 포장 닭갈비 (score: 72.92, volume: 6981)
       3. 강남구 철판닭갈비 (score: 69.02, volume: 6004)
       ...

     Strategy:
       - Focus: short_term
       - Approach: 검색량이 높은 키워드로 빠른 유입 확대
       - Expected Impact: 점진적인 검색 노출 개선
```

### JSON 파일 확인

```bash
# jq 설치 후 사용 (선택)
cat data/output/l3/keyword_strategy.json | jq .

# 적용 가이드만 확인
cat data/output/l3/keyword_strategy.json | \
  jq '.places."1768171911".application_guide'

# Primary 키워드만 확인
cat data/output/l3/keyword_strategy.json | \
  jq '.places."1768171911".primary_keywords'
```

### 적용 가이드 확인

`data/output/l3/keyword_strategy.json` 파일의 `application_guide` 섹션에서 6단계 실행 가이드 확인:

1. 네이버 플레이스 관리자 접속
2. 업체 정보 수정
3. 메뉴/상품 최적화
4. 사진 및 게시글 업로드
5. 리뷰 답글 활용
6. 효과 모니터링

---

## 입력 데이터 준비

### Place ID 찾기

1. 네이버에서 업체 검색
2. URL에서 ID 확인: `https://m.place.naver.com/place/1768171911/home`
3. 숫자 부분이 Place ID: `1768171911`

### 파일 기반 입력

**data/input/place_ids.txt**
```
# 처리할 Place ID 목록 (한 줄에 하나씩)
1768171911
1265317185
```

**data/input/current_keywords.json** (선택사항)
```json
{
  "1768171911": {
    "primary_keywords": ["강남 닭갈비", "히도 강남점"],
    "secondary_keywords": ["강남 맛집"],
    "performance": {
      "avg_monthly_searches": 5000,
      "avg_click_rate": 0.15
    }
  }
}
```

**data/input/manual_notes.json** (선택사항)
```json
{
  "1768171911": {
    "target_keywords": ["닭갈비", "강남맛집"],
    "special_notes": "런치 세트 인기, 직장인 고객 많음",
    "business_goals": "회식 고객 확대",
    "station": "강남역"
  }
}
```

---

## 추가 명령어

### 설정 확인

```bash
node src/main.js config
```

출력:
- Mock Mode 상태
- 경로 설정
- 크롤러 설정

### 시스템 정보

```bash
node src/main.js info
```

출력:
- Node.js 버전
- 플랫폼 정보
- 메모리 사용량

### 도움말

```bash
node src/main.js --help
node src/main.js l1 --help
```

---

## 문제 해결

### Q1: "UNMET DEPENDENCIES" 오류

```bash
# 해결: 패키지 재설치
rm -rf node_modules package-lock.json
npm install
```

### Q2: "Bot detection" 에러 (E_L1_003)

**원인**: 네이버가 크롤러를 감지했습니다.

**해결책**:
1. 캐시된 데이터 사용 (권장)
   ```bash
   # data/input/places-advanced/에 샘플 파일 생성
   # place-{PLACE_ID}-FULL.json 형식
   ```

2. 재시도 간격 조정
   - `local.config.yml`에서 `bot_detection_wait` 증가 (기본: 30초)

3. Mock 모드로 테스트
   - 이미 활성화되어 있음 (`mock_mode: true`)

### Q3: AI API 에러 (E_L2_001)

**현재 상태**: Mock Mode가 기본 활성화되어 있어 API 키 불필요

**실제 AI 사용 시**:
1. `.env` 파일 생성
   ```bash
   cp .env.example .env
   ```

2. API 키 설정
   ```env
   OPENAI_API_KEY=sk-...
   # 또는
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. `local.config.yml`에서 Mock Mode 비활성화
   ```yaml
   ai:
     mock_mode: false
   ```

### Q4: 출력 파일이 없음

```bash
# 디렉토리 확인
ls -la data/output/l1/
ls -la data/output/l2/
ls -la data/output/l3/

# 로그 확인
tail -50 data/logs/combined.log
```

### Q5: 메모리 부족 (E_SYS_004)

**해결**:
- 배치 크기 감소: `--no-batch` 옵션 사용
- 병렬 처리 수 조정: `local.config.yml`의 `max_concurrent_crawls` 감소

---

## 고급 사용법

### 배치 처리

```bash
# place_ids.txt에 여러 ID 추가
echo "1768171911" > data/input/place_ids.txt
echo "1265317185" >> data/input/place_ids.txt

# 배치 실행
node src/main.js l1
```

### 순차 처리 (안전 모드)

```bash
# 병렬 처리 비활성화
node src/main.js l1 --no-batch
```

### 로그 스트리밍

```bash
# 별도 터미널에서 실시간 로그 확인
tail -f data/logs/combined.log
```

---

## 성능 최적화

### Mock Mode (기본)
- **속도**: 매우 빠름 (초당 10+ 업체)
- **비용**: 무료
- **정확도**: 테스트용

### Real API Mode
- **속도**: 느림 (Rate Limit 적용)
- **비용**: API 요금 발생
- **정확도**: 실제 데이터

### 권장 설정

```yaml
# local.config.yml
crawler:
  max_retries: 3
  bot_detection_wait: 30000  # 30초
  timeout: 30000

performance:
  max_concurrent_crawls: 5  # 동시 크롤링 수

naver:
  rate_limit: 10  # 초당 요청 수
```

---

## 다음 단계

1. **샘플 실행**: 제공된 Place ID로 전체 파이프라인 테스트
2. **실제 데이터**: 본인 업체 ID로 실행
3. **결과 적용**: L3 출력의 `application_guide` 참고하여 네이버 플레이스 최적화
4. **효과 측정**: 2-4주 후 검색 유입 확인

---

## 지원 및 문서

- **전체 문서**: `README.md`
- **아키텍처**: `1-planning/docs/architecture/`
- **API 레퍼런스**: `1-planning/docs/api/`
- **이슈 보고**: GitHub Issues

---

**버전**: 1.0.0
**최종 업데이트**: 2025-11-12
**라이선스**: MIT
