# 네이버 플레이스 키워드탐색 역공학 문서

> **원본 프로그램**: `2025-11-08 네이버 플레이스 키워드탐색.exe`  
> **원본 위치**: `C:\Users\enkei\workspace\2-done-project\Reward_Keyword_makers\`  
> **작성일**: 2025-12-26  

---

## 1. 프로그램 개요

네이버 플레이스(지도)에서 특정 업체(MID)가 노출되는 키워드를 자동으로 탐색하는 Windows Forms 애플리케이션입니다.

### 주요 기능
1. **정확매칭 키워드 추출**: 특정 업체가 검색 결과 상위에 정확히 노출되는 키워드 탐색
2. **자연유입 키워드 추출**: 업체가 자연스럽게 노출될 수 있는 연관 키워드 탐색
3. **Google Sheets 연동**: 결과를 Google Sheets로 자동 내보내기 기능

---

## 2. 기술 스택 분석

### 2.1 런타임 환경
- **.NET Framework 4.8** (Windows Forms)
- **Target Platform**: Windows x86/x64

### 2.2 의존 라이브러리

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| `HtmlAgilityPack.dll` | - | HTML 파싱 (네이버 검색 결과 분석) |
| `Newtonsoft.Json.dll` | - | JSON 직렬화/역직렬화 |
| `Google.Apis.dll` | - | Google API 기본 클라이언트 |
| `Google.Apis.Auth.dll` | - | Google OAuth 인증 |
| `Google.Apis.Sheets.v4.dll` | - | Google Sheets API v4 |
| `Google.Apis.Core.dll` | - | Google API 코어 기능 |

### 2.3 Python 대응 라이브러리

| C# 라이브러리 | Python 대응 |
|--------------|-------------|
| HtmlAgilityPack | `beautifulsoup4`, `lxml` |
| Newtonsoft.Json | `json` (내장) |
| Google.Apis.Sheets.v4 | `google-api-python-client`, `gspread` |
| System.Net.Http | `requests`, `httpx` |
| System.Windows.Forms | `tkinter`, `PyQt5`, `customtkinter` |

---

## 3. 설정 및 구성 파일

### 3.1 사용자 설정 (exe.config)

```xml
<userSettings>
    <setting name="Tbox_MID" serializeAs="String">
        <!-- 네이버 플레이스 업체 고유 ID -->
    </setting>
    <setting name="Num_랜덤추출수" serializeAs="String">
        <value>0</value>
    </setting>
    <setting name="Num_정확추출수" serializeAs="String">
        <value>0</value>
    </setting>
    <setting name="Num_최대조합수" serializeAs="String">
        <value>0</value>
    </setting>
    <setting name="Num_최대글자수" serializeAs="String">
        <value>0</value>
    </setting>
    <setting name="Num_자연매칭수" serializeAs="String">
        <value>0</value>
    </setting>
</userSettings>
```

### 3.2 설정 파라미터 설명

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `Tbox_MID` | string | 네이버 플레이스 업체 고유 ID (예: 1364961845) |
| `Num_랜덤추출수` | int | 랜덤으로 추출할 키워드 수 |
| `Num_정확추출수` | int | 정확매칭으로 추출할 키워드 수 |
| `Num_최대조합수` | int | 키워드 조합 시 최대 조합 수 |
| `Num_최대글자수` | int | 키워드 최대 글자 수 제한 |
| `Num_자연매칭수` | int | 자연유입 매칭으로 추출할 키워드 수 |

### 3.3 Google Sheets 인증 (시트.json)

Google Cloud Service Account 인증 파일로, `gspread` 또는 `google-api-python-client`에서 동일하게 사용 가능합니다.

```python
# Python에서 사용 예시
import gspread
from google.oauth2.service_account import Credentials

scopes = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]
creds = Credentials.from_service_account_file("시트.json", scopes=scopes)
client = gspread.authorize(creds)
```

---

## 4. 입력 파일 구조

### 4.1 목적키워드.txt
검색의 주요 타겟이 되는 업종/서비스 키워드 목록입니다.

```
누수탐지
에어컨수리
보일러수리
```

### 4.2 위치키워드.txt
지역명/동네명 키워드 목록입니다.

```
구로
신도림
영등포
```

### 4.3 추가키워드.txt
동의어/유사어 매핑 파일입니다. `=` 구분자로 원본 키워드와 확장 키워드를 연결합니다.

```
미용실=미용,헤어,헤어샵
돼지고기구이=음식점,음식집
```

**파싱 로직**:
```python
def parse_additional_keywords(filepath):
    mappings = {}
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            if '=' in line:
                key, values = line.strip().split('=', 1)
                mappings[key] = [v.strip() for v in values.split(',')]
    return mappings
