@echo off
chcp 65001 >nul
REM ================================================================
REM 42ment ERP - 초기 설정 스크립트
REM 처음 실행시 이 파일을 실행하세요
REM ================================================================

title 42ment ERP - 초기 설정

echo.
echo ================================================================
echo   42ment ERP - 초기 설정
echo ================================================================
echo.

REM Python 확인
python --version >nul 2>&1
if errorlevel 1 (
    echo [오류] Python이 설치되지 않았습니다!
    echo.
    echo Python 3.11 이상을 설치해주세요:
    echo https://www.python.org/downloads/
    echo.
    echo 설치 시 "Add Python to PATH" 옵션을 꼭 선택하세요!
    pause
    exit /b 1
)

echo [확인] Python 설치됨
python --version
echo.

REM 가상환경 생성
if not exist "venv" (
    echo [작업] 가상환경 생성 중...
    python -m venv venv
    if errorlevel 1 (
        echo [오류] 가상환경 생성 실패!
        pause
        exit /b 1
    )
    echo [완료] 가상환경 생성 완료
) else (
    echo [확인] 가상환경 이미 존재함
)
echo.

REM 가상환경 활성화
echo [작업] 가상환경 활성화 중...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo [오류] 가상환경 활성화 실패!
    pause
    exit /b 1
)
echo [완료] 가상환경 활성화됨
echo.

REM 패키지 설치
echo [작업] 필수 패키지 설치 중...
echo 이 작업은 몇 분이 걸릴 수 있습니다...
echo.
python -m pip install --upgrade pip -q
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo [오류] 패키지 설치 실패!
    pause
    exit /b 1
)
echo [완료] 패키지 설치 완료
echo.

REM 데이터베이스 초기화
echo [작업] 데이터베이스 초기화 중...
python run.py --force
if errorlevel 1 (
    echo [오류] 데이터베이스 초기화 실패!
    pause
    exit /b 1
)
echo [완료] 데이터베이스 초기화 완료
echo.

REM 샘플 데이터 로드 여부 확인
echo ================================================================
echo 샘플 데이터를 로드하시겠습니까?
echo (테스트용 고객, 프로젝트, 작업 시간 등)
echo ================================================================
echo.
set /p LOAD_SAMPLE="샘플 데이터 로드? (Y/N): "

if /i "%LOAD_SAMPLE%"=="Y" (
    echo.
    echo [작업] 샘플 데이터 로드 중...
    python run.py --sample
    echo [완료] 샘플 데이터 로드 완료
)

echo.
echo ================================================================
echo   초기 설정 완료!
echo ================================================================
echo.
echo 이제 RUN.bat 파일을 실행하여 ERP를 시작하세요.
echo.
pause
