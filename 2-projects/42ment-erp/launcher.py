"""
42ment ERP Launcher - GUI Application Launcher
Simple GUI to start the ERP system
"""
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import subprocess
import sys
import threading
import os
from pathlib import Path


class ERPLauncher:
    def __init__(self, root):
        self.root = root
        self.root.title("42ment ERP Launcher")
        self.root.geometry("600x500")
        self.root.resizable(False, False)

        self.process = None
        self.project_dir = Path(__file__).parent

        # Set icon (if available)
        try:
            self.root.iconbitmap(default='')
        except:
            pass

        self.setup_ui()
        self.check_dependencies()

    def setup_ui(self):
        """Setup the user interface"""
        # Title
        title_frame = tk.Frame(self.root, bg='#2E86AB', height=80)
        title_frame.pack(fill=tk.X)
        title_frame.pack_propagate(False)

        title_label = tk.Label(
            title_frame,
            text="42ment ERP",
            font=('Arial', 24, 'bold'),
            bg='#2E86AB',
            fg='white'
        )
        title_label.pack(pady=20)

        # Main content
        content_frame = tk.Frame(self.root, padx=20, pady=20)
        content_frame.pack(fill=tk.BOTH, expand=True)

        # Status section
        status_label = tk.Label(
            content_frame,
            text="시스템 상태",
            font=('Arial', 12, 'bold')
        )
        status_label.pack(anchor=tk.W)

        self.status_text = scrolledtext.ScrolledText(
            content_frame,
            height=10,
            width=70,
            state='disabled',
            bg='#f5f5f5',
            font=('Consolas', 9)
        )
        self.status_text.pack(pady=10, fill=tk.BOTH, expand=True)

        # Buttons frame
        button_frame = tk.Frame(content_frame)
        button_frame.pack(pady=10)

        # Start button
        self.start_button = tk.Button(
            button_frame,
            text="▶ ERP 시작",
            command=self.start_erp,
            bg='#4CAF50',
            fg='white',
            font=('Arial', 12, 'bold'),
            width=15,
            height=2,
            cursor='hand2'
        )
        self.start_button.grid(row=0, column=0, padx=10)

        # Stop button
        self.stop_button = tk.Button(
            button_frame,
            text="⬛ 중지",
            command=self.stop_erp,
            bg='#f44336',
            fg='white',
            font=('Arial', 12, 'bold'),
            width=15,
            height=2,
            cursor='hand2',
            state='disabled'
        )
        self.stop_button.grid(row=0, column=1, padx=10)

        # Database tools frame
        tools_frame = tk.LabelFrame(content_frame, text="데이터베이스 도구", padx=10, pady=10)
        tools_frame.pack(pady=10, fill=tk.X)

        tk.Button(
            tools_frame,
            text="데이터베이스 초기화",
            command=self.init_database,
            width=20
        ).grid(row=0, column=0, padx=5, pady=5)

        tk.Button(
            tools_frame,
            text="샘플 데이터 로드",
            command=self.load_sample_data,
            width=20
        ).grid(row=0, column=1, padx=5, pady=5)

        # Footer
        footer_label = tk.Label(
            content_frame,
            text="42ment ERP v0.1 | 프리랜서 프로젝트 관리 시스템",
            font=('Arial', 8),
            fg='gray'
        )
        footer_label.pack(side=tk.BOTTOM, pady=5)

    def log(self, message, level='INFO'):
        """Add message to log"""
        self.status_text.config(state='normal')

        if level == 'ERROR':
            prefix = '❌'
        elif level == 'SUCCESS':
            prefix = '✅'
        elif level == 'WARNING':
            prefix = '⚠️'
        else:
            prefix = 'ℹ️'

        self.status_text.insert(tk.END, f"{prefix} {message}\n")
        self.status_text.see(tk.END)
        self.status_text.config(state='disabled')
        self.root.update()

    def check_dependencies(self):
        """Check if required packages are installed"""
        self.log("의존성 확인 중...")

        missing = []

        try:
            import streamlit
            self.log(f"Streamlit {streamlit.__version__} 설치됨", 'SUCCESS')
        except ImportError:
            missing.append('streamlit')
            self.log("Streamlit 미설치", 'WARNING')

        try:
            import pandas
            self.log(f"Pandas 설치됨", 'SUCCESS')
        except ImportError:
            missing.append('pandas')
            self.log("Pandas 미설치", 'WARNING')

        if missing:
            self.log(f"\n필수 패키지 설치 필요: {', '.join(missing)}", 'WARNING')
            if messagebox.askyesno(
                "패키지 설치",
                f"필수 패키지가 설치되지 않았습니다.\n\n{', '.join(missing)}\n\n지금 설치하시겠습니까?"
            ):
                self.install_dependencies(missing)
        else:
            self.log("\n모든 의존성이 충족되었습니다!", 'SUCCESS')
            self.log("▶ ERP 시작 버튼을 클릭하세요.\n")

    def install_dependencies(self, packages):
        """Install missing packages"""
        self.log(f"\n패키지 설치 중: {', '.join(packages)}...")

        try:
            for package in packages:
                self.log(f"{package} 설치 중...")
                result = subprocess.run(
                    [sys.executable, '-m', 'pip', 'install', package, '-q'],
                    capture_output=True,
                    text=True
                )

                if result.returncode == 0:
                    self.log(f"{package} 설치 완료", 'SUCCESS')
                else:
                    self.log(f"{package} 설치 실패: {result.stderr}", 'ERROR')

            self.log("\n패키지 설치 완료!", 'SUCCESS')
            messagebox.showinfo("설치 완료", "필수 패키지가 설치되었습니다!")
        except Exception as e:
            self.log(f"설치 오류: {str(e)}", 'ERROR')
            messagebox.showerror("설치 실패", f"패키지 설치 중 오류가 발생했습니다:\n{str(e)}")

    def start_erp(self):
        """Start the ERP system"""
        if self.process and self.process.poll() is None:
            messagebox.showwarning("실행 중", "ERP가 이미 실행 중입니다!")
            return

        self.log("\n=== ERP 시작 ===", 'SUCCESS')
        self.log("Streamlit 서버 시작 중...")

        def run_streamlit():
            try:
                main_file = self.project_dir / 'src' / 'main.py'

                if not main_file.exists():
                    self.log(f"main.py 파일을 찾을 수 없습니다: {main_file}", 'ERROR')
                    return

                # Start streamlit
                self.process = subprocess.Popen(
                    [sys.executable, '-m', 'streamlit', 'run', str(main_file), '--server.headless', 'true'],
                    cwd=str(self.project_dir),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    bufsize=1
                )

                self.log("ERP 서버가 시작되었습니다!", 'SUCCESS')
                self.log("브라우저에서 자동으로 열립니다...")
                self.log("URL: http://localhost:8501\n")

                self.start_button.config(state='disabled')
                self.stop_button.config(state='normal')

                # Read output
                for line in self.process.stdout:
                    if line.strip():
                        self.log(line.strip())

            except Exception as e:
                self.log(f"시작 오류: {str(e)}", 'ERROR')
                messagebox.showerror("시작 실패", f"ERP 시작 중 오류가 발생했습니다:\n{str(e)}")

        # Run in thread
        thread = threading.Thread(target=run_streamlit, daemon=True)
        thread.start()

    def stop_erp(self):
        """Stop the ERP system"""
        if not self.process or self.process.poll() is not None:
            messagebox.showwarning("실행 안됨", "실행 중인 ERP가 없습니다!")
            return

        if messagebox.askyesno("중지 확인", "ERP를 중지하시겠습니까?"):
            self.log("\nERP 중지 중...", 'WARNING')

            try:
                self.process.terminate()
                self.process.wait(timeout=5)
                self.log("ERP가 중지되었습니다.", 'SUCCESS')
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.log("ERP가 강제 종료되었습니다.", 'WARNING')
            except Exception as e:
                self.log(f"중지 오류: {str(e)}", 'ERROR')

            self.start_button.config(state='normal')
            self.stop_button.config(state='disabled')
            self.process = None

    def init_database(self):
        """Initialize database"""
        if messagebox.askyesno(
            "데이터베이스 초기화",
            "데이터베이스를 초기화하시겠습니까?\n기존 데이터가 삭제됩니다!"
        ):
            self.log("\n데이터베이스 초기화 중...", 'WARNING')

            try:
                run_script = self.project_dir / 'run.py'
                result = subprocess.run(
                    [sys.executable, str(run_script), '--force'],
                    capture_output=True,
                    text=True,
                    cwd=str(self.project_dir)
                )

                if result.returncode == 0:
                    self.log("데이터베이스 초기화 완료!", 'SUCCESS')
                    self.log(result.stdout)
                    messagebox.showinfo("완료", "데이터베이스가 초기화되었습니다!")
                else:
                    self.log(f"초기화 실패: {result.stderr}", 'ERROR')
                    messagebox.showerror("실패", f"초기화 실패:\n{result.stderr}")
            except Exception as e:
                self.log(f"오류: {str(e)}", 'ERROR')
                messagebox.showerror("오류", f"오류 발생:\n{str(e)}")

    def load_sample_data(self):
        """Load sample data"""
        if messagebox.askyesno(
            "샘플 데이터 로드",
            "샘플 데이터를 로드하시겠습니까?"
        ):
            self.log("\n샘플 데이터 로드 중...")

            try:
                run_script = self.project_dir / 'run.py'
                result = subprocess.run(
                    [sys.executable, str(run_script), '--sample'],
                    capture_output=True,
                    text=True,
                    cwd=str(self.project_dir)
                )

                if result.returncode == 0:
                    self.log("샘플 데이터 로드 완료!", 'SUCCESS')
                    self.log(result.stdout)
                    messagebox.showinfo("완료", "샘플 데이터가 로드되었습니다!")
                else:
                    self.log(f"로드 실패: {result.stderr}", 'ERROR')
                    messagebox.showerror("실패", f"로드 실패:\n{result.stderr}")
            except Exception as e:
                self.log(f"오류: {str(e)}", 'ERROR')
                messagebox.showerror("오류", f"오류 발생:\n{str(e)}")


def main():
    root = tk.Tk()
    app = ERPLauncher(root)

    # Handle window close
    def on_closing():
        if app.process and app.process.poll() is None:
            if messagebox.askyesno("종료", "ERP가 실행 중입니다. 종료하시겠습니까?"):
                app.stop_erp()
                root.destroy()
        else:
            root.destroy()

    root.protocol("WM_DELETE_WINDOW", on_closing)
    root.mainloop()


if __name__ == '__main__':
    main()
