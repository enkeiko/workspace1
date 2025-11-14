@echo off
chcp 65001 >nul
REM ================================================================
REM 42ment ERP - 실행 스크립트
REM ================================================================

title 42ment ERP

REM 가상환경 확인
if not exist "venv" (
    echo [오류] 가상환경이 설정되지 않았습니다!
    echo.
    echo 먼저 SETUP.bat을 실행하여 초기 설정을 완료하세요.
    echo.
    pause
    exit /b 1
)

REM 가상환경 활성화
call venv\Scripts\activate.bat

echo.
echo ================================================================
echo   42ment ERP 시작 중...
echo ================================================================
echo.
echo 브라우저에서 다음 주소로 접속하세요:
echo.
echo   http://localhost:8501
echo.
echo 종료하려면 이 창에서 Ctrl+C를 누르세요.
echo ================================================================
echo.

REM Streamlit 실행
streamlit run src/main.py --server.port 8501

REM 종료 시
echo.
echo ERP가 종료되었습니다.
pause
