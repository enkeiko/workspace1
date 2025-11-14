@echo off
REM ================================================================
REM 42ment ERP - Windows Build Script
REM This script packages the ERP system for Windows distribution
REM ================================================================

title 42ment ERP - Windows Build

echo.
echo ================================================================
echo   42ment ERP - Windows Build Script
echo ================================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.11+ from https://www.python.org
    pause
    exit /b 1
)

echo [OK] Python found
echo.

REM Check if PyInstaller is installed
python -m pip show pyinstaller >nul 2>&1
if errorlevel 1 (
    echo [INFO] PyInstaller not found. Installing...
    python -m pip install pyinstaller
    if errorlevel 1 (
        echo [ERROR] Failed to install PyInstaller!
        pause
        exit /b 1
    )
    echo [OK] PyInstaller installed
) else (
    echo [OK] PyInstaller already installed
)

echo.
echo [INFO] Installing project dependencies...
python -m pip install -r requirements.txt -q
if errorlevel 1 (
    echo [WARNING] Some dependencies may have failed to install
) else (
    echo [OK] Dependencies installed
)

echo.
echo [INFO] Cleaning previous build...
if exist "dist" rmdir /s /q "dist"
if exist "build" rmdir /s /q "build"
echo [OK] Cleaned

echo.
echo [INFO] Building executable with PyInstaller...
echo.
python -m PyInstaller launcher.spec --clean --noconfirm

if errorlevel 1 (
    echo.
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo [OK] Build successful!
echo.

REM Create distribution package
echo [INFO] Creating distribution package...

set DIST_DIR=dist\42ment-ERP-Windows
set BUILD_DIR=dist\42ment-ERP

if exist "%DIST_DIR%" rmdir /s /q "%DIST_DIR%"
mkdir "%DIST_DIR%"

REM Copy build output
echo [INFO] Copying files...
xcopy /E /I /Y "%BUILD_DIR%" "%DIST_DIR%\app"

REM Copy data folder structure
mkdir "%DIST_DIR%\app\data"
mkdir "%DIST_DIR%\app\data\exports"
mkdir "%DIST_DIR%\app\data\logs"
mkdir "%DIST_DIR%\app\data\backups"

REM Copy additional files
copy "README.md" "%DIST_DIR%\" >nul
copy "QUICKSTART.md" "%DIST_DIR%\" >nul
copy "GUI_사용법.md" "%DIST_DIR%\" >nul

REM Create launcher script
echo @echo off > "%DIST_DIR%\시작-42ment-ERP.bat"
echo cd /d "%%~dp0app" >> "%DIST_DIR%\시작-42ment-ERP.bat"
echo start "" "42ment-ERP.exe" >> "%DIST_DIR%\시작-42ment-ERP.bat"

echo.
echo ================================================================
echo   Build Complete!
echo ================================================================
echo.
echo 배포 패키지가 생성되었습니다:
echo   %DIST_DIR%
echo.
echo 테스트하려면:
echo   1. %DIST_DIR% 폴더로 이동
echo   2. "시작-42ment-ERP.bat" 더블클릭
echo.
echo 배포하려면:
echo   %DIST_DIR% 폴더 전체를 압축하여 배포하세요
echo.

pause
