# -*- coding: utf-8 -*-
"""
Naver Place Crawler GUI
- collect_master_data.py 실행/로그 확인
- SQL 미리보기, 스크래핑 히스토리(JSON) 조회, 누적 키워드, 카테고리 보기
- GUI에서 seed 키워드, 로그인 Cookie, 디버그 옵션을 설정해 실행 가능
"""
import os
import sys
import threading
import subprocess
import tkinter as tk
from tkinter import scrolledtext, messagebox, ttk
import json
from pathlib import Path

# 모든 경로를 gui.py 위치 기준으로 고정
BASE_DIR = Path(__file__).parent.resolve()

SCRIPT = BASE_DIR / "collect_master_data.py"
COOKIE_SCRIPT = BASE_DIR / "login_cookie_capture.py"
CATEGORY_SCRIPT = BASE_DIR / "category_token_scraper.py"
SQL_FILE = BASE_DIR / "init_master_data.sql"
DATA_DIR = BASE_DIR / "scrape_results"
LAST_JSON = BASE_DIR / "last_result.json"
CATEGORY_JSON = BASE_DIR / "category_token_result.json"
CATEGORY_JSON_FALLBACK = BASE_DIR / "category_master.json"
CONFIG_FILE = BASE_DIR / "runtime_config.json"

# SEED 키워드 로드
try:
    sys.path.insert(0, str(BASE_DIR))
    import collect_master_data as cm
    SEED_KEYWORDS = cm.SEED_KEYWORDS
except Exception:
    SEED_KEYWORDS = []

def load_config():
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}

def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None

def list_history_files():
    if not DATA_DIR.exists():
        return []
    return sorted([p.name for p in DATA_DIR.glob("*.json")], reverse=True)


def format_ts(ts: int) -> str:
    try:
        import datetime
        return datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return str(ts)

