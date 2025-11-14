@echo off
chcp 65001 >nul
REM ================================================================
REM 42ment ERP - 데이터베이스 리셋
REM 주의: 모든 데이터가 삭제됩니다!
REM ================================================================

title 42ment ERP - 데이터베이스 리셋

echo.
echo ================================================================
echo   경고: 데이터베이스 리셋
echo ================================================================
echo.
echo 이 작업은 모든 데이터를 삭제합니다!
echo - 고객 정보
echo - 프로젝트 정보
echo - 작업 시간 기록
echo - 청구서
echo.
set /p CONFIRM="정말로 삭제하시겠습니까? (YES 입력): "

if not "%CONFIRM%"=="YES" (
    echo.
    echo 취소되었습니다.
    pause
    exit /b 0
)

REM 가상환경 활성화
if exist "venv" (
    call venv\Scripts\activate.bat
)

echo.
echo [작업] 데이터베이스 리셋 중...
python run.py --force

if errorlevel 1 (
    echo [오류] 데이터베이스 리셋 실패!
    pause
    exit /b 1
)

echo [완료] 데이터베이스 리셋 완료
echo.

REM 샘플 데이터 로드 여부 확인
set /p LOAD_SAMPLE="샘플 데이터를 로드하시겠습니까? (Y/N): "

if /i "%LOAD_SAMPLE%"=="Y" (
    echo.
    echo [작업] 샘플 데이터 로드 중...
    python run.py --sample
    echo [완료] 샘플 데이터 로드 완료
)

echo.
echo 완료되었습니다.
pause
