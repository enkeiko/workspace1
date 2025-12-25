# -*- coding: utf-8 -*-
"""
Naver Map 크롤러: 산업 마스터 및 키워드 템플릿 초기 SQL 생성.
- UTF-8 파일 I/O 유지
- 캡차 차단 시 더미 데이터로 대체해 SQL을 비워두지 않음
"""
import os
import json
import time
import random
import requests
from typing import List, Dict, Any
from pathlib import Path

SQL_FILE = "init_master_data.sql"
DATA_DIR = "scrape_results"
LAST_JSON = "last_result.json"
CONFIG_FILE = Path(__file__).parent / "runtime_config.json"

SEED_KEYWORDS = [
    "\ud5ec\uc2a4\uc7a5", "\ud54c\ub77c\ud14c\uc2a4", "\uc694\uac00", "\ub9db\uc9d1", "\uce74\ud398", "\uc220\uc9d1",
    "\ubbf8\uc6a9\uc2e4", "\ub124\uc77c\uc0f7", "\uc601\uc5b4\ud559\uc6d0", "\ub3c5\uc11c\uc2e4", "\uaf43\uc9d1", "\uc0ac\uc9c4\uad00",
    "\uac15\ub0a8\ub9db\uc9d1", "\uac15\ub989\ub9db\uc9d1", "\uac15\ub0a8\ubbf8\uc6a9\uc2e4", "\ud64d\ub300\uce74\ud398", "\ubd80\uc0b0\uc220\uc9d1",
    "\uc81c\uc8fc\uce74\ud398", "\uc11c\uba74\ub9db\uc9d1", "\uac74\ub300\uc220\uc9d1", "\uc5f0\ub0a8\ub3d9\uce74\ud398", "\uc218\uc6d0\ud5ec\uc2a4\uc7a5", "\ub300\uad6c\ud54c\ub77c\ud14c\uc2a4",
]

SEARCH_URL = "https://map.naver.com/p/api/search/allSearch"
GRAPHQL_URL = "https://pcmap-api.place.naver.com/graphql"
HTML_SEARCH_URL = "https://search.naver.com/search.naver"

BASE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://map.naver.com/",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3",
    "Accept-Encoding": "gzip, deflate, br",
    "X-Requested-With": "XMLHttpRequest",
}

SESSION = requests.Session()


def load_config():
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


cfg = load_config()
HEADERS = BASE_HEADERS.copy()
if cfg.get("cookie"):
    HEADERS["Cookie"] = cfg["cookie"]
if cfg.get("seed_keywords"):
    SEED_KEYWORDS = cfg["seed_keywords"]
DEBUG_MODE = bool(cfg.get("debug"))
MAX_REQUESTS = int(cfg.get("max_requests", 300))  # 리뷰 키워드 요청 안전선
BATCH_SIZE = int(cfg.get("batch_size", 40))       # 몇 건마다 쿨다운
COOLDOWN_SEC = float(cfg.get("cooldown_sec", 30)) # 배치 후 쉬는 시간(sec)


def prepare_session():
    """
    - config에 cookie가 있으면 그대로 사용
    - 없으면 map.naver.com/v5/ 에 사전 방문하여 익명 세션 쿠키(NNB 등) 확보
    """
    SESSION.headers.update(HEADERS)
    if cfg.get("cookie"):
        return
    try:
        resp = SESSION.get("https://map.naver.com/v5/", timeout=8)
        resp.raise_for_status()
        print("[INFO] fetched anonymous session cookie")
    except Exception as e:
        print(f"[WARN] failed to prefetch anon cookie: {e}")


prepare_session()

# API 차단 시 최소한으로 채울 더미 플레이스
FALLBACK_PLACES = [
    {"id": "sample_cafe_01", "name": "\uc0d8\ud50c \uce74\ud398", "categoryCode": "CE7", "category": ["\uce74\ud398", "\ub514\uc800\ud2b8"]},
    {"id": "sample_food_01", "name": "\uc0d8\ud50c \ub9db\uc9d1", "categoryCode": "FD6", "category": ["\uc74c\uc2dd\uc810", "\ud55c\uc2dd"]},
    {"id": "sample_gym_01", "name": "\uc0d8\ud50c \ud5ec\uc2a4\uc7a5", "categoryCode": "G109", "category": ["\ud5ec\uc2a4\uc7a5"]},
]