def run_scraper(log_box, status_var, run_btn, refresh_fn, kw_input, cookie_input, debug_var):
    if not SCRIPT.exists():
        messagebox.showerror("오류", f"{SCRIPT} 파일이 없습니다.")
        return
    run_btn.config(state="disabled")
    status_var.set("실행 중...")
    log_box.delete("1.0", tk.END)

    def append(msg: str):
        log_box.after(0, lambda: (log_box.insert(tk.END, msg), log_box.see(tk.END)))

    def worker():
        env = os.environ.copy()
        env["PYTHONUTF8"] = "1"
        config_payload = {
            "seed_keywords": [kw.strip() for kw in kw_input.get("1.0", tk.END).split(",") if kw.strip()],
            "cookie": cookie_input.get().strip(),
            "debug": bool(debug_var.get()),
        }
        try:
            CONFIG_FILE.write_text(json.dumps(config_payload, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception as e:
            append(f"[WARN] 설정 파일 저장 실패: {e}\n")
        try:
            proc = subprocess.Popen(
                [sys.executable, str(SCRIPT)],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                env=env,
                cwd=str(BASE_DIR),
            )
            for line in proc.stdout:
                append(line)
            proc.wait()
            if proc.returncode == 0:
                status_var.set("완료")
                size = SQL_FILE.stat().st_size if SQL_FILE.exists() else 0
                append(f"\n[INFO] 완료. SQL: {SQL_FILE.resolve()} (size={size} bytes)\n")
                refresh_fn()
            else:
                status_var.set(f"실패(code={proc.returncode})")
                append(f"\n[ERROR] 프로세스 실패(code={proc.returncode})\n")
        except Exception as e:
            status_var.set("실패")
            append(f"\n[ERROR] 실행 중 예외: {e}\n")
        finally:
            run_btn.config(state="normal")

    threading.Thread(target=worker, daemon=True).start()

def open_sql():
    if not SQL_FILE.exists():
        messagebox.showinfo("알림", "먼저 크롤러를 실행해 SQL을 생성하세요")
        return
    win = tk.Toplevel()
    win.title("init_master_data.sql 미리보기")
    win.geometry("900x600")
    txt = scrolledtext.ScrolledText(win, wrap="none", font=("Consolas", 10))
    txt.pack(fill="both", expand=True)
    txt.insert("1.0", SQL_FILE.read_text(encoding="utf-8"))
    txt.see("1.0")

def view_keyword_map_window():
    if not SQL_FILE.exists():
        messagebox.showinfo("알림", "먼저 크롤러를 실행해 SQL을 생성하세요")
        return
    kv = {}
    for line in SQL_FILE.read_text(encoding="utf-8").splitlines():
        if "INSERT IGNORE INTO keyword_templates" in line:
            try:
                vals = line.split("VALUES", 1)[1]
                vals = vals.split("(", 1)[1].rsplit(")", 1)[0]
                parts = [v.strip().strip("'") for v in vals.split(",")]
                # 값 포맷: business_id, keyword, [keyword_code], cnt
                if len(parts) >= 3:
                    keyword = parts[1]
                    cnt = parts[-1]
                    kv[keyword] = kv.get(keyword, 0) + int(cnt)
            except Exception:
                continue
    win = tk.Toplevel()
    win.title("키워드맵")
    win.geometry("420x520")
    tree = ttk.Treeview(win, columns=("kw", "cnt"), show="headings", height=20)
    tree.heading("kw", text="keyword")
    tree.heading("cnt", text="count")
    tree.column("kw", width=260)
    tree.column("cnt", width=80, anchor="e")
    for kw, c in sorted(kv.items(), key=lambda x: x[1], reverse=True):
        tree.insert("", "end", values=(kw, c))
    tree.pack(fill="both", expand=True, padx=6, pady=6)


def aggregate_keyword_map():
    kv = {}
    paths = []
    if LAST_JSON.exists():
        paths.append(LAST_JSON)
    if DATA_DIR.exists():
        paths.extend(DATA_DIR.glob("*.json"))
    for p in paths:
        data = load_json(p)
        if not data:
            continue
        for rec in data.get("records", []):
            for kw in rec.get("keywords", []):
                k = kw.get("keyword", "")
                c = kw.get("count", 0)
                if not k:
                    continue
                kv[k] = kv.get(k, 0) + int(c)
    return sorted(kv.items(), key=lambda x: x[1], reverse=True)

def refresh_history(history_list, detail_box, kwmap_box):
    history_list.delete(0, tk.END)
    for f in list_history_files():
        history_list.insert(tk.END, f)
    detail_box.delete("1.0", tk.END)
    kwmap_box.delete("1.0", tk.END)
    items = aggregate_keyword_map()
    if not items:
        kwmap_box.insert("1.0", "데이터 없음")
    else:
        top = items[:30]
        lines = [f"{kw} : {cnt}" for kw, cnt in top]
        kwmap_box.insert("1.0", "\n".join(lines))
        kwmap_box.insert("end", f"\n\n(총 {len(items)} 키워드)")

def show_history_item(history_list, detail_box):
    sel = history_list.curselection()
    if not sel:
        return
    fname = history_list.get(sel[0])
    path = DATA_DIR / fname
    data = load_json(path)
    detail_box.delete("1.0", tk.END)
    if not data:
        detail_box.insert("1.0", "불러오기 실패")
    else:
        # 메타 정보(파일명, 타임스탬프) 우선 표시
        ts = data.get("timestamp")
        header = f"file: {fname}\n"
        if ts:
            header += f"timestamp: {ts} ({format_ts(ts)})\n"
        detail_box.insert("1.0", header + "\n" + json.dumps(data, ensure_ascii=False, indent=2))

def load_last_result(detail_box):
    detail_box.delete("1.0", tk.END)
    path = LAST_JSON
    if not path.exists():
        detail_box.insert("1.0", "last_result.json 이 없습니다. 먼저 크롤링을 실행하세요")
        return
    data = load_json(path)
    ts = data.get("timestamp")
    header = f"file: {path.name}\n"
    if ts:
        header += f"timestamp: {ts} ({format_ts(ts)})\n"
    detail_box.insert("1.0", header + "\n" + json.dumps(data, ensure_ascii=False, indent=2))

def show_category_map():
    path = CATEGORY_JSON if CATEGORY_JSON.exists() else CATEGORY_JSON_FALLBACK
    if not path or not path.exists():
        messagebox.showinfo("알림", "category_token_result.json 또는 category_master.json 이 없습니다.")
        return
    data = load_json(path)
    if not data or not data.get("categories"):
        messagebox.showinfo("알림", "카테고리 데이터가 비어있습니다.")
        return
    win = tk.Toplevel()
    win.title(f"최종 카테고리 ({path.name})")
    win.geometry("480x560")
    tree = ttk.Treeview(win, columns=("code", "name", "path"), show="headings", height=25)
    tree.heading("code", text="code")
    tree.heading("name", text="name")
    tree.heading("path", text="path/lPath")
    tree.column("code", width=80)
    tree.column("name", width=180)
    tree.column("path", width=200)
    cats = data.get("categories", [])
    for c in cats:
        code = c.get("id") or c.get("code") or c.get("categoryId")
        name = c.get("name") or c.get("categoryName")
        path_val = c.get("path") or c.get("lPath", "")
        tree.insert("", "end", values=(code, name, path_val))
    tree.pack(fill="both", expand=True, padx=6, pady=6)
    tk.Label(win, text=f"총 {len(cats)}건").pack(anchor="e", padx=6, pady=(0, 6))


def run_cookie_login(log_box, status_var, btn):
    if not COOKIE_SCRIPT.exists():
        messagebox.showerror("오류", f"{COOKIE_SCRIPT} 파일이 없습니다.")
        return
    btn.config(state="disabled")
    status_var.set("브라우저 로그인 대기...")

    def append(msg: str):
        log_box.after(0, lambda: (log_box.insert(tk.END, msg), log_box.see(tk.END)))

    def worker():
        try:
            proc = subprocess.Popen(
                [sys.executable, str(COOKIE_SCRIPT)],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                cwd=str(BASE_DIR),
            )
            for line in proc.stdout:
                append(line)
            proc.wait()
            if proc.returncode == 0:
                status_var.set("쿠키 저장 완료")
                append("[INFO] 쿠키 세팅이 완료되었습니다. 크롤링 실행 시 적용됩니다.\n")
            else:
                status_var.set(f"쿠키 저장 실패(code={proc.returncode})")
                append(f"[ERROR] 로그인 헬퍼 실패(code={proc.returncode})\n")
        except Exception as e:
            status_var.set("쿠키 저장 실패")
            append(f"[ERROR] 실행 중 예외: {e}\n")
        finally:
            btn.config(state="normal")

    threading.Thread(target=worker, daemon=True).start()


def run_category_scraper(log_box, status_var, btn, refresh_fn):
    if not CATEGORY_SCRIPT.exists():
        messagebox.showerror("오류", f"{CATEGORY_SCRIPT} 파일이 없습니다.")
        return
    btn.config(state="disabled")
    status_var.set("카테고리 수집 중...")

    def append(msg: str):
        log_box.after(0, lambda: (log_box.insert(tk.END, msg), log_box.see(tk.END)))

    def worker():
        try:
            proc = subprocess.Popen(
                [sys.executable, str(CATEGORY_SCRIPT)],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                cwd=str(BASE_DIR),
            )
            for line in proc.stdout:
                append(line)
            proc.wait()
            if proc.returncode == 0:
                status_var.set("카테고리 수집 완료")
                append("[INFO] category_token_scraper 완료\n")
                refresh_fn()
            else:
                status_var.set(f"카테고리 수집 실패(code={proc.returncode})")
                append(f"[ERROR] category_token_scraper 실패(code={proc.returncode})\n")
        except Exception as e:
            status_var.set("카테고리 수집 실패")
            append(f"[ERROR] 실행 중 예외: {e}\n")
        finally:
            btn.config(state="normal")

    threading.Thread(target=worker, daemon=True).start()


def main():
    root = tk.Tk()
    root.title("Naver Place Crawler GUI")
    root.geometry("980x720")

    status_var = tk.StringVar(value="대기")
    cfg = load_config()

    tk.Label(root, text="NAVER Place Master Data Crawler", font=("Segoe UI", 14, "bold")).pack(pady=8)
    tk.Label(root, text=f"스크립트: {SCRIPT.resolve()}\nSQL 출력: {SQL_FILE.resolve()}", justify="left").pack(pady=2)

    kw_frame = tk.Frame(root)
    kw_frame.pack(fill="x", padx=10, pady=4)
    tk.Label(kw_frame, text="SEED 키워드 (콤마 구분)", font=("Segoe UI", 10, "bold")).pack(anchor="w")
    kw_box = scrolledtext.ScrolledText(kw_frame, height=3, wrap="word", font=("Consolas", 10))
    kw_box.pack(fill="x", expand=False)
    default_kw = cfg.get("seed_keywords") or SEED_KEYWORDS
    kw_box.insert("1.0", ", ".join(default_kw) if default_kw else "")

    login_frame = tk.Frame(root)
    login_frame.pack(fill="x", padx=10, pady=(0, 4))
    tk.Label(login_frame, text="로그인 Cookie (smartplace 등 요청용)", font=("Segoe UI", 10, "bold")).pack(anchor="w")
    cookie_entry = tk.Entry(login_frame)
    cookie_entry.pack(fill="x", expand=True)
    cookie_entry.insert(0, cfg.get("cookie", ""))

    debug_var = tk.IntVar(value=1 if cfg.get("debug") else 0)
    tk.Checkbutton(login_frame, text="디버그 로깅(스크립트 stdout 그대로 표시)", variable=debug_var).pack(anchor="w", pady=(4, 2))

    top_frame = tk.Frame(root)
    top_frame.pack(fill="x", padx=10)

    run_btn = tk.Button(top_frame, text="크롤링 실행", width=16,
                        command=lambda: run_scraper(log_box, status_var, run_btn, refresh_history_async,
                                                    kw_box, cookie_entry, debug_var))
    run_btn.pack(side="left", padx=4)

    cookie_btn = tk.Button(top_frame, text="쿠키 수동로그인", width=14,
                           command=lambda: run_cookie_login(log_box, status_var, cookie_btn))
    cookie_btn.pack(side="left", padx=4)

    cat_btn = tk.Button(top_frame, text="카테고리 수집 실행", width=16,
                        command=lambda: run_category_scraper(log_box, status_var, cat_btn, refresh_history_async))
    cat_btn.pack(side="left", padx=4)

    tk.Button(top_frame, text="SQL 미리보기", width=12, command=open_sql).pack(side="left", padx=4)
    tk.Button(top_frame, text="키워드맵 보기", width=12, command=view_keyword_map_window).pack(side="left", padx=4)
    tk.Button(top_frame, text="카테고리 보기", width=12, command=show_category_map).pack(side="left", padx=4)
    tk.Button(top_frame, text="히스토리 새로고침", width=14, command=lambda: refresh_history(history_list, detail_box, kwmap_box)).pack(side="left", padx=4)
    tk.Button(top_frame, text="최근 결과 보기", width=12, command=lambda: load_last_result(detail_box)).pack(side="left", padx=4)
    tk.Label(top_frame, textvariable=status_var, fg="blue").pack(side="left", padx=10)

    mid_frame = tk.Frame(root)
    mid_frame.pack(fill="both", expand=True, padx=10, pady=5)

    log_box = scrolledtext.ScrolledText(mid_frame, wrap="none", height=18, font=("Consolas", 10))
    log_box.pack(side="left", fill="both", expand=True, padx=(0, 6))

    right = tk.Frame(mid_frame, width=320)
    right.pack(side="left", fill="y")

    tk.Label(right, text="저장된 크롤링 결과").pack(anchor="w")
    history_list = tk.Listbox(right, height=10)
    history_list.pack(fill="x")
    history_list.bind("<<ListboxSelect>>", lambda e: show_history_item(history_list, detail_box))

    tk.Label(right, text="선택 결과 미리보기").pack(anchor="w", pady=(4, 0))
    detail_box = scrolledtext.ScrolledText(right, wrap="word", height=10, font=("Consolas", 9))
    detail_box.pack(fill="x", pady=(0, 4))

    tk.Label(right, text="누적 키워드 상위(상위 30)").pack(anchor="w")
    kwmap_box = scrolledtext.ScrolledText(right, wrap="word", height=8, font=("Consolas", 9))
    kwmap_box.pack(fill="x")

    def refresh_history_async():
        refresh_history(history_list, detail_box, kwmap_box)

    refresh_history_async()
    root.mainloop()

if __name__ == "__main__":
    main()
