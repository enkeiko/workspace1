# -*- coding: utf-8 -*-
"""
네이버 smartplace GraphQL(categories)로 업종 코드 크롤링
- 사용자 제공 쿠키/헤더 사용
- BFS로 검색 키워드 확장, 최대 요청 캡을 걸어 타임아웃 방지
- 결과: category_token_result.json, category_token_result.tsv
"""
import requests
import time
import json
import sys
from collections import deque
from pathlib import Path

# Windows 기본 콘솔(cp949)에서 한글/기호가 깨지지 않도록 UTF-8로 재설정
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

TARGET_URL = "https://new.smartplace.naver.com/graphql?opName=categories"
CONFIG_FILE = Path(__file__).parent / "runtime_config.json"

USER_COOKIE = 'NNB=IV7SUWHXYQMGS; NAC=j7YxB0Qz1Psh; CBI_SES=p2kWg5X/a9nh8HxKd72mM6smJ99B5Vr61B702eAg4/nHftVSzXoKWUHZf+0OeOVhQ/CGd+++z/RsHkjGpTrLb8Ha4JoNhhabYLeLT2fv9Mb2sIzpT+jzIVhW467q3gWlHix7PD9nQ2AbbhJB0qF3X0Mzjh69V+4ipBw8Ep65wbF9oK9u3az42EsxgvRIqgzpyoYLxlkI6zDuPiSzUjfVHJyMP1SPvxwgwrZrvo5TJIm0PvYSkXKr2ewdW38OVH/dq5iYWIrBkwMShnHAEdRsThUDb7NORNPiQPOZlc8A8BgPBvZIw4Qoc1VsQeYStsIgvdFUNiAcNcPb2OH/5A09zmIL1xk7y2q7gTUNKHyxGEVIqmeD4w6VC14U2BZqfMz8MIxuH/5rRSBzRqL6HnD4wCDgCgZwQF4FcwnCf0tRHPo7OHxU9Tc5iiGVaMCJXZz7; CBI_CHK=\"r5V0mf9uRUZHZ/vmLGy3ez7f4/k4aqWXL5o03eN68fqFnx+6x21/uaZrHTUzbK/8UwnCK4T6evQ2PqeyHeFkuRh+DcutoYMMSILq53HD0Wq/Vy+ZLA1t+Oa/u+/bWIXGma0BL6V574SaB89iBqFk+EvMrgeKHGeeu4U/Q6Wqu2M=\"; ASID=afd14a610000019a90c872d200000024; nid_inf=1392559216; NID_AUT=vbGUPY2IdILTiVDDStCvb5z7DluTt/BXkeSyP9es9eZ1oc+/vaQHRkA1jF1X6nCJ; NACT=1; MM_PF=SEARCH; SRT30=1763620459; SRT5=1763620459; _naver_usersession_=UWsRK47vux8+p8irQnhLXg==; page_uid=jeI3Csqo1SCss7ZRPqNssssss8d-033344; csrf_token=cc652a3eb45ae8597cb9c249e83d73c83a97c36771b4066a34d1c14016fc87f868fe799659ba7748d314572f970a191f71817eb6123aeffc244a4c93be2eb8cd; JSESSIONID=BD02B1D257096A8946FCE8D18C1B4435; NID_SES=AAABqwCZXajhacbO/u+WIVeEwUZhlRKmcxvwgxZVQ+ROQcYNLL1w0AGnvLbQT7nDB5I6P9zAlkVHXejG/15G0o88VqPPcYLeNUl+QVQUdzGmngskR3Jf4qGXB+RbUNB5y6B4amE8BybXeHNhTUuxFOTDrA+qJutm+qeg1dpT9/yO9p84vTTPZ6+DYO7fExW1lkrKQvJ4I+buLT+X2Ig34ReqeetrIl7XWGTUjJtIKggG1P1gt/VJgxflPge8Poh009sCp6fyrlibJGk/lN1601dbJ8R6ycosdIXpQ8cC5BcQC8l2vCzyTxMQ30B1MjkR/Fzw+x8IHrcyTkn+he5qiJ69/I1XKaBrTWAHXOJDQzuOKgx+kDaIEVzs2/aPowipf9YQmNGpt7H2JDg6V00liQIxFvMqiivk1Qa0/bZR6NCMIRaA7/Ee4393iyQuJBqL61LqbzPfIwrR1hYojEfPYX5viAvqr+/W7btJtKxMzu2ZeFJVVyQS0bKWleLuhRqMB/spgWWBQWsSG38+TXYKgBugtrvGxCI8XjCN2uKVryScFqEyeMc0ovoEGmCE9oM9ZpApkQ==; BUC=mVbxHis3qmFcmuQF7hOXUonvXqjUtmnAjvVxTNoSXpo='

HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    "Cookie": USER_COOKIE,
    "from-system": "smartplace",
    "origin": "https://new.smartplace.naver.com",
    "referer": "https://new.smartplace.naver.com/bizes/place/11443550/details?bookingBusinessId=1442038&menu=basic"
}

# runtime_config.json 에 cookie 키가 있으면 덮어씀
try:
    cfg = json.loads(CONFIG_FILE.read_text(encoding="utf-8")) if CONFIG_FILE.exists() else {}
    if cfg.get("cookie"):
        HEADERS["Cookie"] = cfg["cookie"]
except Exception:
    pass

# login 쿠키가 없으면 익명 쿠키라도 받아오기
def ensure_anon_cookie():
    if HEADERS.get("Cookie"):
        return
    try:
        r = requests.get("https://map.naver.com/v5/", timeout=8)
        if r.cookies:
            cookie_str = "; ".join([f"{c.name}={c.value}" for c in r.cookies])
            HEADERS["Cookie"] = cookie_str
    except Exception:
        pass

ensure_anon_cookie()

# runtime_config.json 에 cookie 키가 있으면 덮어씀
try:
    cfg = json.loads(CONFIG_FILE.read_text(encoding="utf-8")) if CONFIG_FILE.exists() else {}
    if cfg.get("cookie"):
        HEADERS["Cookie"] = cfg["cookie"]
except Exception:
    pass

REQ_TIMEOUT = 8
# CLI 실행 제한(120초) 안에 끝내기 위해 요청 수/지연을 보수적으로 조정
MAX_REQUESTS = 80   # 한 세션 최대 요청 수
DELAY = 0.5         # 요청 간 지연(초)
PARTIAL_EVERY = 10
COOLDOWN_EVERY = 40  # 이 횟수마다 긴 쿨다운
COOLDOWN_SEC = 30    # 쿨다운 시간(초)
OUT_JSON = Path("category_token_result.json")
OUT_TSV = Path("category_token_result.tsv")


def fetch_categories(keyword, leaf=False):
    query_payload = """
    query categories($getCategoriesInput: GetCategoriesInput!) {
      categories(input: $getCategoriesInput) {
        categoryId
        categoryName
        lPath
      }
    }
    """
    variables = {
        "getCategoriesInput": {
            "search": keyword,
            "isPbpUse": True,
            "isLeafCategory": leaf,
            "isSearchUse": True,
            "isUnlimited": True,
            "isUseKeywordLikeMatch": False
        }
    }
    payload = {
        "operationName": "categories",
        "variables": variables,
        "query": query_payload
    }
    response = requests.post(TARGET_URL, headers=HEADERS, json=payload, timeout=REQ_TIMEOUT)
    if response.status_code == 200:
        return response.json().get("data", {}).get("categories", [])
    else:
        print(f" Error Code: {response.status_code} / Message: {response.text[:120]}")
        return []


