# -*- coding: utf-8 -*-
"""
수동 로그인으로 네이버 쿠키를 확보해 runtime_config.json에 저장.
사용법:
  python login_cookie_capture.py
  - 뜨는 브라우저에서 직접 로그인/2차 인증을 완료
  - 콘솔에 Enter 입력 → cookies를 runtime_config.json에 저장
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_DIR = Path(__file__).parent
CONFIG_FILE = BASE_DIR / "runtime_config.json"


def save_cookie_string(cookie_list):
    cookies_str = "; ".join(f"{c['name']}={c['value']}" for c in cookie_list)
    cfg = {}
    if CONFIG_FILE.exists():
        try:
            cfg = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        except Exception:
            cfg = {}
    cfg["cookie"] = cookies_str
    CONFIG_FILE.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[INFO] Saved cookies to {CONFIG_FILE}")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        page.goto("https://nid.naver.com/nidlogin.login", wait_until="networkidle")
        print("[INFO] 브라우저가 열렸습니다. 로그인/2차 인증을 직접 완료하세요.")
        input("로그인 완료 후 Enter 키를 누르면 쿠키를 저장합니다...")
        cookies = page.context.cookies()
        save_cookie_string(cookies)
        browser.close()
        print("[DONE] 쿠키 저장 완료.")


if __name__ == "__main__":
    main()
