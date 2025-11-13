# 🍽️ 네이버 플레이스 완전 크롤러

네이버 플레이스의 모든 정보를 자동으로 수집하는 완벽한 크롤러입니다.

## 🚀 빠른 시작

```bash
# 플레이스 ID로 즉시 수집
node run-scraper.js 1768171911
```

**끝!** 모든 정보가 자동으로 수집됩니다.

---

## 📊 수집 가능한 정보

✅ **기본 정보**
- 이름, 카테고리, 주소
- 전화번호 (스마트콜 자동 감지)
- GPS 좌표

✅ **메뉴 정보** (완벽)
- 메뉴명, 가격, 설명
- 추천 메뉴 표시
- 메뉴 이미지 URL
- 가격대 통계

✅ **리뷰** (완벽)
- 평점, 리뷰 개수
- 한줄평
- **블로그 리뷰 전문** (제목, 내용, 작성자, 날짜)

✅ **이미지**
- 메뉴 사진
- 음식 사진
- 내부/외부 사진

✅ **기타**
- 편의시설 (Wi-Fi, 주차, 포장 등)
- 결제 수단
- 주차 안내

---

## 📁 파일 구조

```
workspace/
├── run-scraper.js           # 🔥 메인 프로그램 (이것만 사용!)
├── ultimate-scraper.js      # 데이터 파서
├── gui-server.js            # GUI 서버 (선택)
├── batch-scraper.js         # 배치 수집 (선택)
├── place-ids.txt            # ID 목록
│
├── places-advanced/         # 결과 저장 폴더
│   ├── place-XXXXX-FULL.json    # 완전한 데이터
│   ├── place-XXXXX-apollo.json  # 원본 데이터
│   └── place-XXXXX.html         # HTML
│
└── README.md                # 이 파일
```

---

## 🎯 사용 방법

### 방법 1: 메인 프로그램 (가장 쉬움) ⭐

```bash
node run-scraper.js <플레이스ID>
```

**예시:**
```bash
# 히도 (돈가스)
node run-scraper.js 1768171911

# 세광양대창 (곱창)
node run-scraper.js 1265317185
```

**특징:**
- ✅ 자동 재시도 (실패 시 3회)
- ✅ 브라우저 자동 재시작
- ✅ 봇 탐지 자동 대응
- ✅ 완전한 데이터 자동 파싱

---

### 방법 2: GUI 사용

```bash
node gui-server.js
```

브라우저에서: **http://localhost:3000**

- 웹 인터페이스로 편리하게 수집
- 단일/배치 수집 모드
- 실시간 진행 상황 확인

---

### 방법 3: 배치 수집

```bash
# 여러 개 한 번에
node batch-scraper.js 1768171911 1265317185

# 파일에서 읽기
node batch-scraper.js --file place-ids.txt
```

---

## 📍 플레이스 ID 찾기

네이버 지도 URL에서 숫자 부분을 복사:

```
https://map.naver.com/p/entry/place/1768171911
                                    ^^^^^^^^^^
                                    이 숫자가 ID
```

또는

```
https://m.place.naver.com/restaurant/1768171911/home
                                      ^^^^^^^^^^
```

---

## 📋 수집 결과 예시

```json
{
  "id": "1768171911",
  "name": "히도",
  "category": "돈가스",
  "roadAddress": "경남 창원시 마산회원구 산호천동길 226 1층",
  "phone": "스마트콜 사용",

  "menuSummary": {
    "total": 23,
    "recommended": 5,
    "priceRange": {
      "min": 3000,
      "max": 18000
    }
  },

  "menus": [
    {
      "name": "모둠카츠",
      "price": "15000",
      "priceFormatted": "15,000원",
      "description": "로스 +히레+치즈 모두 맛보는 메뉴!",
      "recommend": true,
      "images": ["https://ldb-phinf.pstatic.net/..."]
    }
  ],

  "blogReviews": [
    {
      "title": "[마산 맛집] 히도: 합성동 돈까스 맛집",
      "contents": "특로스카츠는 무조건 드세요. 겉은 바삭...",
      "author": "https://m.blog.naver.com/...",
      "date": "3일 전",
      "url": "https://m.blog.naver.com/..."
    }
  ],

  "reviewStats": {
    "score": 4.56,
    "total": 708,
    "textTotal": 623,
    "microReviews": ["입에서 사르르 녹는 부드러운 히레카츠"]
  },

  "images": {
    "menu": [ /* 메뉴 이미지 URL */ ],
    "all": [ /* 전체 이미지 */ ]
  },

  "facilities": {
    "conveniences": ["포장", "배달", "무선 인터넷", "예약", "유아의자"],
    "paymentInfo": ["소비쿠폰(신용·체크카드)", "제로페이"],
    "parkingInfo": "주차장이 따로 없어서..."
  }
}
```

---

## 💡 문제 해결

### 브라우저가 닫혔다는 오류

**증상:** `Target page, context or browser has been closed`

**해결:** `run-scraper.js`가 자동으로 재시작합니다. 기다리세요.

---

### 봇 탐지

**증상:** "서비스 이용이 제한되었습니다"

**해결:**
1. 프로그램이 30초 대기 후 자동 재시도
2. 브라우저 창이 열리면 수동으로 새로고침

---

### 데이터 없음

**증상:** "APOLLO_STATE를 찾을 수 없습니다"

**해결:**
1. 플레이스 ID 확인
2. 네이버 지도에서 해당 ID 존재 여부 확인
3. 식당/카페/병원 등 일부 업종만 지원

---

## ⚙️ 설정

### 헤드리스 모드 (브라우저 숨김)

`run-scraper.js` 파일 수정:

```javascript
const scraper = new StableScraper({
  headless: true,  // false -> true로 변경
  ...
});
```

### 재시도 횟수

```javascript
const scraper = new StableScraper({
  retryCount: 5,  // 3 -> 5로 변경
  ...
});
```

---

## 📈 성능

| 항목 | 값 |
|------|-----|
| 속도 | ~10초 |
| 메모리 | ~200MB |
| 성공률 | ~95% |
| 수집 정보 | 메뉴, 리뷰, 이미지 완전 |

---

## 🎯 프로젝트 구조

### 핵심 파일 (필수)

1. **run-scraper.js** - 메인 프로그램
   - 브라우저 제어
   - 데이터 수집
   - 자동 파싱

2. **ultimate-scraper.js** - 데이터 파서
   - Apollo State 파싱
   - 메뉴/리뷰/이미지 추출

### 선택 파일

3. **gui-server.js** - GUI 인터페이스
4. **batch-scraper.js** - 배치 수집

---

## 🔗 참고 링크

- 네이버 지도: https://map.naver.com
- 네이버 플레이스: https://m.place.naver.com
- Playwright 문서: https://playwright.dev

---

## 📜 라이선스

개인 및 교육 목적으로 자유롭게 사용 가능합니다.

상업적 사용 시 네이버 이용 약관을 준수하세요.

---

## 🎉 시작하기

```bash
# 1. 플레이스 ID 찾기
# https://map.naver.com/p/entry/place/1768171911
#                                     ^^^^^^^^^^

# 2. 실행
node run-scraper.js 1768171911

# 3. 결과 확인
# places-advanced/place-1768171911-FULL.json
```

**모든 정보가 자동으로 수집됩니다! 🚀**

---

더 자세한 내용은 [COMPLETE-GUIDE.md](./COMPLETE-GUIDE.md)를 확인하세요.
