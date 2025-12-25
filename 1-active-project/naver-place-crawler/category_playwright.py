"""
Playwright 기반 카테고리 수집 (강화)
- map.naver.com/v5/ 및 m.place.naver.com 검색 페이지를 순회
- 모든 응답 텍스트를 검사하여 code/name 패턴 추출
- category/cat 문자열이 포함된 응답은 원문 저장(out/categories_raw)
- 페이지 전역 객체 dump (window.__APOLLO_STATE__, window.__PLACE_STATE__ 등) 저장
"""
import asyncio
import re
import json
import time
from pathlib import Path
from playwright.async_api import async_playwright

OUT_FILE = "category_master.json"
RAW_DIR = Path("out/categories_raw")
RAW_DIR.mkdir(parents=True, exist_ok=True)

PATTERN1 = re.compile(r"\"code\":\"([A-Za-z0-9_-]+)\"[^}]{0,400}?\"name\":\"([^\"]+)\"")
PATTERN2 = re.compile(r"\"categoryCode\":\"([A-Za-z0-9_-]+)\"[^}]{0,400}?\"category\":\"([^\"]+)\"")


def dedup(categories):
    m = {}
    for c in categories:
        m[c[0]] = c[1]
    return m


def save_text(idx: int, label: str, text: str):
    fname = RAW_DIR / f"resp_{idx}_{label}.txt"
    fname.write_text(text, encoding="utf-8", errors="replace")


async def scrape():
    targets = [
        "https://map.naver.com/v5/",
        "https://m.place.naver.com/restaurant/list?query=%EC%B9%B4%ED%8E%98",
        "https://m.place.naver.com/restaurant/list?query=%EB%A7%9B%EC%A7%91",
        "https://m.place.naver.com/beauty/hair/list?query=%EB%AF%B8%EC%9A%A9%EC%8B%A4",
    ]
    categories = []
    resp_count = 0
    saved = 0
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        async def handle_response(response):
            nonlocal resp_count, saved, categories
            try:
                url = response.url
                ct = response.headers.get("content-type", "")
                text = await response.text()
                # 원문 저장 조건: url에 category/cat 포함 또는 code/name 패턴 존재
                hit = False
                if ("category" in url.lower()) or ("cat" in url.lower()):
                    hit = True
                if PATTERN1.search(text) or PATTERN2.search(text):
                    hit = True
                if hit:
                    saved += 1
                    save_text(resp_count, "raw", text)
                if "javascript" in ct or "json" in ct or "html" in ct:
                    resp_count += 1
                    for m in PATTERN1.finditer(text):
                        categories.append((m.group(1), m.group(2)))
                    for m in PATTERN2.finditer(text):
                        categories.append((m.group(1), m.group(2)))
            except Exception:
                return

        page.on("response", handle_response)
        for u in targets:
            await page.goto(u, wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_timeout(12000)
            # 전역 상태 덤프
            try:
                apollo = await page.evaluate("() => window.__APOLLO_STATE__")
                if apollo:
                    save_text(int(time.time()*1000), "apollo", json.dumps(apollo, ensure_ascii=False))
            except Exception:
                pass
            try:
                place_state = await page.evaluate("() => window.__PLACE_STATE__")
                if place_state:
                    save_text(int(time.time()*1000), "place", json.dumps(place_state, ensure_ascii=False))
            except Exception:
                pass
        await browser.close()

    code_map = dedup(categories)
    data = {
        "timestamp": int(time.time()),
        "count": len(code_map),
        "categories": [
            {"code": k, "name": v} for k, v in sorted(code_map.items())
        ],
    }
    Path(OUT_FILE).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"responses scanned: {resp_count}, raw_saved: {saved}")
    print(f"saved {OUT_FILE}, codes={len(code_map)}")


if __name__ == "__main__":
    asyncio.run(scrape())
