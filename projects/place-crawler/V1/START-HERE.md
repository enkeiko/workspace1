# 🚀 네이버 플레이스 크롤러 V1

## 📁 위치
```
C:\Users\Nk Ko\Documents\workspace\Place_Crawler\V1\
```

---

## ⚡ 빠른 시작

### 1️⃣ 폴더 이동

```bash
cd "C:\Users\Nk Ko\Documents\workspace\Place_Crawler\V1"
```

### 2️⃣ 실행

```bash
node run-scraper.js <플레이스ID>
```

**예시:**
```bash
node run-scraper.js 1768171911
```

---

## 📋 파일 목록

### 🔥 핵심 프로그램

- **run-scraper.js** - 메인 프로그램 (이것만 사용!)
- **ultimate-scraper.js** - 데이터 파서
- **gui-server.js** - GUI 서버
- **gui-app.html** - 웹 인터페이스
- **batch-scraper.js** - 배치 수집

### 📄 설정 파일

- **place-ids.txt** - 플레이스 ID 목록

### 📖 문서

- **README.md** - 메인 가이드 ⭐
- **COMPLETE-GUIDE.md** - 완전 가이드
- **GUI-사용법.md** - GUI 가이드
- **START-HERE.md** - 이 파일

### 📁 결과 폴더

- **places-advanced/** - 수집된 데이터 저장 폴더

---

## 🎯 사용 방법

### 방법 1: 단일 수집 (추천!)

```bash
cd "C:\Users\Nk Ko\Documents\workspace\Place_Crawler\V1"
node run-scraper.js 1768171911
```

결과: `places-advanced/place-1768171911-FULL.json`

---

### 방법 2: GUI 사용

```bash
cd "C:\Users\Nk Ko\Documents\workspace\Place_Crawler\V1"
node gui-server.js
```

브라우저에서: `http://localhost:3000`

---

### 방법 3: 배치 수집

```bash
cd "C:\Users\Nk Ko\Documents\workspace\Place_Crawler\V1"
node batch-scraper.js 1768171911 1265317185
```

또는 파일에서:
```bash
node batch-scraper.js --file place-ids.txt
```

---

## 📍 플레이스 ID 찾기

네이버 지도 URL에서:
```
https://map.naver.com/p/entry/place/1768171911
                                    ^^^^^^^^^^
                                    이 숫자가 ID
```

---

## 📊 수집되는 정보

✅ 기본: 이름, 주소, 전화번호, 좌표
✅ 메뉴: 이름, 가격, 설명, 추천, 이미지 (완벽)
✅ 리뷰: 평점, 블로그 리뷰 전문 (완벽)
✅ 이미지: 메뉴 사진 URL
✅ 기타: 편의시설, 결제, 주차

---

## 📖 더 알아보기

- **README.md** - 기본 사용법
- **COMPLETE-GUIDE.md** - 상세 가이드
- **GUI-사용법.md** - GUI 사용법

---

## 🎉 시작하기

```bash
# 1. 폴더 이동
cd "C:\Users\Nk Ko\Documents\workspace\Place_Crawler\V1"

# 2. 실행
node run-scraper.js 1768171911

# 3. 결과 확인
# places-advanced/place-1768171911-FULL.json
```

**즐거운 데이터 수집 되세요! 🚀**