```

---

## 5. 출력 파일 구조

### 5.1 결과 폴더
`결과/` 폴더에 MID별로 결과 파일이 생성됩니다.

### 5.2 출력 파일 형식

| 파일명 | 내용 |
|--------|------|
| `{MID} 자연유입 추출결과.txt` | 자연유입으로 노출되는 키워드 목록 (줄바꿈 구분) |
| `{MID} 정확매칭 추출결과.txt` | 정확매칭으로 노출되는 키워드 목록 (줄바꿈 구분) |

**예시 출력** (`1364961845 자연유입 추출결과.txt`):
```
구로누수탐지
구로천장누수
구로상가누수
```

---

## 6. 핵심 알고리즘 추정

### 6.1 키워드 조합 생성
```python
import itertools

def generate_keyword_combinations(locations, purposes, max_combinations, max_chars):
    """위치 + 목적 키워드 조합 생성"""
    combinations = []
    for loc, purpose in itertools.product(locations, purposes):
        keyword = f"{loc}{purpose}"
        if len(keyword) <= max_chars:
            combinations.append(keyword)
        if len(combinations) >= max_combinations:
            break
    return combinations
```

### 6.2 네이버 플레이스 검색 및 MID 확인
```python
import requests
from bs4 import BeautifulSoup

def search_naver_place(keyword):
    """네이버 플레이스에서 키워드 검색 후 결과 파싱"""
    url = f"https://m.place.naver.com/search?query={keyword}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    response = requests.get(url, headers=headers)
    # HTML 파싱 후 업체 목록 추출
    soup = BeautifulSoup(response.text, 'html.parser')
    # ... 업체 ID 추출 로직
    return place_ids

def check_mid_in_results(keyword, target_mid, top_n=10):
    """특정 MID가 검색 결과 상위 N개에 있는지 확인"""
    results = search_naver_place(keyword)
    for i, place_id in enumerate(results[:top_n]):
        if place_id == target_mid:
            return True, i + 1  # (발견 여부, 순위)
    return False, -1
```

### 6.3 정확매칭 vs 자연유입 분류
```python
def classify_keyword(keyword, target_mid):
    """키워드를 정확매칭/자연유입으로 분류"""
    found, rank = check_mid_in_results(keyword, target_mid)
    
    if not found:
        return None  # 미노출
    elif rank <= 3:
        return "정확매칭"  # 상위 3위 이내
    else:
        return "자연유입"  # 4위 이하 노출
```

---

## 7. Python 구현 권장 구조

```
naver_place_keyword_finder/
├── main.py                 # GUI 또는 CLI 진입점
├── config.py               # 설정 관리
├── crawler/
│   ├── __init__.py
│   ├── naver_place.py      # 네이버 플레이스 크롤러
│   └── parser.py           # HTML 파싱 로직
├── generator/
│   ├── __init__.py
│   └── keyword_combiner.py # 키워드 조합 생성
├── sheets/
│   ├── __init__.py
│   └── google_sheets.py    # Google Sheets 연동
├── data/
│   ├── 목적키워드.txt
│   ├── 위치키워드.txt
│   ├── 추가키워드.txt
│   └── 시트.json           # Google 인증 파일
└── 결과/                   # 출력 폴더
```

---

## 8. 필요 Python 패키지

```txt
# requirements.txt
requests>=2.28.0
beautifulsoup4>=4.11.0
lxml>=4.9.0
gspread>=5.7.0
google-auth>=2.16.0
google-api-python-client>=2.70.0
```

설치:
```bash
pip install -r requirements.txt
```

---

## 9. 주의 사항

### 9.1 크롤링 제한
- 네이버는 과도한 요청에 대해 IP 차단을 할 수 있습니다
- `time.sleep()` 등으로 요청 간격 조절 필요
- User-Agent 헤더 필수
- 가능하면 네이버 공식 API 사용 권장

### 9.2 API 변경
- 네이버 플레이스 검색 결과 HTML 구조는 수시로 변경됩니다
- 파싱 로직을 모듈화하여 유지보수 용이하게 구성해야 합니다

### 9.3 인증 파일 보안
- `시트.json` 파일에는 민감한 인증 정보가 포함되어 있습니다
- `.gitignore`에 추가하여 버전 관리에서 제외해야 합니다

---

## 10. 구현 우선순위

1. **[HIGH]** 핵심 크롤링 로직 (네이버 플레이스 검색 + MID 확인)
2. **[HIGH]** 키워드 조합 생성기
3. **[MEDIUM]** 결과 파일 저장
4. **[MEDIUM]** Google Sheets 연동
5. **[LOW]** GUI 구현 (CLI 우선으로 시작 권장)

---

## 부록: 원본 파일 목록

| 파일명 | 크기 | 설명 |
|--------|------|------|
| `2025-11-08 네이버 플레이스 키워드탐색.exe` | 115KB | 실행 파일 |
| `2025-11-08 네이버 플레이스 키워드탐색.pdb` | 122KB | 디버그 심볼 |
| `2025-11-08 네이버 플레이스 키워드탐색.exe.config` | 1.7KB | 설정 파일 |
| `시트.json` | 2.3KB | Google 서비스 계정 인증 |
| `목적키워드.txt` | 1B | 목적 키워드 (빈 파일) |
| `위치키워드.txt` | 1B | 위치 키워드 (빈 파일) |
| `추가키워드.txt` | 73B | 추가 키워드 매핑 |
