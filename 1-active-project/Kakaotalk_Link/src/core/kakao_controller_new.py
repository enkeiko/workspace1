"""
새로운 KakaoTalk 컨트롤러 - Ctrl+F 통합검색 방식
"""

from __future__ import annotations

import time
from typing import Optional
import win32gui
import win32con
import win32api
import pyperclip

from src.utils.logger import setup_logger

logger = setup_logger()

# 키 코드
VK_RETURN = 0x0D
VK_ESCAPE = 0x1B
VK_CONTROL = 0x11
VK_V = 0x56
VK_F = 0x46
VK_TAB = 0x09


class KakaoControllerNew:
    def __init__(self) -> None:
        self.main_hwnd: Optional[int] = None

    def find_hwnd_eva(self) -> Optional[int]:
        """EVA_Window_Dblclk 클래스의 카카오톡 메인 창 찾기"""
        candidates = []

        def callback(hwnd, _):
            if win32gui.IsWindowVisible(hwnd):
                class_name = win32gui.GetClassName(hwnd)
                if "EVA_Window" in class_name:
                    try:
                        text = win32gui.GetWindowText(hwnd)
                        if "카카오톡" in text or "KakaoTalk" in text or text == "":
                            candidates.append((hwnd, class_name, text))
                    except:
                        pass
            return True

        win32gui.EnumWindows(callback, None)

        # OnlineMainView 포함 여부로 최종 선택
        for hwnd, class_name, text in candidates:
            descendants = []

            def enum_child(child_hwnd, _):
                descendants.append(child_hwnd)
                return True

            win32gui.EnumChildWindows(hwnd, enum_child, None)

            for child in descendants:
                try:
                    child_text = win32gui.GetWindowText(child)
                    if "OnlineMainView" in child_text:
                        logger.info(f"find_hwnd_eva: found hwnd={hwnd}, class={class_name}, text='{text}' (has OnlineMainView)")
                        return hwnd
                except:
                    pass

        return None

    def connect(self) -> bool:
        """카카오톡 연결 (없으면 자동 실행)"""
        self.main_hwnd = self.find_hwnd_eva()
        if self.main_hwnd:
            logger.info(f"Connected to KakaoTalk: hwnd={self.main_hwnd}")
            return True

        # 카카오톡이 없으면 자동 실행 시도
        logger.info("KakaoTalk not found, attempting to launch...")
        try:
            import subprocess
            import os

            # 일반적인 카카오톡 설치 경로들
            kakao_paths = [
                r"C:\Program Files (x86)\Kakao\KakaoTalk\KakaoTalk.exe",
                r"C:\Program Files\Kakao\KakaoTalk\KakaoTalk.exe",
                os.path.expandvars(r"%LOCALAPPDATA%\KakaoTalk\KakaoTalk.exe"),
            ]

            launched = False
            for path in kakao_paths:
                if os.path.exists(path):
                    logger.info(f"Launching KakaoTalk from: {path}")
                    subprocess.Popen([path])
                    launched = True
                    break

            if not launched:
                logger.error("KakaoTalk executable not found in common paths")
                return False

            # 카카오톡이 시작될 때까지 대기 (최대 10초)
            import time
            for i in range(10):
                time.sleep(1)
                self.main_hwnd = self.find_hwnd_eva()
                if self.main_hwnd:
                    logger.info(f"KakaoTalk launched successfully: hwnd={self.main_hwnd}")
                    return True
                logger.info(f"Waiting for KakaoTalk to start... ({i+1}/10)")

            logger.error("KakaoTalk did not start within timeout")
            return False

        except Exception as e:
            logger.error(f"Failed to launch KakaoTalk: {e}")
            return False

    def find_all_descendants(self, hwnd: int) -> list:
        """모든 자식 윈도우 찾기"""
        descendants = []

        def callback(child, _):
            descendants.append(child)
            return True

        win32gui.EnumChildWindows(hwnd, callback, None)
        return descendants

    def send_kakao_msg(self, target: str, message: str, tab_type: str = "friend", search_tab: str = "chat") -> bool:
        """카카오톡 메시지 전송 (Ctrl+F 통합검색 방식)

        Args:
            target: 검색할 대상 이름
            message: 전송할 메시지
            tab_type: 'friend' (친구 탭) 또는 'chat' (채팅방 탭)
            search_tab: 'chat' (채팅) 또는 'openchat' (오픈채팅)
        """
        try:
            # 1. 카카오톡 창 활성화 및 클릭
            try:
                # 1-1. 최소화/숨김 상태 확인 및 복원
                SW_RESTORE = 9  # 최소화된 창 복원
                SW_SHOW = 5     # 숨겨진 창 표시

                # IsIconic: 최소화 여부 확인
                if win32gui.IsIconic(self.main_hwnd):
                    logger.info("Step 1: KakaoTalk is minimized, restoring...")
                    win32gui.ShowWindow(self.main_hwnd, SW_RESTORE)
                    time.sleep(0.5)

                # IsWindowVisible: 창이 보이는지 확인
                if not win32gui.IsWindowVisible(self.main_hwnd):
                    logger.info("Step 1: KakaoTalk is hidden, showing...")
                    win32gui.ShowWindow(self.main_hwnd, SW_SHOW)
                    time.sleep(0.5)

                # Alt 키로 포그라운드 락 우회
                win32api.keybd_event(0x12, 0, 0, 0)  # Alt down
                time.sleep(0.05)
                win32api.keybd_event(0x12, 0, win32con.KEYEVENTF_KEYUP, 0)  # Alt up
                time.sleep(0.1)

                win32gui.SetForegroundWindow(self.main_hwnd)
                time.sleep(0.5)

                # 창 중앙을 클릭하여 완전히 포커스 확보
                rect = win32gui.GetWindowRect(self.main_hwnd)
                center_x = (rect[0] + rect[2]) // 2
                center_y = (rect[1] + rect[3]) // 2 + 100  # 조금 아래쪽 (타이틀바 피하기)

                win32api.SetCursorPos((center_x, center_y))
                time.sleep(0.1)
                win32api.mouse_event(win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
                time.sleep(0.05)
                win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
                time.sleep(0.5)

                logger.info(f"Step 1: KakaoTalk window activated and clicked at ({center_x}, {center_y})")
            except Exception as e:
                logger.warning(f"Step 1: Activation failed ({e}), continuing anyway")
                time.sleep(0.5)

            # 1.5. 현재 활성 탭 확인 후 원하는 탭으로 이동
            def get_active_tab():
                """현재 활성화된 탭 확인 (ContactListView, ChatRoomListView, MoreView의 visible 체크)"""
                descendants = self.find_all_descendants(self.main_hwnd)
                for hwnd in descendants:
                    try:
                        text = win32gui.GetWindowText(hwnd)
                        if "ContactListView" in text and win32gui.IsWindowVisible(hwnd):
                            return "friend"
                        elif "ChatRoomListView" in text and win32gui.IsWindowVisible(hwnd):
                            return "chat"
                        elif "MoreView" in text and win32gui.IsWindowVisible(hwnd):
                            return "more"
                    except:
                        pass
                return None

            # 현재 탭 확인
            current_tab = get_active_tab()
            logger.info(f"Step 1.5: 현재 활성 탭 = {current_tab}, 목표 탭 = {tab_type}")

            # 목표 탭으로 이동 (Ctrl+Tab으로 순환: 친구->채팅방->더보기->친구)
            tab_order = ["friend", "chat", "more"]
            if current_tab and current_tab != tab_type:
                current_idx = tab_order.index(current_tab)
                target_idx = tab_order.index(tab_type) if tab_type in tab_order else 0

                # 순환 구조이므로 최단 거리 계산
                forward_steps = (target_idx - current_idx) % 3
                if forward_steps > 0:
                    logger.info(f"Step 1.5: {current_tab} -> {tab_type} (Ctrl+Tab {forward_steps}번)")
                    for _ in range(forward_steps):
                        win32api.keybd_event(VK_CONTROL, 0, 0, 0)
                        win32api.keybd_event(VK_TAB, 0, 0, 0)
                        time.sleep(0.05)
                        win32api.keybd_event(VK_TAB, 0, win32con.KEYEVENTF_KEYUP, 0)
                        win32api.keybd_event(VK_CONTROL, 0, win32con.KEYEVENTF_KEYUP, 0)
                        time.sleep(0.6)
            else:
                logger.info(f"Step 1.5: 이미 원하는 탭({tab_type})에 있음")

            # 1.6. 채팅 탭에서 채팅/오픈채팅 전환 (VBA 방식)
            # ChatRoomListView의 Edit 컨트롤에서 Ctrl+Right/Left로 전환
            if tab_type == "chat":
                # ChatRoomListView 찾기
                descendants = self.find_all_descendants(self.main_hwnd)
                chat_list_edit = None

                for hwnd in descendants:
                    try:
                        text = win32gui.GetWindowText(hwnd)
                        if "ChatRoomListView" in text and win32gui.IsWindowVisible(hwnd):
                            # ChatRoomListView 내부의 Edit 컨트롤 찾기
                            chat_list_hwnd = hwnd
                            edit_hwnd = win32gui.FindWindowEx(chat_list_hwnd, 0, "Edit", None)
                            if edit_hwnd:
                                chat_list_edit = edit_hwnd
                                logger.info(f"Step 1.6: ChatRoomListView Edit 발견 hwnd={edit_hwnd}")
                                break
                    except:
                        pass

                if chat_list_edit:
                    # Edit 컨트롤 클릭하여 포커스
                    rect = win32gui.GetWindowRect(chat_list_edit)
                    click_x = (rect[0] + rect[2]) // 2
                    click_y = (rect[1] + rect[3]) // 2

                    win32api.SetCursorPos((click_x, click_y))
                    time.sleep(0.1)
                    win32api.mouse_event(win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
                    time.sleep(0.05)
                    win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
                    time.sleep(0.3)

                    # Ctrl+Right/Left로 채팅/오픈채팅 전환
                    VK_LEFT = 0x25
                    VK_RIGHT = 0x27

                    if search_tab == "openchat":
                        logger.info("Step 1.6: 오픈채팅으로 전환 (Ctrl+Right)")
                        win32api.keybd_event(VK_CONTROL, 0, 0, 0)
                        win32api.keybd_event(VK_RIGHT, 0, 0, 0)
                        time.sleep(0.05)
                        win32api.keybd_event(VK_RIGHT, 0, win32con.KEYEVENTF_KEYUP, 0)
                        win32api.keybd_event(VK_CONTROL, 0, win32con.KEYEVENTF_KEYUP, 0)
                        time.sleep(0.5)
                    else:
                        logger.info("Step 1.6: 일반 채팅으로 전환 (Ctrl+Left)")
                        win32api.keybd_event(VK_CONTROL, 0, 0, 0)
                        win32api.keybd_event(VK_LEFT, 0, 0, 0)
                        time.sleep(0.05)
                        win32api.keybd_event(VK_LEFT, 0, win32con.KEYEVENTF_KEYUP, 0)
                        win32api.keybd_event(VK_CONTROL, 0, win32con.KEYEVENTF_KEYUP, 0)
                        time.sleep(0.5)
                else:
                    logger.warning("Step 1.6: ChatRoomListView Edit을 찾지 못했습니다")
            else:
                logger.info("Step 1.6: 친구 탭이므로 채팅/오픈채팅 전환 건너뜀")

            # 2. Ctrl+F로 검색창 열기
            win32api.keybd_event(VK_CONTROL, 0, 0, 0)
            win32api.keybd_event(VK_F, 0, 0, 0)
            time.sleep(0.05)
            win32api.keybd_event(VK_F, 0, win32con.KEYEVENTF_KEYUP, 0)
            win32api.keybd_event(VK_CONTROL, 0, win32con.KEYEVENTF_KEYUP, 0)
            time.sleep(1.0)
            logger.info("Step 2: Ctrl+F로 검색창 열기")

            # 3. 검색 Edit 찾기 (메인 윈도우 전체에서)
            search_edit = None
            for edit_attempt in range(3):
                time.sleep(0.3)
                descendants = self.find_all_descendants(self.main_hwnd)

                for hwnd in descendants:
                    try:
                        class_name = win32gui.GetClassName(hwnd)
                        if class_name == "Edit":
                            rect = win32gui.GetWindowRect(hwnd)
                            width = rect[2] - rect[0]
                            height = rect[3] - rect[1]
                            # 화면 내, 검색창 크기 (상대 좌표도 고려)
                            if width > 50 and 10 < height < 50:
                                search_edit = hwnd
                                logger.info(f"Step 3: Found Edit hwnd={hwnd}, size={width}x{height}, rect={rect}")
                                break
                    except:
                        pass

                if search_edit:
                    break

            if not search_edit:
                logger.error("Step 3: 검색 Edit을 찾을 수 없습니다")
                return False

            # 4. 검색창 클릭
            rect = win32gui.GetWindowRect(search_edit)
            click_x = (rect[0] + rect[2]) // 2
            click_y = (rect[1] + rect[3]) // 2

            win32api.SetCursorPos((click_x, click_y))
            time.sleep(0.1)
            win32api.mouse_event(win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
            time.sleep(0.05)
            win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
            time.sleep(0.3)
            logger.info(f"Step 4: 검색창 클릭 ({click_x}, {click_y})")

            # 5. 기존 텍스트 지우기 (Shift+Home으로 전체 선택 후 Backspace)
            # Ctrl+A는 친구 추가를 트리거하므로 사용 불가
            # Shift+Home으로 전체 선택 (3번 시도)
            VK_SHIFT = 0x10
            VK_HOME = 0x24
            VK_BACKSPACE = 0x08

            for attempt in range(3):
                # Shift+Home
                win32api.keybd_event(VK_SHIFT, 0, 0, 0)
                time.sleep(0.05)
                win32api.keybd_event(VK_HOME, 0, 0, 0)
                time.sleep(0.05)
                win32api.keybd_event(VK_HOME, 0, win32con.KEYEVENTF_KEYUP, 0)
                time.sleep(0.05)
                win32api.keybd_event(VK_SHIFT, 0, win32con.KEYEVENTF_KEYUP, 0)
                time.sleep(0.1)

                # Backspace
                win32api.keybd_event(VK_BACKSPACE, 0, 0, 0)
                time.sleep(0.05)
                win32api.keybd_event(VK_BACKSPACE, 0, win32con.KEYEVENTF_KEYUP, 0)
                time.sleep(0.1)

            time.sleep(0.2)
            logger.info("Step 5: 검색창 비우기 (Shift+Home -> Backspace 3회 시도)")

            # 6. 검색어 입력 (클립보드)
            pyperclip.copy(target)
            time.sleep(0.1)

            win32api.keybd_event(VK_CONTROL, 0, 0, 0)
            win32api.keybd_event(VK_V, 0, 0, 0)
            time.sleep(0.05)
            win32api.keybd_event(VK_V, 0, win32con.KEYEVENTF_KEYUP, 0)
            win32api.keybd_event(VK_CONTROL, 0, win32con.KEYEVENTF_KEYUP, 0)
            time.sleep(1.0)
            logger.info(f"Step 6: 검색어 입력 '{target}'")

            # 7. Enter로 채팅 열기
            win32api.keybd_event(VK_RETURN, 0, 0, 0)
            time.sleep(0.05)
            win32api.keybd_event(VK_RETURN, 0, win32con.KEYEVENTF_KEYUP, 0)
            time.sleep(1.5)
            logger.info("Step 7: Enter로 채팅 열기")

            # 8. 메시지 입력 (클립보드)
            pyperclip.copy(message)
            time.sleep(0.1)

            win32api.keybd_event(VK_CONTROL, 0, 0, 0)
            win32api.keybd_event(VK_V, 0, 0, 0)
            time.sleep(0.05)
            win32api.keybd_event(VK_V, 0, win32con.KEYEVENTF_KEYUP, 0)
            win32api.keybd_event(VK_CONTROL, 0, win32con.KEYEVENTF_KEYUP, 0)
            time.sleep(0.5)
            logger.info(f"Step 8: 메시지 입력 '{message}'")

            # 9. Enter로 전송
            win32api.keybd_event(VK_RETURN, 0, 0, 0)
            time.sleep(0.05)
            win32api.keybd_event(VK_RETURN, 0, win32con.KEYEVENTF_KEYUP, 0)
            time.sleep(0.5)
            logger.info("Step 9: 메시지 전송")

            # 10. ESC로 채팅창 닫기
            win32api.keybd_event(VK_ESCAPE, 0, 0, 0)
            time.sleep(0.05)
            win32api.keybd_event(VK_ESCAPE, 0, win32con.KEYEVENTF_KEYUP, 0)
            time.sleep(0.5)
            logger.info("Step 10: 채팅창 닫기")

            # 11. 통합검색 검색어 제거 (Ctrl+F 다시 열어서 비우기)
            win32api.keybd_event(VK_CONTROL, 0, 0, 0)
            win32api.keybd_event(VK_F, 0, 0, 0)
            time.sleep(0.05)
            win32api.keybd_event(VK_F, 0, win32con.KEYEVENTF_KEYUP, 0)
            win32api.keybd_event(VK_CONTROL, 0, win32con.KEYEVENTF_KEYUP, 0)
            time.sleep(0.8)

            # 검색창 찾아서 비우기
            search_edit = None
            descendants = self.find_all_descendants(self.main_hwnd)
            for hwnd in descendants:
                try:
                    class_name = win32gui.GetClassName(hwnd)
                    if class_name == "Edit":
                        rect = win32gui.GetWindowRect(hwnd)
                        width = rect[2] - rect[0]
                        height = rect[3] - rect[1]
                        if width > 50 and 10 < height < 50:
                            search_edit = hwnd
                            break
                except:
                    pass

            if search_edit:
                # 검색창 클릭
                rect = win32gui.GetWindowRect(search_edit)
                click_x = (rect[0] + rect[2]) // 2
                click_y = (rect[1] + rect[3]) // 2

                win32api.SetCursorPos((click_x, click_y))
                time.sleep(0.1)
                win32api.mouse_event(win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
                time.sleep(0.05)
                win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
                time.sleep(0.2)

                # Shift+Home -> Backspace로 비우기
                win32api.keybd_event(0x10, 0, 0, 0)  # Shift
                win32api.keybd_event(0x24, 0, 0, 0)  # Home
                time.sleep(0.05)
                win32api.keybd_event(0x24, 0, win32con.KEYEVENTF_KEYUP, 0)
                win32api.keybd_event(0x10, 0, win32con.KEYEVENTF_KEYUP, 0)
                time.sleep(0.1)

                win32api.keybd_event(0x08, 0, 0, 0)  # Backspace
                time.sleep(0.05)
                win32api.keybd_event(0x08, 0, win32con.KEYEVENTF_KEYUP, 0)
                time.sleep(0.2)

                # ESC로 검색창 닫기
                win32api.keybd_event(VK_ESCAPE, 0, 0, 0)
                time.sleep(0.05)
                win32api.keybd_event(VK_ESCAPE, 0, win32con.KEYEVENTF_KEYUP, 0)
                time.sleep(0.3)

                logger.info("Step 11: 통합검색 검색어 제거 완료")
            else:
                logger.warning("Step 11: 검색창을 찾을 수 없어 검색어 제거 생략")

            logger.info(f"메시지 전송 완료: '{target}' -> '{message}'")
            return True

        except Exception as exc:
            logger.error(f"send_kakao_msg failed: {exc}")
            import traceback
            traceback.print_exc()
            return False

    def send_message(self, target: str, message: str, tab_type: str = "friend", search_tab: str = "chat") -> bool:
        """메시지 전송 (외부 인터페이스)

        Args:
            target: 검색할 대상 이름
            message: 전송할 메시지
            tab_type: 'friend' (친구 탭) 또는 'chat' (채팅방 탭)
            search_tab: 'chat' (채팅) 또는 'openchat' (오픈채팅)
        """
        return self.send_kakao_msg(target, message, tab_type=tab_type, search_tab=search_tab)
