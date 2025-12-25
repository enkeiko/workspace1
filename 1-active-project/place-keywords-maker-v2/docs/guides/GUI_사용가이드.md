# Place Keywords Maker V2 - GUI 사용 가이드

## 개요

Place Keywords Maker V2의 새로운 GUI는 여러 매장을 효과적으로 관리하고, 크롤링 데이터를 시각화하며, 크롤링 이력을 추적할 수 있는 완전한 매장 관리 시스템입니다.

## 주요 기능

### 1. 매장 관리
- ✅ 매장 추가/삭제
- ✅ 매장 정보 관리 (Place ID, 이름, 카테고리, 주소, 전화번호, 메모)
- ✅ 매장별 상세 정보 조회
- ✅ SQLite 데이터베이스 기반 영구 저장

### 2. 데이터 수집 및 시각화
- ✅ 실시간 크롤링 진행 상황 모니터링
- ✅ 수집 데이터 요약 (평점, 리뷰 수, 메뉴, 경쟁업체, 키워드)
- ✅ 네이버 플레이스 경쟁업체 (최대 10개)
- ✅ 다이닝코드 경쟁업체 (최대 10개)
- ✅ 완성도 점수 자동 계산

### 3. 크롤링 이력 관리
- ✅ 매장별 크롤링 이력 추적
- ✅ 성공/실패 상태 관리
- ✅ 완성도 추이 분석
- ✅ 에러 로그 저장

## 시작하기

### 1. 서버 실행

```bash
cd 2-projects/place-keywords-maker-v2
node src/gui/server.js
```

서버가 시작되면 다음 메시지가 표시됩니다:

```
🚀 GUI Server started at http://localhost:3000
📊 Open your browser to view the dashboard
```

### 2. 브라우저 접속

웹 브라우저에서 다음 주소로 접속합니다:

```
http://localhost:3000
```

## 사용 방법

### 대시보드 탭

대시보드는 전체 시스템의 상태를 한눈에 보여줍니다:

- **전체 매장**: 등록된 총 매장 수와 활성 매장 수
- **총 크롤링**: 전체 크롤링 횟수와 성공률
- **평균 완성도**: 모든 크롤링의 평균 완성도 점수

**최근 크롤링 매장** 테이블:
- 매장명, Place ID
- 마지막 크롤링 시간
- 완성도 점수
- 경쟁업체 개수
- 크롤링 상태

### 매장 관리 탭

#### 매장 추가

1. "➕ 매장 추가" 버튼 클릭
2. 필수 정보 입력:
   - **Place ID** (필수): 네이버 플레이스 ID (예: 1716926393)
   - **매장명** (필수): 매장 이름
3. 선택 정보 입력:
   - 카테고리: 예) "샐러드,포케"
   - 주소
   - 전화번호
   - 메모
4. "추가" 버튼 클릭

#### 매장 삭제

1. 매장 목록에서 "삭제" 버튼 클릭
2. 확인 대화상자에서 "확인" 클릭
3. 매장과 관련된 모든 크롤링 이력이 함께 삭제됩니다

#### 매장 상세보기

1. 매장 목록에서 "상세" 버튼 클릭
2. 우측 패널에서 확인 가능한 정보:
   - **기본 정보**: Place ID, 카테고리, 주소, 전화번호
   - **최근 수집 데이터**:
     - 평점
     - 리뷰 수
     - 메뉴 개수
     - 네이버 경쟁업체 개수
     - 다이닝코드 경쟁업체 개수
     - 키워드 개수
   - **크롤링 이력**: 최근 5개 크롤링 기록

### 크롤링 실행 탭

#### 크롤링 시작

1. 크롤링할 매장 선택:
   - 개별 선택: 각 매장의 체크박스 클릭
   - 전체 선택: 상단 체크박스 클릭
2. "선택한 매장 크롤링 시작" 버튼 클릭
3. 확인 대화상자에서 "확인" 클릭

#### 실시간 모니터링

크롤링이 시작되면 "진행 상황" 섹션이 표시됩니다:

- **프로그레스 바**: 전체 진행률 시각화
- **진행 정보**: 현재/전체 매장 수
- **실시간 로그**:
  - 🔵 INFO: 일반 정보 (크롤링 시작, 진행 중)
  - ✅ SUCCESS: 성공한 작업
  - ❌ ERROR: 실패한 작업

### 크롤링 이력 탭

전체 크롤링 이력을 시간순으로 확인할 수 있습니다:

- 매장명
- Place ID
- 시작 시간
- 완료 시간
- 완성도 점수
- 상태 (success, failed, processing)

## 데이터 구조

### 데이터베이스 스키마

#### stores 테이블
```sql
- id: 자동 증가 ID
- place_id: 네이버 플레이스 ID (고유)
- name: 매장명
- category: 카테고리
- address: 주소
- phone: 전화번호
- status: 상태 (active, inactive, archived)
- notes: 메모
- created_at: 생성 시간
- updated_at: 수정 시간
```

