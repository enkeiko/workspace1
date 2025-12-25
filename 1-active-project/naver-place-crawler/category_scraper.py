"""
Naver Map category code scraper (from public JS bundles).
- Downloads https://map.naver.com/v5/ HTML
- Fetches referenced JS bundles
- Extracts occurrences of "code":"<CODE>", "name":"<NAME>"
- Saves to category_master.json
"""
import re
import json
import time
import os
import requests
from urllib.parse import urljoin

BASE_URL = "https://map.naver.com/v5/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Referer": "https://map.naver.com/",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}
OUT_FILE = "category_master.json"


def fetch(url, session):
    r = session.get(url, headers=HEADERS, timeout=10)
    r.raise_for_status()
    return r.text


def extract_js_urls(text: str):
    urls = set()
    urls.update(re.findall(r'https?://[^"\\s]+\\.js', text))
    urls.update(re.findall(r'/[A-Za-z0-9_./-]+\\.js', text))
    return urls


def main():
    sess = requests.Session()
    html = fetch(BASE_URL, sess)
    js_urls = set()
    # HTML 내 script src
    for u in re.findall(r'<script[^>]+src="([^"]+\.js)"', html):
        js_urls.add(u if u.startswith("http") else urljoin(BASE_URL, u))
    # HTML 본문 안의 js 경로도 가져오기
    for u in extract_js_urls(html):
        js_urls.add(u if u.startswith("http") else urljoin(BASE_URL, u))
    print(f"[INFO] seed js urls: {len(js_urls)}")

    code_map = {}
    pattern = re.compile(r'"code":"([A-Z0-9]+)"[^}]{0,120}?"name":"([^"]+)"')
    visited = set()
    queue = list(js_urls)
    i = 0
    while queue and i < 180:  # safety limit
        js_url = queue.pop()
        if js_url in visited:
            continue
        visited.add(js_url)
        i += 1
        try:
            txt = fetch(js_url, sess)
        except Exception as e:
            print(f"[WARN] fetch fail {js_url}: {e}")
            continue
        for m in pattern.finditer(txt):
            code, name = m.group(1), m.group(2)
            code_map[code] = name
        # JS 내부의 또다른 JS 경로를 큐에 추가
        for u in extract_js_urls(txt):
            queue.append(u if u.startswith("http") else urljoin(js_url, u))
        print(f"[INFO] parsed {i}, codes {len(code_map)}, queue {len(queue)}")
        if len(code_map) > 800:
            break

    ts = int(time.time())
    data = {
        "timestamp": ts,
        "count": len(code_map),
        "categories": [
            {"code": c, "name": n} for c, n in sorted(code_map.items())
        ],
    }
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[INFO] saved {OUT_FILE} (codes={len(code_map)})")


if __name__ == "__main__":
    main()
