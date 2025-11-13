@echo off
REM 42ment ERP Launcher Batch File
REM Double-click this file to start the ERP GUI Launcher

title 42ment ERP Launcher

echo.
echo ================================================
echo   42ment ERP - GUI Launcher
echo ================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.11+ from https://www.python.org
    pause
    exit /b 1
)

echo [OK] Python is installed
echo.

REM Check if launcher.py exists
if not exist "%~dp0launcher.py" (
    echo [ERROR] launcher.py not found!
    echo Please ensure launcher.py is in the same directory.
    pause
    exit /b 1
)

echo [INFO] Starting GUI Launcher...
echo.

REM Start the GUI launcher
python "%~dp0launcher.py"

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start launcher!
    echo.
    echo Trying alternative method...
    echo.
    REM Try direct streamlit run
    python -m streamlit run "%~dp0src\main.py"
)

pause
