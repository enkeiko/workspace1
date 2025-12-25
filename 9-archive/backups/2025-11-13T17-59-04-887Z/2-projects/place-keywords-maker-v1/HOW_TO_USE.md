# 🚀 Place_Keywords_maker 사용법

> **VSCode 없이 쉽게 사용하기**

---

## ⭐ 가장 쉬운 방법 (추천)

### 방법 1: START.bat 사용

```
1. Place_Keywords_maker 폴더 열기
2. START.bat 더블클릭
3. 메뉴에서 숫자 선택
4. 완료!
```

**위치**: `C:\Users\Nk Ko\Documents\workspace\Place_Keywords_maker\START.bat`

---

## 📋 다른 사용 방법들

### 방법 2: 명령 프롬프트 (CMD)

```cmd
REM 1. Win + R 누르기
REM 2. cmd 입력 후 엔터

REM 3. 폴더 이동
cd "C:\Users\Nk Ko\Documents\workspace\Place_Keywords_maker"

REM 4. 명령 실행
node src/main.js l1              REM L1 실행
node src/main.js l1 1768171911   REM L1 + 크롤링
node src/main.js l2              REM L2 실행
node src/main.js l3              REM L3 실행
node src/main.js start           REM 전체 실행
```

### 방법 3: GUI 서버 (웹 브라우저)

```cmd
REM 1. START.bat 실행
REM 2. 메뉴에서 6번 선택
REM 3. 브라우저에서 http://localhost:3000 접속
```

---

## 🎯 바로가기 만들기

### 바탕화면에 바로가기 추가

**1. START.bat 바로가기**
```
1. START.bat 우클릭 → 바로가기 만들기
2. 바로가기를 바탕화면으로 이동
3. 이름: "Keywords Maker"
4. 완료!
```

**2. GUI 바로가기**
```
1. 바탕화면 우클릭 → 새로 만들기 → 바로가기
2. 위치 입력:
   cmd.exe /k "cd /d C:\Users\Nk Ko\Documents\workspace\Place_Keywords_maker && node src/gui-server.js"
3. 이름: "Keywords Maker GUI"
4. 완료!
```

---

## 📊 실행 결과 확인

### 결과 파일 위치

```
Place_Keywords_maker/data/output/

├── l1/                    ← L1 결과
│   ├── data_collected_l1.json
│   └── keyword_elements_l1.json
│
├── l2/                    ← L2 결과
│   ├── target_keywords_l2.json
│   └── keyword_report_l2.csv
│
└── l3/                    ← L3 최종 결과
    ├── final_keywords.json
    └── keyword_strategy.md
```

### 결과 열기

```cmd
REM 탐색기에서 열기
start data\output\l3

REM 크롬으로 JSON 보기
start chrome data\output\l3\final_keywords.json
```

---

## 🚨 문제 해결

### "node를 찾을 수 없습니다"

**해결**: Node.js 설치 필요
- https://nodejs.org 에서 다운로드
- LTS 버전 설치

### "모듈을 찾을 수 없습니다"

**해결**:
```cmd
cd "C:\Users\Nk Ko\Documents\workspace\Place_Keywords_maker"
npm install
```

### "E_L1_001: 크롤러 JSON이 없습니다"

**해결**:
```cmd
REM 크롤링 실행
node src/main.js l1 1768171911
```

---

## 💡 요약

| 방법 | 명령 |
|------|------|
| 가장 쉬움 | `START.bat` 더블클릭 |
| 빠른 실행 | `cmd` → `cd Place_Keywords_maker` → `node src/main.js l1` |
| GUI 사용 | `START.bat` → 메뉴 6번 → 브라우저 접속 |

---

**추천: START.bat 바로가기를 바탕화면에 만들어두세요! 🚀**