#### crawl_history 테이블
```sql
- id: 자동 증가 ID
- store_id: 매장 ID (외래 키)
- place_id: 네이버 플레이스 ID
- status: 상태 (success, failed, processing)
- completeness: 완성도 점수 (0-100)
- error_message: 에러 메시지
- data_file_path: JSON 파일 경로
- started_at: 시작 시간
- completed_at: 완료 시간
```

#### crawl_summary 테이블
```sql
- id: 자동 증가 ID
- crawl_id: 크롤링 ID (외래 키)
- store_id: 매장 ID (외래 키)
- rating: 평점
- review_count: 총 리뷰 수
- visitor_review_count: 방문자 리뷰 수
- blog_review_count: 블로그 리뷰 수
- menu_count: 메뉴 개수
- naver_competitor_count: 네이버 경쟁업체 수
- diningcode_competitor_count: 다이닝코드 경쟁업체 수
- keyword_count: 키워드 개수
- has_diningcode: 다이닝코드 링크 유무
- has_catchtable: 캐치테이블 링크 유무
```

### 크롤링 결과 JSON

크롤링 결과는 다음 경로에 저장됩니다:

```
data/output/l1/{placeId}.json
```

JSON 구조 예시:
```json
{
  "placeId": "1716926393",
  "name": "라이브볼",
  "category": "샐러드,포케",
  "address": "서울 강남구...",
  "phone": "02-1234-5678",
  "rating": 4.5,
  "reviewCount": 1234,
  "menus": [...],
  "competitors": {
    "naver": [
      {
        "placeId": "2023037465",
        "name": "그린보이즈",
        "distance": "240m",
        "source": "naver_similar"
      }
    ],
    "diningcode": [
      {
        "rid": "Cc87FqrdJGhv",
        "name": "프로티너 역삼역점",
        "distance": "118m",
        "source": "diningcode_similar"
      }
    ]
  },
  "keywords": [...],
  "crawledAt": "2025-12-02T12:00:00.000Z"
}
```

## 완성도 점수 계산

완성도는 다음과 같이 계산됩니다:

- **기본 정보 (30점)**:
  - 이름: 5점
  - 카테고리: 5점
  - 주소: 5점
  - 전화번호: 5점
  - 평점: 5점
  - 리뷰 수: 5점

- **메뉴 정보 (20점)**:
  - 메뉴 1개 이상: 20점

- **경쟁업체 (20점)**:
  - 네이버 경쟁업체 1개 이상: 10점
  - 다이닝코드 경쟁업체 1개 이상: 10점

- **키워드 (15점)**:
  - 키워드 1개 이상: 15점

- **외부 플랫폼 (15점)**:
  - 외부 링크 1개 이상: 15점

**총점**: 100점

## API 엔드포인트

GUI는 다음 REST API를 제공합니다:

### GET /api/stats
전체 통계 조회

### GET /api/stores
매장 목록 조회 (최근 크롤링 정보 포함)

### POST /api/stores
매장 추가

### GET /api/stores/:placeId
매장 상세 조회

### DELETE /api/stores/:placeId
매장 삭제

### GET /api/stores/:placeId/summary
매장 최근 크롤링 요약

### GET /api/stores/:placeId/history
매장 크롤링 이력

### GET /api/history
전체 크롤링 이력

### POST /api/crawl
크롤링 시작

## 문제 해결

### 서버가 시작되지 않을 때

1. Node.js 버전 확인:
   ```bash
   node --version  # v18 이상 필요
   ```

2. 의존성 재설치:
   ```bash
   npm install
   ```

3. 포트 충돌 확인:
   - 기본 포트 3000이 사용 중이면 `.env` 파일에서 변경
   ```
   GUI_PORT=3001
   ```

### 크롤링이 실패할 때

1. Place ID가 유효한지 확인
2. 네트워크 연결 확인
3. 크롤링 이력 탭에서 에러 메시지 확인
4. 로그 파일 확인: `data/logs/`

### 데이터베이스 초기화

데이터베이스를 완전히 초기화하려면:

```bash
rm data/stores.db
```

서버를 재시작하면 새로운 데이터베이스가 자동으로 생성됩니다.

## 업데이트 내역

### v2.0 (2025-12-02)

#### 새로운 기능
- ✅ SQLite 기반 매장 관리 시스템
- ✅ 여러 매장 동시 관리
- ✅ 크롤링 이력 추적
- ✅ 실시간 진행 상황 모니터링
- ✅ 수집 데이터 시각화
- ✅ 완성도 점수 자동 계산
- ✅ 네이버 + 다이닝코드 경쟁업체 수집

#### 개선 사항
- ✅ 다이닝코드 경쟁업체 수집 로직 수정
- ✅ 공백 정규화 처리
- ✅ 업체명 클리닝 개선

## 관련 문서

- [DATA_COLLECTION_SPEC.md](DATA_COLLECTION_SPEC.md) - 수집 가능한 데이터 명세
- [DININGCODE_COMPETITOR_FIX.md](DININGCODE_COMPETITOR_FIX.md) - 다이닝코드 수집 개선 내역
- [README.md](README.md) - 프로젝트 전체 가이드

## 라이선스

MIT License
