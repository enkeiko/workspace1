import collect_master_data as cm, re
SESSION = cm.SESSION
html_headers = {
    "User-Agent": cm.HEADERS["User-Agent"],
    "Accept": "text/html",
    "Referer": "https://www.naver.com/",
}
params_html = {"query": '헬스장', "sm": "top_hty", "fbm": 1}
resp = SESSION.get(cm.HTML_SEARCH_URL, params=params_html, headers=html_headers, timeout=10)
html = resp.text
names = re.findall(r"\"name\":\"([^\\\"]+)\"", html)
cats = re.findall(r"\"category\":\"([^\\\"]+)\"", html)
print('names', len(names), names[:5])
print('cats', len(cats), cats[:5])