# 방문자 키워드가 없거나 호출 실패 시 채워줄 더미 키워드
FALLBACK_KEYWORDS = [
    {"keyword": "\uccad\uacb0\ud574\uc694", "count": 5},
    {"keyword": "\uce5c\uc808\ud574\uc694", "count": 7},
    {"keyword": "\uac00\uc131\ube44\uc88b\uc544\uc694", "count": 3},
]


def safe_request_json(method: str, url: str, **kwargs) -> Any:
    """HTTP 요청을 실행하고 JSON으로 파싱한다."""
    try:
        resp = SESSION.request(method, url, timeout=10, **kwargs)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"[WARN] Request failed: {url} -> {e}")
        return None


def fetch_top_places(keyword: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    캡차 없는 검색 HTML을 바로 파싱한다.
    """
    # HTML 검색 파싱
    html_headers = {
        "User-Agent": HEADERS["User-Agent"],
        "Accept": "text/html",
        "Referer": "https://www.naver.com/",
        "Accept-Language": HEADERS["Accept-Language"],
    }
    params_html = {"query": keyword, "sm": "top_hty", "fbm": 1}
    try:
        resp = requests.get(HTML_SEARCH_URL, params=params_html, headers=html_headers, timeout=10)
        resp.encoding = "utf-8"
        if resp.status_code == 429:
            raise RuntimeError(f"blocked status {resp.status_code}")
        html = resp.text
        import re, html as htmllib
        names = re.findall(r'"name":"([^"]+)"', html)
        cats = re.findall(r'"category":"([^"]+)"', html)
        # mark 태그, HTML escape 제거
        def clean(txt: str) -> str:
            txt = htmllib.unescape(txt)
            txt = txt.replace("\\u003C", "<").replace("\\u003E", ">")
            txt = re.sub(r"<.*?>", "", txt)
            return txt.strip()
        names = [clean(n) for n in names]
        cats = [clean(c) for c in cats]
        pairs = []
        for n, c in zip(names, cats + [""] * len(names)):
            if n.strip() == "" or n.strip() == keyword:
                continue
            pairs.append((n, c))
        cleaned = []
        seen = set()
        for n, c in pairs:
            if n in seen:
                continue
            seen.add(n)
            cleaned.append({
                "id": f"html_{hash(n) & 0xffffffff}",
                "name": n,
                "categoryCode": "",
                "category": [c] if c else [],
            })
            if len(cleaned) >= limit:
                return cleaned
    except Exception as e:
        print(f"[WARN] HTML search fallback failed for {keyword}: {e}")

    print("[WARN] Both API and HTML parsing failed, using fallback places.")
    return FALLBACK_PLACES[:limit]


def derive_algorithm_type(category: List[str]) -> str:
    cat_set = set(category or [])
    if any(keyword in cat_set for keyword in ["음식점", "카페"]):
        return "TYPE_B"
    return "TYPE_A"


GRAPHQL_QUERY = """
query getVisitorReviewStats($input: VisitorReviewStatsInput!) {
  getVisitorReviewStats(input: $input) {
    votedKeyword {
      details {
        keyword
        keywordCode
        count
      }
    }
  }
}
"""


def fetch_visitor_keywords(place_id: str) -> List[Dict[str, Any]]:
    payload = {
        "query": GRAPHQL_QUERY,
        "variables": {"input": {"businessId": place_id, "businessType": "place"}},
    }
    data = safe_request_json("POST", GRAPHQL_URL, json=payload, headers=HEADERS)
    if not data:
        return FALLBACK_KEYWORDS.copy()
    try:
        details = data.get("data", {}).get("getVisitorReviewStats", {}).get("votedKeyword", {}).get("details", [])
        out = []
        for d in details:
            if not isinstance(d, dict):
                continue
            keyword = d.get("keyword") or d.get("name")
            keyword_code = d.get("keywordCode") or d.get("code")
            count = d.get("count") or d.get("value") or 0
            if keyword:
                try:
                    cnt_int = int(count)
                except Exception:
                    cnt_int = 0
                out.append(
                    {
                        "keyword": str(keyword),
                        "keyword_code": str(keyword_code) if keyword_code else "",
                        "count": cnt_int,
                    }
                )
        if not out:
            out = FALLBACK_KEYWORDS.copy()
        return out
    except Exception as e:
        print(f"[WARN] Failed parsing visitor keywords for {place_id}: {e}")
        return FALLBACK_KEYWORDS.copy()


def generate_sql(records: List[Dict[str, Any]], sql_path: str) -> None:
    lines: List[str] = []
    lines.append("CREATE TABLE IF NOT EXISTS industry_master (" \
                 "business_id VARCHAR(64) PRIMARY KEY, " \
                 "name VARCHAR(255), category_code VARCHAR(64), " \
                 "category_path TEXT, algorithm_type VARCHAR(16));")
    lines.append("CREATE TABLE IF NOT EXISTS keyword_templates (" \
                 "id BIGINT AUTO_INCREMENT PRIMARY KEY, " \
                 "business_id VARCHAR(64), keyword VARCHAR(255), keyword_code VARCHAR(64), " \
                 "cnt INT DEFAULT 0, " \
                 "FOREIGN KEY (business_id) REFERENCES industry_master(business_id));")

    for rec in records:
        biz = rec.get("id", "")
        name = rec.get("name", "")
        category_code = rec.get("categoryCode", "")
        category_path = ",".join(rec.get("category", []))
        algorithm_type = rec.get("algorithm_type", "")
        lines.append(
            "INSERT IGNORE INTO industry_master (business_id, name, category_code, category_path, algorithm_type) VALUES "
            f"('{biz.replace("'", "''")}', '{name.replace("'", "''")}', '{category_code.replace("'", "''")}', "
            f"'{category_path.replace("'", "''")}', '{algorithm_type}');")
        for kw in rec.get("keywords", []):
            keyword = kw.get("keyword", "")
            cnt = kw.get("count", 0)
            keyword_code = kw.get("keyword_code", "")
            lines.append(
                "INSERT IGNORE INTO keyword_templates (business_id, keyword, keyword_code, cnt) VALUES "
                f"('{biz.replace("'", "''")}', '{keyword.replace("'", "''")}', "
                f"'{keyword_code.replace("'", "''")}', {cnt});")

    with open(sql_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"[INFO] SQL written -> {sql_path} (lines: {len(lines)})")


def main():
    all_records: List[Dict[str, Any]] = []
    request_count = 0
    batch_count = 0
    seen_biz = set()

    for idx, keyword in enumerate(SEED_KEYWORDS, start=1):
        print(f"[STEP] ({idx}/{len(SEED_KEYWORDS)}) Searching keyword: {keyword}")
        places = fetch_top_places(keyword)
        if not places:
            print(f"[WARN] No places found for '{keyword}', adding placeholder.")
            placeholder = {
                "id": f"placeholder_{idx}",
                "name": keyword,
                "categoryCode": "",
                "category": [keyword],
            }
            places = [placeholder]

        for place in places:
            cat_list = place.get("category", [])
            algorithm_type = derive_algorithm_type(cat_list)
            place["algorithm_type"] = algorithm_type
            time.sleep(random.uniform(0.6, 1.2))
            keywords = fetch_visitor_keywords(place["id"])
            place["keywords"] = keywords
            key = place.get("id") or place.get("name")
            if key in seen_biz:
                print(f"  - Skip duplicate {place.get('name')} ({key})")
            else:
                seen_biz.add(key)
                all_records.append(place)
                print(f"  - Collected {place.get('name')} / algo={algorithm_type} / keywords={len(keywords)}")
            time.sleep(random.uniform(0.3, 0.7))

            # 요청/배치 카운터
            request_count += 1
            batch_count += 1

            if request_count >= MAX_REQUESTS:
                print(f"[WARN] MAX_REQUESTS({MAX_REQUESTS}) 도달. 추가 수집을 중단합니다.")
                break
            if batch_count >= BATCH_SIZE:
                print(f"[INFO] 배치 {batch_count}건 처리, {COOLDOWN_SEC}s 쿨다운...")
                time.sleep(COOLDOWN_SEC)
                batch_count = 0

    sql_path = os.path.join(os.getcwd(), SQL_FILE)
    generate_sql(all_records, sql_path)

    # JSON 저장 (개별 실행 결과 보관 및 최근 결과 덮어쓰기)
    os.makedirs(DATA_DIR, exist_ok=True)
    run_ts = int(time.time())
    run_file = os.path.join(DATA_DIR, f"{run_ts}.json")
    payload = {"timestamp": run_ts, "records": all_records}
    with open(run_file, "w", encoding="utf-8") as jf:
        json.dump(payload, jf, ensure_ascii=False, indent=2)
    with open(LAST_JSON, "w", encoding="utf-8") as jf:
        json.dump(payload, jf, ensure_ascii=False, indent=2)
    print(f"[INFO] JSON saved -> {run_file}")


if __name__ == "__main__":
    main()