def main():
    seed_keywords = [
        "음식점", "카페", "유흥주점", "미용", "세탁", "수리", "인테리어", "부동산",
        "병원", "약국", "동물병원", "산후조리원", "학원", "학교", "독서실",
        "슈퍼마켓", "쇼핑몰", "가구", "서점", "자동차", "스포츠", "골프", "레저",
        "숙박", "여행사", "법무", "세무", "광고", "제조", "운송", "주유소", "관공서", "종교"
    ]

    # 이전 결과 이어받기
    collected_codes = {}
    if OUT_JSON.exists():
        try:
            old = json.loads(OUT_JSON.read_text(encoding="utf-8"))
            for c in old.get("categories", []):
                cid = c.get("id") or c.get("categoryId")
                collected_codes[cid] = {"name": c.get("name") or c.get("categoryName"), "path": c.get("path") or c.get("lPath","")}
            print(f"기존 코드 {len(collected_codes)}개 로드")
        except Exception:
            pass

    req_count = 0

    # Windows 콘솔(cp949)에서 이모지 출력 시 인코딩 오류가 나므로 ASCII 사용
    print(f"[START] 네이버 플레이스 업종 코드 수집 시작 (초기 시드: {len(seed_keywords)}개)")
    print("-" * 60)

    # leaf=False, True 두 번 패스
    for leaf_mode in (False, True):
        search_queue = deque(seed_keywords)
        visited_keywords = set(seed_keywords)
        while search_queue and req_count < MAX_REQUESTS:
            current_keyword = search_queue.popleft()
            print(f"[SEARCH:{'leaf' if leaf_mode else 'branch'}] {current_keyword} ... ", end="")
            items = fetch_categories(current_keyword, leaf=leaf_mode)
            req_count += 1
            if req_count % COOLDOWN_EVERY == 0:
                print(f"[INFO] {req_count}회 요청, 쿨다운 {COOLDOWN_SEC}s")
                time.sleep(COOLDOWN_SEC)

            if not items:
                print("결과 없음")
                time.sleep(DELAY)
                continue

            new_count = 0
            for item in items:
                c_id = item["categoryId"]
                c_name = item["categoryName"]
                l_path = item.get("lPath", "")
                if c_id not in collected_codes:
                    collected_codes[c_id] = {"name": c_name, "path": l_path}
                    new_count += 1
                # Traverse each part of the l_path to enqueue new keywords.
                if l_path:
                    for part in l_path.replace("||", " ").split():
                        part = part.strip()
                        if len(part) > 1 and part not in visited_keywords:
                            visited_keywords.add(part)
                            search_queue.append(part)
            print(f" {len(items)}개 발견 (신규: {new_count}개) / 누적: {len(collected_codes)}개 / 요청:{req_count}")
            if req_count % PARTIAL_EVERY == 0:
                tmp = {
                    "timestamp": int(time.time()),
                    "count": len(collected_codes),
                    "categories": [{"id": cid, **info} for cid, info in sorted(collected_codes.items())],
                }
                OUT_JSON.write_text(json.dumps(tmp, ensure_ascii=False, indent=2), encoding="utf-8")
                print(f"  -> partial saved ({len(collected_codes)} codes)")
            time.sleep(DELAY)
        # 다음 패스 전에 시드 확장: 수집된 path 토큰을 추가
        seed_keywords = list(visited_keywords)

    # 저장
    data = {
        "timestamp": int(time.time()),
        "count": len(collected_codes),
        "categories": [{"id": cid, **info} for cid, info in sorted(collected_codes.items())],
    }
    OUT_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    with OUT_TSV.open("w", encoding="utf-8") as f:
        f.write("categoryId\tcategoryName\tlPath\n")
        for cid, info in sorted(collected_codes.items()):
            f.write(f"{cid}\t{info['name']}\t{info['path']}\n")
    print("\n수집 완료 ->", OUT_JSON)
    print("TSV ->", OUT_TSV)


if __name__ == "__main__":
    main()
